# Intro videos

| Video | Size | Source | Render |
|---|---|---|---|
| `public/videos/digiconnect-intro-reel.mp4` | 1080×1920 (9:16 reel), 34.5s, Hinglish voiceover + captions | `reel.html` | `node scripts/intro-video/render-reel.mjs` |
| `public/videos/digiconnect-intro.mp4` | 1920×1080 (16:9), 24s, music only | `scene.html` | `node scripts/intro-video/render.mjs` |

Each page is an animation driven by `window.render(t)`. The render scripts capture every frame in headless
Chromium (Playwright) and encode with ffmpeg. Requires `ffmpeg` and Playwright's Chromium.

## Voiceover

`voiceover/line1.wav` … `line5.wav` are generated offline by `voiceover.py` with the Piper Hindi voice
`hi_IN-pratham-medium` (setup steps are in the script's docstring). To change what is said, edit `LINES` in
`voiceover.py`, regenerate, then adjust the scene windows in `reel.html` (`S`, `cardAt`, `featAt`, captions)
and `VOICE_AT` in `render-reel.mjs` so each line still fits its scene.

## Embed on a page

```html
<video src="/videos/digiconnect-intro.mp4" autoplay muted loop playsinline></video>
```
