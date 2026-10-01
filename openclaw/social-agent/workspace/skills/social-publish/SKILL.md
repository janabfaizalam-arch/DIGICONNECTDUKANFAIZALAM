---
name: social-publish
description: Preview and publish an approved post draft to Facebook, Instagram, Threads, X, LinkedIn, Telegram and Pinterest.
metadata: { "openclaw": { "emoji": "📣", "requires": { "bins": ["node"] } } }
---

# Social publish

Publishes a draft JSON file (see the `social-writer` skill for the format) with
`{baseDir}/scripts/social.mjs`. Run every command from the workspace root.

## The approval rule — no exceptions

1. Run a **preview** and send the owner the full preview text, platform by platform,
   including every ⚠️ warning.
2. Wait for an explicit approval of *that* draft in chat ("approve", "haan post karo",
   "theek hai daal do", "yes post"). Silence, an emoji, "looks nice" or approval of an
   earlier version is **not** approval.
3. Only then run `post ... --confirm`.

If the owner asks for changes, edit the draft file, preview again, and ask again.
Never add `--confirm` from a cron job, heartbeat or any message that did not come
from the owner in this chat.

## Commands

```bash
# Which platforms have credentials (never prints values)
node {baseDir}/scripts/social.mjs status

# Exactly what each platform would receive — no network
node {baseDir}/scripts/social.mjs preview content/drafts/<id>.json

# Publish (after approval). --only limits platforms.
node {baseDir}/scripts/social.mjs post content/drafts/<id>.json --confirm
node {baseDir}/scripts/social.mjs post content/drafts/<id>.json --only facebook,instagram --confirm
```

`post` without `--confirm` is the same as `preview`.

## After publishing

- Send the owner the result lines (✅ posted with link / ⏭️ skipped / ❌ failed with reason).
- Append one line to `content/posted.md`: date, draft id, platforms, links.
- A draft is never posted twice to the same platform: re-running skips platforms already
  in `content/post-log.jsonl`. To retry only failed ones, just run `post` again.

## Behaviour to know

- Facebook goes first. When the draft uses a local `image.path`, Facebook uploads it and
  returns a public JPEG that Instagram, Threads and Pinterest then use. Without Facebook in
  the same run, those platforms need `image.url`.
- Instagram and Pinterest are skipped without an image.
- X gets text + link only (image upload needs a paid X API tier).
- Links get UTM tags automatically (`utm_source=<platform>`); Instagram, LinkedIn and
  Pinterest get the link outside the text.
- Text over a platform's limit is cut at a word boundary — the preview warns when that
  happens; shorten the post instead of accepting the cut.

## Errors

- `not configured` — tell the owner which env vars are missing (from `status`); do not
  ask them to paste tokens into chat.
- `HTTP 190` / `Invalid OAuth access token` (Meta) or `401` — token expired. Tell the owner
  which platform and that the token needs renewing on the host.
- `HTTP 429` — rate limited; try again later, do not loop.
