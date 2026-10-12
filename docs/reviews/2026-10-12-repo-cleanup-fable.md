# Ревʼю репозиторія і прибирання — 2026-10-12 (Fable)

Мета: прибрати все старе й зайве (шаблон Payload, рештки палітри 1A, кіт панелі, хвилі), нічого не зламавши, і зробити так, щоб далі сайт було легше змінювати. Читання: весь репозиторій (конфіги, `src`, `scripts`, `deploy`, `docs`, `public`), три паралельні глибокі перевірки (сервер і дані; публічний сайт і редакційні сторінки; панель), `knip` для мертвого коду. Усе зроблене — комітами в `main` без push; кожен коміт перевірено `tsc`, `pnpm lint`, `pnpm test:int` (111 тестів).

Витрачено ≈ 1 год 45 хв агентного часу (з них ≈ 35 хв на саме ревʼю, решта — прибирання й перевірки).

## 1. Що було не так (коротко)

| Шар | Знайдено |
|---|---|
| Корінь | `README.md` — README шаблону Payload (15 КБ про Posts/Pages/Lexical); `.env.example` з `CRON_SECRET`/`PREVIEW_SECRET` шаблону і без `REVALIDATE_SECRET`/`TELEGRAM_WEBHOOK_SECRET`, які сервер читає; `next.config.ts` з Vercel-змінною, `remotePatterns` на власний хост і webpack-алісами (збірка на Turbopack); `tsconfig` з `paths.react` і неіснуючими `redirects.js`/`next.config.js`; `tsconfig.tsbuildinfo` (700 КБ) закомічений; `.gitignore` з каталогами міграції, яких нема; `test.env`, `.npmrc legacy-peer-deps` (npm-опція), дубль `onlyBuiltDependencies` у `package.json` і `pnpm-workspace.yaml`, скрипти `ii`/`reinstall`/`dev:prod` з шаблону, `license: MIT` без `private`. |
| Інструменти | `next-sitemap` з postbuild-кроком, що генерував `sitemap.xml` (індекс з одним записом) і `robots.txt` із `Disallow: /admin` (адмінки нема) і без `/panel`. Vitest із jsdom і React-плагіном, хоча всі тести — Node. 5 невикористаних devDependencies. Жодної перевірки мертвого коду. |
| Сервер | `src/lib/telegram.ts`: клавіатури з посиланнями на `/admin/collections/…` (адмінка Payload) — мертвий код, живі кнопки в `server/telegram/actions.ts`; `types/catalog.ts` з `Media` (Lexical caption, 90 рядків), `_status`, `photos`, `pendingOwnerChanges`, union-типами, продубльованими з `shared/options.ts`; `legacy.ts` як назва живого маппера; ~35 мертвих експортів (guards, адаптер, схеми `cityEdit`/`requestStatusChange`/`claimDecision`, що вже розійшлися з панеллю); URL сайту обчислювався в 6 місцях; регулярка slug у 5; `MAX_PHOTOS` двічі; машинні шляхи `/Users/rodik/…` у 6 скриптах і в `services/instagram.ts`; десяток коментарів про «cutover», «phase 2/3/6», `src/collections/…`. Тести названі за етапами (`m3`, `m4`, `panel-review-fixes`). |
| Сайт | `src/utilities/` (шаблон): `getURL` з Vercel-гілкою, `canUseDOM`, `mergeOpenGraph` з другою копією опису сайту; обгортки `SelectionFaq` і `profile/blocks` на один рядок; проп `bar`, який `InnerMain` ігнорує, але 7 викликів передають; `dynamicParams = true` (дефолт); `Makers` байт-у-байт у WaveB і WaveC; `etsy.json` з різним змістом у `waveA` і `waveB`; генератори `sync-wave-b/c` імпортували тип не з того модуля; `.ui-label` без користувачів; 2 стокові фото, на які ніхто не посилається; коментарі про Payload REST і `Bits.Breadcrumbs`. |
| Панель | З кіта лишилися: `PagedList` (єдиний користувач `@tanstack/react-virtual` і єдине джерело lint-попереджень), `Amount`, `ui/skeleton|separator|table|tabs|tooltip`, `QueryClientProvider` без жодного запиту, chart-токени й стилі recharts без графіків, 5 CSS-варіантів без користувачів, 14 мертвих ключів копії, 6 невикористаних форматерів, коментарі про `index.html` і `DESIGN.md` кіта; smoke-скрипт з іменем власника й портами 3101/3200. |
| Документи | `STATUS.md` і `decisions.md` казали, що редизайн не злито; `studio-owners.md` описував адмінку Payload і cookie `hlyna_owner`; `deploy/README.md` відправляв на `/admin` і згадував `release.sh` як невикористаний; агенти `.claude/agents` згадували Payload і токени 1A; `SYSTEM.md` §9 без позначки «виконано» і «ще не зроблені кроки 3–6»; 5 документів про заміну Payload і аудит архітектури лежали поруч із живими; `docs/share_cards.html` (384 КБ, палітра 1A, Raleway); три варіанти зразків голосу поруч із обраним. |

## 2. Що зроблено (коміти в `main`)

1. **Repo hygiene** — README проєкту, `.env.example` з реальними змінними, `.gitignore`/`.dockerignore`/`.prettierignore` без рештків, `tsbuildinfo` і `test.env` з індексу, `next.config.ts` і `tsconfig.json` без шаблонного баласту, `package.json` `private` і без зайвих скриптів, `src/environment.d.ts` видалено, коментарі в `compose.yaml`/`Caddyfile`.
2. **Tooling** — `src/app/robots.ts` і `sitemap.xml` як маршрути Next (`/panel` закрито для роботів, `next-sitemap` і postbuild видалено); vitest у Node без jsdom/React; devDependencies без 5 зайвих; **`pnpm knip`** з `knip.json` — перевірка мертвих файлів, експортів і залежностей, зараз чиста.
3. **Сервер** — один Telegram-клієнт `src/server/telegram/tg.ts` поруч із кнопками (клавіатури на `/admin` видалено); `types/catalog.ts` без `Media`/`_status`/`photos`/`pendingOwnerChanges`, union-типи з `shared/options.ts`; `legacy.ts` → `publicShape.ts` (`toPublicStudio`/`toPublicCity`); мертві guards/адаптер/схеми/помічники видалено; `SLUG_RE` і `MAX_OWNER_PHOTOS` в одному місці; `site.url` замість чотирьох копій; `src/utilities` → `src/lib` (`ogImage`, `track`, `transliterateUk`), `getURL`/`canUseDOM`/`mergeOpenGraph` видалено; `RESEARCH_DIR` (`../UkraineCeramics`) замість машинних шляхів; `cleanAddress` у геокодері перейменовано на `geocodeQuery` (інша робота, ніж `present.cleanAddress`); `kabinetAuthResponse` переїхав у `server/auth`; тести: `services`, `publicCatalog`, `claims-and-revalidate`; застарілі коментарі виправлено.
4. **Сайт і панель** — `SelectionFaq`/`profile/blocks` вбудовано, `Makers` один (`src/components/site/Makers.tsx`), проп `bar` і `dynamicParams` прибрано, `etsy-shops.json`, генератори хвиль імпортують тип з `@/editorial/copy`, `.ui-label` прибрано, 2 стокові фото видалено (`CREDITS.md` оновлено); панель без `PagedList`/`Amount`/5 ui-файлів, без `@tanstack/react-query` і `react-virtual` (оновлення — `router.refresh()`), без chart-токенів, recharts-стилів, мертвих CSS-варіантів і 14 ключів копії; smoke-скрипти без імені власника, обидва на порту 3000, знімки в `.shots/panel` і `.shots/kabinet`; `scripts/smoke/compare-backends.mjs` (порівняння з Payload) і `deploy/release.sh` видалено; `experiments/` поза lint.
5. **Документи** — `docs/archive/` (п’ять документів про заміну Payload, аудит архітектури, `drop-payload.sql`, старі зразки голосу) з власним README; `share_cards.html` видалено; `STATUS.md` описує сьогоднішній стан; `decisions.md` — редизайн злито, рішення про прибирання; `studio-owners.md` і `deploy/README.md` без адмінки Payload; агенти без Payload і 1A; `SYSTEM.md` §9 позначено виконаним; `AGENTS.md` — правило «Clean» (`pnpm knip` чистий, архів для завершеного) і оновлена мапа файлів.

Розмір: 4 коміти коду + 1 коміт документів; у `src`/`scripts`/`tests` −1 191 / +278 рядків, 17 файлів видалено, 9 перейменовано; залежностей 22 → 20, devDependencies без 5 зайвих (+ `knip`, `jsdom` лишився для `scripts/snapshot.mjs`).

## 3. Перевірка

Усе на локальній копії бази `hlyna_merge` (815 студій, усі 5 міграцій), dev-сервер на :3000.

| Перевірка | Результат |
|---|---|
| `pnpm exec tsc --noEmit` | чисто |
| `pnpm lint` | 0 попереджень (було 10: `PagedList` і `experiments/`) |
| `pnpm test:int` | 111/111 (11 файлів) |
| `pnpm knip` | нічого |
| `pnpm build` (проти бази) | ок, 672 статичні сторінки; 7 попереджень Turbopack «dynamic filesystem access» у `nominatim.ts`/`media/index.ts` — були й до прибирання (кеш геокодера і медіа читають файли за змінною; можна додати `/*turbopackIgnore: true*/`) |
| `node scripts/check-bundles.mjs` | 102 маніфести, панель і API не потрапляють на публічні сторінки |
| `node scripts/snapshot.mjs diff cleanup-before cleanup-after` | 658 сторінок, **0 відмінностей** у всіх 11 категоріях (статус, title, description, canonical, OG, JSON-LD, текст, посилання, заголовки, структура, класи) |
| `/robots.txt`, `/sitemap.xml`, `/catalog-sitemap.xml` | ті самі правила, що генерував `next-sitemap`, плюс `Disallow: /panel`; індекс → каталог; 656 URL |
| `scripts/smoke/panel.mjs` | інвайт → пароль → вхід → огляд, запити, заявки, зміни, журнал на 1280 і 390 — без помилок (знімки `.shots/panel/`); кнопка «Оновити» працює без React Query |
| `node scripts/check-links.mjs` | 633 сторінки, 0 битих посилань, titles до 70 символів; один спільний title `/kabinet/vhid` і `/kabinet/zayavka` (noindex-сторінки) — був і раніше, виправлено в коміті документів |

## 4. Лишається власникові (рішення, я не чіпав)

- **Інша сесія працює в цій самій робочій копії.** Під час ревʼю в `main` зʼявився merge `ed253c6` і зміна `deploy/push.sh` (закомічена як `a069bcd` і запушена разом із моїми першими двома комітами). Мої останні коміти треба перенести поверх `origin/main` (`git rebase origin/main`) перед деплоєм; два агенти в одній копії — ризик затерти чужі правки, краще по робочій копії на сесію (`git worktree`).
- **Незакомічене і невідстежуване:** `.agents/skills/payload/` (довідник Payload — більше не потрібен), `.codex/` (копія `.claude` для Codex зі згадками Payload — або оновити й закомітити, або видалити), `scripts/.keysy-shots.mjs` (одноразовий скрипт знімків), `docs/reviews/2026-10-12-site-review-fable.md` (ревʼю живого сайту з іншої сесії — закомітити).
- **Git:** гілки `replace-payload/m3`, `replace-payload/m4`, `replace-payload/panel` (локально й на origin) і `redesign` злиті — видалити; worktree `hlyna-ops` (detached на коміті відкату Payload) і `hlyna-phase1` (`replace-payload/m4`) — `git worktree remove`.
- **Локальні бази:** 11 копій `hlyna_*` (~600 МБ). `.env` показує на `hlyna`, де нема схеми `app`, тому `pnpm dev` з коробки віддає 500 на сторінках каталогу; свіжа копія з усіма міграціями — `hlyna_merge` (перевірки нижче зроблені на ній). Решту (`prodcopy`, `localcopy`, `m4`, `rehearsal`, `rmpl`, `draftlab`, `snap`, `redesign`) можна дропнути. `hlyna_apptest` потрібна тестам.
- **Фото без користувачів у `src/content/photos.ts`:** doc `wheelHands`, `wheelCloseup`, `festiveWare`, `schoolStudio`, `handbuilding`, `paintingBowl`, `potterOutdoors`, `workshopTable`; stock `tealMug`, `wheelTop`, `restaurantTable`, `wheelBw` (12 файлів у `public/images/doc|stock`). Лишити як пул із кредитами чи видалити.
- **Панель, підписи двічі:** `REQUEST_WHAT_LABEL` у `shared/options.ts` і `what.*` в `uk.ts` («Корпоратив з ліплення з глини» vs «Корпоратив з ліплення»); `TYPE_LABEL` у `lib/catalog.ts` і `type.*` в `uk.ts`. Обрати одне формулювання й читати з одного місця. Сам шар `t('key')` (`uk.ts`, ~600 рядків) лишив: уся копія панелі в одному файлі, а помічник множини потрібен.
- **12 однакових роут-обгорток хвиль** (`dobirky/*`, `hayidy/*`, `muzei-keramiky`, `podiyi`, `novyi-rik-i-rizdvo`, `dlya-biznesu/*` по 11 рядків) можна звести до одного `[slug]` на розділ — нічого не змінює для відвідувача, тому не робив без рішення.
- **API кабінету під `(frontend)/kabinet/api/*`**, решта API в `src/app/api` — переїзд змінює URL форм; лишив як є.
- `deploy/set-telegram.sh` читає chat id через `getUpdates`, що не працює при зареєстрованому webhook (`docs/studio-owners.md`) — або видалити, або переписати на `deleteWebhook` → `getUpdates` → `setWebhook`.
- На диску: `.next` 4,6 ГБ, `.snapshots` 141 МБ, `.shots` 81 МБ, `experiments` 255 МБ — усе поза git, чистити за потреби.

## 5. Наступні кроки «щоб легше змінювати» (обережний рівень, з перевіркою snapshot-diff)

1. Один текст заклику: три рядки CTA набрані в 12 файлах; `RequestBand` (`Inner.tsx`) уже є, але 5 місць потребують `className="max-lg:hidden"` і `href="#zapyt…"` — дати `RequestBand` ці два пропи й замінити.
2. `faqLd(items)` у `lib/ld.ts` замість 8 ручних FAQPage JSON-LD; примітив `Fold` замість 8 копій `<details class="group">` «Показати ще N → / Згорнути» (`ListBlock` — половина цього).
3. Ціновий діапазон «min–max»: `lib/money.ts` має `fromTo`/`spanOf`, а тире-форма збирається у 8 місцях, у `llms.txt` — без розділювачів тисяч. Одна `dash(min, max)`.
4. Дати: `site.contentUpdated` і `site.dataModified` з майже однаковими коментарями; `GuidePage` має літерал `datePublished: '2026-10-10'`. Одне поле.
5. Хвилі B і C: `load()`/`*Metadata()` — однакові 20 рядків; після спільного `Makers` відмінність лише в `LiveBlock`. Один `loadWave(wave, id)`.
6. `RELATED` у `WaveBRoute`/`WaveCRoute` повторюють підписи з `navigation.ts` (одна назва «Новорічні подарунки 2026/27» — у 13 місцях) — таблиця посилань у контенті.
7. Три `handleOf`/`igHandle` і пʼять локальних `norm` з різними правилами — звести до одного помічника на завдання.
8. Smoke панелі покриває огляд/запити/заявки/зміни/журнал; студії, міста, медіа, користувачі — без smoke.
