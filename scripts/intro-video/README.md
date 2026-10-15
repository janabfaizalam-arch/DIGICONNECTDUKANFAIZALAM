# Intro video

24-second 1080p brand intro for DigiConnect Dukan, output at `public/videos/digiconnect-intro.mp4`.

- `scene.html` — the animation (logo reveal → tagline → services → why us → CTA), driven by `window.render(t)`.
- `render.mjs` — captures each frame in headless Chromium (Playwright) and encodes with ffmpeg, adding a soft synth pad.

```bash
node scripts/intro-video/render.mjs            # writes public/videos/digiconnect-intro.mp4
```

Edit text, timings or services in `scene.html`, then re-run. Requires `ffmpeg` and Playwright's Chromium.

Embed on a page:

```html
<video src="/videos/digiconnect-intro.mp4" autoplay muted loop playsinline></video>
```
