# Decisions

Newest at the bottom. One line each; the reason after the dash.

- **2026-10-10. Stack: Next.js + Payload CMS + Postgres.** Admin, database and later studio accounts in one app; pages pre-rendered for speed.
- **2026-10-10. Hosting: self-hosted on the owner's Hostinger VPS with Docker Compose + Caddy.** Postgres on the same server, automatic HTTPS, nightly `pg_dump` kept 14 days. No vendor lock-in, fixed cost.
- **2026-10-10. Styling: Tailwind CSS with design tokens 1A «Clay and cobalt»** (superseded 2026-10-12, see below) (clay, card, ink, muted, terracotta CTA, cobalt links, ochre, line; Unbounded + Raleway) and our own component kit.
- **2026-10-10. Language: Ukrainian only.** English later via Payload localization and `/en` routes on the primary domain, so strings and routing stay i18n-ready. **No Russian, ever.**
- **2026-10-10. Requests: Telegram notifications** + statuses in the Payload admin.
- **2026-10-10. No paid services without the owner's approval.** Free or self-hosted first.
- **2026-10-10. Brand «Глина».** Domains: **hlyna.com.ua** primary; **hlyna.com** (and both www) 301-redirect to it.
- **2026-10-10. Writing voice: see `docs/voice/`.** «Теплий майстер», potters' vocabulary; first 2–3 sentences of a page stay plain and factual for LLMs.
- **2026-10-11. Головна: новий дизайн «реєстр» — шаблон у `docs/design/template/`, бриф у `docs/design/README.md`, історія в `docs/design/history.md`.** Кістяний папір + чорнило + кобальт, вордмарк-вікно у фото, нумеровані фотокартки, контент без змін. Шрифти лише SIL OFL: Unbounded, Golos Text, Playfair Display italic, JetBrains Mono.
- **2026-10-11. Фавіконка: куманець «чаша зверху», теракота;** окремі малюнки для 16/32/48, SVG з темною темою, maskable 512. Файли в `public/`, теги в `layout.tsx`, `manifest.ts`.
- **2026-10-11. Новий дизайн на всьому сайті, не лише на головній.** Палітра 1A знімається повністю; токени за роллю (`paper`, `ink`, `cobalt`, `terracotta`…); єдине джерело правил — `docs/design/SYSTEM.md`. Шапка — варіант A «Реєстр», внутрішні сторінки — A «Реєстр» + смуга фактів під лідом (`experiments/design-options/`). Вордмарк-вікно «ГЛИНА» лише на головній. Без shadcn/Radix — нативні `details`/`dialog`/`popover`.
- **2026-10-11. Теракота — #b4532e (як у фавіконці), для дрібного тексту #a84a27** — контраст на кістяному папері 4.1 і 4.7 проти 3.6 у шаблонного #c9542c.
- **2026-10-11. Фото: архів «Осоння» — наш, беремо його першим;** виключені лише кадри з явним знаком (штамп-будиночок 496–497); обличчя можна, якщо кадр не тримається на одному обличчі; зовнішні фото лише там, де в архіві нічого нема; підписів під фото з архіву нема. План — `docs/design/photo-plan.md`.
- **2026-10-12. Редизайн побудовано на гілці `redesign` (кроки 1–9, без злиття й деплою):** токени за роллю, примітиви в `src/components/ui/`, палітра 1A вилучена; картки OG — C2 «Етикетка» (фото + паперова етикетка, профіль студії на чорному, статична картка головної), без років і змінних чисел.
- **2026-10-12. Магазини й галереї (type=shop) — не студії:** вони є в каталозі, але не у списках, лічильниках, пошуку й мапі за замовчуванням (`isStudio`, `getAllStudios` без них; `getAllWithShops`/`getShops` для "Де купити", блоку на сторінці міста й чипа на мапі). Профілі магазинів лишаються, у вибірці цін вони є.
