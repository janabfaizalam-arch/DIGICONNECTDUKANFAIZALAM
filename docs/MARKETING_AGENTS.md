# Marketing Agents — roz automatic research, post aur publishing

Har din **10:00 AM IST** par 4 agents ek ke baad ek chalte hain:

| # | Agent | Kya karta hai |
|---|-------|---------------|
| 1 | **Research** | Aaj ki service chunta hai (jis par sabse zyada din se post nahi hui; featured services jaldi aati hain). Google Search se latest news, deadlines, rule changes aur log kya search kar rahe hain — sab sources ke saath. |
| 2 | **Prompt** | Research se aaj ka ek strong angle, hook aur CTA chunta hai (pichhle angles repeat nahi karta) aur copywriter + image ke liye detailed prompts likhta hai. |
| 3 | **Post** | Har platform ke liye alag post (Hinglish), ek poster image, aur ek **900–1400 words ka SEO blog article** jo aapki website ke `/blog` par publish hota hai. |
| 4 | **Publish** | Facebook, Instagram, Threads, X, LinkedIn, Telegram, Pinterest par post karta hai. Ek platform fail ho to baaki chalte rehte hain. |

**Website visits kaise badhenge:**
- Har post mein aapki service page ka link hai, **UTM tags** ke saath (`utm_source=facebook` …) — Google Analytics mein dikhega kaunsa platform visitors la raha hai.
- Roz ek naya blog article → Google search se lambe samay tak free traffic.
- Pinterest pins aur blog article mahino tak visitors laate rehte hain.
- Posts sirf research wale facts use karti hain — koi fake deadline, "government" claim ya approval guarantee nahi (isse account ban hone ka risk bhi kam hota hai).

Admin panel: **Admin → Website → Marketing Agents** (`/admin/marketing-agents`) — har run, poster, har platform ka status aur post ka link.

---

## Setup (ek baar)

### 1. Database
Supabase SQL editor mein chalaayein: `supabase/migrations/20260925120000_marketing_agents.sql`

### 2. Vercel environment variables
Pehle se chahiye: `GEMINI_API_KEY`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`.

```
MARKETING_AGENTS_MODE=draft
```

**Pehle `draft` rakhein.** Admin panel mein "Draft banaayein" dabaayein, posts padhein. Pasand aayein to `live` kar dein — phir roz automatic post hoga.

### 3. Platforms (jo chahiye wahi set karein — khaali platform skip ho jata hai)

**Facebook Page + Instagram** (sabse zaroori)
1. developers.facebook.com par Business type app banayein.
2. Instagram account ko Professional (Business) banakar Facebook Page se link karein.
3. Graph API Explorer se permissions lein: `pages_manage_posts`, `pages_read_engagement`, `instagram_basic`, `instagram_content_publish`.
4. Long-lived **Page Access Token** banayein (Business Manager → System User token best hai, expire nahi hota).
5. Set karein: `META_PAGE_ID`, `META_PAGE_ACCESS_TOKEN`, `INSTAGRAM_BUSINESS_ACCOUNT_ID`.

**Threads** — Threads API app se `THREADS_USER_ID`, `THREADS_ACCESS_TOKEN` (permissions: `threads_basic`, `threads_content_publish`). Token 60 din mein refresh karna padta hai.

**X (Twitter)** — developer.x.com par app, "Read and write" permission, phir `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`. (Free tier par text + link post hota hai; image nahi.)

**LinkedIn** — LinkedIn developer app, "Share on LinkedIn" / Community Management product, token with `w_member_social` (ya company page ke liye `w_organization_social`). `LINKEDIN_AUTHOR_URN` = `urn:li:organization:<id>` ya `urn:li:person:<id>`. Token 60 din chalta hai.

**Telegram** — @BotFather se bot banayein, bot ko apne channel ka admin banayein. `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID=@aapkachannel`.

**Pinterest** — Business account, developers.pinterest.com app (`pins:write`, `boards:read`), `PINTEREST_ACCESS_TOKEN`, `PINTEREST_BOARD_ID`.

---

## Dhyan dein
- Cron ek din mein sirf ek baar chalta hai (database ensure karta hai) — double post nahi hoga.
- Token expire hone par admin panel mein us platform par laal "failed" dikhega, error ke saath.
- WhatsApp Status, YouTube aur Google Business Profile abhi shamil nahi hain (unki API mein automatic image post ki suvidha nahi / alag approval chahiye).
- Kharcha: roz lagbhag 4 Gemini calls + 1 image.
