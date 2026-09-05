# Labour Card page — photograph slots

The page ships with drawn SVG artwork in every section, so nothing is ever
blank. These four places would be better with a real photograph.

Drop a file with the exact name below into this folder and that section starts
using it on the next deploy. Nothing else to change — the alt text is already
written in `src/lib/labour/photos.ts`, and the illustration stays until a file
appears.

| File | Where | What it must show | Size |
| --- | --- | --- | --- |
| `hero-site.webp` | Hero, right side | Indian construction site — workers in helmets, scaffolding, a building going up | 1200 × 900 |
| `trades.webp` | "Kiske liye hai?" | A mason, carpenter, plumber or electrician at work with their tools | 960 × 640 |
| `documents.webp` | "Kaunse documents lagenge?" | Indian identity and bank documents laid out — Aadhaar, passbook, photographs, a form | 960 × 640 |
| `counter.webp` | "DigiConnect Dukan kya karta hai" | A small digital service centre counter — computer, printer, someone being helped | 960 × 640 |

## Rules for anything added here

- **WebP**, at the size in the table. Bigger files make the page slower on the
  phones this page is actually read on; smaller ones look soft on a laptop.
- **Licence-free.** Unsplash and Pexels both allow commercial use without
  attribution. Record where each file came from in the table below so the
  licence can be checked later.
- **No stock photo of a person holding a government document as if it were
  issued by this shop.** The page says in several places that DigiConnect Dukan
  is not a government agent; a photograph that implies otherwise undoes that.

Convert and resize with the `sharp` already in this project:

```bash
node -e "require('sharp')('downloaded.jpg').resize(1200,900,{fit:'cover'}).webp({quality:78}).toFile('public/images/services/labour-card/hero-site.webp')"
```

## Where each file came from

| File | Source | Photographer / licence |
| --- | --- | --- |
| _(none added yet)_ | | |
