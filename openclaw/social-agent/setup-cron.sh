#!/usr/bin/env sh
# Schedules for the social agent. Run once on the OpenClaw host after the gateway is up:
#   OWNER_TELEGRAM_ID=123456789 sh setup-cron.sh
#
# None of these jobs publish anything: they research, draft and ask the owner.
# Publishing always waits for the owner's "approve" in chat (see workspace/AGENTS.md).
set -eu

: "${OWNER_TELEGRAM_ID:?set OWNER_TELEGRAM_ID to your numeric Telegram user id}"
TZ_NAME="Asia/Kolkata"
DELIVER="--announce --channel telegram --to ${OWNER_TELEGRAM_ID}"

# shellcheck disable=SC2086
openclaw cron create "0 8 * * *" \
  "Daily social brief. Use the content-calendar skill: read content/calendar.md, check today's and tomorrow's date hooks (verify on official sources), and send me today's plan in 3-5 lines. If something is due today and has no draft, write the draft with social-writer and send me the social-publish preview with sources. Do NOT publish anything." \
  --name "Daily social brief" --tz "$TZ_NAME" --session isolated $DELIVER

# shellcheck disable=SC2086
openclaw cron create "0 12,19 * * *" \
  "Comment sweep. Use the engagement-inbox skill: list unanswered Facebook and Instagram comments, triage them, and send me the inbox with drafted replies. If there are none, reply NO_REPLY. Do NOT send any reply without my approval." \
  --name "Comment sweep" --tz "$TZ_NAME" --session isolated $DELIVER

# shellcheck disable=SC2086
openclaw cron create "30 9 * * 1" \
  "Weekly plan. Use the content-calendar skill to plan the next 7 days, update content/calendar.md, and send me the list so I can pick what to draft. Do NOT publish anything." \
  --name "Weekly plan" --tz "$TZ_NAME" --session isolated $DELIVER

# shellcheck disable=SC2086
openclaw cron create "0 19 * * 0" \
  "Weekly digest. Run 'node skills/social-publish/scripts/social.mjs recent --limit 15' and read content/posted.md. Send me: posts this week, the best and weakest post with numbers, comments handled, and one concrete suggestion for next week. Save durable learnings to memory." \
  --name "Weekly digest" --tz "$TZ_NAME" --session isolated $DELIVER

openclaw cron list
