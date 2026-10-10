#!/usr/bin/env bash
# Put the Telegram bot token and chat id into the server .env and restart the app.
# Run it yourself in a terminal (the token is typed hidden and never lands in a chat log):
#   bash deploy/set-telegram.sh
# Before running: open your bot in Telegram and send it any message (e.g. /start),
# or add the bot to a group and write something there; the chat id is read from that message.
set -euo pipefail

read -rsp "Bot token from @BotFather: " TOKEN; echo
[[ "$TOKEN" =~ ^[0-9]+:[A-Za-z0-9_-]+$ ]] || { echo "This does not look like a bot token."; exit 1; }

UPDATES=$(curl -fsS "https://api.telegram.org/bot${TOKEN}/getUpdates")
CHATS=$(printf '%s' "$UPDATES" | python3 -c '
import json, sys
seen = {}
for u in json.load(sys.stdin).get("result", []):
    m = u.get("message") or u.get("channel_post") or u.get("my_chat_member") or {}
    c = m.get("chat")
    if c: seen[c["id"]] = c.get("title") or c.get("username") or c.get("first_name") or ""
for i, n in seen.items(): print(f"{i}\t{n}")')
if [ -z "$CHATS" ]; then echo "No messages yet. Send the bot a message in Telegram and run this again."; exit 1; fi
echo "Chats that wrote to the bot:"; echo "$CHATS"
CHAT=$(echo "$CHATS" | tail -1 | cut -f1)
read -rp "Chat id to use [$CHAT]: " PICK; CHAT=${PICK:-$CHAT}

ssh hlyna "cd /opt/hlyna && sed -i 's|^TELEGRAM_BOT_TOKEN=.*|TELEGRAM_BOT_TOKEN=${TOKEN}|; s|^TELEGRAM_CHAT_ID=.*|TELEGRAM_CHAT_ID=${CHAT}|' .env && docker compose up -d --force-recreate app >/dev/null && echo 'Server updated, app restarted.'"
curl -fsS -o /dev/null "https://api.telegram.org/bot${TOKEN}/sendMessage" --data-urlencode "chat_id=${CHAT}" --data-urlencode "text=Глина: сповіщення про запити налаштовано ✅" && echo "Test message sent to Telegram."
