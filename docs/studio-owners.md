# Studio owners: claims and the /kabinet cabinet

Studios that are already in the catalogue can claim their profile and edit it themselves. New studios use the 4-field form on /dlya-studiy (a `requests` record of type `studio`).

## Flow
1. **Claim.** On every profile, «Це ваша студія?» → «Подати заявку» opens `/kabinet/zayavka?studio=<slug>`. The person leaves a name, a contact (phone, Telegram or email), confirms they represent the studio and may add up to 5 more of their profiles. This creates a `claims` record (status «Нова») and a Telegram message «Заявка на профіль #id».
2. **Verify** (`/panel/zayavky`, also counted on the panel overview). Check that the contact matches the studio's public Instagram, website or phone. If it doesn't, ask the person to message the «Глина» Instagram from the studio account.
3. **Approve.** Set status «Схвалено» and save. This:
   - creates a `studio-owners` record with the claimed studios (or adds them to the owner chosen in «Існуючий власник», for people who already have a cabinet);
   - marks the studios «Профіль підтверджено студією»;
   - shows «Посилання для пароля» on the claim.
   Copy that link and send it yourself (Instagram DM, Telegram, email). It works once and expires after 7 days.
   To reject: status «Відхилено» and a reason (for our records; nothing is sent automatically).
4. **Owner sets a password** at `/kabinet/parol?token=…`, choosing their login (email or phone), and lands in `/kabinet`.
5. **Owner edits** `/kabinet/studiya/<slug>`: «Розкажіть про студію своїми словами» (internal, never rendered as is), «Новини студії» (published as is, signed and dated, once accepted) and an optional one-sentence quote (shown only once approved), services, products, prices (with month/year), address and business contacts, terms for businesses (minimum order, lead time, logo methods, food-safe, dishwasher-safe, works with venues/companies), up to 10 photos (alt text required; uploading means photo consent), up to 3 Instagram posts. Saving creates a **draft** version, sets «Є зміни від власника» and sends a Telegram message.
6. **Review and publish.** Open the studio from the dashboard list «Зміни від власників». Studio news needs no rewrite: the Telegram message quotes it, and «Опублікувати» puts it on the profile as «Новини від студії · <місяць рік>» (dated by the owner's save, hidden after about six months; while fresh it replaces our «Що нового»). If it is advertising, not Ukrainian or not news, untick it in «Зміни від власників» or clear it later in the studio editor. Only «Розкажіть про студію своїми словами» needs our hand: in «Від власника (кабінет)» rewrite what's useful into «Опис для сайту» in the site voice (`docs/voice/README.md`, `docs/voice/anti-generic.md`): facts only, no superlatives. If the quote is fine, tick «Цитату схвалено» (shown as «Студія про себе: «…»»). Check prices (owner lines carry the source «від студії, MM.YYYY»), terms and photos, then press «Опублікувати». The flag clears itself and the profile shows the changes and photos.

## Owner help
- **Forgot password / new link:** `/panel/korystuvachi/<id>` → «Нове посилання» → send it. The old link stops working.
- **Block access:** untick «Активний» on the owner. Their session ends on the next request.
- **Add another studio to an owner:** edit «Студії» on the owner record.

## Security notes
- Owners have the `owner` role in Better Auth: no access to `/panel` or `/api/panel`. Their session is the Better Auth cookie (`hlyna.session_token`; changing the password ends old sessions).
- Owner edits go through `/kabinet/api/studio/<slug>`, which checks ownership and accepts only the fields above. Public text (summary, «Опис для сайту», «Що нового») is never written by owners — only by us; the owners' own words reach the site only signed: «Новини від студії» and the approved quote. Status, sources, consent notes, internal description and requests are never editable by owners.
- `ownerAbout` never reaches public pages; `ownerNews` does only after we accept the change set (with `owner_news_at`); `ownerQuote` is shown only once approved, and editing it un-approves it.
- Login: 5 wrong passwords lock the account for 15 minutes; per-IP limits on login, claims and saves.
- Internal studio fields (consent, sources, sourceId, confidence, owner text) never reach public pages (`src/server/publicCatalog.ts`).
- Import scripts (`import-ig`, `tag-studios`, `alt-names`) skip studios with an unpublished owner draft.

## Telegram buttons
Notifications in the owner's chat carry buttons, handled by the bot webhook `POST /api/telegram/webhook`
(`src/app/api/telegram/webhook/route.ts`). It accepts only Telegram (header `X-Telegram-Bot-Api-Secret-Token`
= `TELEGRAM_WEBHOOK_SECRET` from the server `.env`) and only our chat (`TELEGRAM_CHAT_ID`); anything else gets 403 or is ignored.
- **«Заявка на профіль #id»:** «✅ Схвалити» runs the same approval as the admin (owner created or extended, studios marked
  confirmed) and the bot sends the one-time link plus a ready-to-forward Ukrainian message for the studio.
  «❌ Відхилити» asks for a reason: reply to the bot's «Причина відмови для заявки #id» message, or tap «Відхилити без причини».
- **«Зміни від власника»:** «✅ Опублікувати» publishes the owner's draft as it is. If the owner wrote text «своїми словами»,
  the bot first reminds you to rewrite it and offers «Опублікувати без тексту» (that text stays internal either way).
- **New customer requests:** «📨 Взято в роботу» (status «В роботі»), «✅ Передано студіям», «🗄 Закрити»; the message is
  edited to show the new status.
- Double taps are safe: actions that are already done just report the current state.
- Webhook registration (once, from the server, never prints the token):
  `set -a; . ./.env; set +a; curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" --data-urlencode url=https://hlyna.com.ua/api/telegram/webhook --data-urlencode secret_token=$TELEGRAM_WEBHOOK_SECRET`.
  With a webhook set, `getUpdates` no longer works, so `deploy/set-telegram.sh` (which reads the chat id from getUpdates)
  needs `deleteWebhook` first if it is ever run again.
