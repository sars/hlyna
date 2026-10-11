const SITE_URL =
  process.env.NEXT_PUBLIC_SERVER_URL ||
  process.env.VERCEL_PROJECT_PRODUCTION_URL ||
  'https://hlyna.com.ua'

/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: SITE_URL,
  generateRobotsTxt: true,
  exclude: ['/catalog-sitemap.xml', '/posts-sitemap.xml', '/pages-sitemap.xml', '/*', '/posts/*'],
  robotsTxtOptions: {
    // Search engines and AI assistants are welcome everywhere except the admin and the API.
    policies: [
      { userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/next', '/kabinet'] },
      ...['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Bingbot', 'Applebot-Extended', 'CCBot'].map((ua) => ({ userAgent: ua, allow: '/', disallow: ['/admin', '/api', '/kabinet'] })),
    ],
    additionalSitemaps: [`${SITE_URL}/catalog-sitemap.xml`, `${SITE_URL}/pages-sitemap.xml`, `${SITE_URL}/posts-sitemap.xml`],
  },
}
