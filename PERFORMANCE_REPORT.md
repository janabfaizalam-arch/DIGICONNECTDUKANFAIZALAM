# DigiConnect Dukan V6 — Performance Report

Date: 2026-07-18

## Route / API reduction

| Surface | Before | After | Delta |
|---|---|---|---|
| App pages | ~109 | 42 | ~-61% |
| API routes | ~127 | 19 | ~-85% |
| Middleware JS (build) | ~92.5 kB | 91.3 kB | modest |
| First Load JS shared | ~102 kB | 102 kB | stable baseline |

## Dependency reduction

Removed heavy / unused runtime packages:

- `framer-motion` (~4.6 MB)
- `recharts` (~7 MB)
- `pdf-parse` (~20 MB)
- `argon2`, `jose`, `swr`, `embla-carousel-react`, `qrcode.react`

Homepage and services are server components with almost no client JS beyond login/pay/track forms.

## Bundle / UX strategy

- Server Components first for public + portal list pages
- Minimal CSS variables (no glass stacks, almost no animation)
- Fonts: Fraunces + DM Sans via `next/font`
- Razorpay checkout script loaded only on pay action
- Service pages statically generated for 7 slugs

## Lighthouse

Formal Lighthouse CI was not run in this pass. Architecture targets Performance / Accessibility / SEO / Best Practices >95 on the slim public pages (`/`, `/services`, service detail). Measure locally after deploy with:

```powershell
# Chrome Lighthouse against local `pnpm start`
```

## Validation gate

- `pnpm run type-check` — pass
- `pnpm run lint` — pass (0 errors)
- `pnpm run build` — pass
