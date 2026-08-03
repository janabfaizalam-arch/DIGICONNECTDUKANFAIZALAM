# Homepage Visual Asset Manifest — Option 3

**Reference:** `C:\Users\DigiConnect Dukan\.codex\generated_images\019fc12b-43a6-7110-b97f-a79adbdd07fa\exec-d006fd62-3d5b-4b0e-a5a4-2a5eb68f79c7.png`  
**Reference pixels:** `1487 × 1058`  
**Target desktop QA viewport:** `1440 × 1024`  
**Target mobile QA viewport:** `390 × 844`  
**Logo colour source:** `public/logo-navbar.png`, `public/digiconnect-dukan-logo-original.png`  
**Brand anchors:** DigiConnect blue `#0056D2` / `#075bbb`, DigiConnect orange `#FF7B00` / `#ff6800`, navy `#071f4d`

## Measured desktop band heights (reference → 1440 target)

| Band | Ref (approx px @1487) | Target @1440 | Notes |
|---|---:|---:|---|
| Announcement | 36–40 | 34–38 | Navy strip |
| Header | 78–84 | 76–82 | White, logo + nav + search + Refer CTA |
| Hero | 340–380 | 330–370 | Blue gradient + photo + Smart Print |
| Quick Actions | 115–135 | 110–130 | Five tinted tiles |
| Trending | 280–320 | 270–310 | Featured + 5 visual cards |
| Categories (first row) | remaining fold | remaining fold | Illustrated cards |

## Hero column proportions (desktop)

| Region | Width share | Role |
|---|---:|---|
| Left copy / search / trust | ~40% | HTML content only — no baked text in photo |
| Assistance photograph | ~40% | Hero visual |
| Smart Print module | ~20% | Cream card inside hero |

## Asset inventory

| Asset | Desktop dimensions | Mobile dimensions | Source | Status | Component |
|---|---:|---:|---|---|---|
| Hero advisor/customer visual | 1600 × 560 | 900 × 720 | generated | generated | HomepageHero |
| ITR service image | 800 × 520 | 800 × 520 | generated | generated | Trending / Featured |
| GST service image | 800 × 520 | 800 × 520 | generated | generated | Trending / Featured |
| MSME / documentation service image | 800 × 520 | 800 × 520 | generated | generated | Trending |
| CIBIL service image | 800 × 520 | 800 × 520 | generated | generated | Trending |
| Passport service image | 800 × 520 | 800 × 520 | generated | generated | Trending |
| Bill-payment image | 800 × 520 | 800 × 520 | generated | generated | Trending |
| Government category art | 640 × 400 | 640 × 400 | generated | generated | Categories |
| Banking category art | 640 × 400 | 640 × 400 | generated | generated | Categories |
| Bill-payment category art | 640 × 400 | 640 × 400 | generated | generated | Categories |
| Insurance category art | 640 × 400 | 640 × 400 | generated | generated | Categories |
| Travel category art | 640 × 400 | 640 × 400 | generated | generated | Categories |
| Business category art | 640 × 400 | 640 × 400 | generated | generated | Categories |
| Logo full-colour | native | native | `public/logo-navbar.png` | reuse | Header / light surfaces |
| Logo on light plate | native | native | same logo on white panel | reuse | Navy footer |

## Planned output paths

```text
public/images/homepage/hero-assistance-desktop.webp
public/images/homepage/hero-assistance-mobile.webp
public/images/homepage/services/gst-registration.webp
public/images/homepage/services/itr-filing.webp
public/images/homepage/services/msme-registration.webp
public/images/homepage/services/cibil-report.webp
public/images/homepage/services/passport-service.webp
public/images/homepage/services/bill-payments.webp
public/images/homepage/categories/government.webp
public/images/homepage/categories/banking-finance.webp
public/images/homepage/categories/bill-payments.webp
public/images/homepage/categories/insurance.webp
public/images/homepage/categories/travel.webp
public/images/homepage/categories/business.webp
```

## Assets reviewed but not reused as primary pack

| Path | Reason |
|---|---|
| `public/images/services/cibil/cibil-report-analysis.png` | Large PNG, different art direction |
| `public/images/services/pvc/*` | PVC-specific, not Option 3 Trending pack |
| `public/images/services/yuva/*` | Campaign posters with baked text |
| `public/images/services/pm-vishwakarma/*` | Scheme photography, inconsistent pack |
| `public/images/services/csc-olympiad/*` | Event assets |

## Art-direction rules (all generated assets)

- DigiConnect blue/orange dominant; teal/violet/cyan only as category accents
- No baked UI copy, fake stats, government seals, readable personal data, or third-party brand marks
- No distorted hands/faces/documents
- Premium editorial photography / soft 3D product look — one consistent family
- Hero: Indian digital-assistance desk scene; space for HTML overlays; no text in photo
- Mobile hero: separate portrait-friendly composition, not a careless desktop crop

## Implementation plan (after assets land)

1. Generate + compress WebP pack into paths above  
2. Wire homepage-specific image map (slug → asset)  
3. Rebuild desktop hero proportions to ~40/40/20  
4. Rebuild Trending image-led cards + Category illustrated cards  
5. Keep lower sections on `--dc-*` surfaces  
6. Separate mobile stack order  
7. Preview → screenshot → visual diff → iterate  

## Status legend

- **required** — must ship before claiming Option 3 fidelity  
- **reuse** — existing approved brand file  
- **generated** — created for this pass  
- **pending** — not yet written to disk  

**Gate:** Layout code must not be considered complete until Status column for all *required* rows is `generated` or `reuse` and files exist on disk.
