// Access-log digest for hlyna.com.ua: pulls the production Caddy logs, keeps raw lines per Kyiv day
// and writes a compact, analysable digest per day. Output is private (IPs) and lives OUTSIDE the repo.
//
//   node scripts/logs/digest.mjs                       pull over ssh (host «hlyna», container edge-caddy-1), merge into raw/, rebuild all digests
//                                                      (rotated logs come once, listed in pulled-files.json; the live log every run; all gzipped)
//   node scripts/logs/digest.mjs --full                fetch the rotated logs again too (e.g. after raw/ was lost)
//   node scripts/logs/digest.mjs --file path.log[.gz]  read a local log instead of ssh (repeatable)
//   (on the server it runs daily from deploy/logs-digest.sh with --file over Caddy's logs and LOGS_DIR=/opt/hlyna-logs; deploy/README.md 5a)
//   node scripts/logs/digest.mjs --days 2026-10-17     rebuild only these digests (comma list or repeat); raw/ is still updated for every pulled day
//
// Output (LOGS_DIR, default /Users/rodik/Claude/hlyna-logs):
//   raw/YYYY-MM-DD.jsonl.gz   raw Caddy lines per Kyiv day, deduped across runs (ts + remote port + uri + ip); keeps history past Caddy's ~60 days
//   days/YYYY-MM-DD.json      the digest (classes, bot passes, ai_answers, scanners, ours, people with journeys, 404s, unknown agents)
//   days/YYYY-MM-DD.md        the short human version
//   summary.csv               one row per day (rebuilt from days/*.json)
//   pulled-files.json         rotated Caddy files already merged into raw/ (fetched once)
//   people-index.json         person key (ip|os|browser) -> first day seen; used to mark returning visitors
// Digests are always recomputed from raw/, so a re-run is idempotent. Run without --days once if people-index.json is missing,
// so «returning» sees earlier days. Nothing here talks to the site's database or changes anything on the server.

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import zlib from 'node:zlib'

// ───────────────────────────── Rules: extend these tables ─────────────────────────────

const SITE_HOST = 'hlyna.com.ua'
const SSH_HOST = process.env.LOG_SSH_HOST || 'hlyna'
const REMOTE_DIR = '/data/access' // in container edge-caddy-1: rotated hlyna-*.log.gz (never change) + the live hlyna.log
// Fail instead of hanging when the link drops; files travel gzipped (the link does ~0.5 MB/s, the logs unpacked are ~100 MB a file).
const SSH_OPTS = ['-o', 'ConnectTimeout=15', '-o', 'ServerAliveInterval=15', '-o', 'ServerAliveCountMax=4']
const OUT_DIR = process.env.LOGS_DIR || '/Users/rodik/Claude/hlyna-logs'

const SESSION_GAP = 30 * 60 // seconds: a person's session and a bot's pass end after this much silence
const SLOW_SECONDS = 3
const SMALL_PASS_PATHS = 25 // a bot pass with at most this many distinct paths lists them

// Owner / our own traffic. Anything matching is class «ours», collapsed per tool.
const OWNER_IPS = new Set(['78.84.114.2', '143.244.45.102']) // Mac at home; 143.* a droplet we used
const OWNER_IP_PREFIXES = ['172.18.', '127.', '104.28.'] // docker network (health, revalidate), loopback, owner's iPhone via Private Relay
const RELAY_EN_GB_PREFIXES = ['172.225.', '140.248.'] // Private Relay egress: ours only with Accept-Language en-GB
const OWNER_UA = /^hlyna-/ // our link checker and audit scripts, wherever they run
const MAYBE_OWNER_IPS = new Set([
  '46.150.17.156',
  '95.147.130.120',
  '185.205.146.117',
  '46.133.29.94',
]) // looked like us in the first scan; tagged, not counted as people
const OURS_TOOLS = [
  [/^hlyna-link-check/, 'hlyna-link-check'],
  [/^hlyna-audit/, 'hlyna-audit'],
  [/HeadlessChrome/, 'HeadlessChrome'],
  [/^curl\//, 'curl'],
  [/^Python-urllib|^python/i, 'python'],
  [/^node$|^node-fetch|undici/, 'node'],
  [/Claude\//, 'Claude desktop'],
]

// Named crawlers: [UA regex, family, class]. First match wins, so specific names go before general ones.
// Classes: ai_answer (fetches a page to answer a person), ai_search, ai_training, search_engines, seo_tools, previews, scanners, other.
const FAMILIES = [
  [/ChatGPT-User/i, 'ChatGPT-User', 'ai_answer'],
  [/OAI-SearchBot/i, 'OAI-SearchBot', 'ai_search'],
  [/GPTBot/i, 'GPTBot', 'ai_training'],
  [/Claude-User/i, 'Claude-User', 'ai_answer'],
  [/Claude-SearchBot/i, 'Claude-SearchBot', 'ai_search'],
  [/ClaudeBot|anthropic-ai/i, 'ClaudeBot', 'ai_training'],
  [/Perplexity-User/i, 'Perplexity-User', 'ai_answer'],
  [/PerplexityBot/i, 'PerplexityBot', 'ai_search'],
  [/DuckAssistBot/i, 'DuckAssistBot', 'ai_answer'],
  [/MistralAI-User/i, 'MistralAI-User', 'ai_answer'],
  [/Meta-ExternalFetcher/i, 'Meta-ExternalFetcher', 'ai_answer'],
  [/ExaSearchBot/i, 'ExaSearchBot', 'ai_search'],
  [/KeenableBot/i, 'KeenableBot', 'ai_search'],
  [/YouBot/i, 'YouBot', 'ai_search'],
  [/meta-externalagent/i, 'meta-externalagent', 'ai_training'],
  [/Amazonbot/i, 'Amazonbot', 'ai_training'],
  [/Bytespider/i, 'Bytespider', 'ai_training'],
  [/CCBot/i, 'CCBot', 'ai_training'],
  [/Reflectionbot/i, 'Reflectionbot', 'ai_training'],
  [/cohere-ai/i, 'cohere-ai', 'ai_training'],
  [/Diffbot/i, 'Diffbot', 'ai_training'],
  [/ImagesiftBot/i, 'ImagesiftBot', 'ai_training'],
  [/Googlebot-Image/i, 'Googlebot-Image', 'search_engines'],
  [/AdsBot-Google/i, 'AdsBot-Google', 'search_engines'],
  [/GoogleOther/i, 'GoogleOther', 'search_engines'],
  [/Google-InspectionTool/i, 'Google-InspectionTool', 'search_engines'],
  [/Googlebot/i, 'Googlebot', 'search_engines'],
  [/Prefetch Proxy/i, 'Google prefetch proxy', 'search_engines'],
  [/^Telegram\/\d+ CFNetwork/, 'Telegram (iOS link preview)', 'previews'],
  [/bingbot/i, 'Bingbot', 'search_engines'],
  [/YandexBot/i, 'YandexBot', 'search_engines'],
  [/Applebot/i, 'Applebot', 'search_engines'],
  [/DuckDuckBot/i, 'DuckDuckBot', 'search_engines'],
  [/PetalBot/i, 'PetalBot', 'search_engines'],
  [/Baiduspider/i, 'Baiduspider', 'search_engines'],
  [/SeznamBot/i, 'SeznamBot', 'search_engines'],
  [/SemrushBot/i, 'SemrushBot', 'seo_tools'],
  [/AhrefsBot/i, 'AhrefsBot', 'seo_tools'],
  [/MJ12bot/i, 'MJ12bot', 'seo_tools'],
  [/DotBot/i, 'DotBot', 'seo_tools'],
  [/DataForSeoBot/i, 'DataForSeoBot', 'seo_tools'],
  [/Barkrowler/i, 'Barkrowler (Babbar)', 'seo_tools'],
  [/serpstatbot/i, 'serpstatbot', 'seo_tools'],
  [/BLEXBot/i, 'BLEXBot', 'seo_tools'],
  [/Dataprovider/i, 'Dataprovider', 'seo_tools'],
  [/BuiltWith/i, 'BuiltWith', 'seo_tools'],
  [/BingPreview/i, 'BingPreview', 'previews'],
  [/facebookexternalhit/i, 'facebookexternalhit', 'previews'],
  [/TelegramBot/i, 'TelegramBot', 'previews'],
  [/Twitterbot/i, 'Twitterbot', 'previews'],
  [/WhatsApp/i, 'WhatsApp', 'previews'],
  [/Viber/i, 'Viber', 'previews'],
  [/Bluesky|Cardyb/i, 'Bluesky', 'previews'],
  [/SkyWatch/i, 'SkyWatch (Bluesky)', 'previews'],
  [/Flipboard/i, 'Flipboard', 'previews'],
  [/Pinterestbot/i, 'Pinterest', 'previews'],
  [/LinkedInBot/i, 'LinkedInBot', 'previews'],
  [/Discordbot/i, 'Discordbot', 'previews'],
  [/Slackbot/i, 'Slackbot', 'previews'],
  [/CensysInspect/i, 'CensysInspect', 'scanners'],
  [/SparixEmailScraper/i, 'SparixEmailScraper', 'scanners'],
  [/CMS-Checker/i, 'CMS-Checker', 'scanners'],
  [/Scrapy|zgrab|masscan|Nuclei/i, 'scanner toolkit', 'scanners'],
  [/ShapBot/i, 'ShapBot', 'other'],
  [/LivelapBot/i, 'LivelapBot', 'other'],
  [/UkrajinaRegistarBot/i, 'UkrajinaRegistarBot', 'other'],
]
// Signed agent requests (Web Bot Auth): Signature-Agent header -> [family, class] when the UA says nothing useful.
const SIGNATURE_AGENTS = [[/chatgpt\.com/, 'ChatGPT agent (signed)', 'ai_answer']]
const GOOGLE_IP_PREFIXES = [
  '66.249.',
  '64.233.',
  '66.102.',
  '72.14.',
  '74.125.',
  '209.85.',
  '216.239.',
  '142.250.',
  '172.217.',
  '173.194.',
  '192.178.',
  '108.177.',
]
const GOOGLE_CLOUD_PREFIXES = ['34.', '35.'] // Google-InspectionTool and friends may fetch from Google Cloud
const GOOGLE_PROXY_IP_PREFIXES = ['162.120.', '72.14.201.', '193.186.4.'] // Chrome prefetch proxy
const META_IP_PREFIXES = ['57.141.'] // Meta crawlers without a helpful UA

// Probe paths: scanners looking for secrets and CMS. A probing IP is a scanner for the whole day.
const PROBE =
  /^\/(\.env|\.git|\.svn|\.hg|\.aws|\.docker|\.ssh|\.npmrc|\.netrc|\.boto|\.claude|\.github|\.travis|\.amplifyrc|wp-|wordpress|xmlrpc|phpmyadmin|actuator|cgi-bin|vendor\/|admin|config|api\/config|_profiler|server-status|solr|geoserver|owa|ecp|autodiscover|vpn|remote|boaform|HNAP|login|user\/login|te\/login|index\.php|\.well-known\/security|docker-compose|README\.md|CLAUDE\.md|AGENTS\.md|backup|sql|db\.|dump|shell|cmd|dashboard|test$)|\?(rest_route|cmd=|url=http)|169\.254/i
// Real endpoints that take non-GET requests; any other POST/PUT/... is a probe.
const KNOWN_WRITE_PATHS =
  /^\/(api\/zapyt|api\/panel|api\/auth|api\/telegram|revalidate|kabinet\/api)(\/|$)/
// A UA that is a tool or crawler we have not named: not a person; listed under unknown_agents so new bots show up.
const GENERIC_BOT =
  /bot|crawl|spider|slurp|python|curl|wget|httpx|aiohttp|okhttp|go-http|java\/|libwww|scrapy|headless|phantom|zgrab|masscan|nmap|censys|scan|checker|radar|monitor|undici|^node$|axios|ruby|php|perl|apache-httpclient|lighthouse|getdomaindata|osyo|reflection|siteradar|NetworkingExtension|^Mozilla\/5\.0$|Mozlila|^Google$|^Chrome$|^http:\/\/|install\.php|Dalvik|dataprovider|scraper/i
// Datacenter / cloud prefixes: a browser UA from here is not a person.
const DC_PREFIXES = [
  '66.102.',
  '43.',
  '216.251.',
  '90.96.182.',
  '205.169.39.',
  '44.',
  '52.',
  '54.',
  '18.',
  '3.',
  '34.',
  '35.',
  '136.71.',
  '149.5',
  '23.27.',
  '63.141.',
  '92.255.0.',
  '106.75.',
  '111.172.',
  '59.14.',
  '51.158.',
  '45.138.12.',
  '100.',
  '107.',
  '24.199.',
  '167.172.',
  '37.187.',
  '51.15.',
  '51.81.',
  '64.89.',
  '119.252.',
  '203.159.',
  '14.194.',
  '204.101.',
  '31.121.111.',
  '206.72.199.',
  '209.50.',
  '139.59.',
  '142.147.',
  '104.253.',
  '172.86.',
  '192.177.',
  '45.56.',
  '198.37.',
  '20.',
  '40.',
  '13.',
  '9.246.',
  '57.141.',
  '66.249.',
  '162.120.',
  '72.14.',
  '74.125.',
  '193.186.4.',
  '85.25.46.',
  '113.31.',
  '221.158.',
  '223.204.',
  '112.208.',
  '81.214.',
  '65.110.',
  '103.14',
  '176.116.',
  '172.252.',
  '61.79.',
  '95.40.',
  '144.172.',
  '45.148.',
  '136.110.',
  '62.60.',
  '185.210.204.',
  '5.133.',
  '82.108.',
  '44.202.',
  '193.235.',
  '185.150.',
  '194.14.',
  '192.36.',
  '192.71.',
  '83.140.',
  '5.198.',
  '185.143.',
  '106.219.',
  '68.183.',
  '190.103.',
  '82.223.',
  '209.38.',
  '155.254.',
  '139.190.',
  '47.236.',
  '3.18.',
  '3.78.',
  '15.204.',
  '71.167.',
  '77.166.',
  '170.106.',
  '49.51.', // Tencent Cloud (fake «iPhone OS 13_2_3» UA)
]

// Where visitors come from: utm_source value or referrer host -> source name. Bucket = the column in summary.csv.
const UTM_SOURCES = {
  'chatgpt.com': 'chatgpt',
  ig: 'instagram',
  instagram: 'instagram',
  fb: 'facebook',
  facebook: 'facebook',
  threads: 'threads',
  telegram: 'telegram',
  perplexity: 'perplexity',
}
const REFERRER_SOURCES = [
  [/(^|\.)google\.[a-z.]+$/, 'google'],
  [/(^|\.)bing\.com$/, 'bing'],
  [/(^|\.)duckduckgo\.com$/, 'duckduckgo'],
  [/(^|\.)yahoo\.com$/, 'yahoo'],
  [/(^|\.)ecosia\.org$/, 'ecosia'],
  [/(^|\.)yandex\./, 'yandex'],
  [/(^|\.)chatgpt\.com$|(^|\.)openai\.com$/, 'chatgpt'],
  [/perplexity\.ai$/, 'perplexity'],
  [/claude\.ai$/, 'claude'],
  [/gemini\.google\.com$/, 'gemini'],
  [/copilot\.microsoft\.com$/, 'copilot'],
  [/(^|\.)instagram\.com$/, 'instagram'],
  [/(^|\.)facebook\.com$|(^|\.)fb\.com$|(^|\.)fb\.me$/, 'facebook'],
  [/(^|\.)threads\.(net|com)$/, 'threads'],
  [/(^|\.)t\.me$|(^|\.)telegram\.org$|^web\.telegram/, 'telegram'],
  [/bsky\.(app|social)$/, 'bluesky'],
  [/(^|\.)ukr\.net$/, 'ukr.net'],
  [/(^|\.)pinterest\./, 'pinterest'],
  [/(^|\.)linkedin\.com$|^lnkd\.in$/, 'linkedin'],
  [/(^|\.)(x|twitter)\.com$|^t\.co$/, 'x'],
  [/mail\.google\.com|^android-app:\/\/com\.google\.android\.gm/, 'email'],
]
const IN_APP_SOURCES = [
  [/Instagram/, 'instagram'],
  [/Barcelona/, 'threads'],
  [/FBAN|FBAV/, 'facebook'],
  [/\bGemini\w*\//, 'gemini'], // Gemini app web view (GoogleWv … GeminiiOS/…), sends no referrer
]
const SUMMARY_SOURCES = ['google', 'chatgpt', 'perplexity', 'gemini', 'instagram', 'direct'] // everything else -> «other»

// Paths that are not pages.
const ASSET =
  /^\/(_next\/|media\/|images\/|fonts\/|favicon|icon|apple-icon|manifest\.webmanifest|og\/)|\.(png|jpe?g|webp|avif|gif|svg|ico|woff2?|css|js|map)$/i
// Not interesting as «missing page» entries.
const NOT_FOUND_IGNORE = /^\/\.well-known\/traffic-advice$/
const META =
  /^\/(robots\.txt|sitemap\.xml|catalog-sitemap\.xml|llms\.txt|health|poshuk\/index\.json|mapa\/studios)/i

// ───────────────────────────── Time (Europe/Kyiv, EET/EEST by rule) ─────────────────────────────

const dstCache = {}
function lastSundayUtc(year, month) {
  const d = new Date(Date.UTC(year, month + 1, 0, 1))
  d.setUTCDate(d.getUTCDate() - d.getUTCDay())
  return d.getTime() / 1000
}
function kyivOffset(ts) {
  const y = new Date(ts * 1000).getUTCFullYear()
  const [from, to] = (dstCache[y] ??= [lastSundayUtc(y, 2), lastSundayUtc(y, 9)])
  return ts >= from && ts < to ? 10800 : 7200
}
const kyivDate = (ts) => new Date((ts + kyivOffset(ts)) * 1000)
const dayOf = (ts) => kyivDate(ts).toISOString().slice(0, 10)
const hms = (ts) => kyivDate(ts).toISOString().slice(11, 19)
const hm = (ts) => kyivDate(ts).toISOString().slice(11, 16)
const WEEKDAYS = ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']

// ───────────────────────────── Helpers ─────────────────────────────

const inc = (o, k, n = 1) => {
  o[k] = (o[k] || 0) + n
}
const sortedEntries = (o) => Object.entries(o).sort((a, b) => b[1] - a[1])
const top = (o, n) => Object.fromEntries(sortedEntries(o).slice(0, n))
const startsWithAny = (s, list) => list.some((p) => s.startsWith(p))
const section = (p) => (p === '/' ? '/' : '/' + p.split('/')[1])
const maskSecrets = (s) => s.replace(/([?&](?:secret|token|key|password|code)=)[^&]*/gi, '$1***')
const normUa = (ua) => ua.replace(/\d+([._]\d+)+/g, 'N').slice(0, 140)

function safeDecode(s) {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

function parseLine(line) {
  let j
  try {
    j = JSON.parse(line)
  } catch {
    return null
  }
  if (j.msg !== 'handled request' || !j.request) return null
  const r = j.request
  const h = r.headers || {}
  const first = (name) => (h[name] || [''])[0]
  const uri = r.uri || ''
  const qi = uri.indexOf('?')
  const rawPath = qi < 0 ? uri : uri.slice(0, qi)
  const search = qi < 0 ? '' : uri.slice(qi + 1)
  const host = (r.host || '').toLowerCase().replace(/:\d+$/, '')
  return {
    ts: j.ts,
    ip: r.client_ip || r.remote_ip || '',
    port: r.remote_port || '',
    method: r.method || 'GET',
    host,
    path: safeDecode(rawPath),
    search,
    ua: first('User-Agent'),
    ref: first('Referer'),
    lang: first('Accept-Language'),
    sfu: first('Sec-Fetch-User'),
    sigAgent: first('Signature-Agent'),
    rsc: 'Rsc' in h,
    prefetch: 'Next-Router-Prefetch' in h || 'Next-Router-Segment-Prefetch' in h,
    proxyAuth: 'Proxy-Authorization' in h,
    status: j.status || 0,
    dur: j.duration || 0,
    uri,
    line,
    key: `${j.ts}|${r.remote_port}|${uri}|${r.client_ip}`,
  }
}

// Path plus query without Next's _rsc cache buster, secrets masked, decoded for reading.
function shownUri(r) {
  const q = r.search
    .split('&')
    .filter((p) => p && !p.startsWith('_rsc='))
    .join('&')
  return maskSecrets(r.path + (q ? '?' + safeDecode(q) : ''))
}

function parseUa(ua) {
  const os = /iPhone|iPad|iPod/.test(ua)
    ? 'iOS'
    : /Android/.test(ua)
      ? 'Android'
      : /Windows/.test(ua)
        ? 'Windows'
        : /Mac OS X/.test(ua)
          ? 'macOS'
          : /Linux|X11/.test(ua)
            ? 'Linux'
            : '?'
  const inApp = IN_APP_SOURCES.find(([re]) => re.test(ua))
  const browser = inApp
    ? 'in-app ' + inApp[1]
    : /GSA\//.test(ua)
      ? 'Google app'
      : /SamsungBrowser/.test(ua)
        ? 'Samsung'
        : /YaBrowser/.test(ua)
          ? 'Yandex'
          : /OPR\/|Opera/.test(ua)
            ? 'Opera'
            : /Edg(e|A|iOS)?\//.test(ua)
              ? 'Edge'
              : /FxiOS|Firefox/.test(ua)
                ? 'Firefox'
                : /CriOS|Chrome\//.test(ua)
                  ? 'Chrome'
                  : /Safari\//.test(ua)
                    ? 'Safari'
                    : '?'
  const device = /iPad|Tablet/.test(ua)
    ? 'tablet'
    : /iPhone|Android.*Mobile|Mobile/.test(ua)
      ? 'phone'
      : 'desktop'
  return { os, browser, device }
}

const isAsset = (r) => ASSET.test(r.path)
const isMeta = (r) => META.test(r.path)
const isPagey = (r) => !isAsset(r) && !isMeta(r)
const isProbe = (r) =>
  PROBE.test(r.path) ||
  PROBE.test(r.uri) ||
  (r.method !== 'GET' && r.method !== 'HEAD' && !KNOWN_WRITE_PATHS.test(r.path))
const isDc = (ip) => !ip.includes(':') && startsWithAny(ip, DC_PREFIXES)

// ───────────────────────────── Request classification ─────────────────────────────

function oursTool(r) {
  for (const [re, name] of OURS_TOOLS) if (re.test(r.ua)) return name
  if (r.ip.startsWith('172.18.') || r.ip.startsWith('127.')) return 'server (health, revalidate)'
  if (r.ip.startsWith('104.28.') || startsWithAny(r.ip, RELAY_EN_GB_PREFIXES))
    return 'phone via Private Relay'
  return 'owner browser'
}

function isOurs(r) {
  if (OWNER_UA.test(r.ua)) return true
  if (OWNER_IPS.has(r.ip) || startsWithAny(r.ip, OWNER_IP_PREFIXES)) return true
  return startsWithAny(r.ip, RELAY_EN_GB_PREFIXES) && r.lang.startsWith('en-GB')
}

// First stage: everything decidable per request. Returns null when the request still needs the IP- and person-level checks.
function classifyFixed(r) {
  if (r.host !== SITE_HOST) return { cls: 'other_hosts', who: r.host || '(no host)' }
  if (isOurs(r)) return { cls: 'ours', who: oursTool(r) }
  const named = FAMILIES.find(([re]) => re.test(r.ua))
  if (named) {
    const [, family, cls] = named
    if (
      cls === 'search_engines' &&
      /Google|AdsBot/.test(family) &&
      family !== 'Google prefetch proxy' &&
      !startsWithAny(r.ip, [...GOOGLE_IP_PREFIXES, ...GOOGLE_CLOUD_PREFIXES])
    ) {
      return { cls: 'scanners', who: `fake ${family}`, fake: true }
    }
    return { cls, who: family }
  }
  const sig = r.sigAgent && SIGNATURE_AGENTS.find(([re]) => re.test(r.sigAgent))
  if (sig) return { cls: sig[2], who: sig[1] }
  if (startsWithAny(r.ip, META_IP_PREFIXES)) return { cls: 'previews', who: 'Meta (IP 57.141.*)' }
  if (startsWithAny(r.ip, GOOGLE_IP_PREFIXES))
    return { cls: 'search_engines', who: 'Google (unnamed fetcher)' }
  if (startsWithAny(r.ip, GOOGLE_PROXY_IP_PREFIXES) && r.ref.includes('google.'))
    return { cls: 'search_engines', who: 'Google prefetch proxy' }
  return null
}

// ───────────────────────────── People ─────────────────────────────

function sourceOf(sessionReqs, landing, ua) {
  const params = new URLSearchParams(landing?.search || '')
  const utm = (params.get('utm_source') || '').toLowerCase()
  if (utm) return { source: UTM_SOURCES[utm] || utm, referrer: '' }
  const ext = sessionReqs.find((r) => {
    if (!r.ref) return false
    try {
      return new URL(r.ref).hostname !== SITE_HOST
    } catch {
      return !r.ref.includes(SITE_HOST)
    }
  })
  if (ext) {
    let host = ext.ref
    try {
      host = new URL(ext.ref).hostname
    } catch {
      /* android-app:// and the like are matched as a whole string */
    }
    const hit = REFERRER_SOURCES.find(([re]) => re.test(host) || re.test(ext.ref))
    return { source: hit ? hit[1] : host, referrer: ext.ref.slice(0, 200) }
  }
  const inApp = IN_APP_SOURCES.find(([re]) => re.test(ua))
  return inApp ? { source: inApp[1], referrer: '' } : { source: 'direct', referrer: '' }
}

function stepKind(r) {
  const p = r.path
  if (r.method !== 'GET' && r.method !== 'HEAD') {
    if (p === '/api/zapyt') return r.status === 201 ? 'zapyt_submit' : 'zapyt_submit_fail'
    if (p === '/kabinet/api/claim') return r.status < 300 ? 'claim_submit' : 'claim_submit_fail'
    if (p === '/kabinet/api/login' || p === '/api/auth/sign-in/email') return 'cabinet_login'
    if (p.startsWith('/kabinet/api/')) return 'cabinet_edit'
    if (p.startsWith('/api/panel')) return 'panel'
    return 'post'
  }
  if (r.status === 404) return '404'
  if (p === '/zapyt') return 'zapyt_open'
  if (p.startsWith('/kabinet/zayavka')) return 'claim_open'
  if (p === '/poshuk') return new URLSearchParams(r.search).get('q') ? 'search' : 'search_open'
  if (p.startsWith('/kabinet')) return 'cabinet'
  if (p.startsWith('/dlya-studiy')) return 'studio_info'
  return r.rsc ? 'nav' : 'page'
}

function buildSteps(reqs) {
  const steps = []
  const typed = new Set()
  let last = null
  for (const r of reqs) {
    const write = r.method !== 'GET' && r.method !== 'HEAD'
    if (r.method === 'OPTIONS') continue
    if (!write && (!isPagey(r) || r.path === '/poshuk/index.json')) continue
    if (r.prefetch) {
      // A prefetched /poshuk?q= link means that query was typed into the search box.
      const q = r.path === '/poshuk' && new URLSearchParams(r.search).get('q')
      if (q && !typed.has(q)) {
        typed.add(q)
        steps.push([hms(r.ts), 'search_typed', r.status, shownUri(r)])
      }
      continue
    }
    const kind = stepKind(r)
    const shown = shownUri(r)
    if (kind === 'search') typed.add(new URLSearchParams(r.search).get('q'))
    if (last && last.shown === shown && r.ts - last.ts < 10 && last.status === r.status && !write)
      continue
    last = { shown, ts: r.ts, status: r.status }
    steps.push([hms(r.ts), kind, r.status, shown])
  }
  return steps
}

function buildPerson(key, reqs, dayIndex, day) {
  reqs.sort((a, b) => a.ts - b.ts)
  const ua = reqs.find((r) => r.ua)?.ua || ''
  const lang = (reqs.find((r) => r.lang)?.lang || '').split(',')[0].split(';')[0].trim()
  const { os, browser, device } = parseUa(ua)
  const sessions = []
  let cur = []
  const flush = () => {
    if (!cur.length) return
    const steps = buildSteps(cur)
    if (steps.length) {
      const landingReq = cur.find((r) => isPagey(r) && !r.prefetch && r.method === 'GET')
      const src = sourceOf(cur, landingReq, ua)
      sessions.push({
        start: hms(cur[0].ts),
        end: hms(cur[cur.length - 1].ts),
        dur_s: Math.round(cur[cur.length - 1].ts - cur[0].ts),
        source: src.source,
        referrer: src.referrer,
        landing: steps[0][3],
        steps,
      })
    }
    cur = []
  }
  for (const r of reqs) {
    if (cur.length && r.ts - cur[cur.length - 1].ts > SESSION_GAP) flush()
    cur.push(r)
  }
  flush()
  if (!sessions.length) return null
  const ip = reqs[0].ip
  const prior = dayIndex[key]
  const person = {
    ip,
    device,
    os,
    browser,
    lang,
    first: sessions[0].start,
    last: sessions[sessions.length - 1].end,
    requests: reqs.length,
    returning: !!prior && prior.first < day,
    ...(prior && prior.first < day ? { first_seen: prior.first } : {}),
    sessions,
  }
  const tags = []
  if (MAYBE_OWNER_IPS.has(ip)) tags.push('maybe_owner')
  if (
    sessions.some((s) =>
      s.steps.some(
        (st) => st[1] === 'cabinet' || st[1] === 'cabinet_login' || st[1] === 'cabinet_edit',
      ),
    )
  )
    tags.push('studio_cabinet')
  if (!reqs.some((r) => r.path.startsWith('/_next/'))) tags.push('no_assets')
  if (tags.length) person.tags = tags
  return person
}

// ───────────────────────────── The day digest ─────────────────────────────

function digestDay(day, recs, dayIndex) {
  recs.sort((a, b) => a.ts - b.ts)
  const cls = {}
  const statuses = {}
  const classTotals = {}
  const fams = {} // family -> {cls, reqs[]}
  const ours = {}
  const otherHosts = {}
  const unknown = {}
  const fives = []
  const slow = []
  const events = []
  const fourOhFour = {}
  const rest = []

  const assign = (r, c) => {
    r.cls = c.cls
    r.who = c.who
    inc(classTotals, c.cls)
    if (r.status >= 500) fives.push(r)
    if (r.dur > SLOW_SECONDS) slow.push(r)
  }

  // Pass 1: per-request rules; remember which IPs probe.
  const probingIps = new Set()
  for (const r of recs) {
    inc(statuses, r.status)
    const c = classifyFixed(r)
    if (c) {
      assign(r, c)
      if (c.cls === 'ours') {
        const o = (ours[c.who] ??= {
          requests: 0,
          statuses: {},
          ips: new Set(),
          first: r.ts,
          last: r.ts,
          paths: {},
        })
        o.requests++
        inc(o.statuses, r.status)
        o.ips.add(r.ip)
        o.last = r.ts
        if (isPagey(r)) inc(o.paths, section(r.path))
      } else if (c.cls === 'other_hosts') {
        const o = (otherHosts[c.who] ??= {
          requests: 0,
          statuses: {},
          ips: new Set(),
          uris: {},
          uas: {},
        })
        o.requests++
        inc(o.statuses, r.status)
        o.ips.add(r.ip)
        inc(o.uris, maskSecrets(r.uri).slice(0, 80))
        inc(o.uas, normUa(r.ua).slice(0, 70))
      } else if (c.cls === 'scanners') {
        probingIps.add(r.ip)
      } else {
        const f = (fams[c.who] ??= { cls: c.cls, reqs: [] })
        f.reqs.push(r)
      }
      continue
    }
    if (isProbe(r)) probingIps.add(r.ip)
    rest.push(r)
  }

  // Pass 2: the rest = scanners, unnamed bots, other automatic traffic, people.
  const byKey = new Map()
  const scannerReqs = recs.filter((r) => r.cls === 'scanners')
  const toScanner = (r, who) => {
    assign(r, { cls: 'scanners', who })
    scannerReqs.push(r)
  }
  for (const r of rest) {
    if (probingIps.has(r.ip)) {
      toScanner(r, 'probing ip')
      continue
    }
    const { os, browser } = parseUa(r.ua)
    const key = `${r.ip}|${os}|${browser}`
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key).push(r)
  }
  const people = []
  const maybePeople = []
  const nonPeople = (reqs, reason) => {
    for (const r of reqs) {
      assign(r, { cls: 'other', who: reason })
      const u = (unknown[normUa(r.ua) || '(no user agent)'] ??= {
        requests: 0,
        ips: new Set(),
        example: shownUri(r),
        reason,
      })
      u.requests++
      u.ips.add(r.ip)
    }
  }
  for (const [key, reqs] of byKey) {
    const ip = reqs[0].ip
    const ua = reqs.find((r) => r.ua)?.ua || ''
    const hasLang = reqs.some((r) => r.lang)
    const hasStatic = reqs.some((r) => r.path.startsWith('/_next/'))
    const hasNav = reqs.some((r) => r.method === 'GET' && !r.prefetch && isPagey(r))
    const bot = !ua || GENERIC_BOT.test(ua) || reqs.some((r) => r.proxyAuth)
    const person = !bot && hasLang && hasNav && !isDc(ip) && hasStatic
    if (!person) {
      // A browser that runs our JavaScript (prefetches, client navigation) but never loaded a page or assets here:
      // probably a person served from cache; listed apart so it can be checked, not counted as a person.
      if (!bot && hasLang && !isDc(ip) && reqs.some((r) => r.prefetch || r.rsc)) {
        const { os, browser, device } = parseUa(ua)
        maybePeople.push({
          ip,
          device,
          os,
          browser,
          lang: reqs.find((r) => r.lang).lang.split(',')[0],
          first: hms(reqs[0].ts),
          last: hms(reqs[reqs.length - 1].ts),
          requests: reqs.length,
          pages: [...new Set(reqs.filter(isPagey).map((r) => r.path))].slice(0, 5),
          referrers: [...new Set(reqs.map((r) => r.ref.slice(0, 80)).filter(Boolean))].slice(0, 3),
        })
      }
      nonPeople(
        reqs,
        !ua
          ? 'no user agent'
          : bot
            ? 'bot-like agent'
            : isDc(ip)
              ? 'datacenter ip'
              : !hasLang
                ? 'no Accept-Language'
                : 'no assets loaded (/_next)',
      )
      continue
    }
    const p = buildPerson(key, reqs, dayIndex, day)
    if (!p) {
      nonPeople(reqs, 'no page views')
      continue
    }
    for (const r of reqs) assign(r, { cls: 'people', who: 'person' })
    people.push(p)
  }
  people.sort((a, b) => a.first.localeCompare(b.first))

  // Scanners collapsed per IP.
  const scanners = {}
  for (const r of scannerReqs) {
    const s = (scanners[r.ip] ??= {
      ip: r.ip,
      requests: 0,
      first: r.ts,
      last: r.ts,
      statuses: {},
      probes: {},
      uas: {},
      hosts: {},
    })
    s.requests++
    s.last = r.ts
    inc(s.statuses, r.status)
    inc(
      s.probes,
      maskSecrets(r.method + ' ' + (isPagey(r) ? r.path : section(r.path))).slice(0, 60),
    )
    inc(s.uas, normUa(r.ua).slice(0, 70) || '(none)')
    if (r.who !== 'probing ip') inc(s.hosts, r.who)
  }
  const scannerList = Object.values(scanners)
    .sort((a, b) => b.requests - a.requests)
    .map((s) => ({
      ip: s.ip,
      requests: s.requests,
      first: hm(s.first),
      last: hm(s.last),
      statuses: s.statuses,
      top_probes: top(s.probes, 6),
      uas: top(s.uas, 2),
      ...(Object.keys(s.hosts).length ? { flagged_as: s.hosts } : {}),
    }))

  // Bot families: passes.
  const bots = {}
  const aiAnswers = []
  for (const [family, f] of Object.entries(fams)) {
    f.reqs.sort((a, b) => a.ts - b.ts)
    const passes = []
    let cur = []
    const close = () => {
      if (!cur.length) return
      const pages = new Set()
      const allPaths = {}
      const sections = {}
      const sts = {}
      const ips = {}
      for (const r of cur) {
        inc(sts, r.status)
        inc(ips, r.ip)
        inc(sections, section(r.path))
        inc(allPaths, r.path)
        if (isPagey(r)) pages.add(r.path)
      }
      const pass = {
        start: hm(cur[0].ts),
        end: hm(cur[cur.length - 1].ts),
        requests: cur.length,
        pages: pages.size,
        ips: Object.keys(ips).length,
        ip_sample: Object.keys(ips).slice(0, 3),
        statuses: sts,
        sections: top(sections, 6),
      }
      if (Object.keys(allPaths).length <= SMALL_PASS_PATHS) pass.paths = allPaths
      passes.push(pass)
      cur = []
    }
    for (const r of f.reqs) {
      if (cur.length && r.ts - cur[cur.length - 1].ts >= SESSION_GAP) close()
      cur.push(r)
    }
    close()
    bots[family] = {
      class: f.cls,
      requests: f.reqs.length,
      ips: new Set(f.reqs.map((r) => r.ip)).size,
      pages: new Set(f.reqs.filter(isPagey).map((r) => r.path)).size,
      statuses: f.reqs.reduce((a, r) => (inc(a, r.status), a), {}),
      passes,
    }
    if (f.cls === 'ai_answer') {
      for (const r of f.reqs) {
        if (isPagey(r) && !r.prefetch)
          aiAnswers.push({ time: hms(r.ts), family, path: shownUri(r), status: r.status })
      }
    }
  }
  aiAnswers.sort((a, b) => a.time.localeCompare(b.time))

  // Events: form submissions and claims from anyone who is not us.
  for (const r of recs) {
    if (r.cls === 'ours' || (r.method !== 'POST' && r.method !== 'PUT')) continue
    if (r.path === '/api/zapyt' || r.path === '/kabinet/api/claim') {
      events.push({
        time: hms(r.ts),
        kind: r.path === '/api/zapyt' ? 'zapyt_submit' : 'claim_submit',
        status: r.status,
        ip: r.ip,
        class: r.cls,
        who: r.who,
        referrer: r.ref.slice(0, 120),
        ua: r.ua.slice(0, 100),
      })
    }
  }

  // Real-page 404s (not probes), with who hit them.
  for (const r of recs) {
    if (
      r.status !== 404 ||
      r.cls === 'ours' ||
      r.cls === 'scanners' ||
      r.cls === 'other_hosts' ||
      NOT_FOUND_IGNORE.test(r.path) ||
      isProbe(r)
    )
      continue
    const e = (fourOhFour[r.path] ??= {
      path: r.path,
      count: 0,
      who: {},
      referrers: {},
      first: r.ts,
    })
    e.count++
    inc(e.who, r.cls === 'people' ? 'person' : r.who)
    if (r.ref) inc(e.referrers, r.ref.slice(0, 100))
  }
  const notFound = Object.values(fourOhFour)
    .sort((a, b) => b.count - a.count)
    .slice(0, 100)
    .map((e) => ({
      path: e.path,
      count: e.count,
      first: hm(e.first),
      who: top(e.who, 4),
      referrers: top(e.referrers, 2),
    }))

  // Counts for the summary.
  const real = people.filter((p) => !p.tags?.includes('maybe_owner'))
  const bucket = (s) => (SUMMARY_SOURCES.includes(s) ? s : 'other')
  const sourceCount = Object.fromEntries([...SUMMARY_SOURCES, 'other'].map((k) => [k, 0]))
  for (const p of real) inc(sourceCount, bucket(p.sessions[0].source))
  const searches = new Set()
  for (const p of real)
    for (const s of p.sessions)
      for (const st of s.steps)
        if (st[1] === 'search' || st[1] === 'search_typed')
          searches.add(p.ip + '|' + (new URLSearchParams(st[3].split('?')[1] || '').get('q') || ''))
  const kindPeople = (kind) =>
    real.filter((p) => p.sessions.some((s) => s.steps.some((st) => st[1] === kind))).length
  const fam = (name) => bots[name]?.requests || 0
  const summary = {
    day,
    people: real.length,
    sessions: real.reduce((n, p) => n + p.sessions.length, 0),
    returning: real.filter((p) => p.returning).length,
    ...Object.fromEntries(Object.entries(sourceCount).map(([k, v]) => [`src_${k}`, v])),
    zapyt_open: kindPeople('zapyt_open'),
    zapyt_submit: events.filter((e) => e.kind === 'zapyt_submit' && e.status === 201).length,
    claim_open: kindPeople('claim_open'),
    claims: events.filter((e) => e.kind === 'claim_submit' && e.status < 300).length,
    searches: searches.size,
    ai_answer_fetches: aiAnswers.length,
    oai_searchbot_req: fam('OAI-SearchBot'),
    googlebot_req: fam('Googlebot'),
    bingbot_req: fam('Bingbot'),
    scanners_req: classTotals.scanners || 0,
    err_5xx: fives.length,
    slow: slow.length,
  }

  const mainReqs = recs.filter((r) => r.host === SITE_HOST).length
  for (const c of [
    'people',
    'ours',
    'ai_answer',
    'ai_search',
    'ai_training',
    'search_engines',
    'seo_tools',
    'previews',
    'scanners',
    'other',
    'other_hosts',
  ])
    cls[c] = classTotals[c] || 0
  const now = Date.now() / 1000
  const dayStart = Math.min(...recs.map((r) => r.ts))
  const dayEnd = Math.max(...recs.map((r) => r.ts))
  const startOfDay = Date.parse(day + 'T00:00:00Z') / 1000 - kyivOffset(dayStart)
  const isPartial =
    dayOf(now) === day || dayStart > startOfDay + 3600 || dayEnd < startOfDay + 86400 - 3600

  const digest = {
    day,
    generated: new Date().toISOString(),
    partial: isPartial,
    covers: { first: hms(dayStart), last: hms(dayEnd) },
    requests: recs.length,
    main_host_requests: mainReqs,
    by_class: cls,
    statuses: Object.fromEntries(sortedEntries(statuses)),
    summary,
    errors_5xx: fives.slice(0, 15).map((r) => ({
      time: hms(r.ts),
      status: r.status,
      method: r.method,
      path: shownUri(r),
      who: r.who,
    })),
    slow: slow
      .sort((a, b) => b.dur - a.dur)
      .slice(0, 30)
      .map((r) => ({
        time: hms(r.ts),
        seconds: Math.round(r.dur * 10) / 10,
        status: r.status,
        path: shownUri(r),
        who: r.who,
      })),
    events,
    ai_answers: aiAnswers,
    bots: Object.fromEntries(Object.entries(bots).sort((a, b) => b[1].requests - a[1].requests)),
    scanners: scannerList,
    ours: Object.fromEntries(
      Object.entries(ours)
        .sort((a, b) => b[1].requests - a[1].requests)
        .map(([k, o]) => [
          k,
          {
            requests: o.requests,
            first: hm(o.first),
            last: hm(o.last),
            ips: [...o.ips].slice(0, 3),
            statuses: o.statuses,
            sections: top(o.paths, 5),
          },
        ]),
    ),
    other_hosts: Object.fromEntries(
      Object.entries(otherHosts).map(([k, o]) => [
        k,
        {
          requests: o.requests,
          ips: o.ips.size,
          statuses: o.statuses,
          uris: top(o.uris, 5),
          uas: top(o.uas, 3),
        },
      ]),
    ),
    people,
    maybe_people: maybePeople,
    not_found: notFound,
    unknown_agents: Object.entries(unknown)
      .sort((a, b) => b[1].requests - a[1].requests)
      .slice(0, 60)
      .map(([ua, u]) => ({
        ua,
        requests: u.requests,
        ips: u.ips.size,
        reason: u.reason,
        example: u.example,
      })),
  }
  return digest
}

// ───────────────────────────── Output ─────────────────────────────

// JSON where anything that fits on one short line stays on one line, the rest is indented.
function fmt(v, ind = '') {
  const flat = JSON.stringify(v)
  if (flat === undefined) return 'null'
  if (v === null || typeof v !== 'object' || flat.length <= 110) return flat
  const next = ind + '  '
  if (Array.isArray(v))
    return '[\n' + v.map((x) => next + fmt(x, next)).join(',\n') + '\n' + ind + ']'
  return (
    '{\n' +
    Object.entries(v)
      .map(([k, x]) => next + JSON.stringify(k) + ': ' + fmt(x, next))
      .join(',\n') +
    '\n' +
    ind +
    '}'
  )
}

const SUMMARY_COLUMNS = [
  'day',
  'people',
  'sessions',
  'returning',
  'src_google',
  'src_chatgpt',
  'src_perplexity',
  'src_gemini',
  'src_instagram',
  'src_direct',
  'src_other',
  'zapyt_open',
  'zapyt_submit',
  'claim_open',
  'claims',
  'searches',
  'ai_answer_fetches',
  'oai_searchbot_req',
  'googlebot_req',
  'bingbot_req',
  'scanners_req',
  'err_5xx',
  'slow',
]

function writeSummaryCsv() {
  const dir = path.join(OUT_DIR, 'days')
  const rows = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).summary)
  const csv =
    [
      SUMMARY_COLUMNS.join(','),
      ...rows.map((s) => SUMMARY_COLUMNS.map((c) => s[c] ?? 0).join(',')),
    ].join('\n') + '\n'
  fs.writeFileSync(path.join(OUT_DIR, 'summary.csv'), csv)
  return rows.length
}

function stepLine(p) {
  const kinds = {}
  for (const s of p.sessions) for (const st of s.steps) inc(kinds, st[1])
  const flags = [
    'zapyt_open',
    'zapyt_submit',
    'claim_open',
    'claim_submit',
    'search',
    'search_typed',
    '404',
    'cabinet',
  ]
    .filter((k) => kinds[k])
    .map((k) => (kinds[k] > 1 ? `${k}×${kinds[k]}` : k))
  const first = p.sessions[0]
  const steps = p.sessions.reduce((n, s) => n + s.steps.length, 0)
  return `- ${p.first}–${p.last} · ${p.device} ${p.os}/${p.browser} · ${p.lang || '?'} · ${first.source} → ${first.landing.slice(0, 70)} · ${steps} кр.${p.sessions.length > 1 ? ` · ${p.sessions.length} сесії` : ''}${p.returning ? ' · повернувся' : ''}${flags.length ? ' · ' + flags.join(' ') : ''}${p.tags ? ' · [' + p.tags.join(',') + ']' : ''} · ${p.ip}`
}

function writeMarkdown(d, file) {
  const s = d.summary
  const wd = WEEKDAYS[new Date(d.day + 'T12:00:00Z').getUTCDay()]
  const L = []
  L.push(`# ${d.day} (${wd})${d.partial ? ' — неповний день' : ''}`)
  L.push('')
  L.push(
    `Логи ${d.covers.first}–${d.covers.last} за Києвом, запитів ${d.requests} (hlyna.com.ua ${d.main_host_requests}). За класами: ${Object.entries(
      d.by_class,
    )
      .filter(([, n]) => n)
      .map(([k, n]) => `${k} ${n}`)
      .join(', ')}.`,
  )
  L.push(
    `Люди: ${s.people} (сесій ${s.sessions}, повернулись ${s.returning}); джерела: google ${s.src_google}, chatgpt ${s.src_chatgpt}, perplexity ${s.src_perplexity}, gemini ${s.src_gemini}, instagram ${s.src_instagram}, напряму ${s.src_direct}, інше ${s.src_other}.`,
  )
  L.push(
    `Форма: відкрили ${s.zapyt_open}, надіслали ${s.zapyt_submit}; заявки студій: відкрили ${s.claim_open}, надіслали ${s.claims}; пошук ${s.searches}; ШІ-відповіді (fetch) ${s.ai_answer_fetches}; 5xx ${s.err_5xx}; повільних (>${SLOW_SECONDS} с) ${s.slow}.`,
  )
  for (const e of d.events)
    L.push(`- ПОДІЯ ${e.time} ${e.kind} ${e.status} · ${e.ip} · ${e.class}/${e.who}`)
  L.push('')
  L.push('## Люди')
  L.push(...(d.people.length ? d.people.map(stepLine) : ['- немає']))
  if (d.maybe_people.length)
    L.push(
      `- (ще ${d.maybe_people.length} можливих людей без завантаження сторінок, лише prefetch: див. maybe_people у json)`,
    )
  L.push('')
  if (d.ai_answers.length) {
    L.push('## ШІ дістає сторінку для відповіді')
    for (const a of d.ai_answers) L.push(`- ${a.time} ${a.family} ${a.status} ${a.path}`)
    L.push('')
  }
  L.push('## Боти (проходи)')
  for (const [family, b] of Object.entries(d.bots)) {
    for (const p of b.passes) {
      L.push(
        `- ${family} [${b.class}] ${p.start}–${p.end} · ${p.requests} зап. · ${p.pages} стор. · ${p.ips} IP · ${Object.entries(
          p.sections,
        )
          .slice(0, 4)
          .map(([k, n]) => `${k} ${n}`)
          .join(', ')}`,
      )
    }
  }
  L.push('')
  const sc = d.scanners
  L.push(`## Сканери: ${sc.length} IP, ${d.by_class.scanners} запитів`)
  for (const x of sc.slice(0, 8))
    L.push(
      `- ${x.ip} ${x.first}–${x.last} · ${x.requests} · ${Object.keys(x.top_probes).slice(0, 3).join(', ')}`,
    )
  if (Object.keys(d.ours).length) {
    L.push('')
    L.push('## Наші')
    for (const [k, o] of Object.entries(d.ours))
      L.push(`- ${k}: ${o.requests} (${o.first}–${o.last})`)
  }
  if (d.not_found.length) {
    L.push('')
    L.push('## 404 на справжніх сторінках')
    for (const n of d.not_found.slice(0, 15))
      L.push(`- ${n.count}× ${n.path} · ${Object.keys(n.who).join(', ')}`)
  }
  const unk = d.unknown_agents.slice(0, 8)
  if (unk.length) {
    L.push('')
    L.push('## Невідомі агенти (топ)')
    for (const u of unk) L.push(`- ${u.requests} · ${u.reason} · ${u.ua.slice(0, 90)}`)
  }
  fs.writeFileSync(file, L.join('\n') + '\n')
}

// ───────────────────────────── Input and raw storage ─────────────────────────────

function parseArgs(argv) {
  const out = { files: [], days: null, full: false }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--file') out.files.push(argv[++i])
    else if (argv[i] === '--days') (out.days ??= []).push(...argv[++i].split(','))
    else if (argv[i] === '--full') out.full = true
    else throw new Error(`Unknown argument ${argv[i]}`)
  }
  return out
}

async function eachLine(stream, fn) {
  for await (const line of readline.createInterface({ input: stream, crlfDelay: Infinity }))
    if (line) fn(line)
}

function ssh(cmd) {
  const child = spawn('ssh', [...SSH_OPTS, SSH_HOST, cmd], { stdio: ['ignore', 'pipe', 'inherit'] })
  const done = new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ssh exited with ${code}: ${cmd}`))))
  })
  return { stdout: child.stdout, done }
}

// Rotated files already merged into raw/ (names only): they never change, so they are fetched once. --full fetches them again.
const pulledFile = () => path.join(OUT_DIR, 'pulled-files.json')

async function pull(args, onLine) {
  if (args.files.length) {
    for (const f of args.files) {
      const raw = fs.createReadStream(f)
      await eachLine(f.endsWith('.gz') ? raw.pipe(zlib.createGunzip()) : raw, onLine)
    }
    return []
  }
  const list = ssh(`docker exec edge-caddy-1 ls ${REMOTE_DIR}`)
  let names = ''
  for await (const chunk of list.stdout) names += chunk
  await list.done
  const seen = new Set(args.full || !fs.existsSync(pulledFile()) ? [] : JSON.parse(fs.readFileSync(pulledFile(), 'utf8')))
  const rotated = names.split('\n').filter((n) => /^hlyna-.*\.log\.gz$/.test(n) && !seen.has(n))
  const jobs = [
    ...rotated.map((n) => `docker exec edge-caddy-1 cat ${REMOTE_DIR}/${n}`),
    `docker exec edge-caddy-1 gzip -c ${REMOTE_DIR}/hlyna.log`,
  ]
  for (const cmd of jobs) {
    const { stdout, done } = ssh(cmd)
    await Promise.all([eachLine(stdout.pipe(zlib.createGunzip()), onLine), done])
    console.log(`pulled ${cmd.split('/').pop()}`)
  }
  return [...seen, ...rotated]
}

const rawFile = (day) => path.join(OUT_DIR, 'raw', `${day}.jsonl.gz`)

function readRaw(day) {
  const f = rawFile(day)
  if (!fs.existsSync(f)) return new Map()
  const m = new Map()
  for (const line of zlib.gunzipSync(fs.readFileSync(f)).toString('utf8').split('\n')) {
    const r = line ? parseLine(line) : null
    if (r) m.set(r.key, r)
  }
  return m
}

function writeRaw(day, map) {
  const lines = [...map.values()].sort((a, b) => a.ts - b.ts).map((r) => r.line)
  const tmp = rawFile(day) + '.tmp'
  fs.writeFileSync(tmp, zlib.gzipSync(lines.join('\n') + '\n', { level: 9 }))
  fs.renameSync(tmp, rawFile(day))
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  for (const d of ['raw', 'days']) fs.mkdirSync(path.join(OUT_DIR, d), { recursive: true })

  const pulled = new Map() // day -> Map(key -> rec)
  let total = 0
  const pulledNames = await pull(args, (line) => {
    const r = parseLine(line)
    if (!r) return
    total++
    const day = dayOf(r.ts)
    if (!pulled.has(day)) pulled.set(day, new Map())
    pulled.get(day).set(r.key, r)
  })
  if (!total) throw new Error('No «handled request» lines read: not touching raw/ or days/')

  const merged = new Map()
  for (const [day, fresh] of pulled) {
    const all = readRaw(day)
    const before = all.size
    for (const [k, r] of fresh) all.set(k, r)
    if (all.size !== before || !fs.existsSync(rawFile(day))) writeRaw(day, all)
    merged.set(day, all)
    console.log(`raw ${day}: ${all.size} lines (+${all.size - before})`)
  }
  // Only now are the rotated files safely in raw/; a failed run above fetches them again next time.
  if (pulledNames.length) fs.writeFileSync(pulledFile(), JSON.stringify(pulledNames.sort(), null, 1) + '\n')

  const allDays = [
    ...new Set([
      ...fs
        .readdirSync(path.join(OUT_DIR, 'raw'))
        .filter((f) => f.endsWith('.jsonl.gz'))
        .map((f) => f.slice(0, 10)),
      ...pulled.keys(),
    ]),
  ].sort()
  const indexFile = path.join(OUT_DIR, 'people-index.json')
  const dayIndex = fs.existsSync(indexFile) ? JSON.parse(fs.readFileSync(indexFile, 'utf8')) : {}
  for (const day of args.days ?? allDays) {
    if (!allDays.includes(day)) {
      console.warn(`no raw data for ${day}`)
      continue
    }
    const recs = [...(merged.get(day) ?? readRaw(day)).values()]
    // Returning is judged against the index as it was BEFORE this day: first_seen < day, so reruns are stable.
    const d = digestDay(day, recs, dayIndex)
    for (const p of d.people) {
      const key = `${p.ip}|${p.os}|${p.browser}`
      if (!dayIndex[key] || dayIndex[key].first > day) dayIndex[key] = { first: day }
    }
    fs.writeFileSync(path.join(OUT_DIR, 'days', `${day}.json`), fmt(d) + '\n')
    writeMarkdown(d, path.join(OUT_DIR, 'days', `${day}.md`))
    const s = d.summary
    console.log(
      `digest ${day}: ${d.requests} req, people ${s.people}, ai_answer ${s.ai_answer_fetches}, OAI-SearchBot ${s.oai_searchbot_req}, scanners ${s.scanners_req}${d.partial ? ' (partial day)' : ''}`,
    )
  }
  fs.writeFileSync(indexFile, JSON.stringify(dayIndex))
  console.log(`summary.csv: ${writeSummaryCsv()} days → ${OUT_DIR}`)
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
