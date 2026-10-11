# Studio owners: claims and the /kabinet cabinet

Studios that are already in the catalogue can claim their profile and edit it themselves. New studios use the 4-field form on /dlya-studiy (a `requests` record of type `studio`).

## Flow
1. **Claim.** On every profile, «Це ваша студія?» → «Подати заявку» opens `/kabinet/zayavka?studio=<slug>`. The person leaves a name, a contact (phone, Telegram or email), confirms they represent the studio and may add up to 5 more of their profiles. This creates a `claims` record (status «Нова») and a Telegram message «Заявка на профіль #id».
2. **Verify** (Admin → Запити → Заявки на профіль, also listed on the admin dashboard). Check that the contact matches the studio's public Instagram, website or phone. If it doesn't, ask the person to message the «Глина» Instagram from the studio account.
3. **Approve.** Set status «Схвалено» and save. This:
   - creates a `studio-owners` record with the claimed studios (or adds them to the owner chosen in «Існуючий власник», for people who already have a cabinet);
   - marks the studios «Профіль підтверджено студією»;
   - shows «Посилання для пароля» on the claim.
   Copy that link and send it yourself (Instagram DM, Telegram, email). It works once and expires after 7 days.
   To reject: status «Відхилено» and a reason (for our records; nothing is sent automatically).
4. **Owner sets a password** at `/kabinet/parol?token=…`, choosing their login (email or phone), and lands in `/kabinet`.
5. **Owner edits** `/kabinet/studiya/<slug>`: «Розкажіть про студію своїми словами», «Що нового» and an optional one-sentence quote (all three are internal: never rendered as is), services, products, prices (with month/year), address and business contacts, terms for businesses (minimum order, lead time, logo methods, food-safe, dishwasher-safe, works with venues/companies), up to 10 photos (alt text required; uploading means photo consent), up to 3 Instagram posts. Saving creates a **draft** version, sets «Є зміни від власника» and sends a Telegram message.
6. **Review and publish.** Open the studio from the dashboard list «Зміни від власників». In «Від власника (кабінет)» read the owner's text and rewrite what's useful into «Опис для сайту» / «Що нового» in the site voice (`docs/voice/README.md`, `docs/voice/anti-generic.md`): facts only, no superlatives. If the quote is fine, tick «Цитату схвалено» (shown as «Студія про себе: «…»»). Check prices (owner lines carry the source «від студії, MM.YYYY»), terms and photos, then press «Опублікувати». The flag clears itself and the profile shows the changes and photos.

## Owner help
- **Forgot password / new link:** Admin → Каталог → Власники студій → tick «Створити нове посилання для пароля» → save → send the new link. The old link stops working.
- **Block access:** untick «Активний» on the owner. Their session ends on the next request.
- **Add another studio to an owner:** edit «Студії» on the owner record.

## Security notes
- Owners are not Payload users: they never get `req.user`, the admin, or REST/GraphQL write access. Their session is a signed `hlyna_owner` cookie (30 days; changing the password ends old sessions).
- Owner edits go through `/kabinet/api/studio/<slug>`, which checks ownership and accepts only the fields above. Public text (summary, «Опис для сайту», «Що нового») is never written by owners — only by us. Status, sources, consent notes, internal description and requests are never editable by owners.
- `ownerAbout` and `ownerNews` are hidden from the public API; `ownerQuote` is readable only once approved, and editing it un-approves it.
- Login: 5 wrong passwords lock the account for 15 minutes; per-IP limits on login, claims and saves.
- Internal studio fields (consent, sources, sourceId, confidence, «Є зміни від власника») are hidden from the public REST API.
- Import scripts (`import-ig`, `tag-studios`, `alt-names`) skip studios with an unpublished owner draft.
