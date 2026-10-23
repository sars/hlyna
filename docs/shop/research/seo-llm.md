# Індексація й цитування товарів пошуковиками та LLM — рекомендації (24.10.2026)

## Три факти, що визначають план
1. **Google: нічого окремого для AI Overviews / AI Mode.** Жодної спеціальної розмітки чи файлів; важливо: проіндексовано, придатне до сніпета, структуровані дані збігаються з видимим текстом, Merchant Center актуальний (developers.google.com/search/docs/appearance/ai-features).
2. **Google Merchant Center і безкоштовні лістинги доступні в Україні** (UAH, українська; support.google.com/merchants/answer/160637). Для малих сайтів є режим автоматичного краулу, де on-page розмітка покращує витяг. Найдешевший крок із найбільшим ефектом: акаунт MC, free listings, краул сайту, потім фід.
3. **ChatGPT і Perplexity shopping — партнерські фід-програми, фактично США.** OpenAI: фіди лише для схвалених партнерів, спека «targets the US» (developers.openai.com/commerce). Perplexity Merchant Program — для великих рітейлерів. Реалістичний шлях — відкритий веб: ChatGPT shopping ранжує продавців за наявністю, ціною, якістю і «чи це виробник або основний продавець» — ми говоримо прямим текстом, що студія = виробник.

## Структуровані дані (за пріоритетом)
**A. Сторінка виробу — merchant listing** (лише там, де можна купити, про один товар):
- Product обов'язково: `name`, `image`, `offers` (саме `Offer`, не AggregateOffer).
- Offer обов'язково: `price` > 0, `priceCurrency: "UAH"`. Рекомендовано: `availability`, `url`, `itemCondition: NewCondition`, `priceValidUntil` (ковзна дата або без), `shippingDetails`, `hasMerchantReturnPolicy`.
- Product рекомендовано (чесно заповнювані): `description`, `sku`, `brand.name` (студія), `material`, `color`, `size`, `category`, кілька `image`. Без `gtin/mpn`, без рейтингів і відгуків.
- `shippingDetails`: `OfferShippingDetails` з `shippingRate` (`value` / `maxValue`, `currency`), `shippingDestination` (`DefinedRegion`, `addressCountry: "UA"`), `deliveryTime` (`handlingTime` + `transitTime`, `QuantitativeValue` min/max, `unitCode: "DAY"`). Термін виготовлення — у `handlingTime`.
- `MerchantReturnPolicy`: `applicableCountry: "UA"`, `returnPolicyCategory` (`MerchantReturnFiniteReturnWindow` + `merchantReturnDays`, або `MerchantReturnNotPermitted` для речей під замовлення), `returnFees`, `returnMethod`. Типова політика — на рівні Organization, окрема — на Offer.
- **Availability у Google:** BackOrder, Discontinued, InStock, InStoreOnly, LimitedAvailability, OnlineOnly, OutOfStock, PreOrder, PreSale, SoldOut. `MadeToOrder` є в schema.org, але **не в списку Google** → для «під замовлення» PreOrder (або BackOrder) + термін у `handlingTime` і тексті. Один примірник проданий → SoldOut; «лишилась 1» → LimitedAvailability.
- Product snippets (сторінки, що лише посилаються на товари): `name` + `offers` / `AggregateOffer` (`lowPrice`, `highPrice`, `priceCurrency`, `offerCount`).

**B. Варіанти:** `ProductGroup` (`productGroupID`, `variesBy` лише color / size / material / pattern / suggestedAge / suggestedGender, `hasVariant` з унікальними `sku`), кожен варіант — свій URL `?color=…`. У нас рідко (серії полив).

**C. Списки:** `ItemList` з ≥ 3 `ListItem` (`position`, `item` = Product з `name`, `image`, `url`), один ItemList на сторінку пагінації. Rich result каруселей для України нема — але допомагає витягу.

**D. Усюди:** `BreadcrumbList` (≥ 2, шлях користувача, видимі крихти). Головна крамниці — `OnlineStore` (`name`, `url`, `logo` ≥ 112 px, `sameAs`, `email`, `hasMerchantReturnPolicy`, `hasShippingService`). **FAQPage rich result не показується з 07.05.2026** — FAQ лишаємо текстом, розмітку не додаємо.

## LLM-поверхні без програм
- Усе в серверному HTML, включно з JSON-LD; ціна й наявність ніколи не з клієнтського fetch.
- robots: дозволити `OAI-SearchBot`, `PerplexityBot` (вже є).
- Bing / Copilot: IndexNow на кожну зміну ціни / наявності; Bing: Product-розмітка + IndexNow замінюють окремий фід; додати `dateModified` у Product.
- llms.txt: Google не використовує; лишаємо (дешево), не розраховуємо.
- Фід: один Google Shopping XML (RSS 2.0, `g:`) — Merchant Center зараз; формати Perplexity / OpenAI — надмножини (неперевірено).
- Sitemap: `lastmod` лише точний; `changefreq` / `priority` ігноруються; можна `<image:image>`.

## Списки й категорії
Без офіційного мінімуму (карусель ≥ 3) — тримаємо правило ≥ 3. Унікальний вступ: 2–3 речення з фактами (кількість, діапазон цін, міста, дата), потім сітка. Кожен товар — `<a href>` (Googlebot не клікає кнопок). Пагінація: кожна сторінка — свій URL і self-canonical, не канонікал на першу, без `#`. Фільтри / сортування: блокувати параметри в robots, фіксований порядок, 404 для порожніх комбінацій; індексувати лише кураторські фасети зі своїм текстом. URL — слова латиницею через дефіс (Google: кирилиця «не рекомендується», транслітерація — ок).

## Сторінка виробу
Title описовий, бренд у кінці: «{Виріб} {полива / матеріал}, {об'єм}, {Студія}, {Місто} · Глина». Перший абзац — факти: що, матеріал, розмір / об'єм, ціна в грн, хто зробив, місто, термін, «Оновлено». Таблиця характеристик (ті самі значення, що в JSON-LD). Блок виробника з посиланням. FAQ звичайними заголовками (доставка, повернення, догляд, під замовлення). Фото: `<img src>` (не CSS-фон), описові назви файлів і alt, кілька ракурсів, одне `og:image`. Вендорні дослідження: AI-рушії цитують гайди / добірки частіше за картки товарів → парувати крамницю з гайдами, що містять ItemList.

## Продані одиничні
Тримати 200 зі станом SoldOut, повними фактами, виробником і 3–6 схожими / «замовити схожу» — це не soft-404. 301 на студію / категорію лише коли сторінка порожня; ніколи на головну. Продане — геть з ItemList і фідів (`out_of_stock`).

## Маркетплейс
Сторінка студії — Organization / LocalBusiness з `makesOffer` → короткий Offer / AggregateOffer; повний Offer із `seller` = студія — на сторінці виробу. Опис не дублювати між профілем і виробом.

## Україна
Слаги транслітерацією; hreflang пізніше (`uk`, `en`, `x-default`, одним методом); ціни `"price": "850"`, `"priceCurrency": "UAH"`, одна валюта на URL.

## Не робити
Фейкові відгуки / рейтинги, GTIN; `MadeToOrder` для Google; кілька значень availability; ціна / наявність за JS; JSON-LD, що розходиться з текстом; канонікал пагінації на першу; `#` у фільтрах; фільтри в sitemap; редірект проданого на головну; 200 на порожні комбінації; покладатися на llms.txt, FAQPage, rel next/prev, changefreq; фід для OpenAI / Perplexity раніше за Merchant Center.

## Не перевірено
Чи живлять free listings AI Mode shopping; формат фіду Perplexity; текст довідки OpenAI (403); сторінки Bing Webmaster (порожні); офіційний мінімум товарів у категорії.

Джерела: developers.google.com/search/docs (merchant-listing, product-snippet, product-variants, return-policy, carousels-beta, breadcrumb, organization, faqpage, ai-features, javascript-seo-basics, ecommerce/*, faceted-navigation, pagination, url-structure, title-link, google-images, sitemaps, localized-versions, http-network-errors), support.google.com/merchants/answer/160637, developers.openai.com/commerce, developers.openai.com/api/docs/bots, docs.perplexity.ai/guides/bots, blogs.bing.com/webmaster (IndexNow shopping, 05.2025), schema.org/MadeToOrder, airops.com/blog/page-types-earn-ai-citations.
