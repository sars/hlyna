# Дизайн-система «Глина» — єдине джерело для UI

Оновлено 15.10.2026. Це **специфікація** для кожного агента, який торкається `src/components/*`, `src/app/(frontend)/*` або `globals.css`. Якщо щось тут розходиться з кодом — правильний цей документ; якщо чогось тут нема — спочатку допиши сюди, потім у код.

Звідки взято: бриф головної `README.md`, історія `history.md`, затверджений макет `template/index.html`, варіанти внутрішніх сторінок `experiments/design-options/` (власник обрав **шапку A**, **внутрішню A** і **смугу цифр із B**), фотоплан `photo-plan.md`, голос `docs/voice/README.md`, правила сайту `AGENTS.md`. Живий приклад кожного примітива — `/dev/styleguide` (§8).

---

## 1. Принципи

1. **Реєстр, не лендінг.** Кістяний папір, чорнило, кобальт як полива, одна теракотова крапка (знак-куманець). Жодних тіней, градієнтів, великих радіусів, карток «із повітрям».
2. **Лінійки замість карток.** Структуру задають лінійки: 2px чорнило під заголовками і в шапці, 1px напівпрозорі між рядками й колонками. Фон у блоків нема (виняток: плитки цифр і службові примітки на `paper-2`, біла плашка цитати).
3. **Одна теракота.** Теракота `#b4532e` — тільки знак у шапці/футері, великі номери, лічильники міст, пунктир словника. Ніколи — кнопки, фони, тексти на темному. Дрібний теракотовий текст — лише `terracotta-text`.
4. **Кобальт — дія і число.** Кнопки запиту, панелі, посилання в таблицях, цифри у смузі фактів, «+/–» у FAQ, епіграф. Персик — акцент тільки на темному.
5. **Запит — перший.** «Отримати пропозиції» видно зверху (шапка + кнопка в геро), після відповіді (смуга після цін) і в кінці (смуга або форма в бічній колонці); на телефоні — закріплений бар.
6. **Порядок для ЛЛМ.** Крихти → кікер → H1 → лід із цифрами і датою → смуга цифр → таблиця → деталі → FAQ → «Оновлено». Вірш — один, після ліду, не в таблицях і не в FAQ, без пояснення.
7. **Фото за змістом і зі згоди.** Архів власника без явних знаків студії, без портретів «у камеру», без підписів; чужі — лише CC0/Unsplash і лише там, де архів порожній; профілі студій — тільки фото самої студії. Деталі — `photo-plan.md`.
8. **Мобільний перший і швидкий.** Серверні компоненти; клієнтські лише для взаємодії (меню, форма, мапа, бар). Нативні `details`, `dialog`, `popover`; без shadcn/Radix. Жодного горизонтального скролу; таблиці на телефоні стають стеком.
9. **Один набір імен.** Токени названі за роллю (`paper`, `ink`, `rule`, `terracotta-text`), палітра 1A і її утиліти (`bg-clay`, `kicker`, `h-display`, `band`) вилучаються повністю; змішувати не можна.
10. **Нічого вигаданого.** Усі числа у смузі фактів, таблицях і прикладах — із `stats()`/`facts()`/`ctx`; у стайлгайді — реальні студії з бази або порожній стан.

---

## 2. Токени

### 2.1 Кольори (`@theme` у `globals.css`)

| Токен | Значення | Роль |
|---|---|---|
| `--color-paper` | `#efe9de` | фон сторінки, шапки, футера, мегаменю, шухляди |
| `--color-paper-2` | `#e4dccd` | плитки цифр, службові примітки («студія ще не вказала»), мапа до завантаження |
| `--color-paper-white` | `#ffffff` | біла плашка цитати/відповіді (`QuoteBlock`) |
| `--color-ink` | `#15130f` | текст, 2px лінійки, кнопка за замовчуванням, чорні панелі й картки |
| `--color-ink-2` | `#4e483f` | другорядний текст, кікери, крихти, підписи, шапка таблиці |
| `--color-cobalt` | `#1d3ec6` | кобальтові панелі й форма запиту, посилання в таблицях, цифри, «+/–», підкреслення меню, фокус |
| `--color-cobalt-deep` | `#132b8f` | hover кобальту, епіграф, текст кнопки `paper` |
| `--color-on-cobalt-2` | `#cfd7ff` | другорядний текст на кобальті (кікер, примітки форми, текст промо) |
| `--color-on-ink-2` | `#d6cfc2` | другорядний текст на чорному (картки, панель «Для студій») |
| `--color-peach` | `#ffd9a8` | акцент лише на темному: курсивне слово, номери кроків, кнопка `peach`, CTA у картках, галочка чекбокса |
| `--color-terracotta` | `#b4532e` | знак-куманець, номери ≥ 24px, пунктир словника (не текст < 19px) |
| `--color-terracotta-text` | `#a84a27` | дрібний теракотовий текст: лічильники міст 13–14px, кікери гайдів 12px, нотатки «останній пост…» |
| `--color-rule` | `rgb(21 19 15 / .2)` | тонкі 1px лінійки на папері |
| `--color-rule-on-dark` | `rgb(239 233 222 / .4)` | тонкі лінійки на кобальті й чорному |

Інших кольорів нема: ні зеленого «успіху», ні червоного «помилки», ні сірого. Стан помилки форми — `terracotta-text` на папері, `peach` на кобальті; успіх — звичайний текст із 2px лінійкою зверху.

**Дозволені пари (WCAG 2.x, пораховано 11.10.2026).** AA для тексту < 18px (або < 14px bold) — ≥ 4.5; для великого — ≥ 3; для нетекстових елементів — ≥ 3.

| Передній план | Фон | Контраст | Де можна |
|---|---|---|---|
| ink | paper | 15.35 | усюди |
| ink-2 | paper | 7.48 | другорядний текст, кікери 11–12px |
| ink | paper-2 | 13.62 | плитки, примітки |
| ink-2 | paper-2 | 6.64 | підписи у плитках |
| cobalt | paper | 6.80 | посилання, цифри, «+/–» |
| cobalt-deep | paper | 9.82 | епіграф, hover |
| cobalt | paper-2 | 6.03 | цифри у плитках |
| cobalt | paper-white | 8.21 | посилання в `QuoteBlock` |
| terracotta-text | paper | 4.73 | **єдиний дозволений дрібний теракотовий текст** |
| terracotta | paper | 4.12 | лише великий текст (≥ 24px bold / ≥ 19px) і нетекст: знак, пунктир, номери `NumberedList` 24px |
| terracotta | paper-white | 4.98 | те саме |
| terracotta-text | paper-2 | 4.20 | лише ≥ 18px — дрібний теракотовий текст на `paper-2` **заборонено** |
| paper | ink | 15.35 | текст на чорному |
| on-ink-2 | ink | 11.98 | другорядний на чорному |
| peach | ink | 13.91 | акцент на чорному |
| ink | peach | 13.91 | кнопка `peach` |
| paper | cobalt | 6.80 | текст на кобальті, поля форми |
| on-cobalt-2 | cobalt | 5.80 | другорядний на кобальті, 11px кікери — AA ✓ |
| peach | cobalt | 6.16 | курсивне слово, номери, помилка форми |
| cobalt-deep | paper | 9.82 | текст кнопки `paper` на кобальті |
| rule-on-dark (.6 для підкреслення поля) | cobalt | 3.41 | нижня межа інпута на кобальті (нетекст ≥ 3 ✓) |

**Заборонені пари:** terracotta на ink (3.73) і на cobalt; peach на paper (1.10); cobalt на ink; terracotta-text < 18px на paper-2; rule (1.53) як єдина межа інтерактивного елемента (для полів на папері підкреслення — `ink-2` 2px).

### 2.2 Лінійки, радіуси, тіні, рух

| Що | Значення |
|---|---|
| Лінійка розділу / шапки / верх таблиці та списку | `2px solid var(--color-ink)` (`border-t-2 border-ink`) |
| Лінійка між рядками і колонками | `1px solid var(--color-rule)` (`border-b border-rule`) |
| На темному | `1px solid var(--color-rule-on-dark)` |
| Смуга цитати | `6px solid var(--color-cobalt)` ліворуч |
| Епіграф | `2px solid var(--color-cobalt)` ліворуч, відступ 16px |
| Рамка чипа, кнопки «Меню», «Закрити» | `box-shadow: inset 0 0 0 1.5px var(--color-ink)` |
| Рамка кнопки `ghost` | `inset 0 0 0 2px currentColor` |
| Радіус | `--radius-btn: 2px` на кнопках, чипах, тултипі; **0** на всьому іншому (фото, панелі, поля, мапа) |
| Тіні | нема |
| Фокус | `outline: 3px solid var(--color-cobalt); outline-offset: 3px`; на кобальті — `outline-color: var(--color-paper)` |
| Рух | `transition: background .2s, color .2s`; стрілка `→` зсув 4px; фото в картці `scale(1.04)` за .6s; усе вимикається при `prefers-reduced-motion` |
| z-index | тултип 5 · список під полем на головній 10 · шапка (з мегаменю й панеллю пошуку) 20 · мобільний бар 30 (у кабінеті на його місці бар збереження 30) · шухляда/діалог/діалог пошуку 50 |

### 2.3 Простір і контейнер

| Токен | Значення | Роль |
|---|---|---|
| `--spacing-gutter` | `clamp(16px, 3vw, 40px)` | бокові поля (`px-gutter`) |
| `--container-wrap` | `1600px` | ширина контенту (`max-w-wrap mx-auto px-gutter`); кольорові панелі — на всю ширину, їх вміст знову в `wrap` |
| `--container-read` | `70ch` | колонка читання: лід, абзаци, опис студії |
| `--container-faq` | `900px` | FAQ |
| `--container-narrow` | `760px` | 404, помилка, `/zapyt`, `/kabinet/zayavka` |
| `--spacing-section` | `clamp(56px, 8vw, 110px)` | між розділами головної |
| `--spacing-block` | `clamp(36px, 5vw, 64px)` | між блоками внутрішньої сторінки |
| `--spacing-hero` | `clamp(18px, 3vw, 32px)` | відступи геро внутрішньої |
| Колонки | `clamp(28px, 4vw, 56px)` | між текстом і бічною колонкою |
| Рядок списку | `13–14px 0` | `StudioRow`, `MakerRow`, FAQ 15–16px |
| Комірка | `18px` (`cards`), `24px` (мега, гайди, формати) | відступ від вертикальної лінійки |
| Поле форми | `padding-block: 7px`, між парою полів `16px` | |
| Сітки карток | `10px` (< lg), `14px` (≥ lg) | `PhotoCard` |
| Якір | `scroll-margin-top: 6rem` | під липку шапку |

Решта відступів — стандартна шкала Tailwind (4px).

### 2.4 Брейкпоінти (перевизначити `--breakpoint-*`)

| Ім'я | Значення | Що перемикає |
|---|---|---|
| `sm` | `40rem` (640) | 2 колонки комірок студій; ціна в `MakerRow` праворуч; правий кікер геро з'являється |
| `md` | `50rem` (800) | смуга цифр 5 колонок; таблиця з стеку у рядки; `NumberedList` 2 колонки; футер 4 колонки; гайди 3 колонки; міста 4 колонки; кроки 3 колонки |
| `lg` | `60rem` (960) | головне меню замість «Меню»; службова смужка; дві колонки сторінки (текст + липка бічна); сітка 3×2 фотокарток; смуга форматів; геро 7/5 |
| `xl` | `80rem` (1280) | лише для ширших полів, якщо знадобиться |

Макети мали ще 600/700/860/1000 — їх зведено до `sm`/`md`/`lg`; `2xl` вилучити.

### 2.5 Шрифтові токени

| Токен | Значення |
|---|---|
| `--font-display` | `var(--font-unbounded), 'Arial Black', system-ui, sans-serif` |
| `--font-body` | `var(--font-golos), 'Helvetica Neue', Arial, sans-serif` |
| `--font-serif` | `var(--font-playfair), Georgia, serif` |
| `--font-mono` | `var(--font-jetbrains), Menlo, monospace` |

`--font-sans` не визначати (щоб `font-sans` зі старого коду не компілювався мовчки).

### 2.6 Кістяк `globals.css`

```css
@import 'tailwindcss';

@theme {
  --breakpoint-sm: 40rem; --breakpoint-md: 50rem; --breakpoint-lg: 60rem; --breakpoint-xl: 80rem;
  --color-paper: #efe9de; --color-paper-2: #e4dccd; --color-paper-white: #ffffff;
  --color-ink: #15130f; --color-ink-2: #4e483f;
  --color-cobalt: #1d3ec6; --color-cobalt-deep: #132b8f;
  --color-on-cobalt-2: #cfd7ff; --color-on-ink-2: #d6cfc2;
  --color-peach: #ffd9a8;
  --color-terracotta: #b4532e; --color-terracotta-text: #a84a27;
  --color-rule: rgb(21 19 15 / .2); --color-rule-on-dark: rgb(239 233 222 / .4);
  --font-display: …; --font-body: …; --font-serif: …; --font-mono: …;
  --spacing-gutter: clamp(16px, 3vw, 40px);
  --spacing-section: clamp(56px, 8vw, 110px); --spacing-block: clamp(36px, 5vw, 64px); --spacing-hero: clamp(18px, 3vw, 32px);
  --container-wrap: 1600px; --container-read: 70ch; --container-faq: 900px; --container-narrow: 760px;
  --radius-btn: 2px;
  /* розміри з §3: text-h1, text-h2, text-h2-poster, text-lead, text-body, text-small, text-kicker, text-label, text-epi, text-btn */
  --text-h1: clamp(28px, 3.4vw, 46px); --text-h1--line-height: 1.08; --text-h1--letter-spacing: -.01em; --text-h1--font-weight: 600;
  --text-h2: clamp(19px, 2.2vw, 26px); --text-h2--line-height: 1.12; --text-h2--letter-spacing: .01em; --text-h2--font-weight: 600;
  --text-h2-poster: clamp(30px, 5.2vw, 76px); --text-h2-poster--line-height: .95; --text-h2-poster--letter-spacing: -.01em; --text-h2-poster--font-weight: 800;
  --text-lead: 18px; --text-lead--line-height: 1.5;
  --text-body: 17px; --text-body--line-height: 1.5;
  --text-small: 15px; --text-small--line-height: 1.45;
  --text-kicker: 12px; --text-kicker--letter-spacing: .08em;
  --text-label: 11px; --text-label--letter-spacing: .06em;
  --text-epi: clamp(19px, 1.7vw, 24px); --text-epi--line-height: 1.3;
  --text-btn: 13.5px; --text-btn--letter-spacing: .03em;
}

@layer base {
  html { color-scheme: light; -webkit-text-size-adjust: 100%; scroll-behavior: smooth; }
  body { background: var(--color-paper); color: var(--color-ink); font-family: var(--font-body); font-size: var(--text-body); line-height: 1.5; -webkit-font-smoothing: antialiased; }
  main { overflow-x: clip; }
  h1, h2, h3 { font-weight: 600; text-wrap: balance; }
  :focus-visible { outline: 3px solid var(--color-cobalt); outline-offset: 3px; }
  [data-tone='cobalt'] :focus-visible, [data-tone='ink'] :focus-visible { outline-color: var(--color-paper); }
  @media (prefers-reduced-motion: reduce) { *, ::before, ::after { transition: none !important; animation: none !important; } html { scroll-behavior: auto; } }
}

@layer components {
  /* лише те, що Tailwind-утилітами незручно: .ui-table (стек з data-label), .ui-faq (+/– через ::before),
     .ui-term (тултип ::after), .ui-wordmark (вікно у фото + @supports), .nav-* (шапка: caret, [aria-expanded]),
     .map-pop (попапи MapLibre). Кожен клас задокументовано у відповідному компоненті §4. */
}
```

Вилучено на кроці 1 (перевірено grep по `src` без `/panel`): `@import 'tw-animate-css'` у публічному CSS, `@config tailwind.config.mjs` (і сам файл), `@plugin "@tailwindcss/typography"` разом із залежністю (`prose` у `src` не вживається), `@custom-variant dark`, усі `@source inline(...)`, shadcn-змінні `:root` і `@theme inline`, `html{opacity:0}` і `data-theme`.

**Лишається до кроку 9 (ще вживається публічним кодом):**
- `--color-card` (`bg-card`, ≈105 місць, у т. ч. `MainNav`, `Wave*`) і `:root { --error }` (`text-[var(--error)]` у формах) — зникають разом із заміною `bg-card`/`--error` за картою §2.7;
- базове правило `* { border-color: var(--color-line) }` (≈85 «голих» `border` покладаються на колір `--border`) — зникає, коли сторінки отримають явні `border-rule`/`border-ink`;
- `body { min-height: 100vh; display: flex; flex-direction: column }` — на ньому тримаються `mx-auto` mains із `w-full`; переглянути на кроці 3 разом із футером;
- `.container` (з медіа-запитами замість `@variant`, без `2xl`) — до вилучення `Bits.container` на кроці 9;
- **`tw-animate-css` лишається в `package.json`**: його імпортує власний `panel.css`, і панель користується `animate-in`/`zoom-in`. З публічного CSS він прибраний.

Нові брейкпоінти (§2.4) змістили `md` 48 → 50rem і `lg` 64 → 60rem, `2xl` (86rem) вилучено; старі сторінки до кроку 9 перелаштовуються на цих значеннях (контейнер: md 800px, lg 960px). Базові `h1, h2, h3 { font-weight: 600 }` змінюють заголовки без явної ваги; `font-bold` (700) на Unbounded тимчасово береться з 800 (вантажаться лише 600/800).

### 2.7 Карта міграції 1A → нова

Механічно: `grep -rnE '<шаблон>' src --include='*.tsx'`, замінити за таблицею, потім `pnpm exec tsc --noEmit` і `pnpm lint`. «Компонент» означає: не підставляти клас, а обгорнути в примітив із §4.

| 1A (токен / утиліта / патерн) | Було | Нова заміна | Примітка |
|---|---|---|---|
| `--color-clay` / `bg-clay` | `#f3e7da` кремовий фон | `bg-paper` | **не** теракота — тому ім'я `clay` зникає |
| `--color-cream` / `bg-cream` | `#fffaf4` фон карток/полів | поля: прозоре тло + підкреслення (`Field`); плашка «Показати ще»: `MoreLink`; цитата: `bg-paper-white` (`QuoteBlock`) | нема 1:1 |
| `--color-sand` / `bg-sand` | пігулки, hover карток | `Chip` (рамка 1.5px, без фону); hover: `hover:text-cobalt` | нема 1:1 |
| `bg-card` | `#fbf3ea` фон карток | без фону: `StudioCell`/`StudioRow`/`NumberedList`/`FaqItem`/`SideBox`; плитки цифр і примітки: `bg-paper-2` | 111 випадків у 42 файлах — найбільша частина роботи |
| `text-ink` / `border-ink` | `#2a2018` | `text-ink` / `border-ink` (значення змінюється на `#15130f`) | ім'я лишається, роль та сама |
| `text-umber` / `--color-umber` | `#6c5243` другорядний | `text-ink-2` | 189 випадків |
| `text-cream` | текст на темному | `text-paper` | |
| `border-line` / `--color-line` | `#e1c7ae` рамки | `border-rule` (1px) між рядками; `border-ink border-t-2` під заголовками; рамки карток — прибрати | |
| `bg-terra` + `text-cream` | теракотова CTA | `<Button variant="ink">` або `variant="cobalt"` | теракота — ніколи фон |
| `hover:bg-terra-dark`, `--color-terra-dark` | | hover кнопки (кобальт) | |
| `text-terra` | лічильники, «+/–», зауваження, номери | лічильники 13–14px → `text-terracotta-text`; номери ≥ 24px → `text-terracotta`; «+/–» → `text-cobalt`; «останній пост…» → `text-terracotta-text` mono 11.5 | |
| `border-terra`, `border-terra/40` | цитата власника, попередження | `border-cobalt` (6px) у `QuoteBlock`; попередження — `bg-paper-2` без рамки | |
| `accent-[var(--color-terra)]` | чекбокс | `accent-cobalt` на папері, `accent-peach` на кобальті | |
| `bg-cobalt` | синя смуга | `<Panel tone="cobalt">` (значення → `#1d3ec6`) | |
| `text-cobalt`, `hover:text-cobalt-dark` | посилання | `text-cobalt`, `hover:text-cobalt-deep` | |
| `--color-ochre` / `text-ochre` / `bg-ochre` / `!text-ochre` / `border-l-ochre` | кікер і номери на темному, кнопка «Додати студію», смуга цитати | на темному → `text-peach`; кнопка → `<Button variant="peach">`; смуга → `border-cobalt` | |
| `--color-sage` | «успіх» | прибрати; успіх — звичайний текст | лише у `KabinetForms`/`StudioEditForm` |
| `--error`, `text-[var(--error)]` | помилка | `text-terracotta-text` (папір) / `text-peach` (кобальт) | |
| `kicker` (утиліта: Unbounded 11.5px терра) | | `<Kicker>` (mono 12px, ink-2) | 185 випадків |
| `h-display` + `text-[clamp(26px,4vw,44px)] leading-[1.06]` | H1 | `font-display text-h1` (без uppercase) | |
| `h-display` + `text-[17px]` (заголовки міст) | | `<CityHead>` | |
| `band` (смугаста стрічка) | | **видалити**, еквівалента нема — єдиний колір у шапці тепер знак | |
| `rounded-full`, `rounded-xl`, `rounded-2xl`, `rounded-[14/18/20/22/26px]` | | `rounded-none` (фото, панелі, мапа) або `rounded-btn` (кнопки, чипи) | 162 випадки |
| `shadow-[…]` (мегаменю) | | прибрати; межа — `border-b-2 border-ink` | |
| `container` (`Bits.container`, 1200px, px-4/5) | | `wrap` = `mx-auto max-w-wrap px-gutter` (експорт із `src/components/ui/layout.ts`) | 69 випадків |
| `font-sans` | Raleway | `font-body` | |
| `font-display` | Unbounded | `font-display` (ваги лише 600/800) | `font-bold` (700) не вантажиться → замінити на `font-semibold`/`font-extrabold` |
| `font-mono` (системний) | | `font-mono` (JetBrains) | |
| `text-[#5a3f2c]`, `border-ochre` в `Epigraph` | | `<Epigraph>` новий (Playfair, cobalt-deep) | |
| `text-[13px] text-umber` (крихти, «Оновлено») | | `<Breadcrumbs>`, `<Updated>` (mono 12px) | |
| `overflow-x-auto rounded-2xl bg-card` + `<table>` | | `<DataTable>` | |
| `details … rounded-2xl bg-card` (FAQ, «Показати ще») | | `<Faq>`, `<MoreLink as="summary">` | |
| `.map-pop`, `.maplibregl-popup-content` (1A хекси) | | кольори з токенів, радіус 2px | |
| `themeColor: '#2a4fa8'` (`layout.tsx`), кольори `manifest.ts` | | `themeColor #efe9de`; manifest `#efe9de` / `#1d3ec6` | див. §7.6 |
| `src/app/(frontend)/og/route.tsx` `C = {…1A}` | | нові токени після 2-го раунду OG (§7) | |

Перевірка наприкінці (крок 9 §9): `grep -rnE 'bg-clay|bg-cream|bg-sand|bg-card|text-umber|text-cream|border-line|bg-terra|text-terra\b|terra-dark|ochre|sage|\bkicker\b|h-display|\bband\b|rounded-(full|xl|2xl|\[)|shadow-|font-sans|cobalt-dark' src` має повернути нуль рядків.

---

## 3. Типографіка

### 3.1 Шкала

| Роль | Шрифт · вага | Розмір (моб → деск) | Інтерліньяж | Трекінг | Регістр | Де |
|---|---|---|---|---|---|---|
| Вордмарк «ГЛИНА» | Unbounded 800 | `min(345px, calc((100vw − 2·gutter) / 4.4))` | .9 | −.02em | верхній | лише головна, `WordmarkWindow` |
| Логотип у шапці/футері | Unbounded 800 | 22px / 22px (футер 16px) | 1 | .02em | верхній | `Header`, `Footer` |
| H1 | Unbounded 600 | `clamp(28px, 3.4vw, 46px)` | 1.08 | −.01em | як у реченні | усі сторінки; головна теж (не плакатний) |
| H2 плакатний | Unbounded 800 | `clamp(30px, 5.2vw, 76px)`; у панелях до 84/68px | .95 | −.01em | верхній + курсивне слово Playfair .9em (cobalt на папері, peach на темному) | **лише головна** (`SectionHead variant="poster"`) |
| H2 розділу | Unbounded 600 | `clamp(19px, 2.2vw, 26px)` | 1.12 | .01em | верхній, без курсиву | внутрішні сторінки (`SectionHead`) |
| H3 міста / комірки | Unbounded 600 | 15.5–17px; картка фото 21px; крок 19px; формат 20px | 1.15–1.2 | 0 | як у реченні | `CityHead`, `StudioCell`, `PhotoCard`, кроки, гайди |
| Лід | Golos 400, числа `b` 600 | 18px | 1.5 | 0 | | під H1, max 70ch |
| Текст | Golos 400 | 17px | 1.5 | 0 | | `body` |
| Дрібний текст | Golos 400 | 14.5–15px, ink-2 | 1.45 | 0 | | примітки, опис у рядках |
| Підпис/примітка форми | Golos 400 | 12.5–13px | 1.4 | 0 | | `fine`, плитки |
| Кікер | JetBrains Mono 400 | 12px (11px у мега/футері) | 1.4 | .08em | верхній | `Kicker`, `Updated`, шапка таблиці-підпис |
| Мітка/шапка таблиці/чип | JetBrains Mono 500 | 11–11.5px | 1 | .06em | верхній | `th`, `Chip`, `Field label`, `data-label` |
| Меню | JetBrains Mono 400 | 12px | 1 | .06em | верхній | `nav-*` |
| Крихти | JetBrains Mono 400 | 12px, ink-2 | 1.4 | .04em | звичайний | `Breadcrumbs` |
| Футер | JetBrains Mono 400 (заголовки 500) | 11.5px | 1.7 | .03em (.08em заголовки) | заголовки верхній | `Footer` |
| Епіграф | Playfair Display italic 400 | `clamp(19px, 1.7vw, 24px)` | 1.3 | 0 | | `Epigraph`, max 30ch |
| Підтвердження форми | Playfair Display italic 400 | 20px | 1.3 | 0 | | `RequestForm` done |
| Кнопка | Unbounded 600 | 13.5px (sm: 12px) | 1 | .03em | верхній | `Button` |
| Посилання «ще» | Unbounded 600 | 12.5–13px | 1 | .04em | верхній | `MoreLink` |
| Число в геро | Unbounded 600 | 22px, cobalt, `tabular-nums` | 1 | 0 | | `Stat inline` |
| Число у смузі / плитці | Unbounded 800 | `clamp(20px, 2.2vw, 28px)` / `clamp(26px, 2.6vw, 36px)`, cobalt | 1 | 0 | | `FactStrip`, `Stat tile` |
| Номер картки / кроку | Unbounded 800 | 56px / `clamp(48px, 6vw, 88px)` | .8 | −.02em | | `PhotoCard`, кроки |
| Номер пункту | Unbounded 800 | 24px, terracotta | 1 | 0 | | `NumberedList` |
| Ціна у рядку | Unbounded 600 | 17px, cobalt, `tabular-nums`, `nowrap` | 1.2 | 0 | | `MakerRow` |

Числа всюди `font-variant-numeric: tabular-nums` (таблиці, смуги, ціни); текст — `lining-nums`.

### 3.2 `next/font` (`src/app/(frontend)/layout.tsx`)

```ts
import { Golos_Text, JetBrains_Mono, Playfair_Display, Unbounded } from 'next/font/google'

const unbounded = Unbounded({ subsets: ['cyrillic', 'latin'], weight: ['600', '800'], variable: '--font-unbounded', display: 'swap' })
const golos = Golos_Text({ subsets: ['cyrillic', 'latin'], weight: ['400', '500', '600'], variable: '--font-golos', display: 'swap' })
const playfair = Playfair_Display({ subsets: ['cyrillic', 'latin'], weight: ['400'], style: ['italic'], variable: '--font-playfair', display: 'swap', preload: false })
const jetbrains = JetBrains_Mono({ subsets: ['cyrillic', 'latin'], weight: ['500'], variable: '--font-jetbrains', display: 'swap', preload: false })
// <html className={`${unbounded.variable} ${golos.variable} ${playfair.variable} ${jetbrains.variable}`} lang="uk">
```

- **Підмножини:** `cyrillic` (покриває ї, є, ґ — U+0490/0491 входить) + `latin` (цифри, пунктуація, латинські назви студій, домен). `latin-ext`/`cyrillic-ext` не вантажити. Preload-посилання генеруються лише для `subsets`, тож `cyrillic` + `latin` × ваги = кількість preload.
- **Preload:** Unbounded (2 ваги × 2 підмножини = 4) і Golos (3 × 2 = 6) — це 10 preload-файлів. Якщо Lighthouse покаже забагато — перейти на `weight: 'variable'` для обох (по 1 файлу на підмножину, 4 preload; обидва шрифти на Google Fonts варіативні). Playfair і Mono — `preload: false` (нижче першого екрана; Mono в меню з'являється зі `swap`, це прийнятно).
- **Ваги:** Unbounded 600/800 (400 ніде не потрібен; 700 для OG береться окремо з `src/assets/fonts`). Mono — лише 500 (використати і для 400-ролей; різниця в 12px непомітна). Playfair — лише italic 400 (500 з макета не потрібен).
- `adjustFontFallback` — за замовчуванням (true).
- Для OG/Satori — окремі статичні TTF у `src/assets/fonts` (Unbounded ExtraBold з репозиторію googlefonts/unbounded, Golos Text Regular і JetBrains Mono Regular з Google Fonts; OFL, `OFL.txt`). Raleway і Unbounded Bold прибрано. Статичні файли з `@fontsource` для Satori не підійшли: накладені контури дають діри в «E», «К».

---

## 4. Компоненти

### 4.0 Правила

- **Примітиви** — `src/components/ui/*.tsx`, серверні, без стану, без імпорту даних сайту. Іменування файлів — за компонентом (`Button.tsx`), експорт іменований. Клієнтські лише: `MainNav.client`, `MobileDrawer.client` (усередині `MainNav`), `RequestForm.client`, `MobileRequestBar.client`, мапи, `InstagramPosts.client`, кабінетні форми (`ListEditor`, `PasswordInput`, `PhotoManager`).
- **Композити** — `src/components/site/*` збирають примітиви й знають про `site`, `navigation`, каталог. Шаблони сторінок (`TopicPage`, `WavePage`, `GuidePage`) лишаються в `site/`.
- Стилі — утиліти Tailwind з токенами §2; власні класи лише в `@layer components` і лише з префіксами `ui-*` (примітиви), `nav-*` (шапка) і `kb-*` (шапка й підвал кабінету, §4.4). Ніяких інлайнових хексів.
- Панелі задають тон атрибутом `data-tone="cobalt|ink"`; дочірні примітиви читають його через `group-data-[tone=cobalt]:…` або селектори в `@layer components` (кікер, лінійки, кнопка за замовчуванням, фокус).
- Усі списки студій, FAQ, таблиці рендеряться на сервері повністю (нічого не ховати за JS — ЛЛМ і пошук читають HTML).
- Кожен примітив показаний у `/dev/styleguide` (§8); новий примітив без запису там і тут не приймається.
- **Як реалізовано (крок 2):** кнопка, таблиця, FAQ, терм, поля, смуга цифр, комірки/рядки студій, фотокартка і вордмарк мають власні `ui-*` класи в `@layer components` (складні стани, `data-*` атрибути); решта — утиліти Tailwind. Тон панелі читають кікер і `Italic` через `group-data-[tone=…]/tone:`, кнопка без `variant` і поля — через `[data-tone] …` у CSS. Списки-обгортки експортуються разом з елементами: `StudioCells`/`StudioCell`/`IndexCell` (`StudioCell.tsx`), `StudioRows`/`StudioRow`, `MakerRows`/`MakerRow`; `CityList.tsx` містить і `SmallCities` (`groups: {name, studios: {name, href}[]}[]`); `Fields.tsx` — `Field`, `FieldRow`, `Input`, `Textarea`, `Select`, `Checkbox`; `Faq.tsx` — `Faq` і `FaqItem`. `PhotoCard` позначає тон атрибутом `data-pcard`, щоб не збігатися з `data-tone` панелей. `MoreLink` — `inline-flex`, а не `inline-block` (inline-block посилання як елемент grid/flex отримувало колонку вужчу за свій `nowrap`-текст).
- **`Term` на телефоні** (< 40rem): тултип — не над словом, а фіксована плашка між гаттерами над нижнім краєм (`position: fixed; bottom: calc(92px + safe-area)`, `z-index: 40` — між нижнім баром (30) і шухлядою (50)), `text-align: start`, щоб не виходити за екран при будь-якій позиції слова; від `sm` — над словом, `side="end"` для слів біля правого краю.
- **Після рев'ю дизайнера (крок 4):** `.ui-field` має `align-content: start`; `CityList` має `variant="side"` (без верхньої лінійки, для `SideBox`); інтерактивний `Chip` має зону дотику 44px через `::before` (вигляд не змінюється); `MoreLink` має `pad={false}`; `FactStrip` значення `nowrap` від md (на телефоні комірка вужча — передавайте короткі значення); діапазони цін у тексті обгортає `nobreak()` (`ui/NoBreak.tsx`) у `whitespace-nowrap` — символи тексту не змінюються; широка таблиця `mode="scroll"` на телефоні дописує до підпису « · прокрутіть вбік»; `StudioRow` з `showCity` має 132px колонку типу; `.ui-check` — 44px рядок.

### 4.1 Примітиви (`src/components/ui/`)

| Компонент | Призначення | Props (коротко) | Варіанти | Вигляд | Можна / не можна | Замінює |
|---|---|---|---|---|---|---|
| **`Button`** | усі кнопки й кнопкоподібні посилання | `href?` (→ `next/link`), `type?`, `variant`, `size: 'md'∣'sm'`, `arrow?`, `full?`, `disabled?`, `children` | `ink` (за замовч.: bg ink, text paper, hover cobalt) · `cobalt` (hover cobalt-deep) · `paper` (bg paper, text cobalt-deep; на кобальті; hover ink/paper) · `peach` (bg peach, text ink; на чорному; hover paper) · `ghost` (прозора, inset 2px currentColor; hover ink/paper) | `inline-flex`, висота 52px (`sm` 44px), `padding 0 1.4em`, Unbounded 600 13.5px (sm 12px) .03em верхній, `rounded-btn`, `white-space: nowrap`; `arrow` додає `<span class="ui-arrow">→</span>` зі зсувом 4px на hover; `disabled:opacity-60` | Можна: один primary на екран-блок. Не можна: теракотове тло, пігулки, іконки замість тексту, два `cobalt` поруч (другий — `ghost`) | усі `rounded-full bg-terra…`, `border border-line bg-card px-4 py-2 font-bold`, кнопки `KabinetForms`, `error.tsx` |
| **`Kicker`** | рядок над заголовком, мітки «Що нового:», «У містах:» | `children`, `as?: 'span'∣'p'`, `tone?: 'default'∣'terracotta'`, `className?` | `terracotta` — тільки кікери гайдів на головній (`terracotta-text`) | Mono 12px .08em верхній ink-2; на панелях — `on-cobalt-2` / `on-ink-2` автоматично | Не можна: Unbounded, теракота за замовчуванням, 11.5px | утиліта `kicker` |
| **`SectionHead`** | голова розділу з лінійкою | `title`, `id`, `kicker?`, `note?` (рядок 14.5px ink-2, max 70ch), `more?: {label, href}` (праворуч, `MoreLink`), `level?: 2∣3`, `variant?: 'rule'∣'poster'` | `rule` (за замовч.): grid gap 6, `padding-bottom 12`, `border-b-2 border-ink`, `margin-bottom 18`; заголовок `font-display text-h2 uppercase` · `poster` (лише головна): `text-h2-poster uppercase`, `more` в одному рядку по базовій лінії на ≥ md, курсивне слово через `<Italic>` | | Не можна: `poster` на внутрішніх; курсив у `rule`; заголовок без `id` (на нього ведуть `aria-labelledby`) | `Bits.SectionHead`, усі `<div className="mb-6 grid…"><span className="kicker">…<h2 className={h2}>` на головній |
| **`Italic`** | курсивне слово в плакатному H2 | `children` | — | Playfair italic 400, `.9em`, `text-transform: none`, cobalt на папері, peach на темному | Лише в `SectionHead variant="poster"` і H2 панелей головної | — |
| **`CityHead`** | H3 міста над списком | `name`, `count?`, `id` | — | flex baseline gap 10; Unbounded 600 17px; `count` Unbounded 600 14px `terracotta-text`; `padding-bottom 8`, `border-b-2 border-ink`, `margin-top 26` | | `h-display text-[17px]` + `text-terra` у `TopicPage.StudioList`, `/vyrobnyky` |
| **`Rule`** | явна горизонтальна лінійка | `tone?: 'thin'∣'ink'∣'on-dark'`, `className?` | `thin` 1px rule · `ink` 2px ink · `on-dark` 1px rule-on-dark | `<hr>` без відступів | Вертикальні лінійки — не компонент, а `border-l border-rule` + `pl-6` у сітці | — |
| **`Panel`** | суцільна кольорова панель | `tone: 'cobalt'∣'ink'`, `bleed?: boolean`, `as?`, `className?`, `children` | `bleed` — на всю ширину вікна з `wrap` усередині, `padding-block clamp(44px,7vw,96px)`; без `bleed` — вставний блок (форма, промо) з `padding clamp(18px,2.4vw,28px)` | `data-tone`, `bg-cobalt text-paper` / `bg-ink text-paper`; усередині кікер → `on-*-2`, лінійки → `rule-on-dark`, `Button` за замовчуванням → `paper` (кобальт) / `peach` (чорний) | Не можна: тінь, радіус, рамка; два `bleed` поспіль без паперу між ними | синя смуга і чорний блок головної, промо мегаменю, обгортка `RequestForm` |
| **`FactStrip`** | цифри сторінки під лідом | `items: {value: string, label: string}[]` (3–5), `label?` (aria, за замовч. «Цифри сторінки») | — | grid 2 → 5 колонок на md; `border-t-2 border-ink`, `border-b border-rule`, `margin-top 10`; комірка `padding 14px 16px 14px 0` + `border-r border-rule` (остання без); на < md непарні зліва без відступу, парні без правої лінійки, рядки від 3-го з верхньою 1px, останній непарний — на всю ширину; `value` Unbounded 800 `clamp(20px,2.2vw,28px)` cobalt `tabular-nums`; `label` 13px ink-2 | Значення лише з `ctx`/`stats()`: кількість студій, міст, діапазон цін, термін, «оновлено». Не можна: < 3 пунктів, вигадані числа, на панелях | нове (з внутрішньої B) |
| **`Stat`** | число з підписом | `value`, `label`, `variant: 'inline'∣'tile'` | `inline` (геро): `b` Unbounded 600 22px cobalt + 14px ink-2 у рядок, набір через flex gap 8/28 · `tile` (ринок): `bg-paper-2 p-[14px_16px]`, число Unbounded 800 `clamp(26px,2.6vw,36px)` cobalt, підпис 13px ink-2; сітка 2 → 4 колонки на sm, gap 12 | | | числа геро й плитки головної |
| **`PhotoCard`** | нумерована фотокартка напряму | `n: '01'…`, `title`, `text`, `cta`, `href`, `tone: 'ink'∣'cobalt'`, `photo: SitePhoto` | ≥ lg — комірка сітки 3×2: фото 1:1, номер 56px Unbounded 800 paper `mix-blend-mode: difference` у лівому верхньому куті (12/14px), текст на тлі tone (h3 Unbounded 600 21px, p 14.5px `on-*-2` max 36ch, CTA mono 12px .06em верхній peach) · < lg — рядок: фото 108px на всю висоту ліворуч, номер mono 12px .1em peach над назвою 16px, текст 13px `line-clamp-2`, CTA 11px | `sizes="(min-width:960px) 33vw, 108px"`, hover фото `scale(1.04)` | Не можна: горизонтальна стрічка на телефоні; більше 6; інша пропорція фото | картки напрямів головної |
| **`VesselWindow`** | фото у формі посудини | `shape: 'jug'∣'bowl'∣'plate'`, `photo`, `title`, `caption`, `href` | `jug` 128×170 (3:4), `bowl`/`plate` 170×170 | SVG `<clipPath clipPathUnits="objectBoundingBox">` з `template/index.html` (`#jug`, `#bowl`, `#plate`) один раз у `main`; ≥ lg — смуга з трьох плиток через `border-r border-rule`, вікно ліворуч, Unbounded 600 20px + mono підпис праворуч, під смугою 1px лінійка; md–lg — три в ряд по центру; < md — стовпчик, вікно 120px ліворуч | Лише головна. Не ставити поруч зі списком міст у дві колонки (відкинуто) | нове |
| **`DataTable`** | будь-яка таблиця | `caption`, `columns: {key, label, align?: 'start'∣'end', numeric?, mono?}[]`, `rows: Record<key, ReactNode>[]`, `mode?: 'stack'∣'scroll'` (за замовч. `stack`), `className?` | `stack`: < md `thead` ховається, `tr` → блок з `padding 12px 0` і 1px лінійкою, `td` → рядок із `::before content: attr(data-label) ' · '` mono 11px верхній ink-2, перший `td` 600 16px без мітки · `scroll`: для ≥ 5 колонок (`/tsiny-2026`) — `overflow-x: auto` без фону й радіуса, `min-width` таблиці | `border-top: 2px ink`; `caption` ліворуч mono 11.5px .08em верхній ink-2; `th` mono 500 11px .06em верхній ink-2, `padding 10px 0`, 1px знизу; `td` 15px `padding 11px 0`, 1px знизу, `vertical-align: top`, між колонками `padding-left 14`; `numeric` → `tabular-nums` + `nowrap` на ≥ md; посилання cobalt `underline` offset 3; `mono` колонка (джерело) mono 12px ink-2 nowrap | Клас `ui-table` у `@layer components`. Не можна: фон, радіус, зебра, рамки навколо комірок | таблиці `GuidePage`, `/tsiny-2026`, приклади цін `TopicPage` (замість списку плашок → таблиця Студія / Місто / З прайсу / Джерело) |
| **`Chip`** | тег, лічильник, фільтр | `href?`, `children`, `count?`, `size?: 'md'∣'sm'`, `active?`, `tone?: 'ink'∣'cobalt'`, `as?: 'a'∣'span'∣'button'` | `md`: mono 11.5px .04em верхній, `padding 7px 11px`, `inset 1.5px ink`, `rounded-btn`, hover `bg-ink text-paper`; `count` `terracotta-text` 500 з відступом 5px · `sm` (у `MakerRow`): 10.5px, `padding 4px 7px`, `inset 1px rule`, без hover · `tone="cobalt"`: inset 1.5px cobalt + text cobalt (акцентний формат) · `active`: `bg-ink text-paper` (фільтри мапи) | Теги «Дивіться також» = `md` з `padding 9px 14px` | Не можна: пігулки, фон `sand`, заливка кобальтом | усі `rounded-full bg-sand…`, чипи міст, `tags`, фільтри `StudioMap` |
| **`ChipGroup`** | набір чипів із міткою | `label?` (`Kicker`), `aria-label`, `children`, `as?: 'nav'∣'div'` | — | flex wrap gap 8, align center | | `nav aria-label="У містах"`, «Дивіться також» |
| **`Faq`** + **`FaqItem`** | питання-відповіді + JSON-LD | `Faq`: `items: {q, a}[]`, `id?`, `title?`, `kicker?`, `jsonLd?: boolean` (за замовч. true), `openFirst?` · `FaqItem`: `q`, `children`, `open?` | — | `details` з `border-b border-rule` (перший ще `border-t`); `summary` grid `1fr auto` gap 20 baseline, `padding 15px 0`, Unbounded 600 15.5px (головна 16px) 1.25, `list-style: none`; знак `.ui-faq-pm` mono 18px cobalt, `details[open] … ::before {content:"–"}` інакше `"+"`; відповідь 17px ink-2 max 62ch, `margin-bottom 18` | Клас `ui-faq`. Не можна: фон, радіус, іконки, JS | `SelectionFaq`, FAQ у `TopicPage`/`WavePage`/`GuidePage`/`/mapa` |
| **`Term`** | слово зі словника з тултипом | `children`, `def`, `side?: 'start'∣'end'` | — | `<abbr class="ui-term" tabIndex={0} data-def>`; `text-decoration: underline dotted 1.5px terracotta`, offset 4px, `cursor: help`; тултип `::after content: attr(data-def)`: `bg-ink text-paper` 14px Golos 1.4, `padding 8px 11px`, `max-width min(300px, 70vw)`, `rounded-btn`, над словом (`bottom: calc(100% + 8px)`), `left: 0` (`side="end"` → `right: 0`), показ на `:hover`/`:focus`, `z-index 5` | Визначення — з `docs/voice/glossary.md` (винести у `src/content/glossary.ts`). Слово має бути пояснене і в тексті (для ЛЛМ) — тултип дублює, не замінює. Не можна: на панелях, у заголовках, у таблицях | нове |
| **`Epigraph`** | вірш після ліду | `lines: string[]` | — | `<figure aria-label="Епіграф">`, `p` Playfair italic `text-epi` cobalt-deep, кожен рядок `display: block`, `max-width 30ch`, `padding-left 16`, `border-l-2 border-cobalt`; без смужки знизу | Один на сторінку; тільки на папері; не в геро внутрішніх (після ліду, у колонці тексту); на головній — у геро під кнопками | `Bits.Epigraph` (ochre + смужка) |
| **`Field`** + **`Input`/`Textarea`/`Select`/`Checkbox`** | поля форм | `Field`: `label`, `htmlFor`, `hint?`, `error?`, `children` · контроли: нативні props + `invalid?` | тон беруть від батьківської `Panel` (`data-tone="cobalt"`) або паперу | `Field` grid gap 3 `padding-block 7`; `label` mono 11px .08em верхній (на кобальті `opacity .85`); контрол `font: inherit; font-size 16px` (iOS без зуму), `border: 0; border-bottom: 2px`, тло прозоре, `padding 6px 0`, `rounded-none`, `width 100%`; на кобальті: текст paper, межа `rgb(239 233 222 / .6)`, placeholder `.55`; на папері: текст ink, межа `ink-2`, placeholder `ink-2`; `Select` `appearance: none` + chevron SVG (paper на кобальті, ink на папері); `Textarea` `min-height 56`, `resize: vertical`; `Checkbox` 16px, `accent-peach` / `accent-cobalt`; помилка — текст 13px `peach`/`terracotta-text` + межа того ж кольору, `aria-invalid`; пара полів — `grid-cols-2 gap-4` (`FieldRow`) | Не можна: рамки з радіусом, тло `cream`, мітки 13px Golos | поля `RequestForm`, `KabinetForms`, `StudioEditForm` |
| **`Breadcrumbs`** | крихти + JSON-LD | як зараз: `items`, `modified?` | — | `nav` mono 12px .04em ink-2; роздільник `›` з `opacity .6`, `margin-inline 6`; hover cobalt; JSON-LD `BreadcrumbList` + `WebPage` без змін | | `Bits.Breadcrumbs` (13px Raleway) |
| **`Updated`** | «Оновлено: …» | `date?` (за замовч. `site.dataUpdated`) | — | mono 12px .06em верхній ink-2 | Є на кожній публічній сторінці | `Bits.Updated` |
| **`NumberedList`** | пункти розділу з номерами | `items: {title, text}[]`, `columns?: 1∣2`, `start?` | `columns=2` на ≥ md, `column-gap 32` | `ol` з `border-t border-rule`; `li` grid `44px 1fr`, `padding 14px 0`, `border-b border-rule`; номер Unbounded 800 24px terracotta (`grid-row 1/3`); заголовок Unbounded 600 15.5px; текст 15px ink-2 | Не можна: картки, `sm:[&:last-child:nth-child(odd)]:col-span-2` | пункти `TopicPage.sections`, `PlacePicks`, `GuidePage` items, кроки `WavePage` |
| **`QuoteBlock`** | відповідь-цитата з джерелом | `children`, `source?` | — | `bg-paper-white`, `border-l-[6px] border-cobalt`, `padding 16px 20px` (головна 18/22), grid gap 8, 17px; `source` mono 11.5px .05em верхній ink-2 | Одна на розділ («Найчастіше в прайсах — …») | `border-l-ochre bg-cream` на головній, відповідь про ціни в `TopicPage`, цитата власника в профілі (без `source`) |
| **`CtaBand`** | смуга запиту після відповіді / в кінці | `title`, `text?`, `cta: {label, href}`, `tone: 'ink'∣'cobalt'` | `ink` → кнопка `peach` · `cobalt` → кнопка `paper`, текст `on-cobalt-2` | `Panel` без `bleed`, flex `space-between` wrap gap 16, `padding 18px 22px`; `title` Unbounded 600 17px блоком, текст 16px max 60ch | Після відповіді про ціни — `cobalt`; наприкінці контенту — `ink`. Не більше двох на сторінку. Не плутати з вилученою утилітою `band` | нове |
| **`MoreLink`** | «Показати ще N →», «Усі міста →» | `href?`, `as?: 'a'∣'summary'`, `children` | `summary` — для `details` «Показати ще / Згорнути» | Unbounded 600 12.5–13px .04em верхній, `padding 12px 0`, hover cobalt, стрілка `ui-arrow` | | `rounded-full border border-line bg-cream … summary`, лінки «Усі … →» |
| **`StudioCell`** | студія в сітці (профіль «Інші студії», `/vyrobnyky`) | `s: StudioCard`, `showCity?`, `line?` | — | `ul.ui-cells` з `border-t-2 border-ink`; на ≥ sm 2 колонки: непарна комірка `border-r border-rule pr-[18px]`, парна `pl-[18px]`; `a` grid gap 6 `padding 14px 0` `border-b border-rule` `h-full`; тип (+ місто) mono 11px .06em верхній ink-2; назва Unbounded 600 16px (hover cobalt); опис 14px ink-2 `line-clamp-3`; «останній пост…» mono 11.5px `terracotta-text`; «Профіль →» mono 12px .06em верхній cobalt | Без фото, поки студія не дала згоди; без фону й радіуса | `StudioCard` |
| **`StudioRow`** | студія у тематичному списку | `s`, `line` (evidence), `showCity?` | — | `ul.ui-rows`; `li > a` grid `1fr auto` (≥ md `96px 1fr auto`) gap `2px 16px`, `padding 13px 0`, `border-b border-rule`; тип mono 11px верхній ink-2; назва Unbounded 600 15.5px; рядок 14px ink-2 `line-clamp-2` `overflow-wrap: anywhere`; стрілка mono 14px cobalt по центру праворуч; hover → назва cobalt | | `TopicPage.Row` |
| **`MakerRow`** | студія у списку міста майстер-класів | `s`, `price?: {value, unit}`, `place?` (місто чи село рядка на сторінці «місто і область», перед адресою) | — | `ul.ui-makers` `border-t-2 border-ink`; `li` grid `1fr auto` gap `4px 18px`, `padding 14px 0`, 1px лінійка; назва Unbounded 600 16px; мета mono 12px ink-2 («Студія · адреса · @ig», ig підкреслено); опис 14px ink-2; чипи `Chip size="sm"` (акцентний формат `tone="cobalt"`); ціна праворуч, `grid-row 1/4`, Unbounded 600 17px cobalt `nowrap` + `small` mono 10.5px верхній ink-2 («з особи»); < sm ціна під текстом ліворуч | Ціна — разове групове заняття з прайсу; якщо нема — колонку не рендерити | `MakerRow`, рядки `/maister-klasy/[city]` |
| **`CityList`** | міста з лічильниками | `items: {name, href, count}[]`, `columns?: 2∣4` | — | grid 2 → 4 колонки на md, `gap 0 24px`, `border-t-2 border-ink`; `a` flex `space-between` baseline, `padding 12px 0`, `border-b border-rule`, 600 17px, hover cobalt; лічильник Unbounded 600 14px `terracotta-text` | | плитки `rounded-[14px] bg-card` на `/vyrobnyky/misto`, `/maister-klasy`, список міст головної |
| **`SmallCities`** | «Ще міста і села» | `groups: {name, studios}[]` | — | grid 1 → 2 колонки, `gap 4px 24px`, 15px; назва 600 + посилання з підкресленням | | `TopicPage.StudioList small` |
| **`Facts`** | «Коротко» профілю | `rows: [label, ReactNode][]` | — | `dl` `border-t-2 border-ink`; рядок grid 1 → `130px 1fr` на sm, `padding 10px 0`, 1px лінійка; `dt` mono 11px верхній ink-2; `dd` 15.5px `overflow-wrap: anywhere`, посилання cobalt підкреслені | | таблиця фактів профілю |
| **`ListBlock`** / **`PriceList`** | «Вироби / Послуги», ціни профілю | `title`, `items` · `items: {text, source?}[]` | — | `ListBlock`: `Kicker` з 1px лінійкою, пункти 15px `padding 4px 0` з `«— »` `terracotta-text`; `PriceList`: рядки `padding 9px 0` 1px лінійка, grid `1fr auto`, джерело mono 11.5px ink-2 nowrap (< sm у стовпчик) | | `profile/blocks.ListBlock`, `PriceItem` |
| **`SideBox`** | блок у бічній колонці без форми | `title` (`Kicker`), `children` | — | `border-t-2 border-ink pt-3` grid gap 8 15px; список міст усередині 2 колонки з 1px лінійками і лічильником `terracotta-text` | | `CityJump card`, «Це ваша студія?», «Купити або замовити», «Подарувати або піти командою» |
| **`Note`** | службова примітка | `children` | — | `bg-paper-2 p-[16px_18px]` 15.5px max 70ch, без рамки | «Студія ще не вказала…», попередження «така студія вже є» | `bg-sand border-terra/40`, `bg-card` примітки |
| **`MapFrame`** | контейнер мапи | `height: 'profile'∣'list'`, `children`, `fallback?` | `profile` 200/260px · `list` `60vh min 360 max 720` | `bg-paper-2`, `border border-rule`, `rounded-none`, `overflow: hidden`; поки мапа не завантажилась — mono 12px верхній ink-2 по центру; попапи MapLibre: `bg-paper`, `rounded-btn`, Golos 14px, посилання cobalt; маркери cobalt (студія) / terracotta (кілька поруч); легенда — кружки 12px | | обгортки `ProfileMap`, `StudioMap`, `.map-pop` |
| **`IndexCell`** | редакційна комірка (добірки, кейси, формати) | `href`, `kicker?`, `title`, `text?`, `cta?` | — | як `StudioCell`, але заголовок Unbounded 600 17px, текст 15px | | `rounded-[18px] bg-card` на `/dobirky`, `/keysy` |
| **`WordmarkWindow`** | «ГЛИНА» як вікно у фото | `photo: {desktop: SitePhoto, mobile: SitePhoto}` | — | §6.3 | Лише головна | нове |
| **`Mark`** | знак-куманець | `size?: 22∣26∣28`, `className?` | — | інлайн `<svg viewBox="0 0 64 64" aria-hidden fill="currentColor">` з трьома path фавіконки (`experiments/design-options/menu.js` → `MARK`), колір `text-terracotta` | Єдиний теракотовий елемент у шапці й футері | — |

`SitePhoto = { src, width, height, alt }` — реєстр `sitePhotos` у `src/content/photos.ts` (§6).

### 4.2 Композити (`src/components/site/`)

**`SiteHeader`** (сервер) + **`MainNav.client`**. Замінює поточні `SiteHeader`/`MainNav`. Однакова на всіх сторінках.

- Службова смужка (`nav-util`, лише ≥ lg): `border-b border-rule`; `utilityNav` mono 11px .06em верхній ink-2, gap 22, `padding-block 7`; праворуч «UA» 500 ink. hover cobalt.
- Шапка (`nav-head`): `position: sticky; top: 0; z-index 20; bg-paper; border-b-2 border-ink`. Рядок `wrap` grid `auto 1fr auto` gap 20 `padding-block 12`: логотип (`Mark` 26px + «ГЛИНА» Unbounded 800 22px .02em; `aria-label="Глина — на головну"`) · `nav aria-label="Головне меню"` по центру · `Button size="sm" arrow` «Отримати пропозиції» (href `requestHrefFor(pathname)`), на < lg текст «Запит».
- Пункти (`nav-sec`): `button` для розділів із мегаменю / `Link` для `simpleNav`; mono 12px .06em верхній, `padding 4px 0`, `border-b-2 transparent`, hover і `[aria-expanded=true]` → `border-cobalt`; `emphasis` → text cobalt; caret 6px (`nav-caret`), обертається при відкритті. Gap `clamp(10px,1.8vw,26px)`, flex-wrap.
- < lg: grid `auto 1fr auto auto`, меню ховається, з'являється `Button variant="ghost" size="sm"` «Меню» (`aria-controls="mobile-menu"`), кнопка «Запит →».
- Мегаменю (`nav-mega`): усі панелі в HTML, видима одна (`hidden`); `absolute inset-x-0 top-full bg-paper border-b-2 border-ink` (без тіні); усередині `wrap` grid `3×1fr + 1.1fr` `padding-block 28px 32px`; колонка `pl-6 border-l border-rule` (перша без); заголовок колонки mono 11px .08em верхній ink-2 з 1px лінійкою; посилання 600 15.5px 1.25 `padding 7px 0`, hover cobalt; `small` 13px ink-2. Промо — `Panel tone="cobalt"` (вставна) `ml-6 p-[22px]` grid gap 10: `b` Unbounded 600 17px, `p` 14.5px `on-cobalt-2`, `Button variant="peach" size="sm"`. Логіка (клік + hover-intent, Escape, клік поза, закриття на навігації) — як зараз.
- Шухляда (`nav-drawer`): нативний `<dialog id="mobile-menu" aria-label="Меню">` на `showModal()`; `position: fixed; inset: 0; max-width: none; max-height: none; bg-paper; padding 14px gutter 40px; overflow-y: auto`; `::backdrop` не потрібен (на всю ширину). Верх: логотип + `Button ghost sm` «Закрити», `border-b-2 border-ink`. Розділи — `details` (перший `open`): `summary` Unbounded 600 15px верхній `padding 16px 0`, знак «+/–» mono 20px cobalt праворуч (`nav-pm`), 1px лінійка; посилання 600 16px `padding 7px 0`. Далі `details` «Ще» (`simpleNav` + «Для студій» → `STUDIO_JOIN_HREF`), службові посилання mono 11px, і `Button variant="cobalt" full arrow` «Отримати пропозиції». Закриття: Escape (нативно), кнопка, навігація. `body { overflow: hidden }` поки відкрито.
- Усі власні класи — `nav-*` у `@layer components`; решта — утиліти.
- Пошук (`SearchHeader`, §4.3) стоїть у `nav-actions` перед «Меню»/кнопкою запиту. На телефоні рядок «лупа · Меню · Запит» вміщається від 360px: `nav-top gap 4px`, `nav-actions gap 6px`, `ui-btn padding-inline 10px`, «Запит» без стрілки (стрілка повертається від 65rem); знак-куманець ховається від `max-width: 22.5rem`.

**`SiteFooter`.** `footer` у `wrap`: `margin-top clamp(56px,8vw,96px)`, `border-t-2 border-ink`, `padding-block 26px 44px`, grid 1 → `1.2fr 1fr 1fr 1fr` на md, gap 18; mono 11.5px .03em 1.7 ink-2. Перша колонка: `Mark` 22px + «ГЛИНА» (Unbounded 800 16px), `site.description`, «Дані оновлено: …», рядок `© рік · Глина · hlyna.com.ua`. Колонки `footerColumns`: заголовок mono 500 верхній .08em ink з `margin-bottom 6`, посилання блоком, hover cobalt. Без фону, без нижньої лінійки.

**`RequestForm.client`.** Завжди у `Panel tone="cobalt"` (вставна), `id="zapyt-forma"` (на нього ведуть бар і кнопки «Отримати пропозиції» на сторінці). Grid gap 2: `Kicker` «Швидкий запит · безкоштовно» (на головній «Запит · безкоштовно»), заголовок Unbounded 600 19–20px paper (`p` з `id` для `aria-labelledby`: «Опишіть, що потрібно — передамо студіям, які роблять подібне» (не обіцяємо, скільки студій відповість: лише кому передамо, «до 5») / профіль: «Запит {назва} і ще 2–4 студіям»), поля (`Field`), `sub`: `Button variant="paper"` «Отримати пропозиції» (на головній «Надіслати запит») + `small` mono 11px `on-cobalt-2` «Відповідь напряму від студій», `fine` 12.5px `on-cobalt-2` max 52ch. Honeypot `website2` лишається.
- `compact` (геро головної): textarea «Що потрібно і скільки», місто, дата, контакт — 4 поля в один стовпчик.
- повна: `Select` «Що потрібно» (WHAT), пара кількість/дата (тексти з `KIND`), місто, деталі, пара телефон/email, `Checkbox` «Потрібен логотип» (лише де `KIND.logo`).
- `forStudio` («Додати нову студію»): ті самі поля на кобальті; попередження про наявну студію — `Note` на папері всередині (єдиний світлий блок).
- Стани: `sending` → кнопка `disabled`; `done` → ховає поля, показує Playfair italic 20px «Запит надіслано · № N» + абзаци 15px paper; `error` → 13px peach над кнопкою.
- На `/zapyt` і в кабінеті — та сама панель у `max-w-narrow`.

**`MobileRequestBar.client`.** Як зараз за логікою (`#zapyt-forma`, ховається, коли форма на екрані, не на `/zapyt`). Вигляд: `fixed inset-x-0 bottom-0 z-30 bg-paper border-t-2 border-ink`, `padding 10px gutter calc(10px + env(safe-area-inset-bottom))`, `Button variant="cobalt" full arrow` «Отримати пропозиції»; `lg:hidden`; сторінка з баром має `pb-[76px]` на `main` (замість `pb-28`). Без blur і прозорості.

**`TopicPage` / `WavePage` / `GuidePage` / `PlaceContent`** — композиція за §5; власних стилів не мають, лише сітки (`wrap`, `hero`, `cols`): 
- `hero`: grid 1 → `7fr 5fr` на lg, gap `clamp(20px,3vw,40px)`, `padding-block var(--spacing-hero) clamp(24px,3vw,40px)`, `border-b-2 border-ink`; текстова частина grid gap 14.
- `cols`: grid 1 → `1.15fr .85fr` на lg, gap `clamp(28px,4vw,56px)`, `padding-top clamp(24px,3vw,40px)`; `aside` на lg `sticky top-[84px]` grid gap 22; головна колонка grid gap `var(--spacing-block)`.

**`InstagramPosts.client`** — комірки як `StudioCell` (ruled), без радіуса.

**`TopList`** — «топ за категоріями» на письмових сторінках (поле `tops` у копії, `WavePage` ставить після першої секції; приклад у `/dev/styleguide` №20). Кожна категорія — `Block` з кікером «Топ за категоріями»; `ol` з лінійками як `NumberedList`: номер 1–5 Unbounded 800 24px terracotta у колонці 44px; назва виробу Unbounded 600 16px; ціна — найпомітніший рядок (Unbounded 600 17px cobalt, tabular; від sm окрема права колонка); виробник — посилання на профіль, без профілю — на Instagram (`nofollow`); деталі 15px, умови 14px ink-2; «Дані: …» mono 11.5px верхній ink-2. Пост в Instagram показано відкритим під рядком (max 480px), embed вантажиться ліниво біля екрана, до того — компактна картка-посилання; на телефоні виходить з відступу номера. Після бізнесової категорії (корпоративні, з логотипом) — `RequestBand tone="cobalt"` на `#zapyt-forma`. JSON-LD: `ItemList` з `ListItem` (назва + посилання), без Product/Offer.

**`KabinetForms.client`** (вхід, пароль, заявка «Це ваша студія?») — `Field variant="box"`, `PasswordInput`, `Button variant="ink"`; сторінки й редактор кабінету — §4.4.

### 4.3 Пошук (`src/components/site/search/`)

Макети, міри й стани — `docs/design/search/` (варіант A, обрано 15.10.2026). Логіка — `src/lib/search/` (рушій, що працює в браузері й на сервері), індекс — `src/server/searchIndex.ts`, віддається як `/poshuk/index.json`. Класи — `srch-*` у `@layer components`.

- **`SearchHeader`** (`SiteSearch.client.tsx`, у `MainNav`). Від 80rem — справжнє поле 232×44 (`srch-box`: `inset 1.5px ink`, hover 2px ink, відкрито — `inset 2px cobalt`), лупа 18px `ink-2`, placeholder mono 12px верхній «Пошук», праворуч `kbd` «/» (відкрито — «Esc»). Нижче 80rem — квадрат 44×44 з лупою (`srch-trigger`, `inset 2px currentColor`, `aria-label="Пошук по каталогу"`; без JS — посилання на `/poshuk`): **єдиний дозволений іконковий контрол**, бо слово «Пошук» не вміщається в телефонний рядок. Клавіші `/` і `⌘K`/`Ctrl K` відкривають пошук звідусіль.
- **Панель** (`srch-panel`, від 80rem): як мегаменю — `absolute inset-x-0 top-full bg-paper border-b-2 border-ink`, без тіні й затемнення; усередині `wrap` `padding 24px gutter 22px`; три колонки `1.35fr 1fr 1fr` з `border-l border-rule` і `padding-inline 24px` (відповідь і студії · міста · сторінки й гайди; порожня група лишає колонку порожньою). Заголовок групи `srch-grp` mono 11px .08em верхній `ink-2` з 1px лінійкою і лічильником `terracotta-text` 500. Низ `srch-foot`: «Усі результати для «…» →» (`MoreLink` на `/poshuk?q=`) і клавіші ↑↓ Enter Esc ліворуч, `Button cobalt sm arrow` «Отримати пропозиції» праворуч. Порожнє поле: «Популярне» (`Chip` вписує запит), «Міста» (`Chip` на сторінки міст + «Усі міста →»), «Нещодавно» (до 5 запитів із `localStorage`, «Очистити»), «Як шукати». Нічого не знайшли: `h3` 19px із запитом у лапках, 15.5px `ink-2`, `Button cobalt` на `/zapyt?q=` (запит потрапляє в «Деталі»), `Button ghost` «Усі виробники», чипи «Спробуйте».
- **Діалог** (`srch-dialog`, нижче 80rem і з поля головної на телефоні): нативний `<dialog>` на `showModal()`, як `nav-drawer`; верх `srch-dialog-top` — лупа 20px, `input` 48px Golos 18px (iOS без зуму), «Скасувати» mono 12px верхній `cobalt` 44px, під ними `border-b-2 border-ink`; результати одразу під полем (`srch-dialog-body`, `overflow-y: auto`, `overscroll-behavior: contain`), рядки 56px, групи стовпчиком, внизу «Усі результати» і `Button cobalt full`. Закриття: «Скасувати», Esc / «назад» (нативно), навігація.
- **`SearchRow`** (`SearchRow.tsx`, серверний; той самий у панелі, діалозі й на `/poshuk`): `a.srch-row` grid `1fr auto` gap `1px 14px`, 1px лінійка, 48px (панель) / 56px (діалог, `.srch-page`); кікер mono 11px верхній `ink-2` («Студія · Львів», «Майстер-класи»); назва Unbounded 600 15.5px; рядок 13.5px `ink-2`; праворуч ціна разового групового заняття з прайсу студії (Unbounded 600 15px `cobalt` `tabular-nums` + «з особи» mono 10.5px; та сама, що в рядках міських сторінок), інакше `→` mono 14px `cobalt`. Збіг — `<mark>` без фону: `underline 2px cobalt offset 3`. Закрита студія чи з непідтвердженою активністю — у кінці групи з приміткою mono 11.5px `terracotta-text` («останній пост — …»). Hover — назва `cobalt`; обрано (`aria-selected`) — фон `paper-2` + назва `cobalt`.
- **`SearchAnswer`** — сторінка, що відповідає на запит повністю («коло львів» → «Гончарне коло у Львові»): біла плашка з 6px кобальтом (як `QuoteBlock`), кікер mono 12px «Сторінка каталогу · …», назва Unbounded 600 18px `cobalt`, рядок 14.5px `ink-2` (місця й ціни зі сторінки); обрана з самого початку, тож Enter відкриває її.
- **`SearchField`** / **`HeroSearch`** — велике поле (`srch-field`): 52px (56px від sm), `inset 2px ink`, лупа 20px, `input` 16/18px, `Button ink` «Знайти» в рамці; GET-форма на `/poshuk` (працює без JS). На головній стоїть під підзаголовком замість «Знайти майстер-клас», `Button cobalt` запиту одразу під ним; на десктопі показує список під собою (`srch-drop`, 2px ink), на телефоні відкриває діалог.
- **`/poshuk?q=`** — внутрішній шаблон: крихти → кікер → H1 «Результати для «…»» → лід із числами → `SearchField` → `Updated`; `cols` з `Block` «Відповідь», «Студії · N», «Міста · N», «Сторінки й гайди · N» і `RequestBand ink`; бічна — `RequestForm` (місто й вид запиту з результатів, «Деталі» = запит). `noindex, follow`; у sitemap і `llms.txt` не потрапляє.
- Доступність: поле `role="combobox"` з `aria-expanded`, `aria-controls`, `aria-activedescendant`, `aria-autocomplete="list"`; список `role="listbox"`, групи `role="group"`; фокус лишається в полі, ↑↓ рухають вибір, Enter відкриває; прихований `aria-live` із підсумком через 500 мс.
- Рух: без анімації появи; `transition background/color .2s`; поки вантажиться індекс — 2px кобальтова риска (`srch-busy`), статична при `prefers-reduced-motion`.
- Не можна: тінь, радіус чи затемнення в панелі; фон у рядків (крім `paper-2` обраного); заливка в `<mark>`; горизонтальна стрічка чипів; числа у відповіді, яких нема на самій сторінці.

### 4.4 Кабінет студії (`kb-head`, `Field variant="box"`, `ListEditor`, `ChoiceChip`, `StatusTag`, `SectionRow`, `SaveBar`, `PhotoManager`)

Кабінет (`/kabinet/*`, noindex) — окрема коренева група `src/app/(kabinet)` з власним `layout.tsx` без `SiteHeader`/`SiteFooter`/`MobileRequestBar`: шапка `kb-head` (знак + «ГЛИНА», mono «Кабінет студії» від 40rem, «На сайт →», «Вийти» — `form` POST; `border-b-2 border-ink`) і підвал-рядок `kb-foot`. Заявка `/kabinet/zayavka` лишається публічною сторінкою з шапкою сайту, але з тими самими бланками. Макети, міри й стани — `docs/design/kabinet/` (варіант B «огляд + екран на розділ», обрано 16.10.2026). Правило: **читабельне — на `paper-2`, редаговане — на білому.**

- **`Field variant="box"`** (`ui-box`) — поле-бланк для форм на папері: `paper-white`, `inset 1px ink-2`, 48px, `padding 12px 14px`, Golos 16px; hover `inset 1px ink`; фокус `inset 2px cobalt` без зовнішнього кільця; помилка `inset 2px terracotta-text` + 13.5px текст під полем (`aria-invalid`, `aria-describedby`); `textarea` ≥ 120px; дрібний `data-size="sm"` 40px/14px. Підпис Golos **500 15px у реченні** над полем, «необов’язково» 13.5px `ink-2`; підказка 13.5px `ink-2` між підписом і полем; лічильник mono 11px праворуч під полем. `PasswordInput` — «Показати/Сховати» mono 11px `cobalt` усередині рамки. На кобальті (`RequestForm`) лишається підкреслений `Field`; mono-капітельні підписи — лише там.
- **`ui-check`** — рядок 48px з 22px чекбоксом, текст 16px + пояснення 13px `ink-2`, 1px лінійки (група `ui-checks` з верхньою); усередині `Panel` лишається компактний рядок. **`ChoiceChip`** — як `Chip md`, але `label` з прихованим `checkbox`, `padding 11px 13px`, обрано `bg-ink text-paper`, фокус на чипі.
- **`ListEditor`** (`ui-list`) — рядок `1fr 48px` gap 8: бланк + «×» 48×48 (`inset 1.5px ink-2`, mono 18px, `aria-label="Прибрати: …"`); заголовок групи mono 12px з 2px лінійкою; знизу `Button ghost sm` «+ Додати …»; Enter у рядку — новий рядок, порожні рядки форма відкидає. `kind="price"`: `textarea` (від 72px, росте з текстом) + `select` «Коли актуально» (12 останніх місяців за київським часом, новий рядок = поточний, невідома збережена дата лишається окремим пунктом, «місяць не вказано»; видимий підпис «Коли актуально» — над `select` на телефоні, заголовком колонки від 40rem) + «×»; від 40rem `1fr 200px 48px`.
- **`StatusTag`** (`ui-tag`) — mono 11px верхній з крапкою 7px: `live` `ink-2`, `review` `cobalt`, `missing` `terracotta-text` з порожньою крапкою; на `paper-2` `missing` → `ink-2`.
- **`SectionRow`** — рядок огляду: `a` grid `1fr auto`, `padding 13px 0`, 1px лінійка (список із `border-t-2`), назва Unbounded 600 16px, рядок 13px `ink-2`, `StatusTag`, `→` mono 16px `cobalt`; `aria-current` → фон `paper-2` на `margin-inline -12px`; від lg той самий список — ліва липка навігація (300px). **`Meter`** (`ui-meter`): «Заповнено N з M розділів» (`short` — «N з M розділів» для бічної колонки) Unbounded 600 15px + 4px `rule`/`cobalt`; тег справа переноситься під текст, якщо не влазить.
- **Дотик у кабінеті:** `:hover` лише в `@media (hover: hover)`, на дотику — `:active`; зони дотику ≥ 44px (чип — через `input`, дії плиток — через `::before`, кнопки в барі й у `kb-note` — через `padding` з від’ємним `margin`).
- **`SaveBar`** (`ui-savebar`) — `sticky bottom 0 z-30`, `bg-paper border-t-2 border-ink`, `padding 10px gutter calc(10px + safe-area)`, grid `1fr auto`: стан 13.5px `ink-2` (`aria-live="polite"`), помилка `terracotta-text` з посиланнями на поля, 2px кобальтова риска «зберігаємо»; праворуч `Button ink sm` «Зберегти» → після збереження `Button ghost sm` «Далі: …», у розділі «Фото» — лічильник mono «6 / 10». Бар у потоці (sticky), тому відступ під ним не потрібен: він липне до низу екрана, а на короткій сторінці лягає над підвалом.
- **`PhotoManager`** (`ui-photos`) — справжній `<input type=file accept="image/*,.heic,.heif" multiple>` + `label`-кнопки (`Вибрати фото` у зоні від 40rem, `Додати ще фото` під сіткою на телефоні); зона `inset 2px ink` (`over`: `cobalt` + `paper-2`); сітка 2 → 4 колонки (три дії під плиткою в один рядок), плитки 1:1 `paper-2`, місце скидання — 4px кобальтова риска, номер/«Головне» mono 10.5px `ink`/`paper` (головне — `peach`), позначка «перевірка» mono 10px `cobalt`; прогрес 3px `rule`/`cobalt`; помилка `inset 2px terracotta-text` + «Ще раз»; дії mono 10.5px «Головне» `cobalt` · «Підпис» · «Прибрати» `ink-2`; прибране — `opacity .35` + «Повернути». Кожна дія зберігається одразу; підпис необов’язковий. Обробка в браузері (`photoProcess.ts`): HEIC → JPEG лише коли браузер не читає файл сам (`heic-to` підвантажується динамічним `import()` у момент вибору), EXIF-поворот, довша сторона ≤ 2400px, JPEG q 0.85; файли вантажаться по одному (`XMLHttpRequest`, прогрес, «Скасувати»). Порядок — перетягуванням (миша; довге натискання на дотику) і клавішами ← → / Home з оголошенням у `aria-live`.
- **Копія.** Лічильники й «Розділ 3 / 6» — зі скісною рискою, а не «з»: у mono-капітелі «з» між цифрами читається як «3». Мітка перевірки в списку студій — «на перевірці від 14.10».
- Не можна: радіус і тінь на бланках; підкреслення як єдина межа поля на папері; mono-капітель як підпис поля на папері; обов’язковий підпис до фото; `accept` лише на JPG/PNG; одна кнопка «Зберегти» на всі розділи; шапку сайту й бар запиту в кабінеті.

---

## 5. Шаблони сторінок

Скрізь: `SiteHeader` → `main.wrap` → … → `SiteFooter`; `MobileRequestBar` на сторінках із формою або з контекстним запитом. У дужках — де стоїть CTA запиту: **верх / після відповіді / кінець**.

| Сторінка | Порядок блоків (компоненти) |
|---|---|
| **Головна** `/` | Геро: рядок кікерів (ліворуч «Українська кераміка ручної роботи», праворуч «Каталог студій і майстрів · оновлено …», правий ховається < sm) → `WordmarkWindow` → `Rule ink` → grid 7/5: [H1 `text-h1` max 18ch, підзаголовок 18px ink-2 max 52ch, `Button cobalt arrow` «Отримати пропозиції» (**верх**) + `Button ghost`, `Epigraph verses.home`, `Stat inline` ×3] ∣ [`RequestForm compact`] · «Що ви шукаєте?» `SectionHead poster` + `more` «Усі напрями →» → 6 `PhotoCard` (01–04 ink, 05–06 cobalt) · `Panel cobalt bleed` «Як це працює»: кікер, H2 плакатний з `Italic` «замість», 3 кроки (номер peach, h3 19px, p 15.5px `on-cobalt-2` max 30ch, вертикальні `rule-on-dark`), `Button paper arrow` «Надіслати запит →» (**після відповіді**) · «Скільки коштує…» `SectionHead poster` + «Ціни 2026 →» → grid 4/8: фото 4:5 ∣ [`QuoteBlock` з `Term` «випали», 4 `Stat tile`, `DataTable` «Типові формати і ціни, 2026» 4 колонки] · «Майстер-класи за містами» `SectionHead poster` + «Усі міста →» → 3 `VesselWindow` → `CityList columns=4` → `ChipGroup` 7 форматів · «Як замовити кераміку без сюрпризів» → 3 гайди в колонках через `border-l border-rule` (`Kicker tone="terracotta"`, h3 19px, p 15px) · `Faq` 6 питань · `Panel ink bleed` «Для студій і майстрів»: grid 4/8 фото 3:4 ∣ H2 плакатний з `Italic`, 3 пункти з `rule-on-dark`, `Button peach` «Додати студію», примітка з посиланням «Вхід для студій» (peach, підкреслено) · `MobileRequestBar` (**кінець** на телефоні; окремої смуги в кінці не додаємо — шаблон затверджено без неї). Тексти й цифри — без змін із поточного `page.tsx`. |
| **TopicPage** (18 тематичних) | `hero`: [`Breadcrumbs`, `Kicker`, H1, лід 18px з `b` на числах, `FactStrip` (студій · міст · ціни · термін · оновлено — лише ті, що є в `ctx`), `ChipGroup` «У містах:» з лічильниками, `Button cobalt arrow` «Отримати пропозиції» (**верх**, href `#zapyt-forma`) + `Button ghost` «Студії за містами» (`#list0`), `Updated`] ∣ [фото 16:11 без підпису (`DocPhoto` без `figcaption` для `sitePhotos`; з підписом — лише Wikimedia)] · `cols`: головна колонка — `Epigraph` → `PlaceStory` (абзаци max 70ch) → `PlacePicks` як `NumberedList` → розділи `SectionHead` + `NumberedList columns=2` → Ціни: `SectionHead` з `note` → `QuoteBlock` («Найчастіше в прайсах — …» + джерело) → `DataTable` (Студія · Місто · З прайсу · Джерело) → `CtaBand cobalt` (**після відповіді**) → Списки: `SectionHead` + `note` → `ChipGroup` міст-якорів → `CityHead` + `StudioRow` (12, далі `details` з `MoreLink as="summary"`) → `SmallCities` → `PlaceSeeAlso` → `Faq` → `ChipGroup` «Дивіться також» → `CtaBand ink` (**кінець**) → `PlaceSources`; бічна — `RequestForm` (якщо `topic.form`) або `SideBox` з посиланнями, під нею `SideBox` «Міста у списку». `MobileRequestBar`. JSON-LD без змін. |
| **WavePage** (хвилі B/C, сезонні) | як TopicPage без списків студій: геро з `FactStrip` із чисел копі → `Epigraph` → підказки `NumberedList` → розділи (`DataTable` «Формати поруч», календар) → `Faq` → теги → `CtaBand ink`; бічна `RequestForm`. |
| **GuidePage** `/hayidy/*` | геро з `DocPhoto` → `Epigraph` → розділи: проза max 70ch + `DataTable` + `NumberedList` → `Faq` → теги → `CtaBand ink`; бічна `RequestForm` (`what`/`studio` з гайда) або `SideBox`. |
| **Списки** `/vyrobnyky`, `/vyrobnyky/vyrib/[product]`, `/vyrobnyky/misto/[city]` | `Breadcrumbs`, `Kicker`, H1, лід, `FactStrip`, `Updated` → по містах `CityHead` + `StudioCell` сітка (`Показати ще` через `details`) → `SmallCities` → `Faq` (де є) → `CtaBand ink`; бічна (lg) `SideBox` «Купити або замовити» + міста. |
| **Міста** `/vyrobnyky/misto`, `/maister-klasy`, `/vyrobnyky/vyrib` | геро без фото → `SectionHead` «Міста/Формати» → `CityList columns=4` (формати — `ChipGroup`) → `SmallCities` → `Faq` → `CtaBand ink`. |
| **Місто майстер-класів** `/maister-klasy/[city]`, `[format]` | геро: крихти, кікер, H1, лід, `FactStrip` (студій · від … грн · формати · оновлено), `ChipGroup` форматів + «Показати на мапі →», `Button cobalt` (**верх**), `Updated` ∣ фото 16:11 (кадр 87) → `Epigraph` (≥ 8 студій) → `SectionHead` + `note` → `MakerRow` список → на сторінці обласного центру «Ще в області · N» (`MakerRow` з `place`, посилання на окремі сторінки міст області) → `ChipGroup` (сертифікат, формати) → `Faq` → `CtaBand ink`; бічна `RequestForm defaultWhat="master-class"`. |
| **Добірки, кейси** `/dobirky`, `/keysy` | геро → `IndexCell` сітка 2 колонки → для кейсів `CtaBand ink` «Ваша студія робила замовлення?» (`Button peach` → `/zapyt?vid=keys`). Кейс `/keysy/[slug]`: геро з фото студії (лише з Payload) → проза → `Facts` → `CtaBand cobalt`. |
| **Профіль** `/vyrobnyky/[slug]` | `hero` 7/5: [`Breadcrumbs`, `Kicker` «Тип · Місто», H1 (`break-words`), опис 17px max 70ch (абзаци), `QuoteBlock` цитата власника (без джерела), новина: `Kicker` «Новини від студії · місяць рік» + текст власника (свіжа, до ~6 міс.) або «Що нового:» `Kicker` + наш текст, `ChipGroup` статичних чипів (`as="span"`: «працює із закладами», «корпоративні замовлення»), `Button cobalt arrow` «Запит цій студії» (**верх**), `Updated`] ∣ [`Kicker` «Коротко» + `Facts`] · фото студії (лише з Payload, зі згоди): головне 3:2 max 760 + до 5 квадратів, підпис «Фото: {назва}, публікуються зі згоди студії» 12.5px ink-2 · `cols`: Де знайти: `SectionHead` з `note`-адресою → `MapFrame profile` → маршрути (mono кікер + посилання cobalt) · Що робить: 2 `ListBlock` (+ `MoreLink` «Ще N →») · Ціни: `SectionHead note` → `PriceList` · Для бізнесу: `SectionHead kicker` → `Note` або умови → `CtaBand cobalt` (**після відповіді**) · Кейси студії `IndexCell` · Instagram (`InstagramPosts`) · Інші студії міста: `StudioCell` сітка ∣ бічна: `RequestForm` (**кінець** на десктопі), `SideBox` «Це ваша студія?» → «Керувати профілем →». `MobileRequestBar`. |
| **`/zapyt`** | `max-w-narrow`: `Breadcrumbs`, `Kicker`, H1, лід → `RequestForm` повна/`forStudio` → `Faq` коротке (що далі, 10%). Без `MobileRequestBar`. |
| **Кабінет** `/kabinet/*` (noindex) | власний layout (`kb-head`, `kb-foot`), список і вхід — `max-w-[520px]`/`860px`, редактор від lg — `300px + 720px`; бланки `Field variant="box"`, `ListEditor`, `ChoiceChip`, `StatusTag`, `SectionRow`, `SaveBar`, `PhotoManager` (§4.4); читабельне на `paper-2`; без епіграфа, без запиту, без шапки сайту. |
| **404 / error** | `max-w-narrow pt-16 pb-24` grid gap 5: `Kicker` «Помилка 404» / «Тимчасова помилка», H1, абзац 18px ink-2, `ChipGroup` розділів (404) або `Button ink` «Спробувати ще раз» + `Button ghost` «На головну» (error), `MoreLink` «На головну →». Фото нема (кадр 417 з плану — лише якщо власник захоче). |
| **`/mapa`, `/podiyi`, `/muzei-keramiky`, `/pro-nas`, `/dlya-studiy`, `/de-kupyty-keramiku`, `/tsiny-2026`** | геро без фото (крім `pro-nas` — без) → розділи з `SectionHead` + `DataTable` (`/tsiny-2026` зведена — `mode="scroll"`, решта `stack`) / `MapFrame list` + `Chip active` фільтри / `NumberedList` → `Faq` → `CtaBand ink` або `Panel ink` «Для студій» на `/dlya-studiy`. |

---

## 6. Фото

### 6.1 Правила (коротко; повністю — `photo-plan.md`)

- Архів власника — без окремої згоди; **виключені** кадри зі штампом-знаком 496–497; портрети «в камеру» не для ілюстрацій; людина в сцені — можна.
- Підписів і кредитів під архівними фото нема → `DocPhoto` отримує варіант без `figcaption` (для `sitePhotos`); підпис лишається тільки для Wikimedia (`docPhotos`, CC BY-SA).
- Зовнішні фото — лише для сюжетів, яких в архіві нема (посуд у закладі, стос тарілок, діти, піч); перевага Unsplash/CC0; запис у `CREDITS.md`.
- Профілі й кейси — тільки фото студії (завантажені власниками, `getStudioPhotos`).
- Alt-тексти — з таблиць `photo-plan.md` (без назви студії й міста).
- Реєстр `sitePhotos` у `src/content/photos.ts`: `{ src, width, height, alt }`, у коментарі № кадру; файли `public/images/site/<розділ>-<слот>-<n>.jpg` (JPEG q80, sRGB, без EXIF).

**Заглушки на час впровадження** (власник дивиться на зверстаних сторінках):

| Де | Зараз у макетах | Статус |
|---|---|---|
| Картка 01 «посуд для закладів», `/dlya-biznesu/posud-dlya-restoraniv`, гайд про посуд | `template/img/rest-plating.jpg` (Unsplash, джерело не записане) / `public/images/stock/restaurant-table.jpg` (pepe nero, CC0) | заглушка; кандидат Big Dodzy (§3 плану) або знайти джерело `rest-plating` |
| «Сирець сохне» (ринок) | `class-drying-bowls.jpg` (Unsplash) | замінити архівним 505/508, підпис у блоці змінити |
| Картка 02 «штамп» | `os-stamp.jpg` (кадр 496, знак) | **не публікувати** → 542 |
| «Для студій» | `os-portrait.jpg` (526, портрет) | → 57 |
| `/dlya-biznesu/posud-dlya-hoteliv` | нема | заглушка Elena Mozhvilo (Unsplash) до дозйомки |
| `/maister-klasy/dlya-ditey` | нема | заглушка Kadir Celep (Unsplash) |
| Гайд про випал, `chornodymlena-i-molochena` | Wikimedia (`docPhotos`) з підписом CC | лишається з підписом |
| Добірки `/dobirky/*` | без фото | без фото, поки майстри не дадуть свої |
| Профілі без фото | — | без фото; OG — чорне поле з назвою студії (§7.2) |

### 6.2 Розміри `next/image` по компонентах

| Компонент | Кроп | Файл | `sizes` |
|---|---|---|---|
| `WordmarkWindow` (десктоп) | 8:3 | 2400×900, q75 | через `image-set` (§6.3) |
| `WordmarkWindow` (телефон) | 8:3 | 1200×450 | `@media (max-width: 959px)` |
| `PhotoCard` | 1:1 | 1200×1200 | `(min-width:960px) 33vw, 108px` |
| Фото ринку (головна) | 4:5 | 1200×1500 | `(min-width:960px) 33vw, 100vw` |
| `VesselWindow` | 3:4 / 1:1 | 600×800 / 600×600 | `(min-width:960px) 170px, 120px` |
| «Для студій» | 3:4 (< lg 4:3, `object-position: center 30%`) | 1200×1600 | `(min-width:960px) 33vw, 100vw` |
| `DocPhoto` у геро внутрішніх | 16:11 | 1200×825 | `(min-width:960px) 40vw, 100vw` |
| Профіль: головне / мініатюри | 3:2 / 1:1 | `getStudioPhotos` | `(min-width:960px) 760px, 100vw` / `(min-width:640px) 150px, 33vw` |
| OG | 1.91:1 | 1200×630, q70, ≤ 200 KB | — |

Усі фото `object-fit: cover`, `rounded-none`, `priority` лише для першого фото геро; решта lazy.

### 6.3 Вордмарк-вікно (`WordmarkWindow`, серверний)

1. `getImageProps` двічі (без `sizes`, щоб `srcSet` мав `1x/2x`, як у прикладі «Background CSS» у `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md`): десктоп `{ src: desktop.src, width: 1600, height: 600, quality: 75, alt: '' }` → Next віддасть ширини ≈ 1920 (1x) і джерельні 2400 (2x; вище джерела не масштабує); телефон `{ width: 800, height: 300 }`.
2. `srcSet` → `image-set("url" 1x, "url" 2x)` (функція з документації); обидва значення передати інлайн як `style={{ '--wm-d': …, '--wm-m': … }}`.
3. CSS `@layer components`:
   ```css
   .ui-wordmark { font-family: var(--font-display); font-weight: 800; text-transform: uppercase; line-height: .9; letter-spacing: -.02em;
     font-size: min(345px, calc((100vw - 2 * var(--spacing-gutter)) / 4.4)); width: fit-content; max-width: 100%; margin-left: -.02em;
     background: var(--wm-m) center 48% / cover no-repeat; -webkit-background-clip: text; background-clip: text; color: transparent; }
   @media (min-width: 60rem) { .ui-wordmark { background-image: var(--wm-d); } }
   @supports not ((background-clip: text) or (-webkit-background-clip: text)) { .ui-wordmark { background: none; color: var(--color-ink); } }
   ```
4. Preload обох варіантів через `ReactDOM.preload(url1x, { as: 'image', imageSrcSet: srcSet, fetchPriority: 'high', media: '(min-width: 60rem)' })` і те саме з `media: '(max-width: 59.99rem)'` (React 19 підтримує `media`, `imageSrcSet`, `imageSizes`).
5. Розмітка: `<div class="ui-wordmark" aria-hidden="true">Глина</div>`; справжній `<h1>` нижче. `main { overflow-x: clip }` вже в базі.
6. Перевірка: `pnpm shots /` — слово рівно по ширині контейнера на 390 і 1280, без обрізання; у Network один запит фото на в'юпорт.

---

## 7. OG-картка — C2 «Етикетка»

Обрано власником 11.10.2026 (`experiments/design-options/og-c2.html`, знімки `shots/og-c2-*.png`; відхилені варіанти прибрано з дошки). Маршрут `src/app/(frontend)/og/route.tsx` переписати за цим розділом на кроці 8 (§9).

### 7.1 Композиція (1200×630, `ImageResponse`)

Сюжет на всю картку, паперова етикетка внизу ліворуч, паперовий ярлик із логотипом угорі ліворуч. Усе — flex і `position:absolute`.

| Елемент | Геометрія | Стиль |
|---|---|---|
| Тло | `position:absolute; inset:0` | `<img>` фото `object-fit:cover`; для широких кропів `object-position: 0 50%` (сюжет праворуч від етикетки); без фото — поле `ink #15130f` |
| Ярлик (бренд) | `absolute; left:48; top:0; padding:12px 18px 14px` | тло `paper`, куманець 30px `clay`, «ГЛИНА» Unbounded 800 22px капітеллю, `letter-spacing:.02em` |
| Етикетка | `absolute; left:48; bottom:48; width:760; padding:32px 40px 28px` | тло `paper`, `border-left:12px solid cobalt`, flex column |
| Кікер | mono 17px, `letter-spacing:.08em`, капітель, `clay-text #a84a27` | |
| Заголовок | Unbounded 800 капітеллю, `line-height:1.04`, `margin-top:12px` | 48px до 28 символів, 42px до 44, далі 36px (`ogSize`) |
| Підпис | Golos 21px, `line-height:1.3`, `ink-2`, `margin-top:14px` | лише стабільний текст (7.4) |
| Низ етикетки | mono 15px, `letter-spacing:.06em`, `ink-2`; `margin-top:18px; padding-top:12px; border-top:1px rgba(21,19,15,.2)`; flex space-between | ліворуч `hlyna.com.ua`, праворуч «Каталог студій і майстрів» |

Перевірено у прев'ю ~600 і ~300px: заголовок ≥ 36px лишається читабельним; кікер і підпис на 300px декоративні — норма для OG.

### 7.2 Варіанти за типом сторінки

| Тип | Тло | Ярлик | Етикетка |
|---|---|---|---|
| Тематична (`TopicPage`), гайд, формат × місто, сертифікати | фото сторінки з `photo-plan.md` (той самий кадр, що в геро; кроп 1.91:1, для широких — `object-position: 0 50%`); сторінки без власного кадру — 331 | так | кікер = `topic.kicker` (без року), заголовок = `h1`, підпис = `topic.ogSub` — стабільне речення без чисел |
| **Місто** (`/maister-klasy/[city]`) | кадр **318** (руки центрують глину на колі); **без гербів** — `public/images/coa` в OG більше не вживаються | так | кікер «Майстер-класи», підпис «Гончарне коло, ліплення і розпис: студії, адреси, формати й сертифікати» |
| **Бізнес-тема «Посуд для ресторанів»** | кадр **508** (полита миска на білому столі, широкий кроп) | так | кікер «Для ресторанів», підпис із `metaDescription` без чисел («Тарілки, миски й посуд для подачі на замовлення: зразки, харчова полива, дозамовлення») |
| **Профіль студії** (без фото — згода) | поле `ink`; назва студії як сюжет: `absolute; left:56; top:56; right:56`, Unbounded 800 капітеллю 120px (у збірці розмір підбирається за довжиною назви й найдовшого слова: 120 / 92 / 68 / 56 / 46px, щоб вмістилось у два рядки; довше слово ламається; `letter-spacing: 0`), `line-height:.96`, колір `paper`; над нею кікер «Тип · Місто» mono 17px `peach`, `margin-bottom:16px` | **ні** (бренд один раз) | `width:840`; без кікера й заголовка: підпис = перше речення `summary` (+ адреса шоуруму, якщо є) Golos 21px; підпис у збірці — перші речення `summary` до 140 символів без цін і років (адресу шоуруму не додано); рядок «що роблять» = до 4 `productChips` mono 14px капітеллю через `border-right:1px rgba(21,19,15,.25)`; низ: ліворуч куманець 22px + «ГЛИНА» 16px + `hlyna.com.ua` mono 14px, праворуч «Профіль у каталозі студій» |
| **Головна** | **статичний PNG** `public/og-home.png`, не маршрут (`page.tsx` → `openGraph.images`) | | три підходи на дошці — **вибір власника**: **Г1б** (фото 331 широким кропом, великий ярлик: куманець 56px + «ГЛИНА» 44px, етикетка 42px) — рекомендую; Г1а (логотип рядком у етикетці, без ярлика); Г3б (чорне поле, вордмарк-вікно «ГЛИНА» 230px із кадру 331 зверху, куманець 350px `clay` праворуч унизу, етикетка 640px) |

Статичний PNG головної: відкрити обраний підхід в `og-c2.html`, зняти кадр 1200×630 Playwright-скриптом (`page.locator('.og-frame').first().screenshot()` при масштабі 1 — як у `shots.mjs`), зберегти як `public/og-home.png` (q80, ≤ 200 KB); перезнімати лише при зміні бренду. Г1а/Г1б можна зробити і в Satori, Г3б — ні (`background-clip:text`). Обрано Г1б; знято з маршруту: `curl 'http://localhost:3000/og?title=…&kicker=…&sub=…&img=og-331-wide-1&big=1' -o public/og-home.png`. Той самий файл — OG за замовчуванням для сторінок без власного (`mergeOpenGraph`), `og-default.jpg` видалено.

### 7.3 Параметри маршруту `/og`

`title`, `kicker`, `sub`, `img` (ім'я файлу з `public/images/site`; `doc-<name>` — `public/images/doc`, `stock-<name>` — `public/images/stock`; невідоме ім'я → 331), `big=1` (лише для зйомки `og-home.png`), `credit` (лише CC BY / CC BY-SA; зараз жодна сторінка не передає), `studio=1` (профільна композиція) + `makes` (до 4 через `|`). Параметри `coa` і `pattern` та `ShieldMosaic` вилучити. Довжини: title ≤ 90, kicker ≤ 60, sub ≤ 140, makes ≤ 4 × 24. `ogImage()` в `src/utilities/ogImage.ts` оновити відповідно.

### 7.4 Правила вмісту (маршрут застосовує сам, сторінки — теж)

- **Років на картках не буває.** У маршруті перед рендером до `title`, `kicker`, `sub`, `makes`:
  ```ts
  const noYears = (s: string) =>
    s.replace(/\s*[·—–-]?\s*\b(?:19|20)\d{2}(?:\/\d{2})?\b/g, '').replace(/\s{2,}/g, ' ').replace(/\s*[:,·—–-]\s*$/, '').trim()
  // «Майстер-класи · 2026» → «Майстер-класи»; «Новорічні подарунки 2026/27» → «Новорічні подарунки»; «Ціни 2026» → «Ціни»
  ```
  У збірці регулярка розширена словами, що ведуть до року («сезон 2026/27», «в 2026 році»). `ogImage()` ще до маршруту прибирає змінне: у заголовку частину після двокрапки, якщо там цифри («Гончарне коло у Києві: 20 місць, ціни» → «Гончарне коло у Києві»); у підписі — усе від першої ціни («… грн»), року чи дужки з цифрою («Студія: МК 900 грн (2026), групи» → «Студія: МК»). Сторінки без стабільного підпису (формат × місто, хвилі, подарунки) картку без підпису не псують.
- **Без змінних чисел**: ні лічильників студій/місць, ні цін, ні «оновлено …» — картки кешуються (`Cache-Control: public, max-age=86400, s-maxage=604800`) і не перегенеруються. `sub` — стабільне речення з конфігу теми (`topic.ogSub`) або `metaDescription` без числових фрагментів; сторінка передає `ogSub` явно, маршрут не рахує нічого.
- Фото в OG — лише з `sitePhotos`/`docPhotos` (згода і кредити за §6); без логотипів студій і штампів-знаків; профілі — без фото.
- Українська, без емодзі; бренд на картці один раз (ярлик або рядок у етикетці, не обидва).

### 7.5 Токени, шрифти, обмеження Satori

- Кольори: `paper #efe9de`, `ink #15130f`, `ink-2 #4e483f`, `cobalt #1d3ec6`, `clay #b4532e` (знак), `clay-text #a84a27` (кікер), `peach #ffd9a8` (кікер на чорному), лінійка `rgba(21,19,15,.2)`.
- Шрифти (TTF у `src/assets/fonts`, усі OFL): **Unbounded ExtraBold 800** (файл з googlefonts/unbounded: без накладених контурів — Satori заливає перетини дірами, і «E», «К» виходять із зазубленим краєм), **Golos Text 400**, **JetBrains Mono 400**. Golos 500 не потрібен. Raleway і Unbounded Bold видалено. Playfair у OG не потрібен.
- Satori: лише `display:flex` (кожен `div` з кількома дітьми — flex), `position:absolute`, `object-fit`/`object-position`, рамки, `letter-spacing`, `textTransform`; без grid, `background-clip`, blend, clip-path. Фото — `<img src="data:image/jpeg;base64,…">` з `readFile`, як зараз; SVG куманця — інлайн (той самий path, що у `public/favicon.svg`).
- Розмір відповіді ≤ 200 KB: Satori віддає лише PNG (700+ KB з фото), тож маршрут перекодовує його через `sharp` у JPEG q82 (30–95 KB); статичний `og-home.png` (`big=1`) лишається PNG із палітрою (190 KB). Джерельні JPEG для OG ≤ 1600px по довгій стороні: `public/images/site/og-331-wide-1.jpg`, `og-318-1.jpg`, `og-508-wide-1.jpg`; «wide» у назві = кроп з `object-position: 0 50%`.

### 7.6 Разом з OG

- `layout.tsx`: `viewport.themeColor = '#efe9de'` (папір, як шапка — **вирішено**).
- `src/app/manifest.ts` (не в `(frontend)`: під catch-all `[...missing]` маніфест віддавав 404, і на проді теж): `background_color: '#efe9de'`, `theme_color: '#1d3ec6'`.
- `page.tsx` головної: `openGraph.images = [{ url: '/og-home.png', width: 1200, height: 630 }]`.
- Перевірка (крок 8 §9): відкрити `/og?…` для тематичної, міської, бізнес-теми і `/og?studio=1&…`, порівняти зі знімками `experiments/design-options/shots/og-c2-desktop.png`; жоден параметр не містить року; `pnpm exec tsc --noEmit`.

---

## 8. Стайлгайд `/dev/styleguide`

- Файл `src/app/(frontend)/dev/styleguide/page.tsx`, серверний, `export const metadata = { title: 'Стайлгайд', robots: { index: false, follow: false } }`. У sitemap не потрапляє (`next-sitemap` виключає все, крім `catalog-sitemap.xml`; `/dev` у `catalog-sitemap` не додавати). У `robots.txt` **не** забороняти (інакше `noindex` не прочитають). На `/llms.txt` не згадувати. Посилань на нього із сайту нема.
- **Лише локально** (рішення власника, крок 2): сторінка серверна й `dynamic = 'force-dynamic'`, у production викликає `notFound()` (першим рядком після перевірки `process.env.NODE_ENV`); посилань на неї нема ніде.
- Рендерить **справжні компоненти з `src/components/ui` і `site`**, не копії розмітки, у такому порядку (кожен блок — `SectionHead` з назвою компонента і `id`): 1 кольори (свотчі зі значенням, роллю і парами з §2.1, читаються з CSS-змінних) · 2 типографіка (усі рядки §3.1 живим текстом) · 3 лінійки/радіус/фокус · 4 `Button` усі варіанти × розміри × стани (hover показати як окремий статичний приклад не треба; `disabled`) на папері, у `Panel cobalt` і `Panel ink` · 5 `Kicker`, `SectionHead rule/poster`, `CityHead`, `MoreLink`, `Breadcrumbs`, `Updated` · 6 `Panel` обидва тони з кікером, текстом і кнопкою · 7 `FactStrip` (цифри з `stats()`), `Stat inline/tile` · 8 `PhotoCard` ×2 (ink, cobalt) з фото з `sitePhotos`, `VesselWindow` ×3 · 9 `DataTable` stack і scroll (рядки з `facts()`/таблиці головної) · 10 `Chip` усі варіанти, `ChipGroup` · 11 `Faq` (3 питання з `faqFor`) · 12 `Term` · 13 `Epigraph` (`verses.home`) · 14 `Field`/`Input`/`Select`/`Textarea`/`Checkbox` на папері й на кобальті, стан помилки · 15 `NumberedList` 1 і 2 колонки, `QuoteBlock`, `CtaBand` обидва тони, `Note`, `SideBox` · 16 `StudioCell`, `StudioRow`, `MakerRow`, `CityList`, `SmallCities`, `Facts`, `ListBlock`, `PriceList`, `IndexCell` — з **реальними** студіями (`getCatalog`, перші 2–4 з Києва; якщо база недоступна під час білда — порожній стан «немає даних», без вигаданих) · 17 `MapFrame` (порожній, fallback-текст) · 18 `RequestForm` compact і повна, `MobileRequestBar` показати як статичний блок (`position: static` через проп `inline`) · 19 `Mark` 22/26/28 · 20 вордмарк (`WordmarkWindow`) · 21 `SearchAnswer`, `SearchRow` (з ціною, без, з приміткою, обраний), `SearchField` — з реального індексу · 22 `Field variant="box"` (спокій, фокус, помилка, disabled, textarea, select, пароль), `ui-check`, `ChoiceChip` · 23 `ListEditor` (перелік і ціна), `StatusTag` ×3, `SectionRow` + `Meter`, `SaveBar` усі стани · 24 `PhotoManager` (порожньо, завантаження, помилка, заповнено, прибрано).
- Перевірка: `pnpm shots /dev/styleguide` на 390/1280 — порівняти з попереднім знімком у `.shots/`; скрипт `shots.mjs` доповнити перевіркою `document.documentElement.scrollWidth <= window.innerWidth` (друкує попередження про горизонтальний скрол).
- Доки й код не розходяться: новий примітив → рядок у §4.1 + блок у стайлгайді в одному коміті.

---

## 9. Порядок впровадження

**Виконано повністю 12.10.2026** (усі кроки злито в main і задеплоєно); таблиця лишається як запис того, що й у якому порядку робилося. Відхилення — в §11.

Кожен крок — один коміт (або 2–3 дрібних), без push. Перевірка кожного: `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm shots <маршрути>` на 390 і 1280 — подивитися знімки, переконатися, що нема горизонтального скролу і що бар/форма не перекривають поля. На кроках 1–3 решта сайту тимчасово змішана (старі класи на нових значеннях `ink`/`cobalt`) — це прийнятно лише до кроку 9.

| # | Крок | Файли | Перевірка |
|---|---|---|---|
| 1 | **Токени + шрифти.** Новий `@theme` (§2.6) поруч зі старими 1A-токенами (старі лишаються до кроку 9, але `--color-ink` і `--color-cobalt` одразу отримують нові значення); базові стилі; видалити shadcn-змінні (крім `--card`/`--error`, див. §2.6), `html{opacity:0}`, `dark`, typography, імпорт `tw-animate-css` з публічного CSS (пакет лишається для `/panel`), `tailwind.config.mjs`; `next/font` за §3.2; `font-sans` → `font-body` у коді | `globals.css`, `layout.tsx`, `manifest.ts`, `package.json` | `pnpm build`; `pnpm shots /` — шрифти Golos/Unbounded, сторінка не «біла»; Lighthouse: ≤ 10 preload шрифтів (фактично 4: Google віддає варіативні файли, один на підмножину) |
| 2 | **Примітиви + стайлгайд.** `src/components/ui/*` з §4.1, `layout.ts` (`wrap`), `@layer components` (`ui-table`, `ui-faq`, `ui-term`, `ui-wordmark`), `src/content/glossary.ts`, `sitePhotos` у `photos.ts` (поки з наявними файлами), `/dev/styleguide` | `src/components/ui/`, `src/app/(frontend)/dev/styleguide/` | `pnpm shots /dev/styleguide`; стек таблиці на 390; тултип не виходить за край; `tsc` |
| 3 | **Шапка, футер, бар.** `SiteHeader`, `MainNav.client` (`dialog`-шухляда, `nav-*`), `SiteFooter`, `MobileRequestBar` | `src/components/site/` | `pnpm shots / /dlya-biznesu/posud-dlya-restoraniv`; e2e smoke (`tests/e2e`) меню відкривається/закривається, Escape; на 390 «Запит →» в один рядок, шухляда прокручується |
| 4 | **Головна.** `page.tsx` за §5: `WordmarkWindow`, `PhotoCard`, `Panel`, `Stat`, `DataTable`, `VesselWindow`, `CityList`, `Faq`; `RequestForm compact` на кобальті; фото за `photo-plan.md` §2 (експорт у `public/images/site/`) | `page.tsx`, `photos.ts`, `public/images/site/` | `pnpm shots /`: «ГЛИНА» по ширині; картки 3×2 на 1280, списком на 390; e2e H1 без змін; JSON-LD на місці (`view-source`) |
| 5 | **TopicPage.** `TopicPage`, `PlaceContent`, `StudioRow`, `SmallCities`, `CityHead`, `FactStrip`, `CtaBand`, `QuoteBlock`, `RequestForm` повна; потім `WavePage`, `GuidePage`, `WaveB/CRoute` | `src/components/site/` | `pnpm shots` 3 тематичних (бізнес, МК-формат, гайд) + одна хвиля; форма липка на 1280, бар ховається над формою на 390; FAQ JSON-LD |
| 6 | **Профіль і списки.** `vyrobnyky/[slug]`, `StudioCell`, `MakerRow`, `Facts`, `ListBlock/PriceList`, `MapFrame` + стилі попапів, `InstagramPosts`; `/vyrobnyky`, `/vyrobnyky/misto[/city]`, `/vyrobnyky/vyrib[/product]`, `/maister-klasy`, `/maister-klasy/[city][/format]`, `/dobirky*`, `/keysy*`, `/tsiny-2026`, `/mapa` | `src/app/(frontend)/…` | `pnpm shots` профіль SaGa Pottery, `/maister-klasy/kyiv`, `/vyrobnyky/misto`, `/tsiny-2026`, `/mapa`; таблиця цін scroll без обрізання на 390 |
| 7 | **Решта.** `/zapyt`, `/kabinet/*` + `KabinetForms`/`StudioEditForm`, 404/`error.tsx`, `/pro-nas`, `/dlya-studiy`, `/podiyi`, `/muzei-keramiky`, `/de-kupyty-keramiku`, `/sertyfikaty*`, `/podarunky-z-keramiky`, `/novyi-rik-i-rizdvo` | | `pnpm shots` кожної; `tests/int` проходять; форма кабінету надсилається |
| 8 ✓ | **OG + manifest + themeColor** за §7 (C2 «Етикетка», статичний PNG головної); TTF у `src/assets/fonts`, прибрати Raleway TTF | `og/route.tsx`, `manifest.ts`, `layout.tsx` | відкрити `/og?…` для 4 типів сторінок, ≤ 200 KB, шрифти рендеряться |
| 9 | **Прибирання 1A.** Видалити старі токени й утиліти з `globals.css`, `Bits.container`, `StudioCard.tsx`, `SelectionFaq.tsx`; grep-перевірка з §2.7 = 0; запис у `docs/decisions.md` і `docs/STATUS.md`; `AGENTS.md` (власник) | | `pnpm build`; `pnpm shots` головна + 2 внутрішні; grep порожній |

---

## 10. Відкриті питання для власника

1. ~~**Стайлгайд у проді**~~ — вирішено: лише локально, у production `notFound()` (§8).
2. ~~**Стани форм без зеленого/червоного**~~ — вирішено: успіх — звичайний текст у барі збереження й примітка на `paper-2`, помилка — `terracotta-text` (§4.4); у макетах кабінету це працює.
3. ~~**`theme-color` браузера**~~ — вирішено: папір `#efe9de` (§7.6).
4. **Словник (`Term`)** — лише вручну у вибраних місцях (головна «випали», гайди) чи автоматично для першої появи кожного слова з `glossary.md` на сторінці?
5. **Телефон: дві кнопки запиту** (шапка «Запит →» + нижній бар) — лишити обидві, як у макеті, чи прибрати з шапки, коли є бар?

---

## 11. Відхилення при впровадженні (кроки 1–9)

Чого немає в §§2–8 у тому вигляді, як збудовано:

- **Файли.** Примітиви в `src/components/ui/` — по файлу на компонент; додатково до списку §4.1: `StudioCells`/`StudioRows`/`MakerRows` (обгортки списків), `CityList` з варіантом `side` і `note`, `NoBreak`, `MapFrame`, `Rule`, `Italic`, `Facts`, `MoreLink pad`. Внутрішні сторінки — на `InnerMain`, `InnerHero`, `InnerCols`, `Block`, `Related`, `InfoList`, `FaqRich`, `HeroPhoto`, `BoldFacts` (`src/components/site/Inner.tsx`); списки майстрів хвиль B і C — `Makers` (`src/components/site/Makers.tsx`).
- **Chip** має `onClick` і область дотику 44px; **VesselWindow** перемикається на 700px; шапка стискається нижче 65rem; липка колонка форми — лише від 56rem заввишки; місце під мобільний бар дає `body:has([data-request-bar]) footer`.
- **Виміри.** `--container-read: 42em` (em, не ch: інакше CLS при підміні шрифту); максимальні ширини заголовка, ліда й епіграфа — в em.
- **Тіней нема ніде:** кільця `inset-ring-*` замість `shadow-*`; `* { border-color: var(--color-rule) }` лишено для голих `border` (Rule, роздільники таблиць і списків).
- **`body`** без flex-колонки: підвал не притискається до низу короткої сторінки (як і раніше); знімки до/після 5 сторінок на 390/1280 збігаються піксель у піксель.
- **Прибрано з `globals.css` (крок 9):** палітра 1A (`clay`, `sand`, `cream`, `card`, `umber`, `line`, `terra`, `terra-dark`, `cobalt-dark`, `ochre`, `sage`), `--error`, `.container`, утиліти `band`, `kicker`, `h-display`. `/panel` має власні токени в `panel.css`.
- **OG** — див. §7: TTF від Google Fonts, JPEG-відповідь через `sharp`, `manifest.ts` у корені `src/app`, `ogImage()` прибирає змінні числа.
