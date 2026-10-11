# Заміна Payload CMS власним стеком: дизайн-документ

2026-10-11. Лише документ, код не змінювався. Основа: `docs/architecture-audit-2026-10-11.md`, `src/payload.config.ts`, `src/collections/*`, `src/migrations/*`, `scripts/*`, `src/lib/{catalog,ownerAuth,kabinet,telegram}.ts`, маршрути `/kabinet/*` і `/api/telegram/webhook`, локальна БД `hlyna` (815 студій: 488 опубліковано, 327 чернеток; 6 728 рядків у `_studios_v`; 144 міста; 1 728 цін). Еталон стеку: `brocoders/inhouse-ai-starter-kit` (`docs/stack.md`, `docs/decisions.md`, `frontend/DESIGN.md`, `server/src/{auth,db/schema,db/audit}.ts`).

Вимоги Родіона: одна система адміністрування (Payload видаляється повністю); справжня, а не поспішна, mobile-first панель `/panel`; публічні сторінки не завантажують жодного JS панелі; лише безкоштовне або self-hosted; інтерфейс українською.

---

## 0. Що Payload робить для нас сьогодні (інвентаризація)

| # | Функція Payload | Де саме | Чим замінюємо |
|---|---|---|---|
| 1 | Схема БД з колекцій + 11 міграцій (`prodMigrations` на старті сервера) | `src/collections/*`, `src/migrations/*` | Drizzle-схема в `src/server/db/schema/*`, `drizzle-kit generate`, окремий крок `migrate` у `deploy/release.sh` |
| 2 | Типи `payload-types.ts` (використовує ~23 файли, з них 9 скриптів і `lib/*`) | `generate:types` | `InferSelectModel` + Zod-типи; сумісний тип `StudioCard` на час переходу |
| 3 | Чернетки й версії студій (`versions.drafts`, `maxPerDoc: 10`; `_studios_v` + 9 масивних `_studios_v_version_*`) | `Studios.ts` | `studio_revisions` (повні знімки, відновлення) + `change_sets` (зміни власників на перевірку) + `visibility` замість `_status` |
| 4 | Локалізація (лише `uk`): `cities_locales`, `studios_locales`, `_locale` у масивах `services`/`products` | `payload.config.ts` | Звичайні колонки українською; англійська — пізніше окремою таблицею перекладів (див. 2.3) |
| 5 | Завантаження медіа + sharp (7 розмірів: thumbnail, square, small, medium, large, xlarge, og), focal point, папки, Lexical-підпис | `Media.ts` | `src/server/media/*`: перевірка файлу, sharp-варіанти, таблиця `media`, віддача через Caddy |
| 6 | Авторизація адмінів (`users`, `auth: true`, `users_sessions`, pbkdf2) | `Users` | Better Auth, ролі `admin` / `editor` |
| 7 | Власна авторизація власників поруч із Payload (scrypt, HMAC-cookie, блокування після 5 помилок, лінк на пароль на 7 днів) | `lib/ownerAuth.ts`, `StudioOwners.ts`, `/kabinet/api/*` | Той самий Better Auth, роль `owner`, таблиця `studio_owner` |
| 8 | Контроль доступу: `authenticated`, `authenticatedOrPublished`, поля `adminRead` (consent, sources, sourceId, confidence, ownerAbout/News, pendingOwnerChanges), `ownerQuote` лише після схвалення, `adminOnly` у Requests | `src/access/*`, колекції | Явні проєкції в DAL (публічний `select` ніколи не містить внутрішніх колонок) + guard-и ролей у Hono |
| 9 | Хук `ensureUniqueSlug` (транслітерація, `-2`, `-3`) для студій і міст | `hooks/ensureUniqueSlug.ts` | Функція DAL `uniqueSlug()` + `UNIQUE` індекс; історія slug-ів для 301 |
| 10 | Хуки ревалідації (`revalidateTag('studios')` після змін, `disableRevalidate` для скриптів) | `hooks/revalidateCatalog.ts` | `afterCommit` у DAL: ті самі теги; скрипти в кінці викликають `POST /revalidate` |
| 11 | Telegram-сповіщення про новий запит (+ кнопки) | `Requests/hooks/notifyTelegram.ts` | Сервіс `requests.create()` → `notify.telegram()` після коміту |
| 12 | Валідація запиту (honeypot `website2`, обрізання довжин, контакт обов'язковий, email-регулярка) | `Requests/hooks/validateRequest.ts` | Спільна Zod-схема `requestCreate` (форма + API) |
| 13 | Комісія 5 % (`computeCommission`) | `Requests/hooks/computeCommission.ts` | Згенерована колонка Postgres `commission_kop` |
| 14 | Публічна відповідь на створення запиту лише з `id` (`publicCreateResponse`) | `Requests/index.ts` | Hono повертає `{ doc: { id } }` — форма не змінюється (вона читає `json.doc.id`) |
| 15 | Схвалення заявки: створити/доповнити власника, позначити студії `ownerVerified`, видати лінк | `Claims.ts` `onApprove`, Telegram-webhook | Сервіс `claims.approve()` в одній транзакції; викликають панель і Telegram |
| 16 | «Опублікувати чернетку власника», зняття `pendingOwnerChanges` | `Studios.ts` beforeChange, webhook | `changeSets.approve(fields)` |
| 17 | Local API у сторінках і скриптах (`getPayload` у `catalog.ts`, `kabinet.ts`, webhook, 16 скриптів, `pnpm payload run`) | — | Шар доступу до даних `src/server/*` (repo + services), скрипти через `tsx` |
| 18 | REST, що його використовують форми: `POST /api/requests` | `RequestForm.client.tsx` | Hono-маршрут з тим самим шляхом і форматом відповіді |
| 19 | REST/GraphQL для всього іншого (`/api/studios`, `/api/graphql`, playground) | `(payload)/api/*` | Прибираємо. Наш JS їх не використовує (перевірено `grep`) |
| 20 | Адмінка `/admin` з `OwnerQueue` на дашборді, локи документів, налаштування колонок | `(payload)/admin`, `payload_locked_documents`, `payload_preferences` | `/panel`; замість локів — оптимістична перевірка `revision` |
| 21 | Шаблонні залишки: Pages, Posts, Categories, Header/Footer-глобали, плагіни form-builder/search/redirects/nested-docs/seo, Lexical, seed, AdminBar | `src/blocks`, `src/heros`, `plugins` | Видаляємо (у таблицях `redirects` 0 рядків, `pages` — 1 шаблонна сторінка, `posts` — 0) |
| 22 | `jobs` Payload (порожній список задач) | config | Таблиця `jobs` з кита (див. 4.9) |
| 23 | `PAYLOAD_SECRET` (теж ключ HMAC власників) | `.env` | `BETTER_AUTH_SECRET`; сесії власників перевипускаються (див. 7) |

---

## 1. Рекомендація: залишити чи замінити

### Коротко
**Замінити**, якщо ми готові витратити на це 36–46 робочих днів (7–9 тижнів послідовно, 5–6 календарних тижнів із паралельними агентами) і не поспішати. Головна умова в тому, що замінюємо поетапно, публічний сайт за весь час не змінюється ні на піксель, а для перевірки є автоматичне порівняння всіх сторінок до і після. Якщо цих тижнів зараз немає, правильний проміжний крок — фаза 0 цього плану (прибрати шаблон, AdminBar, додати тести і знімки сторінок), а саму заміну відкласти. Варіант «Payload + власна `/panel` поверх Local API» з аудиту дешевший (7–8 днів), але дає дві адмінки і дві системи користувачів. Родіон цей варіант відхилив, і я з цим згоден (аргументи нижче).

### Чому замінювати
1. **Ми вже користуємося Payload лише як ORM і дуже загальною адмінкою.** Публічний сайт читає БД одним запитом у `catalog.ts`, власники ходять в обхід Payload-auth через `/kabinet`, Telegram-кнопки працюють через Local API з `overrideAccess: true`, а 16 скриптів пишуть прямо в базу. Головні процеси (заявки, черга змін власників, статуси запитів) уже живуть у власному коді, і Payload тут — проміжний шар.
2. **Модель чернеток не підходить для перевірки змін власників.** Чернетка в Payload — це вся студія цілком. «Опублікувати» публікує її як є: немає диффа по полях, не можна прийняти ціни й відхилити текст, а паралельна правка адміна і власника перезаписує одна одну. `change_sets` з диффом і прийняттям по полях закривають саме цей процес.
3. **Дві системи користувачів уже є.** Payload `users` (pbkdf2, `users_sessions`) і власний `ownerAuth.ts` (scrypt, HMAC-cookie, лічильник помилок, лінки) підтримуються окремо. Better Auth замінює обидві однією, з rate limit, сесіями в БД і відкликанням сесій.
4. **Адмінка Payload не mobile-first.** Родіон працює з телефону і Telegram. Таби, sidebar-поля і масиви в адмінці Payload на 390 px незручні, а швидких дій (статус одним тапом, дифф, KPI) там немає.
5. **Вага й зв'язаність.** 12 пакетів `@payloadcms/*`, Lexical, GraphQL, Prism; ~60 файлів шаблону; збірка Docker вимагає фіктивних `DATABASE_URL`/`PAYLOAD_SECRET`; кожен апдейт Next чекає сумісного релізу Payload (Payload 3.90 жорстко прив'язаний до мінорних версій Next). Плюс `AdminBar` робить `fetch('/api/users/me')` на кожному перегляді.
6. **Схема.** Payload створює ~110 таблиць (з них ~25 для студій: масиви, локалі, rels, версії), enum-и з довгими назвами і `numeric` для цілих. Власна схема має ~20 таблиць і легко читається в `psql`, у скриптах і для агента.
7. **Узгодженість з китом Brocoders.** Hono + Zod + Drizzle + Better Auth + компоненти `inhouse/*` — перевірені рішення з готовими патернами (audit, tracking, ролі, rate limit, `PagedList`). Агентові простіше працювати за записаними правилами, ніж за магією конфігурації CMS.

### Чому залишити (чесні мінуси заміни)
1. **Безкоштовна загальна адмінка зникає.** Payload сам дає списки, пошук, фільтри, редактор масивів, завантаження, керування користувачами і медіа. Усе це доведеться побудувати й підтримувати: орієнтовно 3–4 тижні з 7–9 (фази 5–7).
2. **Альтернативна вартість.** Ці тижні не підуть на контент, SEO і запити, а це головна мета проєкту (AGENTS.md: «requests and traffic»).
3. **Ризик даних.** Перенесення масивів, локалей, версій і медіа може тихо загубити рядок. Потрібні звірка і знімки сторінок (розділ 6).
4. **Безпеку пишемо самі.** Права в Hono-маршрутах — наш код. Помилка в guard-і є дірою, яку Payload раніше закривав декларативно. Потрібні тести прав на кожен маршрут.
5. **Better Auth швидко змінюється** (кит: «1.7.0 broke things, 1.7.3 reverted part of it»). Треба точний pin і читання upgrade guide на кожному мінорі.
6. **Зникає «безкоштовна» англійська локалізація.** Її доведеться додати таблицею перекладів, коли знадобиться. Зараз англійської немає, тож це відкладена, а не поточна вартість.

### Ризики заміни і як їх знімаємо
| Ризик | Пом'якшення |
|---|---|
| Зміна публічних сторінок (SEO, LLM-цитування) | Сумісний шар `StudioCard` на перехід; знімок усіх URL із sitemap до/після, diff має бути нульовим |
| Втрата даних при міграції | Ідемпотентний мігратор, звірка кількостей і поле-в-поле через старий Local API проти нового DAL; репетиції на дампі проду |
| Діри в правах | Матриця тестів «роль × маршрут» на реальному Postgres; owner-whitelist полів як Zod-схема |
| Простій під час переходу | Нове працює паралельно в схемі `app`; перемикання — один реліз; відкат — попередній образ + дамп |
| Недороблена панель у день перемикання | Перемикаємо лише після того, як `/panel` покриває все з таблиці розділу 0; критерії готовності у фазі 8 |

---

## 2. Цільова архітектура (той самий Next.js-застосунок)

### 2.1 Структура коду
```
src/
  app/
    (frontend)/            публічний сайт — без змін маршрутів
    (panel)/panel/         окремий root layout, свій CSS, свій бандл
    api/[[...route]]/route.ts   Hono: export const GET/POST/... = handle(app)
    revalidate/route.ts    як зараз
  server/                  лише сервер ('server-only' у кожному index)
    db/
      schema/*.ts          Drizzle (pgSchema 'app')
      index.ts             pg Pool + drizzle()
      tracking.ts audit.ts revisions.ts   з кита, адаптовано
    repo/                  запити: studios, cities, requests, claims, media, users, changeSets
    services/              бізнес-операції в транзакціях: claims.approve, changeSets.apply, requests.create…
    catalog/               публічне читання (кеш, теги, сумісний StudioCard)
    auth/                  Better Auth instance, ролі, guards
    api/                   Hono sub-apps: public, kabinet, panel, telegram
    media/                 sharp, збереження, варіанти
    notify/telegram.ts     нинішній lib/telegram.ts
  shared/
    schemas/*.ts           Zod: requestCreate, claimCreate, ownerStudioEdit, studioEdit, cityEdit…
    options.ts             STUDIO_TYPES, STUDIO_FORMATS, статуси (з колекцій)
  components/
    site/                  як є
    panel/ui/*             shadcn Base UI з кита (не редагуємо)
    panel/inhouse/*        PageHeader, PagedList, FilterBar, StatusBadge, KpiCard, HistoryList, ConfirmDialog, FormField, EmptyState, Choice…
    panel/shell/*          sidebar, tab-bar, user-menu
scripts/                   ті самі скрипти, `tsx` + `src/server/*`
drizzle/                   згенеровані SQL-міграції (не редагуються після застосування)
```
Правила ESLint `no-restricted-imports`: `(frontend)` і `components/site` не імпортують `components/panel`, `@tanstack/*`, `better-auth/react`; `components/*` не імпортують `src/server/*` напряму (лише через server components / API).

### 2.2 Чому Hono всередині Next, а не лише route handlers / server actions
- Одне місце для всіх HTTP-меж: публічні форми, кабінет, панель, Telegram-webhook, `/api/auth/*`. Middleware (request id, auth, роль, rate limit, перевірка `Origin` для cookie-POST) пишемо один раз.
- `@hono/zod-validator` з тими самими схемами, що й у формах; типізований клієнт `hc<PanelApi>` для панелі.
- **Тестованість**: `app.request('/api/panel/studios/1', …)` проти реального Postgres, без запуску Next. Server actions так не протестуєш.
- Монтування: `src/app/api/[[...route]]/route.ts` з `handle(app)` з `hono/vercel` (працює і на Node), `runtime = 'nodejs'`. Шляхи, які вже існують, зберігаємо: `/api/requests`, `/api/telegram/webhook`, `/kabinet/api/*` (для `/kabinet/api/*` лишаємо тонкі route handlers, що делегують у ті самі Hono sub-app, або переносимо на `/api/kabinet/*` разом з клієнтом; рекомендую перенести і залишити 308-редиректи на один реліз).
- Читання для серверних сторінок панелі йде напряму через `src/server/repo` у server components (перший рендер без клієнтських запитів). Мутації та підвантаження сторінок списку йдуть через Hono.

### 2.3 Drizzle-схема
Усі нові таблиці живуть у Postgres-схемі **`app`** (`pgSchema('app')`, `drizzle.config.ts` → `schemaFilter: ['app']`). Тоді drizzle-kit ніколи не бачить і не чіпає таблиць Payload у `public`, нова і стара схеми живуть паралельно до перемикання, а мігратор копіює дані між ними в одній БД.

Конвенції з кита: snake_case; `timestamptz`; на кожній таблиці `withTracking()` (`created_at`, `updated_at`, `created_by`, `updated_by`); гроші — цілі копійки; м'яке видалення `deleted_at` там, де видалення має історію. **ID студій, міст, запитів, заявок і медіа зберігаємо цілими і переносимо як є**: на них посилаються Telegram-повідомлення (`c:a:<id>`, `r:w:<id>`), нотатки і логи.

**Каталог**
- `cities`: `id`, `slug` UNIQUE, `name`, `oblast`, `population int`, `is_over_100k bool`.
- `studios` (одна широка таблиця, бо всі поля 1:1 з профілем):
  - ідентичність: `id`, `slug` UNIQUE, `name`, `type` (enum як `STUDIO_TYPES`), `status` (`active|unclear|closed|relocated`), `visibility` (`public|hidden`, замість `_status`), `confidence`, `source_id` UNIQUE, `revision int` (оптимістичне блокування);
  - місце: `city_id` FK, `oblast`, `address`, `geo_lat`/`geo_lng` (`double precision`), `geo_precision`, `geo_geocoded_at`, `geo_source`;
  - тексти: `summary`, `public_description`, `recent_note`, `description_internal`, `owner_about`, `owner_news`, `owner_quote`, `owner_quote_approved`;
  - контакти: `instagram`, `website`, `facebook`, `phone`, `email`;
  - b2b: `b2b_min_order`, `b2b_lead_time`, `b2b_food_safe`, `b2b_dishwasher_safe`, `b2b_works_with_horeca` (index), `b2b_works_with_corporate`;
  - активність: `activity_last_post_date date`, `activity_posts_90d int`, `activity_followers int`, `activity_website_alive bool`, `activity_etsy_sales int`, `activity_checked_at`;
  - згода: `consent_photos`, `consent_requests` (index), `consent_contacted_at`, `consent_notes`;
  - власники: `owner_verified bool`;
  - **списки рядків — `text[]`**: `alternate_names`, `formats` (CHECK на допустимі значення, GIN-індекс), `services`, `products`, `sales_channels`, `other_links`, `sources`, `instagram_posts` (CHECK `cardinality ≤ 3`), `b2b_logo_methods`.
  - `pending_owner_changes` як колонку **не** зберігаємо: це `EXISTS(change_sets WHERE status='pending')`.
- `studio_prices`: `id`, `studio_id` FK cascade, `position`, `text`, `source`, `date_text`; у майбутньому `amount_min`, `amount_max`, `currency` (парсер з `priceIndex.ts` один раз пише числа, і всі сторінки беруть ту саму цифру; це закриває пункт 3 аудиту). Ціни мають власну таблицю, бо це головна цінність сайту: у кожного рядка своє джерело й дата, по них будуємо індекс цін, а в диффі змін власника потрібна точність до рядка.
- `studio_photos`: `studio_id`, `media_id`, `position`, PK (`studio_id`, `media_id`).
- `studio_slug_history`: `studio_id`, `old_slug` UNIQUE, `changed_at` — профіль за старим slug віддає 301 (зараз зміна slug просто ламає URL).

**Чому `text[]`, а не JSONB і не дочірні таблиці.** Сервіси, продукція, назви, посилання й джерела — це впорядковані списки рядків без власних атрибутів. Масив Postgres зберігає порядок, у Drizzle він типізований, фільтрується через `@>`/GIN і читається в `psql`. Окрема таблиця на кожен такий список (як у Payload: 9 таблиць) нічого не дає. JSONB лишаємо для знімків, диффів і варіантів медіа.

**Чому не таблиця перекладів зараз.** Сайт лише українською (AGENTS.md: англійська «later»). Коли з'явиться `/en`, додаємо `studio_translations(studio_id, locale, summary, public_description, recent_note, services text[], products text[])` і `city_translations` з fallback на українські колонки. Це одна міграція, сторінки й панель від неї не залежать.

**Запити і заявки**
- `requests`: усі поля форми (`what` enum, `details`, `studio_name`, `studio_links`, `photo_consent`, `quantity`, `deadline`, `budget_per_item`, `city`, `logo`, `contact_name`, `contact_phone_or_telegram`, `contact_email`, `source_page`), внутрішні `status` (enum як `REQUEST_STATUS_OPTIONS`, index), `deal_amount_kop bigint`, **`commission_kop bigint GENERATED ALWAYS AS (round(deal_amount_kop * 0.05)) STORED`**, `notes`, `ip_hash` (для антиспаму, не IP).
- `request_studios`: `request_id`, `studio_id`, `sent_at` (кому переслано).
- `claims`: `id`, `status` (`pending|approved|rejected`), `name`, `contact`, `represents`, `reject_reason`, `link_to_owner_id` → `user.id`, `owner_id` → `user.id`, `decided_by`, `decided_at`, `notes`.
- `claim_studios`: `claim_id`, `studio_id`, `is_main bool`.

**Люди (Better Auth + наше)**
- `user`, `session`, `account`, `verification`, `rate_limit` — колонки, які генерує `@better-auth/cli` (як у кита), у схемі `app`. Додаткові поля `user`: `role` (`admin|editor|owner`), `active`, `login_display`, `failed_logins`, `lock_until`, `last_login_at`, `telegram_note`.
- `studio_owner`: `user_id`, `studio_id`, `granted_by`, `granted_at`, PK (`user_id`, `studio_id`).

**Медіа**
- `media`: `id`, `file_name` (як у Payload, щоб не перейменовувати файли), `mime`, `size`, `width`, `height`, `sha256` (дублікати), `alt`, `caption text` (замість Lexical), `focal_x`, `focal_y`, `variants jsonb` (`{thumbnail:{file,w,h,size}, …}`), `status` (`active|pending|orphan`), `uploaded_by`.

**Історія та процеси**
- `studio_revisions`: `id`, `studio_id`, `revision int`, `snapshot jsonb` (студія + ціни + фото), `actor_id`, `source` (`panel|owner-approve|telegram|script:<name>|migration|payload-version`), `note`, `created_at`. Тримаємо 50 останніх на студію (≈ 815 × 50 × ~4 КБ ≈ 160 МБ у найгіршому випадку; реально менше). Знімок дає «відновити цю версію».
- `audit_log` (кит): `at`, `actor_id`, `entity`, `entity_id`, `action`, `changes jsonb` (дифф по полях, контакти редагуються як у кита `redact`), `source`, `request_id`. Пишеться для всіх сутностей. Для студій журнал і ревізії доповнюють одне одне: журнал швидко відповідає «хто що змінив», ревізії дають відновлення.
- `change_sets`: `id`, `studio_id`, `author_id` (власник), `status` (`pending|applied|partially_applied|rejected|superseded`), `base_revision`, `proposed jsonb` (лише поля з owner-whitelist), `new_media_ids int[]`, `applied_fields text[]`, `decided_by`, `decided_at`, `decision_note`. Одна відкрита `pending` на студію: повторне збереження власника оновлює її, а не плодить нові.
- `jobs` (кит, ~80 рядків, `FOR UPDATE SKIP LOCKED`): перевірка сайтів, генерація варіантів медіа, нічні звірки.
- `import_runs`: `script`, `started_at`, `finished_at`, `counts jsonb`, `note` — скрипти Instagram/геокодування пишуть сюди, панель показує стан.

### 2.4 Міграції
- `drizzle-kit generate` → SQL у `drizzle/`, переглядаємо очима, комітимо. Правило кита: застосовану міграцію не редагуємо ніколи, лише нова. Перенести з кита `check-repo.mjs`-перевірку і hook, що забороняє редагувати старі міграції.
- Застосування в проді — окремий крок `deploy/release.sh` перед перемиканням контейнера: `backup.sh` → `docker compose run --rm app node dist/migrate.js` → `up -d`. Не на старті сервера, як зараз у Payload: невдала міграція тоді не кладе сайт, а зупиняє реліз.
- Збірка Docker більше не потребує фіктивних `DATABASE_URL`/`PAYLOAD_SECRET` під Payload. `BUILD_WITHOUT_DB=1` лишається, бо сторінки ревалідуються після деплою.

### 2.5 Шар доступу до даних (замість Payload Local API)
- `repo/*` — тонкі функції на Drizzle, фільтри й пагінація в SQL (keyset за `(updated_at desc, id)`), явні `select`-проєкції: `publicStudioColumns` ніколи не містить `consent_*`, `sources`, `source_id`, `confidence`, `owner_about`, `owner_news`, `description_internal`; `owner_quote` повертається лише при `owner_quote_approved`.
- `services/*` — операції, що змінюють більше одного рядка, у `db.transaction()`. Кожен запис студії: перевірка `revision` → update → `studio_revisions` + `audit_log` → після коміту ревалідація й сповіщення. Сигнатура: `studios.update(id, patch, { actor, source, expectedRevision, revalidate })`.
- **Публічне читання** (`server/catalog`): `loadStudiosRaw()` повертає **рівно ту саму форму**, що сьогодні (`StudioCard`: `services: {text}[]`, `b2b: {...}`, `activity: {...}`, `geo: {...}`, `cityDoc`, `_status: 'published'`) через маппер `toLegacyStudio()`. `unstable_cache`, ключі і тег `studios` не змінюються. Так `lib/*.ts` (catalog, present, priceIndex, topics, waveA/B/C, mapData…) і сторінки не треба чіпати на момент перемикання. Після перемикання тип поступово спрощуємо окремими PR.
- **Скрипти**: `pnpm script <name>` → `tsx scripts/<name>.ts`; `HLYNA_SCRIPT=1` лишається (читання без Next-кешу). Записи йдуть через `services.studios.update(..., { source: 'script:import-ig', revalidate: false })`, і в кінці один `POST /revalidate`. Правило «не чіпати студії з відкритою зміною власника» стає одним SQL-фільтром.

### 2.6 Валідація: спільні Zod-схеми
`src/shared/schemas/*` використовуються в трьох місцях: клієнтська форма (`safeParse` при відправці, повідомлення під полем), Hono (`zValidator`) і скрипти імпорту. Повідомлення українською, ті самі, що зараз у `validateRequest.ts` і кабінеті. Приклади:
- `requestCreate`: ліміти довжин з `TEXT_LIMITS`, `trim`, honeypot `website2` має бути порожнім, `refine` «телефон або email», формат email.
- `ownerStudioEdit`: **whitelist** полів власника (`OWNER_FIELDS`) — сама схема і є правом доступу; URL нормалізуються; Instagram-пости за регуляркою; ≤40 цін, ≤10 фото.
- `studioEdit` (панель): повна форма; `cityEdit`, `claimDecision`, `requestStatus`, `userInvite`.

### 2.7 Ревалідація
- Після коміту в `services`: `revalidateTag('studios')` (як зараз). Додатково, для точності: `studio:<slug>` і `city:<slug>`, коли сторінки почнуть їх використовувати. Обгортка `safeRevalidate()` ковтає помилку поза Next (скрипти), як зараз.
- Скрипти і деплой: `POST /revalidate?secret=…`, як зараз.
- Зміна slug: запис у `studio_slug_history`, ревалідація старого і нового шляху, sitemap.

---

## 3. Авторизація: Better Auth для адмінів і власників

### 3.1 Чому одна система і чому Better Auth
- Зараз дві системи: Payload `users` (адмін) і рукописний `ownerAuth.ts`. Рукописна зроблена акуратно (scrypt, `timingSafeEqual`, відбиток пароля в cookie, блокування), але сесії живуть лише в cookie: відкликати конкретну сесію не можна, rate limit тримається в пам'яті процесу, тестів немає.
- Better Auth дає сесії в БД (видно активні, можна відкликати), rate limit зі сховищем у БД, перевірку `Origin`/CSRF, `revokeSessionsOnPasswordReset`, Drizzle-адаптер, і кит уже має робочу конфігурацію з поясненнями щодо IP за Caddy. Self-hosted і безкоштовно.
- **Аргумент проти**: ще одна залежність, що швидко змінюється. Тому точний pin (кит: 1.7.5; ніколи 1.7.0–1.7.2), upgrade guide на кожен мінор і тести auth-маршрутів. Альтернатива «лишити власний `ownerAuth` і дописати адмінів» дешевша на 1–2 дні, але тоді rate limit, відкликання сесій, CSRF і запрошення пишемо й тестуємо самі. Чесно: обидва варіанти робочі; Better Auth обираю заради узгодженості з китом і меншого обсягу коду безпеки, який треба підтримувати.

### 3.2 Ролі та права
| Роль | Доступ |
|---|---|
| `admin` | Усе в `/panel`, зокрема користувачі, ролі, жорстке видалення, відновлення версій, медіа-чистка |
| `editor` | Студії, міста, медіа, запити, заявки, зміни власників, журнал (читання). Без керування користувачами і жорсткого видалення |
| `owner` | Лише `/kabinet` і `/api/kabinet/*` для студій зі `studio_owner`. Доступу до `/panel` немає |

Роль зберігається в колонці `user.role` з `input: false`, плюс наші guard-и: `requireRole('editor')` в Hono і `requirePanelUser()` у layout `/panel`. Плагін organization не використовуємо (кит: «organization plugin is multi-tenancy»). Плагін `admin` не потрібен: бан робимо через `active=false` + видалення сесій.

### 3.3 Логін власника: email або телефон
Власники зараз входять за email **або номером телефону**. Better Auth вимагає `email` у `user`, тому:
- плагін **`username`**: `username` = нормалізований логін (`normalizeLogin()`: email у нижньому регістрі або `380…`), вхід через `signIn.username`;
- якщо логін — телефон, `email` = службова адреса `owner-<id>@owners.hlyna.invalid` (домен `.invalid` гарантовано не існує, і лист туди ніколи не піде); `login_display` показує людині її логін;
- адміни входять за email + паролем.

### 3.4 Паролі і перенесення хешів
- Власники: `scrypt$salt$key` (Node `scryptSync`, N=16384, r=8, p=1, 64 байти). Better Auth дозволяє свої `emailAndPassword.password.{hash, verify}`. Використовуємо наші функції з `ownerAuth.ts` (вони вже протестовані часом), тож **паролі власників переносяться без скидання**.
- Адміни Payload (pbkdf2, 1 обліковий запис): пароль не переносимо, після міграції видаємо лінк скрипта `pnpm script user-invite --email … --role admin`.

### 3.5 Лінки на пароль без платної пошти
Як і зараз, пошту не надсилаємо: лінк бачить адмін і пересилає сам (Instagram, Telegram), або бот надсилає його в чат Родіона з готовим текстом.
- `emailAndPassword.sendResetPassword({ user, url })` не відправляє лист. Він записує лінк у таблицю `invite_links_outbox` (лише для показу адміну, TTL 7 днів) і викликає `notifyOwnerTelegram(['Лінк для <імені>', url])`.
- Публічний маршрут `/api/auth/request-password-reset` **вимкнено** (`disabledPaths` або `hooks.before` → 404). Лінк генерує лише сервер: `claims.approve()`, кнопка «Новий лінк» у `/panel/korystuvachi/:id` і Telegram-кнопка «Схвалити».
- `resetPasswordTokenExpiresIn: 7 * 86400`; токен одноразовий (Better Auth видаляє його з `verification` після використання).
- Сторінка `/kabinet/parol?token=…` (URL той самий) просить логін + пароль. Наш маршрут перевіряє унікальність логіна, ставить `username`, викликає `auth.api.resetPassword` і одразу логінить.
- «Забули пароль» для власника: кнопка «Напишіть нам» (Instagram / Telegram), як зараз. Магічні лінки поштою можна ввімкнути пізніше, лише якщо Родіон погодиться на поштовий сервіс.

### 3.6 Сесії, ліміти, блокування
- Сесії в БД: адміни/редактори — 7 днів з продовженням (`updateAge` 1 день); власники — 30 днів, як зараз (`session.expiresIn` залежно від ролі через `hooks.after` на sign-in, або однакові 30 днів для простоти; рекомендую 30/7 за роллю).
- Rate limit Better Auth, `storage: 'database'` (переживає рестарт): `/sign-in/*` 3 спроби / 10 с з IP (як у кита), `/reset-password` 10 / 15 хв. IP з `X-Forwarded-For`, який ставить Caddy (пояснення кита дослівно застосовне до нашого `Caddyfile`).
- Блокування облікового запису після 5 невдалих паролів на 15 хв (як зараз): `hooks.before`/`after` на sign-in оновлюють `failed_logins`/`lock_until`.
- `active=false` → `auth.api.revokeUserSessions` + guard відкидає сесію одразу.
- Публічні форми (запити, заявки, перевірка студії) мають наш лімітер у Postgres (таблиця `rate_limit` Better Auth або своя `rl_bucket`), а не `Map` у пам'яті.
- Cookie: `httpOnly`, `secure`, `sameSite=lax`, один cookie `hlyna.session_token` на весь сайт. Власник, що відкрив `/panel`, отримує 403 і посилання в кабінет.

---

## 4. `/panel`

### 4.1 Окремий бандл
- `src/app/(panel)/panel/layout.tsx` — **окремий root layout** (`<html>` своє), шрифт Inter з `next/font/local`, `panel.css` з токенами кита (`DESIGN.md`: background/card/primary/muted/positive/negative/warning/chart-1…6, темна тема через `[data-theme=dark]`). У Tailwind 4 два CSS-входи з `@source`, обмеженими своїми директоріями, тож класи панелі не потрапляють у CSS сайту, і навпаки.
- Клієнтські залежності панелі (`@tanstack/react-query`, `@tanstack/react-virtual`, Base UI, `better-auth/react`, MapLibre для гео-превʼю, Recharts ліниво) імпортуються лише з `components/panel/*`.
- `robots: noindex`, `/panel` виключено з sitemap і `robots.txt`.
- **Перевірка, а не обіцянка**: скрипт `scripts/check-bundles.mjs` після `next build` читає маніфести клієнтських чанків для кожного публічного маршруту і падає, якщо там є модулі з `components/panel`, `@tanstack`, `@base-ui`, `better-auth`. Плюс бюджет кита: 200 КБ першого рендеру панелі.
- Публічний сайт нічого не втрачає: `AdminBar` і запит `/api/users/me` зникають разом із Payload.

### 4.2 Що беремо з кита і що ні
**Беремо**: `components/ui/*` (shadcn, стиль base-nova, не редагуємо руками), `components/inhouse/*` (`PageHeader`, `PagedList`, `FilterBar`, `StatusBadge`, `KpiCard`, `HistoryList`, `ConfirmDialog`, `FormField`, `EmptyState`, `RefreshButton`, `Choice`, `BarList`, `CategoryBar`, `PeriodPicker`), `shell/*` (`app-sidebar`, `tab-bar`, `pull-to-refresh`, `user-menu`), `lib/format.ts` (переписати на `uk-UA`, `Europe/Kyiv`), `t()` з `uk.ts` замість `en.ts` (множини через `Intl.PluralRules('uk')`), `DESIGN.md` і `check-frontend.mjs` (адаптувати шляхи), патерни `audit.ts`/`tracking.ts`/`jobs`.
**Не беремо**: Vite SPA і TanStack Router (маршрути дає App Router), PWA (можна пізніше, якщо Родіон захоче іконку на телефоні), Resend/пошту.

Фільтри в URL: `searchParams` у server component для першої сторінки + `useSearchParams`/`router.replace` у `FilterBar`. Посилання показує колезі той самий список.
Списки: перша сторінка рендериться на сервері й гідратується в TanStack Query, далі `PagedList` (keyset + віртуалізація) тягне `/api/panel/...?after=…`.
Оптимістичні дії: статус запиту, схвалити/відхилити, прийняти поле — `useMutation` з `onMutate` (миттєвий UI), відкат і toast при помилці; сервер повертає новий `revision`.

### 4.3 Оболонка і телефон
- Телефон (390 px): нижній `tab-bar` з 5 пунктів — **Огляд · Запити · Черга · Студії · Ще** (Ще: Міста, Медіа, Користувачі, Instagram, Журнал). На десктопі — `app-sidebar` з усіма пунктами і лічильниками.
- Таблиці під 640 px стають карт-рядками ≥44 px; деталі — окрема сторінка або нижній drawer; `pb-24` під tab-bar; жодного горизонтального скролу.
- Форми: `<fieldset disabled>` під час збереження, помилки під полями (відповідь сервера має пріоритет), кнопка `type="submit"`, на телефоні липка панель «Зберегти» внизу.

### 4.4 Екрани
| Екран | URL | Що робить |
|---|---|---|
| **Огляд** | `/panel` | KpiCard: нові запити (7/30 днів), у роботі, угоди й комісія за місяць; заявки на профіль у черзі; зміни власників у черзі; студії без Instagram / без цін / без геокоду / «не перевірено > 90 днів»; публічні vs приховані. Під ними коротка черга «що зробити зараз» (посилання на кожен пункт). |
| **Запити** | `/panel/zapyty` | Список з фільтрами (статус, тип `what`, місто, період), пошук по імені/контакту/деталях. Статус одним тапом (оптимістично), «Кому переслано» (пошук студій з `consent_requests`), сума угоди → комісія показується одразу, нотатки, кнопки «Написати в Telegram / подзвонити / email» з контакту. |
| **Заявки на профіль** | `/panel/zayavky` | Картка: студії, контакт, **підказка звірки** (публічний Instagram/сайт/телефон студії поруч з контактом заявника), «Існуючий власник» (пошук). «Схвалити» → `claims.approve()` → лінк видно один раз + кнопки «Скопіювати повідомлення для студії» / «Надіслати собі в Telegram». «Відхилити» з причиною. |
| **Зміни від власників** | `/panel/zminy` | Список відкритих `change_sets`. Деталь: **дифф поле за полем** (було → стало; для списків — додані/видалені рядки; для цін — рядок із джерелом «від студії, MM.YYYY»; фото — превʼю нових з alt). Біля кожного поля прапорець «прийняти». Тексти `owner_about`/`owner_news` позначено «лише внутрішнє — перепишіть», поруч поле «Опис для сайту» для переписування в тому ж екрані. «Схвалити цитату». Кнопки: «Прийняти вибране», «Прийняти все крім тексту» (як Telegram-кнопка зараз), «Відхилити» з нотаткою. |
| **Студії: список** | `/panel/studii` | Пошук (назва, інші назви, slug, Instagram, сайт), фільтри: місто, тип, статус, видимість, формати, HoReCa, згода на запити, «є зміни власника», «без цін», «без гео», «підтверджено власником». Масові дії (адмін): змінити статус/видимість, додати формат. CSV-вивантаження. |
| **Студія: редагування** | `/panel/studii/:id` | Секції (таби на десктопі, акордеон на телефоні): Основне (назва, інші назви, тип, місто, область, статус, видимість, slug з попередженням про 301), Тексти (summary з лічильником 160, опис для сайту, «що нового», внутрішній опис, тексти власника + цитата), Формати (чіпи-чекбокси), Послуги / Продукція / Де продає / Посилання / Джерела (редактор списку: додати, видалити, вгору/вниз; на десктопі перетягування), **Ціни** (рядки: текст, джерело, дата; підсвітка розпізнаної суми), **Фото** (завантаження з обов'язковим alt, порядок, прапорець згоди — без згоди фото не показуються, як зараз), B2B, Контакти, **Гео** (lat/lng, точність, «Геокодувати» через Nominatim з кешем ≤1 запит/с, мінімапа MapLibre лише в панелі), Активність (Instagram-пости ≤3, дати, лічильники), Згода, Власники (хто керує, лінки). Вкладка **Історія**: `HistoryList` з ревізій, дифф між двома версіями, «Відновити» (адмін). При конфлікті `revision` (хтось зберіг раніше) — 409 і дифф «ваші зміни / нові на сервері». Кнопка «Відкрити на сайті». |
| **Міста** | `/panel/mista` | Список з кількістю студій, редагування назви, slug (з 301), області, населення, 100k+. |
| **Медіа** | `/panel/media` | Сітка, фільтр «чиє», «не прив'язані», «на перевірці»; alt/підпис; видалення лише неприв'язаних (адмін); заміна файлу з перегенерацією варіантів. |
| **Користувачі** | `/panel/korystuvachi` | Адміни, редактори, власники; запросити (лінк), змінити роль (адмін), деактивувати (сесії відкликаються), «Новий лінк на пароль», студії власника (додати/прибрати), активні сесії, останній вхід. |
| **Instagram-оновлення** | `/panel/instagram` | Стан даних, а не запуск браузера (Instagram оновлюється з локального Claude in Chrome): частка студій з `activity_checked_at` за 30/90 днів, без Instagram, останній пост > 12 міс., `website_alive=false`; останні `import_runs` (скрипт, коли, скільки змінено); черга «перевірити далі» з CSV для `ig_queue.tsv`. Кнопка «Перевірити сайти» ставить задачу `refresh-status` у `jobs` (серверний fetch, без Instagram). |
| **Журнал змін** | `/panel/zhurnal` | `audit_log`: фільтри сутність / хто / джерело / період, дифф у рядку, посилання на запис. |

### 4.5 Що замінює чернетки
- **Зміни власників** → `change_sets` (pending, дифф, прийняття по полях). Опубліковані дані студії змінюються лише при схваленні. Власник у кабінеті бачить «На перевірці з 12.10» і свої запропоновані значення в полях.
- **Нові фото власника** зберігаються як `media.status='pending'` і прив'язуються до студії лише при схваленні. Відхилені за 30 днів чистить задача.
- **Правки адміна** публікуються одразу. Захистом служать ревізії з відновленням і журнал. Прихована студія (`visibility='hidden'`) — це заміна «чернетки» для студій поза scope (зараз 327). Окремий режим «зберегти без публікації» для адміна не робимо: на практиці він не використовується. Якщо знадобиться, адмін теж може створити `change_set` («Зберегти як пропозицію»).
- **Скрипти** пропускають студії з відкритим `change_set` (як зараз — з чернеткою власника).
- **Telegram-кнопки**: «Схвалити заявку» → `claims.approve()`; «Опублікувати» → `changeSets.apply(all except owner text)`; статуси запитів — `requests.setStatus()`. Посилання в кнопках ведуть на `/panel/...`; для старих повідомлень Caddy/Next редиректить `/admin/collections/{studios,claims,requests}/:id` → `/panel/{studii,zayavky,zapyty}/:id`.

---

## 5. Медіа і бекапи

- **Сховище**: той самий Docker-volume `media` (зараз змонтований у `/app/public/media`), файли й імена Payload лишаються як є. Нові файли пишемо туди ж: `<slug>-<timestamp>-<n>.<ext>` + варіанти `-<w>x<h>`.
- **Віддача**: Caddy `handle_path /media/*` → `file_server` з volume, змонтованого в Caddy read-only, `Cache-Control: public, max-age=31536000, immutable`. Payload зараз віддає медіа через свій маршрут `/api/media/file/<name>`; додаємо 301 `/api/media/file/*` → `/media/*` (на випадок закешованих посилань). Next не віддає з `public/` файли, що з'явилися після збірки, тому Caddy тут — найпростіший надійний шлях.
- **Обробка (sharp)**: перевірка за вмістом (`sharp.metadata()`; лише jpeg/png/webp), ≤8 МБ, `rotate()` за EXIF і **видалення EXIF/GPS** (метадані фото студій можуть містити координати), ліміт пікселів. Варіанти: thumbnail 300, square 500×500, small 600, medium 900, large 1400, xlarge 1920, og 1200×630 (як у Payload) + WebP-версії великих. Генерація синхронна для одного фото; масова перегенерація — задача `jobs`.
- **`next/image`** публічних сторінок працює з `/media/...` без змін (`remotePatterns` не потрібні, це той самий хост).
- **Бекапи**: `deploy/backup.sh` уже дампить БД і тарить `media`; додаємо (а) прогін `restore.sh` у тимчасову БД раз на місяць з перевіркою кількостей, (б) копію бекапу поза сервером (`rsync` на машину Родіона або безкоштовний варіант; платне сховище лише з його згоди), (в) обов'язковий бекап перед кожною міграцією в `release.sh`.

---

## 6. Перенесення даних з таблиць Payload

### 6.1 Підхід
- Скрипт `scripts/migrate-from-payload.ts`: читає таблиці `public.*` Payload прямим SQL (не через Payload, щоб не залежати від нього після видалення) і пише в `app.*` в одній транзакції: `TRUNCATE app.* RESTART IDENTITY` → вставка → `setval` послідовностей на `max(id)`. **Ідемпотентний**: можна запускати скільки завгодно разів на копіях проду.
- Перед перемиканням на кожній репетиції: свіжий дамп проду → локальна БД → мігратор → звірка → знімки сторінок.

### 6.2 Відповідність таблиць
| Payload | → `app` | Деталі |
|---|---|---|
| `studios` (опубліковані й чернетки) | `studios` | `_status='published'` → `visibility='public'`, `draft` → `hidden`. `b2b_*`, `activity_*`, `consent_*`, `geo_*` 1:1; `numeric` → `int`/`double` з перевіркою, що дробових значень немає |
| `studios_locales` (`_locale='uk'`) | `studios.summary/public_description/recent_note/description_internal` | Інші локалі — перевірка, що їх 0 |
| `studios_services`, `studios_products` (`_locale='uk'`, за `_order`) | `services[]`, `products[]` | |
| `studios_alternate_names`, `_other_links`, `_sales_channels`, `_sources`, `_activity_instagram_posts`, `studios_formats`, b2b `logo_methods` | відповідні `text[]` | порядок за `_order` |
| `studios_prices` | `studio_prices` | `position` = `_order` |
| `studios_rels` (`path='photos'`) | `studio_photos` | порядок за `order` |
| `_studios_v` + `_studios_v_version_*` + `_studios_v_locales` + `_studios_v_rels` | `studio_revisions` (`source='payload-version'`) | Знімок зібраний з версії; останні 10 на студію (стільки й тримав Payload) |
| `_studios_v` з `latest=true`, `version__status='draft'`, `version_pending_owner_changes=true` при опублікованому основному рядку | `change_sets` (pending) | `proposed` = різниця owner-полів між версією і основним рядком. Локально таких 0; у проді — скільки є. Перед перемиканням чергу краще розібрати до нуля. **Перевірити на дампі**, що Payload 3 при збереженні чернетки опублікованого документа не змінює основний рядок (так працює `draft: true`), — інакше джерело правди інше |
| `cities` + `cities_locales` | `cities` | |
| `requests` + `requests_rels` | `requests` + `request_studios` | `deal_amount` грн → `deal_amount_kop`; `commission5` не переносимо — генерується, звіряємо |
| `claims` + `claims_rels` | `claims` + `claim_studios` | `invite_link` не переносимо (див. нижче) |
| `studio_owners` + `_rels` | `user` (role `owner`) + `account` (`provider_id='credential'`, `password` = наш scrypt) + `studio_owner` | `login` → `username`; `failed_logins`, `lock_until`, `last_login_at` 1:1. Невикористані інвайт-токени не переносяться: для таких власників після перемикання генеруємо нові лінки (список у чекліст) |
| `users` | `user` (role `admin`) | без пароля → новий лінк |
| `media` (+ `sizes_*`) | `media` (`variants` jsonb) | файли не чіпаємо; перевірка, що кожен файл існує на диску |
| `pages`, `posts`, `categories`, `forms*`, `form_submissions*`, `search*`, `redirects`, `header*`, `footer*`, `payload_*` | — | не переносимо; перед цим перевіряємо, що там немає нашого контенту (зараз: 1 шаблонна сторінка, 0 редиректів, 0 постів) |

### 6.3 Перевірка
1. **Кількості** по кожній сутності і кожному масиву: студії (усього / public / hidden), ціни, сервіси, продукти, формати, фото, міста, запити, заявки, власники, медіа, версії. Звіт `migration-report.json`; будь-яка розбіжність зупиняє процес.
2. **Звірка поле-в-поле**: доки Payload ще в репозиторії, тест бере кожну студію двічі — через Payload Local API (старий `loadStudiosRaw`) і через новий `server/catalog` — і робить глибоке порівняння JSON (без внутрішніх `id` рядків масивів і службових полів). Те саме для `getStudioPhotos`, міст, `mapa/studios.geojson`.
3. **Знімки всіх публічних сторінок**: `scripts/snapshot-site.mjs` обходить усі URL із `sitemap.xml`, `catalog-sitemap.xml` і список додаткових (`/llms.txt`, `/mapa/studios.geojson`, `/health`, OG-зображення — хеш байтів) на двох збірках, що дивляться в ту саму копію БД (старий код на Payload і новий на `app`). Нормалізація: прибрати хеші чанків, build id, `nonce`, вміст `<script>` RSC-flight (окремо порівнюємо витягнуті з нього дані). Порівнюються видимий текст, `<head>` (title, description, canonical, robots), JSON-LD, атрибути посилань і зображень. **Критерій: 0 відмінностей** або явний allowlist (наприклад, URL медіа `/api/media/file/x` → `/media/x`).
4. **Скріншоти** 20 ключових сторінок на 390 і 1280 px (`pnpm shots`) з піксельним порівнянням.
5. **Функціональні перевірки**: створити запит з форми (і Telegram-повідомлення), заявку, схвалити кнопкою в Telegram, задати пароль, увійти в кабінет, зберегти зміни, прийняти в панелі.

---

## 7. Перемикання без видимих змін і відкат

### 7.1 Підготовка (до дня перемикання)
- Новий код живе в гілці; публічне читання має прапорець `DATA_SOURCE=payload|app` на час репетицій (одна збірка може читати обидва джерела, і знімки порівнюються на одному образі).
- Мінімум 2 повні репетиції на свіжому дампі проду: мігратор → звірка → знімки → функціональні перевірки — усе зелене.
- Черга змін власників і заявок розібрана до нуля (або мігратор перенесе залишок, але менше рухомих частин краще).
- Знімок публічного проду (`snapshot-site.mjs` проти https://hlyna.com.ua) за годину до перемикання — еталон.

### 7.2 День перемикання (≈ 1 година, у тихий час)
1. Повідомлення в Telegram собі: «перемикання почато».
2. `deploy/backup.sh` (БД + media), копія дампу на машину Родіона.
3. **Заморожування записів у старій системі**: env `WRITE_FREEZE=1` на старому образі (кабінет і заявки відповідають «оновлюємося, спробуйте за годину»). **Форма запитів лишається живою.** Мігратор у фінальному прогоні ще раз копіює запити з `id > max`, тож нічого не губиться.
4. Мігратор (фінальний прогін) → звіт кількостей.
5. `release.sh` нового образу: міграції drizzle → `up -d` → `POST /revalidate`.
6. Telegram-webhook той самий (`/api/telegram/webhook`), секрет той самий — нічого не перереєстровуємо.
7. Знімок публічного сайту → diff з еталоном (крок 7.1). Нуль відмінностей (поза allowlist) — продовжуємо.
8. Смок-тест: запит з форми → Telegram → статус кнопкою; вхід у `/panel`; вхід власника (якщо є) старим паролем.
9. Лінки на пароль для адміна і власників з невикористаними інвайтами — згенерувати й надіслати.

### 7.3 Відкат
- **У першу годину (до нових записів)**: `docker compose` на попередній тег образу (`hlyna-app:pre-cutover`), таблиці Payload у `public` ще на місці й не змінювалися з моменту заморожування. Відкат займає ~2 хвилини.
- **Пізніше**: старий образ + скрипт `scripts/backport-to-payload.ts`, що переносить назад лише нове з `audit_log` після моменту перемикання (запити, статуси, заявки, правки студій). Обсяг малий (кілька записів на день), тож прийнятно і вручну з журналу.
- Таблиці Payload через 7 днів переносимо в схему `payload_legacy` (`ALTER TABLE … SET SCHEMA`), через 30 днів видаляємо після окремого архівного дампу.
- Видалення пакетів `@payloadcms/*`, `(payload)`-маршрутів і `src/collections` іде **окремим релізом** після 7 днів стабільної роботи. Так відкат на першому тижні залишається простим.

---

## 8. Фази, оцінки, паралельність, тести

Оцінки — робочі дні з агентом, «як слід», включно з тестами і переглядом. Невизначеність ±25 %.

| Фаза | Зміст | Днів |
|---|---|---|
| **Ф0. Підготовка в межах Payload** | Пункти 1, 2, 4 аудиту: прибрати `AdminBar`/провайдери, шаблонні Posts/Pages/Categories/плагіни, тести на `priceIndex`/`present`/`ownerAuth`. `snapshot-site.mjs` + еталон проду. Корисно навіть без заміни. | 3–4 |
| **Ф1. Фундамент** | Drizzle + `pgSchema('app')` + drizzle-kit, tracking/audit/revisions, Zod-схеми, Hono під `/api`, Better Auth (username, кастомний scrypt, ролі, ліміти в БД), інфраструктура тестів (Postgres у Docker + vitest), правила ESLint імпортів, `check-bundles.mjs` | 4–5 |
| **Ф2. Мігратор і звірка** | `migrate-from-payload.ts`, звіт кількостей, порівняння поле-в-поле через Local API, перша репетиція на дампі | 3–4 |
| **Ф3. Публічне читання** | `server/catalog` з `toLegacyStudio`, перемикач `DATA_SOURCE`, фото, geojson; знімки сторінок = 0 diff; переведення 16 скриптів на DAL | 4–5 |
| **Ф4. Публічні записи і кабінет** | `/api/requests` (той самий контракт), заявки, кабінет на Better Auth, `change_sets` замість чернеток, Telegram-webhook на сервіси, медіа-завантаження (sharp, EXIF), Caddy `/media` | 4–5 |
| **Ф5. Панель: оболонка і черги** | Root layout, токени, shell, `t()` українською, вхід, Огляд, Запити, Заявки, Зміни від власників з диффом | 5–6 |
| **Ф6. Панель: студії** | Список з фільтрами, повна форма (масиви, ціни, фото, формати, b2b, гео з геокодуванням), історія і відновлення, конфлікти `revision`, slug-історія | 6–8 |
| **Ф7. Панель: решта** | Міста, Медіа, Користувачі (інвайти, ролі, сесії), Instagram-стан + `jobs`/`import_runs`, Журнал | 4–5 |
| **Ф8. Репетиції і перемикання** | 2 повні репетиції, чекліст, перемикання, тиждень спостереження, прибирання Payload, `payload_legacy` | 3–4 |
| **Разом** | | **36–46 днів ≈ 7–9 тижнів** послідовно |

**Паралельність.** Після Ф1 (схема і інтерфейси DAL зафіксовані):
- Ф2 (мігратор) ∥ Ф3 (публічне читання) — різні файли, зустрічаються на звірці;
- Ф5–Ф7 (UI панелі) ∥ Ф3–Ф4: панель будується на тих самих `services`, на сидовій копії даних;
- Ф0 можна почати хоч завтра, незалежно від рішення про заміну.
З 2–3 паралельними агентами в окремих worktree реалістично **5–6 календарних тижнів**. Критичний шлях: схема → мігратор → DAL → знімки сторінок → перемикання.

**Стратегія тестів** (лише локально, без платного CI — як у AGENTS.md):
- **Unit (vitest)**: Zod-схеми (кожне повідомлення помилки), `diff`/`redact`, застосування `change_set` по полях, `uniqueSlug`, `normalizeLogin`, scrypt hash/verify (сумісність зі старими хешами), парсер цін.
- **Інтеграційні на реальному Postgres 16** (контейнер, не PGlite: є `text[]`, GIN, generated columns): `services/*` у транзакціях, `app.request()` на кожен Hono-маршрут, **матриця прав** «аноним / owner чужої студії / owner своєї / editor / admin × кожен маршрут», ліміти, honeypot, ідемпотентність Telegram-дій.
- **Міграційні**: мігратор на фікстурі-дампі; кількості; поле-в-поле.
- **Знімки сайту**: `snapshot-site.mjs` перед кожним мерджем у фазах 3–4 і в день перемикання.
- **E2E (Playwright, уже є в репо)**: на 390 px — запит з форми, заявка → схвалення → пароль → кабінет → збереження → дифф у панелі → прийняття → зміна на сайті після ревалідації.
- **Бандли**: `check-bundles.mjs` у `pnpm check`; Stop-hook запускає `tsc`, `lint`, unit.
- **Безпека**: ручний прохід за чеклістом (cookie-атрибути, `Origin` на POST, відсутність внутрішніх полів у публічних відповідях, EXIF прибрано, `/panel` віддає 403 власнику і `noindex`).

---

## Appendix (English): key technical decisions

- **Placement**: everything stays in the existing Next.js 16 app. New tables live in Postgres schema `app` (`pgSchema('app')`, drizzle-kit `schemaFilter: ['app']`), so Payload's `public` tables are untouched until cutover and the migrator can re-run idempotently inside one database.
- **IDs**: integer ids of studios, cities, requests, claims and media are preserved (Telegram callback data and notes reference them). Better Auth `user.id` stays text.
- **Studios table**: one wide row; ordered string lists as `text[]` (GIN on `formats`); `studio_prices` and `studio_photos` as child tables; `visibility` replaces `_status`; `revision int` gives optimistic concurrency; `pending_owner_changes` is derived from `change_sets`.
- **History**: `studio_revisions` (full JSONB snapshots, restore) + kit-style `audit_log` (field diffs, all entities). Owner edits are `change_sets` (one open per studio, whitelisted fields, per-field apply). Admin edits publish immediately.
- **Requests**: `commission_kop` is a `GENERATED ALWAYS AS (round(deal_amount_kop * 0.05)) STORED` column; `POST /api/requests` keeps Payload's response shape `{ doc: { id } }` so `RequestForm.client.tsx` is unchanged.
- **API**: Hono mounted at `src/app/api/[[...route]]/route.ts` via `hono/vercel` `handle()` on the Node runtime; sub-apps `public`, `kabinet`, `panel`, `telegram`, plus Better Auth at `/api/auth/*`. Panel reads go server-component → repo directly; panel mutations and list paging go through Hono with TanStack Query (optimistic updates).
- **Auth**: Better Auth pinned exactly (kit uses 1.7.5; never 1.7.0–1.7.2). `username` plugin for owners who log in with a phone; synthetic `@owners.hlyna.invalid` emails. Custom `password.hash/verify` reuse the existing `scrypt$salt$key` format, so owner passwords migrate as-is. Password-reset emails are replaced by a `sendResetPassword` callback that stores the link for the admin and posts it to the owner's Telegram chat; the public request-reset endpoint is disabled. Rate-limit storage `database`; client IP from Caddy's single-value `X-Forwarded-For` (same reasoning as the kit's `auth.ts`). Account lockout (5 fails / 15 min) via sign-in hooks.
- **Bundle isolation**: `(panel)/panel/layout.tsx` is its own root layout with its own CSS entry (Tailwind 4 `@source` scoped). ESLint `no-restricted-imports` plus a post-build manifest check fail the build if any public route's client chunks contain panel, TanStack, Base UI or Better Auth client modules.
- **Media**: same Docker volume and filenames; Caddy serves `/media/*` (immutable cache) and 301s `/api/media/file/*`; sharp re-encodes with EXIF/GPS stripped and produces Payload's seven sizes plus WebP.
- **Migrations in prod**: `release.sh` runs backup → `node dist/migrate.js` in a one-off container → `up -d` → `/revalidate`; a failed migration aborts the release instead of crash-looping the app.
- **Verification gate**: row counts, field-by-field parity (old Payload Local API vs new DAL, while both exist), full-site HTML/JSON-LD snapshot diff across every sitemap URL, 390/1280 screenshot diff, end-to-end owner and request flows. Cutover proceeds only on zero unexplained differences.
- **Rollback**: previous image tag within the first hour (Payload tables frozen, not modified); afterwards, backport rows written since cutover using `audit_log`. Payload tables move to schema `payload_legacy` after 7 days and are dropped after 30 days, following an archival dump.
