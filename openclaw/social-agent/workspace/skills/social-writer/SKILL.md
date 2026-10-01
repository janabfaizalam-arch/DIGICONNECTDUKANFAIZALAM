---
name: social-writer
description: Write platform-native Hinglish posts for DigiConnect Dukan and save them as a draft JSON ready for social-publish.
---

# Social writer

Turns an idea ("Diwali offer", "GST return deadline", "naya PAN card service") into a
draft file at `content/drafts/<id>.json`, then hands over to `social-publish` for preview.

## Before writing

1. **Pick the service page** the post sends people to (table below). Every post links to
   one real page. If unsure the page exists, `web_fetch https://www.rnos.in/sitemap.xml`.
2. **Check facts.** For any deadline, fee, rule change or scheme detail, search the web and
   prefer official sources (incometax.gov.in, gst.gov.in, uidai.gov.in, india.gov.in,
   PIB). Keep the source URLs — the preview to the owner must list them. If a fact cannot
   be confirmed, leave it out.
3. **Check what already went out** in `content/posted.md` and `memory/` — do not repeat an
   angle used in the last 14 days.

## Hard rules (account-safety and honesty)

- We are a **private service centre that helps people apply**. Never say or imply we are
  the government, never use government logos, never write "official" about ourselves.
- Never guarantee approval, a loan amount, a CIBIL score or a delivery date.
- No invented deadlines, penalties, "last chance" or fake scarcity.
- No personal data of any customer, ever — not names, not numbers, not photos.
- No political, religious or caste-based angles; festival greetings are fine and warm.

## Voice

Natural Hinglish in Roman script (switch to Hindi or English only if the owner asks).
Open with the hook. Short lines. 2–4 fitting emojis, not more. Give real value (a document
list, a mistake to avoid, a tip) so people save and share. End with a call to action to
visit the website.

**Do not write URLs or hashtags inside the post text** — `social-publish` adds the
tracked link and the hashtags itself, sized for each platform.

## Per platform

| Key         | Length (body)        | Style                                                          |
| ----------- | -------------------- | -------------------------------------------------------------- |
| `facebook`  | 120–250 words        | Story or checklist, value first, CTA last                      |
| `instagram` | 80–180 words         | Very scannable, line breaks, end "Link bio mein / website par" |
| `threads`   | < 350 chars          | Conversational, one idea                                       |
| `x`         | < 200 chars          | Punchy, one fact                                               |
| `linkedin`  | 80–200 words         | Slightly more formal, for small-business owners                |
| `telegram`  | < 600 chars          | Short update with emoji bullets                                |
| `pinterest` | < 400 chars          | Searchable description; also set `title`                       |

Only include platforms that suit the content. 3–8 `hashtags` total, no `#`, mix one
brand tag (`DigiConnectDukan`) with topic tags.

## Image

- Generate a poster with `image_generate` when a visual helps (Instagram and Pinterest
  need one). Square 1080×1080, bold short headline in Hindi/English, brand colours
  (deep blue + saffron/orange accents), no government emblems, no faces of real people,
  no small text. Save it under `media/` and reference it as `"image": { "path": "media/<file>.png" }`.
- Or use a public image the owner sends: `"image": { "url": "https://..." }`.

## Draft format

```json
{
  "id": "2026-10-20-diwali-gst",
  "path": "/services/gst-registration",
  "campaign": "diwali-2026",
  "title": "GST registration before Diwali",
  "description": "Documents and steps for GST registration, explained simply.",
  "image": { "path": "media/2026-10-20-diwali-gst.png" },
  "hashtags": ["GST", "SmallBusiness", "DigiConnectDukan"],
  "posts": {
    "facebook": "...",
    "instagram": "...",
    "x": "..."
  },
  "sources": ["https://www.gst.gov.in/..."]
}
```

`id`: `YYYY-MM-DD-short-topic`, lowercase, hyphens. `campaign` defaults to `id`.
`sources` is for the owner's review only; it is not posted. A sample lives at
`content/drafts/example-itr-reminder.json`.

Then run the `social-publish` preview and send it to the owner with the sources.

## Website service pages

All at `https://www.rnos.in/services/<slug>`:

- **Cards / IDs:** `pan-card`, `aadhaar-services`, `pvc-card`, `voter-id`, `eshram-card`,
  `labour-card`, `ayushman-card`, `passport`, `learning-driving-license`
- **Certificates:** `income-certificate`, `caste-certificate`, `domicile-certificate`,
  `food-license`
- **Tax:** `itr-filing`, `gst-registration`, `gst-return-filing`
- **Business:** `msme-registration`, `private-limited-registration`,
  `private-limited-compliance`, `opc-registration`, `dsc`, `iso-certification`,
  `startup-india-assistance`, `detailed-project-report`
- **Loans / schemes:** `pmegp-loan`, `mudra-loan`, `pm-vishwakarma-yojana`,
  `cm-yuva-entrepreneur-loan-assistance`
- **Banking / finance:** `credit-cards`, `saving-account-opening`,
  `current-account-opening`, `cibil-report-increase`, `insurance`
- **Other:** `csc-olympiad`

Home page: `/`. Contact: `/contact`. Blog: `/blog`.
