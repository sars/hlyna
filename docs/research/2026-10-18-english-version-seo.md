# English version (/en): search and AI-answer research

Date: 18.10.2026. Scope: how to launch an English version of hlyna.com.ua so that it ranks and gets cited, mainly by Google (including AI Overviews and AI Mode), Bing/Copilot, ChatGPT search, Perplexity and Claude, without scaled-content risk. Every claim has a source and the date that source gives. "n.d." means the page shows no date. Third-party claims are marked as such.

Our own data point (owner's access logs, October 2026): ChatGPT already sends English-speaking users from the US and UK to Ukrainian pages (`/dlya-biznesu/posud-dlya-restoraniv`, `/dobirky/rizdvianyi-posud`, `/vyrobnyky/vyrib/prykrasy`) with `utm_source=chatgpt.com`, and OAI-SearchBot makes about 5k requests a day. **The demand already reaches us. The English version should give it pages in the reader's language and a request form they can use.**

---

## 1. Google: multilingual sites (primary sources)

**URLs and structure**
- Google recommends a separate URL for each language version. A subdirectory such as `example.com/en/` is listed as easy to set up and low-maintenance. URL parameters (`?lang=en`) are not recommended. Localised words in URLs are fine. Source: [Managing multi-regional and multilingual sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites), updated 2025-12-10.
- Google works out a page's language from its **visible content**. It does not use the `lang` attribute or the URL for this. Use one language for content and navigation on a page, and don't put translations side by side. Source: the same page, 2025-12-10.

**What not to do**
- Don't redirect automatically by assumed language (IP or Accept-Language). Googlebot crawls mostly from the US and **doesn't send Accept-Language**, so it may never see the variants. Show visible links to the other language instead. Sources: [Managing multi-regional sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites) (2025-12-10) and [Locale-adaptive pages](https://developers.google.com/search/docs/specialty/international/locale-adaptive-pages) (2025-12-10).
- Don't use cookies or browser settings to switch the content language. Every language needs its own URL. Source: the same page.
- **Don't translate only the boilerplate.** Translating the navigation while the main content stays Ukrainian "can create a poor experience". Source: the same page. Localised versions count as duplicates only when the main content stays untranslated. Source: [Localized versions (hreflang)](https://developers.google.com/search/docs/specialty/international/localized-versions), updated 2026-09-21.
  For us this means: no `/en/` studio profile whose description is still in Ukrainian.

**hreflang** (source: [Localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions), 2026-09-21)
- There are three equivalent methods: HTML `<link rel="alternate" hreflang>`, the HTTP `Link` header, or the XML sitemap (`xhtml:link`). Using more than one gives no extra benefit. **Pick one.** For us that is the HTML link via Next.js `metadata.alternates.languages`, or the sitemap via `alternates.languages` in `sitemap.ts`. Both are documented in `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md` and `.../01-metadata/sitemap.md`.
- Each version lists **itself and every other version**, and the links must be **reciprocal**. If X points to Y and Y doesn't point back, both annotations are ignored.
- You may leave some languages out. Google says to link newer variants bidirectionally to the original first. **A partial English set is explicitly fine.**
- URLs must be fully qualified (`https://hlyna.com.ua/en/...`).
- Codes are ISO 639-1 plus an optional region. Use `uk` and `en`. `UK` is a reserved region code and has no effect, so never write `en-UK`. We have one English version for all countries, so plain `en` is right.
- `x-default` is the fallback for users whose language doesn't match.
- Google does not use hreflang or `lang` to *detect* language. hreflang only links the variants.

**Canonical**
- Each language version canonicalises **to itself**. When you specify a canonical for localised content, Google says to "specify a canonical page in the same language" (or the best substitute only if none exists). Google prefers URLs that belong to hreflang clusters. Source: [Consolidate duplicate URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), updated 2026-07-10.
- Never canonicalise `/en/x` to the Ukrainian `/x`. That tells Google to drop the English page.

**Machine or AI translation**
- The spam policy on **scaled content abuse** lists "automated transformations like synonymizing, translating" among its examples. It applies to *many pages generated to manipulate rankings that give little value*. Source: [Spam policies](https://developers.google.com/search/docs/essentials/spam-policies), updated 2026-08-28.
- In June 2025 Google removed its old advice to block auto-translated pages with robots.txt. The changelog says "docs-only change, no change in behavior". Google told press its policies "do not strictly define content that has been translated by AI as spam". The deciding test is value, not method. Sources: [Search Engine Journal, 2025-06-11](https://www.searchenginejournal.com/google-removes-robots-txt-guidance-for-blocking-auto-translated-pages/548870/) and [G-Squared Interactive (Glenn Gabe), 2025-05-05, updated 2025-06-11](https://www.gsqi.com/marketing-blog/auto-translating-content-google-scaled-content-abuse/).
- For AI-assisted content in general, Google says to fact-check, to review titles, meta descriptions, structured data and alt text too, and that mass pages "without adding value" may violate scaled content abuse. Source: [Guidance on using generative AI content](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content), updated 2026-10-01.
- **Practical reading:** LLM-drafted English that a person reviews, carries our real data (counts, prices, dates, named makers) and is written for a foreign reader is fine. Bulk-translating ~350 thin profiles and every city × format page is the risky pattern. If a translated page isn't good enough, **don't publish it**. `noindex` is the fallback (an SEJ interpretation, not a Google statement). Never block it in robots.txt, because then Google can't see a noindex.

**Google already shows our Ukrainian pages to English searchers in translation.** "Translated results" machine-translates the title and snippet of a foreign-language result and opens a machine-translated page. It works for about 21 languages including English, can be filtered in Search Console under Search Appearance, and can be opted out of with `notranslate`. Source: [Translated results](https://developers.google.com/search/docs/appearance/translated-results), updated 2025-12-10.
**An English page has to beat Google's own auto-translation:** foreign-buyer framing, shipping facts, EUR/USD hints and an English request form.

**AI Overviews and AI Mode**
- There are no extra requirements. A page must be indexed and eligible for a snippet. No special markup, AI files or schema is needed. Keep structured data consistent with the visible text. Source: [AI features and your website](https://developers.google.com/search/docs/appearance/ai-features), updated 2025-12-10.
- The new [AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) (updated 2026-07-10) says AI features use core ranking plus **query fan-out**. It recommends unique first-hand information, "non-commodity" content, clear headings, and images.
  - It explicitly says these are **not needed**: llms.txt, Markdown copies, chunking, rewriting content for AI, and "overfocusing on structured data".
  - It warns that making a page per fan-out query variation violates scaled content abuse.
  - It points to the **Generative AI performance report** in Search Console for measurement. The guide says nothing language-specific.

---

## 2. Bing/Copilot and AI answer engines

**Bing / Copilot**
- Bing's language handling is poorly documented in primary sources. Bing's guidelines page renders client-side and couldn't be read. Ahrefs (updated 2025-03-08) reports that Bing calls hreflang "a weak signal" but still recommends it in its guidelines ([Ahrefs](https://ahrefs.com/blog/hreflang-tags/)). Other SEO sources say Bing leans on `content-language` and `<html lang>` ([technicalseo.com](https://technicalseo.com/tools/pages/docs/hreflang.html), n.d.; [Sitebulb](https://sitebulb.com/hints/international/has-hreflang-annotations-without-html-lang/), n.d.). A Microsoft support answer (2025-03-10) tells a site to use reciprocal hreflang plus `lang` and distinct per-market titles ([Microsoft Q&A](https://learn.microsoft.com/en-us/answers/a/2322609)).
  **To cover all of these:** correct `<html lang="en">` on `/en/` (our root layout must vary `lang` by route), reciprocal hreflang, and different titles and descriptions per language.
- Bing launched the **AI Performance** report in Bing Webmaster Tools on 2026-02-10. It shows citations in Copilot and Bing AI summaries per URL, with "grounding queries". Bing's advice for getting cited:
  - keep content fresh and accurate
  - use IndexNow
  - use clear headings, tables and FAQ sections
  - support claims with evidence

  Source: [Bing Webmaster Blog, 2026-02-10](https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview).
- IndexNow is used by Bing, Naver, Seznam, Yandex and Yep. Google doesn't use it. Source: [indexnow.org](https://www.indexnow.org/), n.d.

**ChatGPT search (OpenAI)**
- **OAI-SearchBot** decides whether a site appears in ChatGPT search answers. GPTBot is for training and is a separate setting. ChatGPT-User makes user-initiated fetches and may ignore robots.txt. Source: [OpenAI crawlers](https://developers.openai.com/api/docs/bots), n.d.
- Per OpenAI's FAQ, ChatGPT adds `utm_source=chatgpt.com` to referral URLs, and `noindex` works only if the crawler can read the page. The FAQ returned 403 to our fetch, so this comes from search snippets of [help.openai.com/en/articles/12627856](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq), n.d. OpenAI documents nothing about hreflang or language variants.
- **ChatGPT often searches in English even for non-English prompts.** Peec AI studied 10M prompts and 20M fan-outs from February 2026:
  - 78% of non-English prompt runs added English fan-out queries
  - 43% of all fan-out steps for non-English prompts were in English
  - no language fell below 60%

  Peec's advice is "strategic English content beats blind translation". This is vendor data; OpenAI hasn't commented. Sources: [Peec AI, Feb 2026](https://docs.peec.ai/research/chatgpt-searches-in-english) and [Search Engine Journal, 2026-02-18](https://searchenginejournal.com/chatgpt-search-often-switches-to-english-in-fan-out-queries-report/567811/).
  **Implication:** English pages can be retrieved even for *Ukrainian-language* ChatGPT questions. A Peec study from April 2026 also found that ChatGPT adds "best", "top" and "reviews" to fan-outs ([ppc.land](https://ppc.land/what-chatgpt-actually-searches-for-5-million-fanout-queries-analyzed/)). So pages that honestly answer "best Ukrainian ceramic studios for X" in a table are well placed.

**Perplexity**
- PerplexityBot indexes pages for Perplexity results and is not used for training. Perplexity-User makes user-initiated fetches and generally ignores robots.txt. IP lists are published. Source: [Perplexity crawlers](https://docs.perplexity.ai/guides/bots), n.d. Nothing is documented about language.

**Claude (Anthropic)**
- Anthropic runs three bots: ClaudeBot (training), Claude-SearchBot (search indexing) and Claude-User (user-initiated fetches). Blocking either of the last two reduces visibility. Source: [Anthropic Help Center](https://support.claude.com/en/articles/8896518-what-is-claude-bot), updated 2026-04-07.
- Claude's web search reportedly uses Brave Search: Brave appears on Anthropic's subprocessor list, according to a third party ([Xponent21](https://xponent21.com/insights/claude-web-search-brave-turbopuffer/), checked 2026-07-02). This is a secondary source. Being indexed by Brave helps.

**llms.txt**
- The proposal allows an `llms.txt` at the root **or at a subpath**, where it covers the pages under that path. The most specific file applies. Source: [llmstxt.org](https://llmstxt.org/), last modified 2026-08-10. So `/en/llms.txt` is valid under the spec.
- Google Search doesn't use it ([AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide), 2026-07-10). Mueller said "no AI system currently uses llms.txt" ([SERoundtable, 2025-06-18](https://seroundtable.com/google-ai-llms-txt-39607.html)). Lighthouse 13.3 added an optional llms.txt audit for agentic browsing ([SEJ, 2026-05-20](https://www.searchenginejournal.com/googles-llms-txt-guidance-depends-on-which-product-you-ask/575431/)).
  **Verdict:** it's cheap, so add `/en/llms.txt` mirroring our existing route with English leads, and link it from the root file. Don't expect ranking from it. Check our own access logs for which bots actually fetch `/llms.txt`.

**What makes English pages likely to be cited** (combining the sources above)
- The answer comes first, in plain facts with numbers and a date. Then a table, then FAQ. We already do this.
- Unique data nobody else has, such as counts of makers, 2026 price ranges, minimum batches, lead times and who ships abroad. That's the "non-commodity" content Google asks for.
- Fresh "Updated" dates, IndexNow pings to Bing, and the sitemap `lastmod`.
- Structured data that matches the visible text (see section 4).
- No crawler blocks for OAI-SearchBot, PerplexityBot, Claude-SearchBot, Claude-User or Bingbot.

---

## 3. English-language demand

**Volume is small for head terms; the value is in the long tail, in B2B and in AI answers.** Google Trends pull from 2026-10-18, worldwide, last 5 years, relative scale ([trends.google.com](https://trends.google.com/trends/explore?date=today%205-y&q=ukrainian%20pottery,ukrainian%20ceramics,polish%20pottery)):
- "polish pottery" averages 29. "ukrainian pottery" and "ukrainian ceramics" average **0**, meaning below 1% of the peak.
- Against "pysanka" (4) and "vyshyvanka" (7), the ceramics terms are still 0.
- Against "made in ukraine" (17), they are 0, and "ukrainian gifts" is 1.
- In a smaller comparison, "ukrainian pottery" scores 4 against "ukrainian ceramics" 1, "pottery kyiv" 1, and 0 for "pottery class kyiv", "pottery lviv", "opishnya" and "kosiv ceramics".
- In Canada and the UK, "pysanka" dwarfs both ceramics terms.

**Conclusion:** don't build English pages for keyword volume. Build them for (a) the ChatGPT and AI-answer traffic we already get, (b) business buyers abroad, and (c) heritage queries where we can be the only page linking a tradition to living makers.

**Who searches in English**
- Diaspora in the US, Canada, the UK, Germany and Poland: gifts, Christmas tableware, heritage pieces. The Ukrainian Museum in New York sells Havarechchyna black-smoked ceramics in its shop ([shop.theukrainianmuseum.org](https://shop.theukrainianmuseum.org/products/umshop298), n.d.).
- International buyers on Etsy: in 2023, Ukraine ranked 8th worldwide in Etsy sales, with 19,110 sellers ([Mind.ua, 2023-01-13](https://mind.ua/en/publications/amp/20252005-war-did-not-thwart-ukrainian-craftsmen-rank-eighth-in-the-world-in-terms-of-sales-on-etsy), Koalanda data). Etsy blocks automated search, so we got no current listing count for "Ukrainian pottery".
- Designers, galleries and restaurants abroad: Ukrainian ceramics appear at Maison&Objet ([Guculia Tini](https://mom.maison-objet.com/en/product/1678054/small-bowl-guculia-tini), n.d.), in Disegno ([disegnojournal.com](https://disegnojournal.com/newsfeed/myska-2-guculia-tini-danuta-kril), n.d.), on 1stdibs ([1stdibs](https://www.1stdibs.com/furniture/dining-entertaining/ceramics/origin/ukrainian), n.d.) and at Ambiente. The Ukrainian HORECA Cluster exhibits at Gulfood ([gulfood.com](https://www.gulfood.com/exhibitors/ukrainian-horeca-cluster), n.d.).
- Journalists and curators: our ChatGPT referrals to `/dlya-biznesu/posud-dlya-restoraniv` fit this group and the business buyers.
- Visitors in Kyiv and Lviv looking for a class or a souvenir.

**Who ranks now (WebSearch, 2026-10-18)**
- **"Ukrainian ceramics":** Wikipedia ([Opishnia](https://en.wikipedia.org/wiki/Opishnia_decorative_ceramics), [Kosiv](https://en.wikipedia.org/wiki/Kosiv_painted_ceramics)), the University of Kansas CREES ([crees.ku.edu](https://crees.ku.edu/ukrainian-ceramics)), the Encyclopedia of Ukraine and 1stdibs. These are all informational. **None links the tradition to living makers you can buy from or visit.**
- **"buy Ukrainian ceramics / handmade tableware":** single-brand shops and resellers. These include [Gunia Project](https://guniaproject.com/collections/keramika), [clayproductsshop.com](https://clayproductsshop.com/collections/handmade-ceramics-collection) (free worldwide shipping claimed), [Ukraine Strong](https://ukraine-strong.com/collections/ukrainian-ceramics) (Kosiv, Vasylkiv and Opishnya), [Saga Pottery](https://sagapottery.com/), Etsy shops such as [Decrasa](https://www.etsy.com/shop/Decrasa) and [BercAnna](https://www.etsy.com/shop/BercAnna), and German eBay listings. **There's no multi-maker English directory.**
- **"pottery class Kyiv":** [Homo Faber](https://www.homofaber.com/en/experience/pottery-wheel-masterclass-in-kyiv-zvfz3x) lists a Kyiv wheel class in English at USD 300 per person and an Irpin course. Nothing relevant came up for Lviv in English.
- **"Opishne pottery":** [Ukrainer](https://ukrainer.net/opishne-life-originated-in-clay/), Wikipedia, the [National Museum in Opishne](https://opishne-museum.gov.ua/en/departaments/the-museum-of-the-artistic-krychevsky-family) and [Authentic Ukraine](https://authenticukraine.com.ua/en/blog/opisnanskaa-keramika).
- **Heritage facts to reuse with citations:** Kosiv painted ceramics were inscribed on the UNESCO Representative List in December 2019 ([MFA Ukraine](https://mfa.gov.ua/en/news/76609-ukrajinsykij-jelement-tradicija-kosivsykoji-malyovanoji-keramiki-vklyucheno-do-reprezentativnogo-spisku-nematerialynoji-kulyturnoji-spadshhini-lyudstva); [UNESCO 01456](https://ich.unesco.org/en/RL/tradition-of-kosiv-painted-ceramics-01456)).
- **Export marketplaces** (status in 2026 unverified): [I Am U Are](https://en.ain.ua/2023/08/30/i-am-u-are-launches-ukrainian-brands-in-us) (US, 2023) and [Made with Bravery](https://emerging-europe.com/made-with-bravery-ukraine-launches-online-marketplace/) (2022, shipping via Ukrposhta).

**Mapping demand to our page types** (existing Ukrainian page, then a proposed `/en/` page)
| Demand | Existing page | Proposed /en/ |
|---|---|---|
| Restaurant, café and hotel tableware from Ukraine (B2B abroad) | `/dlya-biznesu/posud-dlya-restoraniv`, `-kavyaren`, `-hoteliv` | `/en/tableware-for-restaurants` (+ cafés, hotels) |
| Corporate gifts and logo mugs | `/dlya-biznesu/korporatyvni-podarunky`, `chashky-z-lohotypom` | `/en/corporate-gifts`, `/en/custom-logo-mugs` |
| Where to buy online, ships abroad, Etsy | `/de-kupyty-keramiku`, `/dobirky/etsy` | `/en/buy-ukrainian-ceramics-online` (one page: ships abroad + Etsy) |
| Tableware brands | `/dobirky/brendy-posudu` | `/en/ukrainian-tableware-brands` |
| Heritage: Kosiv and Opishne | `/dobirky/kosiv-i-opishne` | `/en/kosiv-and-opishne-ceramics` |
| Heritage: black-smoked and milk-fired | `/hayidy/chornodymlena-i-molochena` | `/en/black-smoked-and-milk-fired-pottery` |
| Types of Ukrainian ceramics | `/hayidy/vydy-keramiky` | `/en/types-of-ukrainian-ceramics` |
| Contemporary ceramists | `/dobirky/suchasni-keramisty` | `/en/contemporary-ukrainian-ceramicists` |
| Gifts, souvenirs, Christmas | `/dobirky/suveniry-z-ukrainy`, `rizdvianyi-posud`, `yalynkovi-prykrasy` | `/en/ukrainian-ceramic-souvenirs`, `/en/christmas-tableware` |
| Prices | `/tsiny-2026` | `/en/prices-2026` |
| Pottery class Kyiv / Lviv | `/maister-klasy/[city]` | `/en/pottery-classes-kyiv`, `-lviv` (**only studios confirmed to teach in English, ≥3**) |
| Studio profiles | `/vyrobnyky/...` | phase 2, see section 5 |

---

## 4. Practicalities (brief)

**Shipping from Ukraine**
- **US:** duty-free de minimis ended for all countries on 2025-08-29 ([CBP CSMS](https://content.govdelivery.com/accounts/USDHSCBP/bulletins/3f01456); [KPMG](https://kpmg.com/us/en/taxnewsflash/news/2025/08/us-cbp-implements-eo-suspending-duty-free-de-minimis-treatment.html)). Ukrposhta says that since 24.07.2026 US duty depends on the item category, a 10-digit HS code is required, about 200k parcels have gone under the new rules, delivery takes from 7 days and the PRIME rate starts at $6. A further change is expected on 22.10.2026 ([Ukrposhta, 2026-09-08](https://www.ukrposhta.ua/en/news/58770-cherez-ukrposhtu-vidpravili-200-tisjach-posilok-do-ssha-za-novimi-mitnimi-pravilami)).
- **EU:** the €150 duty exemption ended on 1.07.2026, replaced by a transitional €3 flat duty until 2028 under Reg. (EU) 2026/382. Sources disagree on whether it is counted per item category or per consignment ([Ibec, 2026-03-09](https://www.ibec.ie/sfa/news-insights-and-events/insights/2026/03/09/reminder---150-eur-customs-duty-exemption-threshold-to-be-removed-as-of-1-july-2026); [Andersen](https://be.andersen.com/en/news/the-end-of-the-eur-150-customs-duty-exemption-the-european-union-introduces-a-flat-rate-eur-3-duty-on-small-parcels)). VAT applies as before.
- **UK:** £135 duty relief remains for now. The government intends to remove it by March 2029 ([33 Bedford Row](https://33bedfordrow.co.uk/insights/bulletins/the-end-of-the-135-customs-duty-relief-what-importers-and-platforms-need-to-know); [DWF, 2026-01](https://dwfgroup.com/en/news-and-insights/insights/2026/1/reform-of-customs-treatment)).
- **Carriers:**
  - Nova Poshta claims 160+ countries and offices in 16–18 countries, including Poland, Germany, the US via UPS, and Canada ([novaposhtaglobal.ua](https://novaposhtaglobal.ua/en/about/), n.d.).
  - Ukrposhta is in the US entry above.
  - No primary-source data was found for Meest.
- **On the page:** say plainly that the buyer pays import duty and VAT, give a "check with the maker" note and a date, and **don't promise rates**. Fragile ceramics need the maker's own packaging, so mention it.

**Which makers ship abroad:** a rough count in the raw research file (`../UkraineCeramics/_master/all_entries.jsonl`, 1,003 active entries) gives 56 that mention Etsy and 44 whose text mentions worldwide or international shipping. Before publishing, check these against published profiles. Add a profile flag such as `shipsAbroad` with source and date, filled only from evidence (Etsy shop, bio, site). Never infer it.

**Currency:** keep UAH as the source of truth, also in JSON-LD `priceCurrency: UAH`, because structured data must match the visible text. Show "≈ €/$" next to it, rounded, with "at the NBU rate on DD.MM.YYYY". Recompute at build or revalidate time, never by hand.

**Request form for foreign buyers:** an English form posting to the same request service, with these fields:
- country and city
- delivery needed (yes/no)
- quantity and budget (any currency)
- needed by (date)
- language for replies (English / Ukrainian)
- business or private

Flag `lang=en` on the request, so the owner and studios know to answer in English. Route it only to studios marked as answering in English or shipping abroad. State the model briefly in English, as `site.model` does now.

**Structured data in English:** the same types as the Ukrainian pages (`ItemList`, `LocalBusiness`, `FAQPage` and so on).
- Add `inLanguage: "en"`.
- Keep one `Organization` `@id` shared across languages.
- Studio entities keep the same `@id` and `sameAs` (Instagram, Etsy) in both languages.
- Text must match the visible English page ([Google AI features](https://developers.google.com/search/docs/appearance/ai-features), 2025-12-10).

---

## 5. Recommendation

**Phase 1: about 15–20 hand-checked hub pages under `/en/`**
- Launch the pages from the table above: B2B tableware for restaurants, cafés and hotels; corporate gifts and logo mugs; buy online / ships abroad / Etsy; tableware brands; Kosiv & Opishne; black-smoked & milk-fired; types of ceramics; contemporary ceramicists; souvenirs; Christmas tableware; prices 2026; About / how it works; the request form.
- Add `/en/` home, `/en/llms.txt` and an English sitemap section.
- Start with the three pages ChatGPT already sends English users to.
- These are pages where we hold unique data and where English results are informational or single-brand.

**Phase 2: makers, but not all ~350**
- Add `/en/makers/<slug>` only for makers with evidence of foreign relevance: they ship abroad, are on Etsy, sell B2B or teach in English. Expect around 50–100.
- Each profile gets a short English description written from our data fields (techniques, products, minimum order, price range, city, shipping) and reviewed. **Don't do a line-by-line translation of the Ukrainian prose.**
- Profiles without English keep no `en` hreflang.
- City class pages in English only where at least 3 studios are confirmed to teach in English.

**Do not:**
- translate all city × format pages
- publish `/en/` pages with Ukrainian main content
- auto-redirect by IP or Accept-Language
- set a cookie-only language switch
- canonicalise across languages
- write `en-UK`

**Technical setup**
- **Routing:** Next.js App Router, `src/app/(frontend)/en/...` with English slugs and one mapping table, `ukPath ↔ enPath`, in `src/content`. From that table, generate:
  - `metadata.alternates.languages` (`uk`, `en`, `x-default`) on both sides, only for mapped pairs, so reciprocity is guaranteed
  - the language switcher link
  - the hreflang check
- **`x-default`:** point it to the Ukrainian original, the complete version. An alternative is the English page, to serve non-Ukrainian speakers such as Poles and Germans. The hreflang docs only say x-default is the fallback "when no listed language matches", so either is valid. We recommend **English as x-default where an English page exists**, since a non-matching user is more likely to read English. Decide once and record it in `decisions.md`.
- **`<html lang>`** must be `en` on `/en/`. `src/app/(frontend)/layout.tsx` hardcodes `<html lang="uk">`, so `/en` needs its own root layout: a separate route group with its own `<html lang="en">`, the way `(panel)` and `(kabinet)` already have their own.
- **`decisions.md` is stale:** it still says "Payload localization" for `/en`, but Payload is no longer in `package.json`. Update the decision when work starts.
- Keep the voice rules. English pages get English-language prose and no verse epigraph unless it's a proper translation. Keep the "Updated" date and the answer → table → FAQ order. Titles key-first, ≤ 62 characters hand-written, with "· Hlyna" (or "· Глина") per `fitTitle`.

**Keeping translations in sync**
- In the mapping table, store each English page's `sourceUpdated`, the Ukrainian page's content date at the time of translation.
- `scripts/check-links.mjs` (or a new check) should **warn** when the Ukrainian source changed after `sourceUpdated`, and fail on non-reciprocal pairs or a missing `/en` target.
- Live numbers (counts, prices, maker lists) come from the same data functions, so they never drift. Only the prose needs re-translating.
- Workflow: an LLM drafts from the current Ukrainian text and data, a person reviews, then update `sourceUpdated`.

**Measuring success**
- **Search Console:**
  - Add a URL-prefix property for `https://hlyna.com.ua/en/` (or filter Pages by `/en/`), then compare by country.
  - Watch the **Generative AI** report ([AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide), 2026-07-10) and the Translated-results search appearance on Ukrainian pages. That translated traffic should shift to `/en/` over time.
  - The International Targeting report and its hreflang error view were retired on 2022-09-22 ([Google Help](https://support.google.com/webmasters/answer/12474899); [Search Engine Land](https://searchengineland.com/google-search-console-to-remove-international-targeting-report-387477)). Validate hreflang with URL Inspection and our own check script.
- **Bing Webmaster Tools:** verify the site, submit the sitemap, enable IndexNow, and watch **AI Performance** citations per `/en/` URL.
- **GA4:** segment by page path prefix `/en/`, `utm_source=chatgpt.com` (and perplexity, copilot, claude referrers), and the request form submissions with `lang=en`.
- **Access logs** (existing digest, `scripts/logs/digest.mjs`) — add `/en/` columns:
  - OAI-SearchBot, Claude-SearchBot, PerplexityBot and Bingbot crawl of `/en/`
  - **user-initiated fetches** (ChatGPT-User, Claude-User, Perplexity-User), which are the closest proxy for "an AI answer used this page"
  - fetches of `/llms.txt` and `/en/llms.txt`
- **The success metric is requests,** not sessions: English requests per month, and the share from AI referrals. Review at 4 and 12 weeks after launch. Expand to phase 2 only if phase-1 pages get crawled and cited and bring at least a few qualified requests.
