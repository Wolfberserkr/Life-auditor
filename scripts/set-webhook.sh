#!/usr/bin/env bash
# Optional: point the Telegram bot at the cos edge function by hand.
# (The scheduler does this automatically on its first run.)
#   TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... PROJECT_REF=... ./scripts/set-webhook.sh
set -euo pipefail
: "${TELEGRAM_BOT_TOKEN:?}" "${TELEGRAM_WEBHOOK_SECRET:?}" "${PROJECT_REF:?}"

curl -sS "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -d "url=https://${PROJECT_REF}.supabase.co/functions/v1/cos/telegram" \
  -d "secret_token=${TELEGRAM_WEBHOOK_SECRET}" \
  -d 'allowed_updates=["message","callback_query"]' \
  -d "drop_pending_updates=true"
echo

curl -sS "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setMyCommands" \
  -H 'Content-Type: application/json' \
  -d '{"commands":[
    {"command":"brief","description":"Briefing right now"},
    {"command":"tasks","description":"Open tasks by area"},
    {"command":"shifts","description":"Your next shifts"},
    {"command":"reset","description":"Clear chat history"},
    {"command":"help","description":"What I can do"}]}'
echo
