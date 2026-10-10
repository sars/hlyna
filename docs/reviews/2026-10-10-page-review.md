# Page review: 10 pages, 2026-10-10

This is a trial review of the live site (hlyna.com.ua, deploy `edb717c`), done before reviewing every page. Each page was checked on desktop at 1440px (full page, read in viewport-height chunks) and on a phone at 390px (the first two screens). Each page was then read twice: from its visible text, head, JSON-LD and links, and once more as an LLM would read it.

Screenshots are in `.shots/review/` and are not committed.

Scores run from 1 to 5. **V** = visual, **R** = readability, **L** = LLM usefulness, **D** = content depth.

| # | Page | V | R | L | D | Verdict |
|---|------|---|---|---|---|---------|
| 1 | `/` | 4 | 4 | 3 | 3 | Strong look. Too many dead links, 5% said 3×, some photos off-topic |
| 2 | `/dlya-biznesu` | 3 | 4 | 2 | 2 | A link hub, 6 of its 12 cards are 404, no list or FAQ, OG uses the default image |
| 3 | `/dlya-biznesu/chashky-z-lohotypom` | 3 | 3 | 3 | 3 | Good methods and checklist. 63-card second list is noise. Hero photo is folk pottery, not logo mugs |
| 4 | `/dlya-biznesu/korporatyv-lipennya-z-hlyny` | 4 | 4 | 4 | 3 | Best business page. The price range mixes per-person and group totals |
| 5 | `/maister-klasy/kyiv` | 2 | 2 | 2 | 3 | Same 51 entries twice (table + cards), 11,000px tall, «від 100 до 20 000 грн», non-MK entries |
| 6 | `/maister-klasy/vinnytsia` | 3 | 3 | 2 | 2 | Thin template, nothing specific to the city, kicker «Вінницька» |
| 7 | `/maister-klasy/dlya-dvokh` | 4 | 4 | 4 | 4 | Best page overall. Small wording bugs |
| 8 | `/sertyfikaty` | 4 | 3 | 3 | 3 | Good guide. Cards repeat «подарункові сертифікати» 50× instead of price or validity |
| 9 | `/vyrobnyky/kust-ceramics-kustceramics` | 2 | 2 | 3 | 4 | Rich data dumped raw: duplicates, ~40 price lines, internal research notes |
| 10 | `/vyrobnyky/liliia-berezhnenko` | 3 | 4 | 2 | 1 | Exhibiting artist shown as a business (badge «майстер-класи», request form, «умови для закладів») |

## Site-wide (template) findings

### P1: fix before promoting the site (about 1 day)

1. **37 broken internal links on every page.**
   - **Nav and footer:** the main nav («Кейси», «Гайди», «Мапа», «Ціни» and all of its menu) and the utility bar («Для студій і майстрів», «Як це працює») all return 404. So does «Додати студію» on the home page and in the Makers menu.
   - **Cards:** the home «Гайди» cards, the `/dlya-biznesu` «Корисне» cards, «Посуд для кав’ярень/готелів», «Корпоративні подарунки», «Дозамовлення».
   - **Makers menu:** all `/vyrobnyky/vyrib/*`, `/vyrobnyky/misto/*` and `/dobirky/*` links, and `/pro-nas/metodolohiya`.
   - **Why it matters:** crawlers and LLM fetchers hit a 404 within one click from any page, which is a quality signal against the site.
   - **Fix:** hide nav entries whose route doesn't exist (a `published` flag in `navigation.ts`, checked against a list of built routes), or build stubs. Keep the plan in a separate file, not in live nav.
2. **The request form defaults to «Посуд для закладу» everywhere.** That includes master-class city pages, studio profiles and a 70-year-old exhibiting artist's profile. Its «Місто» placeholder is «Київ» even on the Vinnytsia page.
   - **Fix:** default `what` by page type (master-class → «Майстер-клас», profile → the studio's main format) and prefill the city on city and profile pages.
3. **City master-class pages show junk price ranges.** The lead says «ціни від 100 до 20 000 грн», and table cells say «100–8 200 грн». These mix master classes, courses, coworking hours and products. The topic pages already use the P10–P90 «здебільшого від … до …» logic with a filter for single-session prices; reuse it here. In the per-studio column, show only the cheapest single master class («від 800 грн») or «—».
4. **Duplicated listing on city pages.** The table and the «Профілі» cards list the same studios, so Kyiv is 11,000px tall. Keep one: a compact card grid grouped by format, or the table with a 1-line summary.
5. **Studio profiles dump raw research arrays without de-duplication.** KUST lists «керамічні світильники» 6× and about 50 services. «Де продає» repeats «Bodo», «сайт» and «Etsy» 3× each. Price lines carry internal notes («медіана ~155 EUR (вітрина магазину, переглянуто 2026-10-08)»).
   - **Fix:** de-duplicate and fold near-duplicates when importing. Cap lists at about 12 items with «ще N». Group prices into Master classes / Courses / Products, show at most 8, and strip research notes and very old (pre-2023) lines.
6. **The master-class tag is applied too widely.** Kyiv's «51 місце, де проводять заняття» includes a souvenir shop («Мрії Марії»), an academy department and exhibiting artists with no classes (Людмила Красюк, Надія Козак, Петро Печерний). The thin profile (Бережненко) gets the badge «майстер-класи» too. The `offersMasterClasses` regex fallback became Unicode-aware today, which is why this widened.
   - **Fix:** use only the `formats` tags (wheel, handbuilding, painting, kids, couples, courses, certificates, corporate-workshop), with no type-based fallback for `maker` or `shop`.

### P2: quality and LLM value (2–3 days)

7. **Evidence lines on topic cards are mostly one generic phrase.** On the logo page: «посуд на замовлення» about 30×. On certificates: «подарункові сертифікати» about 50×. On «Для двох»: «побачення». They add nothing for a reader or an LLM.
   - **Fix:** prefer the matching *price* line (format, duration, price) and fall back to `summary`. Drop the «є ціни» badge: it's on almost every card, so it no longer distinguishes anything.
8. **The logo page's second list (63 studios) is weak or off-topic.** It includes «[наїв]» (a jewellery brand), «Артпростір ЕтноЧари — кав’ярня» and «Арт-студія Ліхтарик — корпоративний МК».
   - **Fix:** show only brand and studio makers of tableware there, collapse it after 12 with «показати всі», or replace it with «Інші студії, що роблять посуд на замовлення» grouped by city.
9. **Content repeated across sections.**
   - **5% model:** on the home page it appears in the form note, «Як це працює» and the studios CTA (3×); FAQ adds a 4th. Business pages say it in the lead and the form note.
   - **Prices and lead time:** «550–1 550 грн з особи» appears 3× on the home and corporate pages. «3–8 тижнів» appears 2× per page, and the home page table says «3–6 тижнів» for logo mugs while the logo page says «3–8 + 1–2».
   - **Fix:** say each key fact once in the lead (quotable), once in the FAQ (JSON-LD), and remove it from form notes and CTAs. Make the logo lead time consistent.
10. **Epigraphs repeat between cities.** The same 6 verses rotate, so Kyiv and Vinnytsia share «Мокра глина пахне дощем». On mobile, the epigraph sits between the lead and the list on every city page and pushes the content down. Use one verse per city only for the top ~10 cities, and none on thin pages.
11. **Photos.**
    - The home «Посуд для ресторанів» card shows an outdoor market of terracotta pots.
    - The logo page hero shows traditional Bar folk jugs, not logo mugs.
    - `/sertyfikaty` shows a third party's sign «Арт-центр Керамічне диво».
    - The home card «Чашки з логотипом» uses a dark, unreadable stack-of-pots crop.
    - **Fix:** use neutral close-ups for logo and business pages until studios send photos. No visible third-party branding.
12. **Odd kickers and labels.**
    - «Майстер-класи · м. Київ (спецстатус)» leaks an internal admin label.
    - «Майстер-класи · Вінницька» should read «Вінницька область».
    - «у місті Київ» and «у місті Вінниця» should be «у Києві» and «у Вінниці».
    - «здебільшого від 800 до 3 120 грн, здебільшого за двох» repeats «здебільшого».
    - «3 120» and «7 700» look falsely precise; round to 100 for display.
13. **The corporate price block mixes units.** «Найчастіше в прайсах — від 500 до 7 700 грн» pools per-person prices with group totals («8000 грн за групу до 10 осіб»). Compute per-person only (lines with «з особи/особа/учасник»), and list group packages separately.
14. **Thin and non-commercial profiles.** For exhibiting artists with no sales channel (Бережненко):
    - hide the request form and «Умови для закладів і компаній»;
    - show «Де побачити роботи» instead;
    - consider `noindex` until there is a contact.
    - Remove the birth year: personal detail, not business. Privacy rule in CLAUDE.md.
15. **Studio names with parenthetical aliases in H1 and title.** Examples: «KUST Ceramics (КУСТceramics)», «Glynar. Гончарна на Лютеранській (Майстерня «Глинар»)», «Гончарні майстер-класи у Миколаєві (партнер KAVA, тел. 066 569 19 64)». The last one has a phone number inside the name.
    - **Fix:** add a `displayName` field and put aliases in `alternateName` (JSON-LD) and a small subtitle.
16. **JSON-LD gaps.**
    - **`LocalBusiness`:** `streetAddress` carries metro and two addresses in one string, and `sameAs` holds non-URLs («https://kustceramics.net (магазин)») and booking-site links. Split into two `location`s or keep the first address; put only clean profile URLs in `sameAs`. Add `priceRange`, and `makesOffer` for master classes when prices are known.
    - **City master-class pages:** the `ItemList` items have no type. Use `ListItem` → `item: {@type: LocalBusiness, name, address.addressLocality}`.
    - **`/dlya-biznesu`:** has no FAQPage and no `ItemList`, and its OG image is the generic default.

### P3: polish (1–2 days)

17. **Desktop layout:** on long topic pages the right column is empty for 5,000–8,000px below the sticky form. Either let the content go full-width after the first screen, or put a «Зміст» / jump-links box and the «Для команди» promo in the aside.
18. **Card grids:** the 5th card sits alone on «Як ставлять логотип» and «Як це проходить». Use 3-up or 6 items.
19. **City pills on the home page:** «Івано-Франківськ» wraps and breaks the row height. Use a smaller font or `hyphens`, or abbreviate to «Франківськ».
20. **Price example lines:** they mix «(Instagram, ~2024)», «(dom4824.org, 2021)» and «(Kyiv Post 2018)».
    - Hide lines older than 2023.
    - Show the source as a small muted suffix.
    - Sort by relevance to the page.
21. **«Ще міста і села»:** a long run-on paragraph of links is hard to scan. Use a 2–3 column list grouped by city.
22. **Aside on `/sertyfikaty`:** «Подарувати або піти командою» links «Сертифікати →» to the page itself. Swap that link for «Для двох».

## Per-page notes

### 1. Home `/`
- **Good:**
  - a clear H1 and two CTAs;
  - quick request form above the fold;
  - the «Типові формати і ціни, 2026» table is quotable and very LLM-friendly;
  - city pills with counts;
  - FAQ JSON-LD.
- **Fix:**
  - all 3 «Гайди» cards and «Додати студію» are 404;
  - logo lead time is 3–6 in the table vs 3–8+ elsewhere;
  - card photos are off-topic (see 11);
  - the 5% model appears 3×;
  - the H1 runs to 6 lines at 1440px: reduce the clamp max, or shorten it to «Посуд і подарунки від українських студій».
- **LLM additions:**
  - one sentence defining what «Глина» is and who runs it;
  - «Як ми збираємо дані» (methodology, also a 404 today);
  - a «Популярне» list naming 5–8 real studios, so answers can cite names.

### 2. `/dlya-biznesu`
- **Problem:** pure navigation, and half of it is dead.
- **Add:**
  - the 6–8 top business-ready studios (horeca, logo or corporate tags) with city and one fact each;
  - the home price table (business rows);
  - FAQ (min. batch, lead time, food-safe, invoices/ФОП payment);
  - an OG card.

### 3. `/dlya-biznesu/chashky-z-lohotypom`
- **Good:** «Як ставлять логотип» (5 methods) and «Що узгодити» are genuinely useful and well written.
- **Fix:**
  - hero photo;
  - the «Найчастіше в прайсах — від 280 до 3 400 грн» block lists candles and 2018 shop prices; keep mugs only, 2024+;
  - the second list (see 8);
  - the orphan 5th card.
- **Add:**
  - a small table comparing methods (стійкість / мін. партія / ціна relative / термін);
  - an example timeline;
  - the art files to send (already partly covered).

### 4. `/dlya-biznesu/korporatyv-lipennya-z-hlyny`
- **Good:** the lead answers price, duration, place and pickup time in 2 sentences. It has formats and «Що написати студії».
- **Fix:**
  - the price block (see 13);
  - the «Ще міста» paragraph (see 21);
  - the Mykolaiv entry with a phone number in its name.
- **Add:**
  - per-city «від X грн з особи» for Kyiv, Lviv and Dnipro;
  - group size ranges from the data («3–10», «4–30», «10–100»);
  - an «на виїзд» flag per studio.

### 5. `/maister-klasy/kyiv`
- **Fix:**
  - the lead's price range, the per-row ranges (see 3), the duplicate table + cards (see 4), the non-MK entries (see 6) and the kicker «(спецстатус)»;
  - the FAQ says «У прайсах 22 студій… від 100 до 20 000 грн; середина — 1 750», which is not believable.
- **Add (high LLM value):**
  - district or metro per studio, since addresses exist for many;
  - format chips per studio (коло / ліплення / розпис / для двох / діти / сертифікат);
  - the cheapest single class price;
  - a short «Як обрати» paragraph;
  - links to `/sertyfikaty/kyiv` and the format pages filtered to Kyiv.
- Title «51 студія» vs lead «51 місце»: pick one wording.

### 6. `/maister-klasy/vinnytsia`
- **Fix:** kicker, «у місті Вінниця», shared verse, form defaults. «Іван Шостак … вироби на замовлення» is not a master-class place.
- **Add:** 1–2 sentences of real city context (e.g. the «Гончарство в темряві» school for veterans is notable and worth a line), plus addresses and the cheapest class.

### 7. `/maister-klasy/dlya-dvokh`
- **Good:**
  - the lead is a perfect LLM answer (count, cities, price, duration, pickup);
  - «Як це проходить» is clear;
  - the non-form aside is a nice change.
- **Fix:**
  - «здебільшого … здебільшого»;
  - a 2021 price line («Цятка … 600 грн»);
  - the bare «побачення» evidence;
  - the orphan 5th card.
- **Add:** whether the price is per couple or per person, made explicit per line («за двох»).

### 8. `/sertyfikaty`
- **Good:**
  - the lead states price, validity and formats;
  - «Як обрати сертифікат» has 4 sensible points.
- **Fix:**
  - the evidence lines (see 7);
  - a false positive: «Empath Ceramics … сертифікат автентичності»;
  - the outlier «Восьма Комора — 6 000 грн»;
  - the photo with third-party branding;
  - the self-link in the aside.
- **Add:**
  - per-studio validity and type (електронний / паперовий / безстроковий), since the data has some;
  - links to the 7 city certificate pages near the top. They exist, but the page doesn't surface them visibly.

### 9. `/vyrobnyky/kust-ceramics-kustceramics`
- **Good:** the 3-paragraph description is excellent (addresses, signature product, formats, sales channels). The «Коротко» table works well.
- **Fix:**
  - everything below «Коротко» (see 5);
  - the form default;
  - the H1 alias;
  - `sameAs` noise.
- **Add:**
  - photos or an Instagram embed (pending the Instagram pass);
  - a «Ціни коротко» summary: МК від 1 750 грн, курси 2 000–8 500 грн, коворкінг 100 грн/год.

### 10. `/vyrobnyky/liliia-berezhnenko`
- See 14.
- The «Інші студії та майстри: Запоріжжя» block is a good internal-linking pattern; keep it.

## Phone (390px)
- **No horizontal overflow** after today's grid fix.
- **Headers and leads** are readable.
- **Tables:** the Kyiv table scrolls sideways and the Instagram column is cut off. Acceptable, but cards would be better on phones.
- **Long topic pages:** the request form comes only after all the content. Add a sticky bottom «Отримати пропозиції» bar on mobile for business pages.

## Suggested order
1. P1-1 (dead links)
2. P1-2 (form defaults)
3. P1-6 (master-class tag)
4. P1-3 and P1-4 (city pages)
5. P1-5 (profile de-duplication)
6. P2-7 and P2-9 (evidence lines, repetition)
7. P2-11 (photos)
8. the remaining P2
9. P3

Re-run this review on 10 other pages after P1 and P2.
