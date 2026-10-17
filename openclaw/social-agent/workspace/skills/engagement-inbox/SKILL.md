---
name: engagement-inbox
description: Find unanswered Facebook and Instagram comments, triage them, and draft replies for the owner to approve.
metadata: { "openclaw": { "emoji": "💬", "requires": { "bins": ["node"] } } }
---

# Engagement inbox

Uses the publisher script from the `social-publish` skill. Run from the workspace root.

```bash
# Unanswered comments on recent posts (JSON)
node skills/social-publish/scripts/social.mjs comments --limit 10
node skills/social-publish/scripts/social.mjs comments --platform instagram

# Reply — dry run first, then --confirm after the owner approves
node skills/social-publish/scripts/social.mjs reply --platform facebook --comment-id <id> --text "..."
node skills/social-publish/scripts/social.mjs reply --platform facebook --comment-id <id> --text "..." --confirm
```

## Triage

Sort each comment into one bucket:

| Bucket        | Examples                                         | What to do                                                                                               |
| ------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| **Lead**      | "price?", "kaise apply kare", "documents kya lagenge" | Draft a short helpful reply + invite to WhatsApp / website. Flag 🔥 to the owner.                        |
| **Question**  | general how-to, eligibility                      | Draft a factual reply; if unsure of the fact, say so to the owner rather than guessing.                  |
| **Praise**    | "thanks", "great service"                        | Draft a warm one-line thank-you.                                                                         |
| **Complaint** | delay, refund, bad experience                    | Do **not** draft a public argument. Draft a calm public line ("Sorry for the trouble — please DM us / WhatsApp us so we can check") and alert the owner with the full comment. |
| **Spam/abuse**| links, scams, abuse                              | Do not reply. List it for the owner (they can hide/delete it in the app).                                 |

## Reply rules

- Never ask for or repeat Aadhaar, PAN, phone numbers, OTPs or any document in a public reply.
  Move personal matters to DM/WhatsApp.
- Never quote a price unless the owner has written it in `USER.md` or told you in chat.
- Never promise approval or timelines.
- Same language as the commenter (Hinglish / Hindi / English). 1–3 short lines.

## Sending the owner the inbox

One message, grouped by bucket, each item as:

```
🔥 FB · Ramesh K: "PAN card kitne din mein?"
   ↳ Draft: "Namaste Ramesh ji! Usually 7–15 din lagte hain. Apply karne ke liye website par details hain ya humein WhatsApp karein 🙏"
   [reply id: 123_456]
```

The owner can answer "approve all", "approve 1,3", or edit a reply. Send only the
approved replies with `--confirm`, then report what went out.
