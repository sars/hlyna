# Аудит архітектури hlyna.com.ua — 2026-10-11

Тільки читання: код не змінювався. Стек: Next.js 16 (App Router, Turbopack) + Payload 3.90 + Tailwind 4.

## 1. Організація коду

**Що добре.** Публічний сайт відокремлений від шаблону: `components/site/*` (21 файл), `lib/*` (дані й логіка), `content/*` (тексти), маршрути транслітом українською. Клієнтські компоненти позначені суфіксом `.client.tsx` і їх небагато (форми, мапи, меню, Instagram); решта — серверні. Кабінет власника має власну сесію (`lib/ownerAuth.ts`, scrypt + HMAC-cookie, без доступу до Payload REST) — це правильне рішення.

**Проблеми.**
- **Дубльована логіка цін і форматування.** `fmt`/`range`/`pluralUk` у `lib/catalog.ts`; рядок «від X до Y грн» збирається окремо в `lib/topics.ts:81` і `lib/waveA.ts:61`; витяг сум «… грн» регулярками — у `catalog.ts:146`, `priceIndex.ts:33`, `present.ts` (джерела, USD/EUR); набори ключових слів МК/курс/сет — у `priceIndex.ts:20-29` і окремо в `content/topics.ts:66-67`. Розбіжність цих копій уже зараз дасть різні цифри на різних сторінках.
- **П'ять механізмів редакційних сторінок**: `topics` (content 939 рядків + lib + `TopicPage`), `guides` (550 + `GuidePage`), `places` (`PlaceContent`), і три «хвилі» `waveA/B/C` (по `lib/waveX.ts`, `content/waveX/`, `scripts/build-wave-X.ts`, `scripts/sync-wave-X.mjs`, свій `*Route.tsx`). Хвилі B і C імпортують `fillCopy`/типи з `waveA`, `waveC` — `newYearData` з `waveB`: це вже одна система, розкидана по трьох файлах з цифрами в назві.
- **Великі файли**: `content/topics.ts` 939, `content/guides.ts` 550, `collections/Studios.ts` 469, `vyrobnyky/[slug]/page.tsx` 405 (профіль: дані + розмітка + JSON-LD в одному файлі), `content/navigation.ts` 331.
- **Залишки шаблону Payload Website**: колекції `Posts`, `Pages`, `Categories`; маршрути `posts/*`, `search`, `[slug]`, `next/preview`; `blocks/*` (Code, Form, Archive, CTA, Banner, MediaBlock, RelatedPosts), `heros/*`, `Header/`, `Footer/` (глобали), `providers/Theme` і `HeaderTheme`, `AdminBar`, `BeforeDashboard/SeedButton`, `endpoints/seed`, плагіни search/form-builder/redirects/nested-docs, `posts-sitemap.xml`, `pages-sitemap.xml`, `package.json` → `"description": "Website template for Payload"`. Це ~60 файлів, Lexical і Prism у залежностях та зайвий JS на кожній сторінці (див. розділ 2).
- **Назви**: `waveA/B/C` описують історію релізів, а не зміст (краще `editorial/` з id сторінки). Змішано `utilities/` (шаблон) і `lib/` (своє).
- **Тести фактично відсутні**: `tests/int/api.int.spec.ts` перевіряє лише `find users`, `tests/e2e/frontend.e2e.spec.ts` чекає заголовок «Payload Website Template» — тобто зламаний. Найризикованіший код (регулярки цін у `priceIndex.ts`, `present.ts`, `ownerAuth.ts`, права в `/kabinet/api/*`) без жодного тесту.

**Пріоритетний список рефакторингу (без змін зараз).**

| # | Що | Навіщо | Обсяг |
|---|----|--------|-------|
| 1 | Прибрати `AdminBar` і `Providers` (Theme/HeaderTheme) з `(frontend)/layout.tsx` | −36 КБ JS і зайвий запит `/api/users/me` на кожен перегляд | 1–2 год |
| 2 | Unit-тести (vitest) на `priceIndex`, `present.publicPrices/splitSource`, `ownerAuth`, доступ у `kabinet/api`; полагодити або видалити e2e шаблону | ціни — головна цінність сайту; захист від регресій | 0,5–1 день |
| 3 | `lib/money.ts`: один парсер «грн», `formatUah`, `priceRange(min,max)`, спільні регулярки категорій | одна правда для всіх цифр | 0,5–1 день |
| 4 | Видалити шаблонні Posts/Pages/Categories/search/blocks/heros/seed/плагіни + міграція на drop таблиць | менше коду, швидша збірка, чистіша адмінка | 1 день |
| 5 | Об'єднати waveA/B/C в одну систему `editorial/` (реєстр сторінок `{id, path, section, data(), template}`, один build/sync-скрипт, один `EditorialRoute`) | новий тип сторінки — це запис у реєстрі, а не новий набір файлів | 2–3 дні |
| 6 | Розбити профіль `vyrobnyky/[slug]/page.tsx` на секції-компоненти; `Studios.ts` — поля по табах у окремі файли; `topics.ts`/`guides.ts` — у JSON як у хвилях | читабельність, менші диффи | 1 день |
| 7 | Пізніше: звести topics/guides/places у ту ж editorial-систему | одна модель контенту | 2–3 дні |

## 2. Гігієна бандлів (прод, 2026-10-11)

Перевірено curl'ом на 89.116.24.123: HTML + усі `/_next/static/chunks/*`.

| Сторінка | JS (сирий / gzip) | CSS | HTML |
|---|---|---|---|
| Головна `/` | 660 КБ / 205 КБ | 81 КБ | 149 КБ |
| Профіль `/vyrobnyky/alina-okara` | 664 / 206 (+1,03 МБ / 273 КБ gzip MapLibre лениво) | 81 | 87 |
| Місто `/vyrobnyky/misto/kyiv/` | 660 / 205 | 81 | **409** |
| Тема `/podarunky-z-keramiky/` | 660 / 205 | 81 | 326 |
| Каталог `/vyrobnyky/` | 649 / 201 | 81 | 287 |
| Мапа `/mapa/` | 657 / 204 (+MapLibre) | 151 | 364 |

- **Адмінка Payload на публічні сторінки не потрапляє**: немає `@payloadcms/ui`, Lexical, qs-esm. Але **на всіх сторінках є чанк `@payloadcms/admin-bar` (36 КБ, 11,5 КБ gzip)**, який при кожному завантаженні робить `fetch('/api/users/me', {credentials:'include'})` — зайвий некешований запит до Payload/БД на кожен перегляд. Причина — `<AdminBar>` у `(frontend)/layout.tsx`. Пункт №1 вище.
- **MapLibre** (1 МБ) підвантажується динамічним `import()` лише на профілі (по прокрутці) і `/mapa` — правильно. CSS MapLibre (70 КБ) на `/mapa` статично, на профілі — динамічно; у спільному CSS лише власний рядок стилю попапу.
- Базові ~200 КБ gzip — це React 19 + Next router (~115 КБ gzip) плюс провайдери шаблону і спільні клієнтські компоненти; після п. 1 і видалення Theme-провайдерів очікувано ~170–180 КБ.
- **Важкий HTML**: сторінка міста 409 КБ, мапа 364 КБ, теми ~300 КБ — це RSC-payload (дані карток дублюються в HTML і flight-даних). Варто передавати в клієнтські компоненти лише потрібні поля і обмежити списки (пагінація / «показати ще»).

## 3. Власна адмін-панель у стилі inhouse-ai-starter-kit

**Кит знайдено** (`gh repo view brocoders/inhouse-ai-starter-kit` — доступ є; `~/.config/inhouse` містить лише токен і папку іншого проєкту; в AGENTS.md/docs hlyna згадок немає). Стек кита: **Vite 8 SPA + React 19 + TanStack Router/Query/Virtual**, **Tailwind 4 + shadcn (Base UI, стиль base-nova)**, Lucide, Inter; бекенд **Hono + Zod + Drizzle + Postgres 16**, авторизація **Better Auth** (email+пароль і magic link, сесії, rate limit, роль у колонці), власна таблиця jobs, pino, Resend. Готові компоненти `components/inhouse/*`: `PageHeader`, `PagedList`, `FilterBar`, `StatusBadge`, `KpiCard`, `HistoryList`, `ConfirmDialog`, `FormField`, `EmptyState`, `RefreshButton`; оболонка — `app-sidebar` на десктопі + `tab-bar` на телефоні, pull-to-refresh, PWA. Дизайн-правила `frontend/DESIGN.md` (стиль Tremor, щільно, `tabular-nums`, рядки ≥44 px на телефоні, бюджет 200 КБ на перший рендер).

**Пропозиція для hlyna — `/panel` всередині того ж Next.js**, а не окремий Vite-застосунок (одна БД, один деплой, Payload Local API замість Drizzle):
- **Маршрути**: окрема група `src/app/(panel)/panel/...` зі своїм root layout (без `SiteHeader`, без шрифтів сайту, Inter), своїми `globals.css` і токенами кита. Окремий root layout = окремий бандл; публічні сторінки його не бачать, а панель не тягне `@payloadcms/ui`.
- **Компоненти**: перенести з кита `components/ui/*` (shadcn Base UI) і `components/inhouse/*` у `src/components/panel/`; TanStack Router/Query не потрібні — серверні компоненти + server actions, фільтри в `searchParams` (той самий принцип «фільтри в URL»).
- **Авторизація**: Payload local auth над існуючою колекцією `users` — `payload.login()` у server action, cookie `payload-token`, перевірка `payload.auth({ headers })` у layout `/panel`. Better Auth не додавати (друга система користувачів). Додати rate-limit на логін і роль `editor` поряд з `admin`. Власники студій лишаються в `/kabinet` зі своєю сесією.
- **Екрани (mobile-first, нижній tab-bar)**: 1) **Огляд** — KPI: нові заявки, заявки на власність, правки власників у черзі, студії без Instagram/цін; 2) **Заявки** (`requests`) — список, статус одним тапом, перехід у Telegram/телефон; 3) **Claims** — підтвердити/відхилити, видати лінк на пароль; 4) **Правки власників** — дифф «було/стало» поля за полем, прийняти/відхилити (замінює `admin/OwnerQueue`); 5) **Студії** — пошук, швидке редагування: статус, місто, формати, ціни, Instagram, пости, адреса з повторним геокодуванням; `HistoryList` з версій Payload; 6) **Instagram / перевірки** — `checkedAt`, `websiteAlive`, останній запуск `refresh-status.ts`, кнопка «оновити» через чергу задач.
- **Що лишається в Payload admin**: схема й рідкісні поля (`consent`, медіа, міста, користувачі), масові правки, міграції, ревізії; адмінка доступна лише за `/admin`.
- **Оцінка**: оболонка + логін + токени — 1–1,5 дня; Огляд + Заявки + Claims — 1,5 дня; Правки власників з диффом — 1 день; Студії швидке редагування + історія — 2 дні; Instagram-статус і запуск задач — 1 день; тести і перевірка бандлу — 0,5 дня. **Разом ≈ 7–8 робочих днів** з агентом; MVP (логін + Огляд + Заявки + Claims + Правки) — ≈ 4 дні.
