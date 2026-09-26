# Auth brand artwork

`AuthScene` (`src/components/auth/ui/auth-scene.tsx`) draws the brand panel on
all eight auth pages: customer sign in / sign up, forgot and reset password, DC
Partner sign in, admin sign in, and both partner-application pages. It has two
picture slots, and either can be filled without the other.

Drop a file in this folder, point the matching constant at it, and that is the
whole change. A path that resolves to nothing falls back to the plain gradient
panel rather than leaving a hole, so a typo in the filename costs a 404 and
nothing else.

| Slot | Constant | What it is |
|---|---|---|
| Backdrop | `BRAND_ARTWORK` | fills the panel edge to edge, under a scrim |
| Cutout | `BRAND_MASCOT` | a character drawn over the scrim, at full strength |

## Which slot

**A character — an avatar, a mascot, a person — goes in `BRAND_MASCOT`.** It is
drawn over everything else at full colour, in the band the panel leaves empty:
between the logo and the headline on a desktop, and to the right of the compact
header on a phone. Nothing is laid over it, so it keeps its colours.

**A scene — a storefront, a street, a texture — goes in `BRAND_ARTWORK`.** It
fills the panel and the text sits on top of it, so a scrim of roughly half
strength is laid over it to keep the text readable. That wash suits a backdrop
and flattens a character, which is why a mascot does not belong here.

## `BRAND_MASCOT` — the cutout

| | |
|---|---|
| Format | **PNG with a transparent background** (WebP with alpha also works) |
| Size | about 900 × 1100 px |
| Aspect | square to portrait, no taller than 4:5 |
| Weight | under 300 KB |

Trim the file to the subject with only a little padding — the box it is fitted
into is roughly 305 × 290 px on a desktop and 117 × 145 px on a phone, and
`object-contain` fits the whole file inside that, so empty margin in the file
is empty space on the panel and shrinks the character.

Keep the subject upright and centred in the file. It is anchored to the right
of its box, bottom-aligned on a phone, so a drop shadow or a ground plane
baked into the artwork should sit at the bottom edge.

## `BRAND_ARTWORK` — the backdrop

| | |
|---|---|
| Format | WebP |
| Size | 1200 × 1600 px, portrait |
| Weight | under 400 KB |
| Colour | sRGB |

The panel is roughly 3:4 on a desktop and much wider than it is tall on a
phone, and the image fills it (`object-cover`). Only the middle of the image
survives both crops, so keep the subject centred; anything near the left or
right edge is cut off on a phone, and anything at the very top or bottom is cut
off on a desktop.

Text runs across the whole panel — the logo at the top, the kicker, headline
and three promise cards over the lower half — so the backdrop should be a
broad, low-detail scene rather than something with a focal point to protect.

### Light or dark

`ARTWORK_IS_LIGHT` applies to the backdrop only. `true` shades the panel for a
light scene: navy text, the full-colour logo, and a white scrim. `false` keeps
the white text the gradient was built for and shades with navy instead. A
bright storefront or daylight illustration is light; a night scene or a
deep-blue render is not.
