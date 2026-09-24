# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** DC Partners
**Generated:** 2026-09-24 10:02:54
**Category:** Fintech/Crypto
**Design Dials:** Variance 6/10 (Balanced / Modern) | Motion 4/10 (Standard) | Density 8/10 (Dense / Dashboard)

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#0F172A` | `--color-primary` |
| On Primary | `#FFFFFF` | `--color-on-primary` |
| Secondary | `#1E3A8A` | `--color-secondary` |
| Accent/CTA | `#A16207` | `--color-accent` |
| Background | `#F8FAFC` | `--color-background` |
| Foreground | `#020617` | `--color-foreground` |
| Muted | `#E8ECF1` | `--color-muted` |
| Border | `#E2E8F0` | `--color-border` |
| Destructive | `#DC2626` | `--color-destructive` |
| Ring | `#0F172A` | `--color-ring` |

**Color Notes:** Trust navy + premium gold [Accent adjusted from #CA8A04 for WCAG 3:1]

### Typography

- **Heading Font:** IBM Plex Sans
- **Body Font:** IBM Plex Sans
- **Mood:** financial, trustworthy, professional, corporate, banking, serious
- **Google Fonts:** [IBM Plex Sans + IBM Plex Sans](https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap');
```

### Spacing Variables

*Density: 8/10 — Dense / Dashboard*

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `2px` / `0.125rem` | Tight gaps |
| `--space-sm` | `4px` / `0.25rem` | Icon gaps, inline spacing |
| `--space-md` | `8px` / `0.5rem` | Standard padding |
| `--space-lg` | `12px` / `0.75rem` | Section padding |
| `--space-xl` | `16px` / `1rem` | Large gaps |
| `--space-2xl` | `24px` / `1.5rem` | Section margins |
| `--space-3xl` | `32px` / `2rem` | Hero padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Hero images, featured cards |

---

## Component Specs

### Buttons

```css
/* Primary Button */
.btn-primary {
  background: #A16207;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Secondary Button */
.btn-secondary {
  background: transparent;
  color: #0F172A;
  border: 2px solid #0F172A;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}
```

### Cards

```css
.card {
  background: #F8FAFC;
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow-md);
  transition: all 200ms ease;
  cursor: pointer;
}

.card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}
```

### Inputs

```css
.input {
  padding: 12px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 200ms ease;
}

.input:focus {
  border-color: #0F172A;
  outline: none;
  box-shadow: 0 0 0 3px #0F172A20;
}
```

### Modals

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
}
```

---

## Style Guidelines

**Style:** Soft UI Evolution

**Keywords:** Evolved soft UI, better contrast, modern aesthetics, subtle depth, accessibility-focused, improved shadows, hybrid

**Best For:** Modern enterprise apps, SaaS platforms, health/wellness, modern business tools, professional, hybrid

**Key Effects:** Improved shadows (softer than flat, clearer than neumorphism), modern (200-300ms), focus visible, WCAG AA/AAA

### Page Pattern

**Pattern Name:** Real-Time / Operations Landing

- **Conversion Strategy:** For ops/security/iot products. Demo or sandbox link. Trust signals.
- **CTA Placement:** Primary CTA in nav + After metrics
- **Section Order:** 1. Hero (product + live preview or status), 2. Key metrics/indicators, 3. How it works, 4. CTA (Start trial / Contact)

---

## Motion

**Parallax Scroll** (Standard) — Trigger: scroll (continuous) | Duration: tied to scroll position | Easing: `linear (scrub)`

```js
gsap.utils.toArray('.parallax-layer').forEach((layer, i) => { gsap.to(layer, { yPercent: (i + 1) * -8, ease: 'none', scrollTrigger: { trigger: layer.parentElement, scrub: 0.5 } }); });
```

**Framework notes:** Layer count beyond 3-4 has diminishing visual return and multiplies scroll-listener cost

- ✅ Vary speed per layer (background slowest, foreground fastest) to sell the depth illusion
- ❌ Don't let parallax layers overflow their container; clip with overflow: hidden on the wrapper
- ⚡ Batch all layers under one ScrollTrigger container where possible instead of one per layer

---

## Anti-Patterns (Do NOT Use)

- ❌ Playful design
- ❌ Unclear fees
- ❌ AI purple/pink gradients

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile

---

## As implemented (DigiConnect Dukan, partner panel)

The generated recommendation above is the starting point; these are the values
actually shipped, and the places they differ and why.

### Where the tokens live

`src/app/globals.css`, scoped to `[data-dcp]` — the attribute is set once on
the panel shell in `src/app/ap/layout.tsx`, so nothing outside the partner
panel inherits any of it. The page canvas is painted by `[data-dcp-page]`.

### Colour, and the contrast work

Every token below was checked with the WCAG contrast formula against each
surface it is actually used on. Three of the first-draft values failed and
were re-cut:

| Token | First draft | Shipped | Why |
|---|---|---|---|
| `--dcp-ink-3` | `#64769a` | `#5d6e8f` | 4.29:1 on `--dcp-surface-2` — under 4.5 |
| `--dcp-ink-4` | `#8c9ab7` | `#636d82` | 2.83:1 on white — well under 4.5 |
| `--dcp-g-brand` | `#1268e8 → #3b8bff` | `#0b4fb8 → #1268e8` | white hit only 3.32:1 at the light end |
| `--dcp-g-good` | `#0b7c58 → #12b07f` | `#0b7c58 → #0e8661` | white hit 3.94:1 at the light end |

The orange is the interesting one. White on the brand orange is 3.37:1 and
there is no orange that carries white at 4.5:1 while still reading as orange —
darkening it to pass turns it brown. So the accent gradient stayed vivid
(`#ff6800 → #ffa15c`) and the *ink* changed instead: navy `#0a1834` on it is
6.06:1 at the dark end and 8.80:1 at the light end. Anything sitting on the
accent gradient — the tier badge, the announcement CTA, `.dcp-btn-accent` —
takes navy ink, never white.

Final state: every text/surface pair in the panel clears 4.5:1.

### Deliberate departures from the generated system

- **Accent is brand orange, not the suggested gold `#A16207`.** DigiConnect's
  mark is blue and orange; a gold accent would be a third brand colour.
- **Primary stays `#1268e8`, not `#0F172A`.** The suggestion treats navy as the
  primary; here navy is the masthead surface and blue is the action colour, so
  "what I can press" reads as one thing throughout.
- **No parallax.** The suggested motion preset is scroll parallax; this is a
  dashboard people use daily, so motion is limited to 150–300ms hover and press
  feedback, all of it dropped under `prefers-reduced-motion`.

### Density

Dial 8/10. Section rhythm 18px, card padding 14px, tile gap 10px. The previous
page used 20–24px section gaps and 16px card padding, which is a marketing
page's rhythm and left the dashboard looking half-empty.
