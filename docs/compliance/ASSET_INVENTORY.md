# Asset inventory

Internal record of the images, fonts and third-party media the site ships.
"Unverified" means the codebase does not show a licence — it does **not** mean
the asset is infringing. Nothing here should be read as a claim of ownership.

Last reviewed: 25 September 2026.

| Asset | Source (as far as the repo shows) | Licence / status | Commercial use | Attribution | Action |
|---|---|---|---|---|---|
| `public/logo-navbar.png`, `public/digiconnect-dukan-logo-original.png`, `public/icons/*`, `src/app/icon.png` | Own brand mark | Owned by RNOS India Pvt. Ltd. (confirm trademark status) | Yes | No | None |
| `public/images/homepage/**` (hero, services, categories, illustrations — 21 files) | AI-generated for the homepage redesign (`homepage-visual-asset-manifest.md`) | Generated; confirm the generator's terms allow commercial use | Confirm | Per generator terms | Record the generator + terms |
| `public/images/services/pm-vishwakarma/*.png` (6) | Unknown | **Unverified** | Unknown | Unknown | Confirm origin. Remove any government emblem/logo unless use is permitted |
| `public/images/services/yuva/cm-yuva-logo.png`, `subsidy-poster.png`, `interest-free-poster.png`, `hero-banner.jpg` | Likely scheme/government material | **Unverified** — scheme logos may be restricted | Unknown | Unknown | Confirm permission, or replace with neutral artwork |
| `public/images/services/csc-olympiad/logo.png`, `hero.webp`, `gallery*.webp` | Likely CSC Olympiad organiser material | **Unverified** — third-party trademark/photos | Unknown | Unknown | Confirm authorisation from the organiser |
| `public/images/services/pvc/*.png` (4) | Unknown | **Unverified** | Unknown | Unknown | Confirm origin |
| `public/images/services/cibil/cibil-report-analysis.png` | Unknown | **Unverified** — "CIBIL" is a TransUnion CIBIL mark | Unknown | Unknown | Confirm origin; avoid bureau logos |
| `public/images/services/eshram/*.png`, `food-license/hero.png` | Unknown | **Unverified** | Unknown | Unknown | Confirm origin |
| Unsplash URLs in `src/lib/services-v5-data.ts` | Unsplash | Unsplash Licence (commercial use allowed, no attribution required) — confirm the rows are still used | Yes | Not required | None |
| Admin-uploaded images (Supabase storage: slides, gallery, banners, service media) | Uploaded by staff | Depends on each upload | Unknown | Unknown | Staff must only upload images the business owns or has licensed |
| Fonts: Inter, Poppins, IBM Plex Sans, Playfair Display, Noto Sans Devanagari | Google Fonts, self-hosted by `next/font` | SIL Open Font Licence 1.1 | Yes | Not required | None |
| Icons: `lucide-react` | npm | ISC | Yes | Not required | None |
| Social brand marks in `src/components/footer-social.tsx` | Platform brand paths | Used to identify the platform, per brand guidelines | Yes (identification) | No | None |
