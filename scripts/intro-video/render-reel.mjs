// Renders reel.html (1080x1920, 9:16) frame-by-frame with headless Chromium and encodes an MP4
// with the Hinglish voiceover (voiceover/line*.wav, see voiceover.py) over a soft music pad.
// Usage: node scripts/intro-video/render-reel.mjs [output.mp4]
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("/opt/node22/lib/node_modules/playwright")); }

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(process.argv[2] || path.join(here, "../../public/videos/digiconnect-intro-reel.mp4"));
const FPS = 30, DURATION = 34.5;
// Start time of each voiceover line; keep in sync with the scene windows in reel.html.
const VOICE_AT = [0.4, 4.3, 7.8, 18.0, 24.7];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto("file://" + path.join(here, "reel.html"));
await page.evaluate(() => window.ready);

// Soft background pad cycling C -> Am -> F -> G every 6s.
const chords = [[261.63, 329.63, 392], [220, 261.63, 329.63], [174.61, 220, 261.63], [196, 246.94, 293.66]];
const music = Array.from({ length: Math.ceil(DURATION / 6) }, (_, i) =>
  chords[i % 4].map((hz) => `0.05*sin(2*PI*${hz}*t)*between(t,${i * 6},${i * 6 + 6})`).join("+")).join("+");

const voiceInputs = VOICE_AT.flatMap((_, i) => ["-i", path.join(here, "voiceover", `line${i + 1}.wav`)]);
const voiceChains = VOICE_AT.map((s, i) => `[${i + 2}:a]aresample=44100,adelay=${Math.round(s * 1000)}:all=1,volume=1.6[v${i}]`);
const filter = [
  `[1:a]afade=t=in:d=1.5,afade=t=out:st=${DURATION - 2}:d=2,lowpass=f=1800,volume=0.45[m]`,
  ...voiceChains,
  `[m]${VOICE_AT.map((_, i) => `[v${i}]`).join("")}amix=inputs=${VOICE_AT.length + 1}:normalize=0,alimiter=limit=0.95[a]`,
].join(";");

const ff = spawn("ffmpeg", [
  "-y", "-loglevel", "error",
  "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
  "-f", "lavfi", "-i", `aevalsrc='${music}':s=44100:d=${DURATION}`,
  ...voiceInputs,
  "-filter_complex", filter, "-map", "0:v", "-map", "[a]",
  "-c:v", "libx264", "-preset", "slow", "-crf", "22", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
  "-c:a", "aac", "-b:a", "160k", "-t", String(DURATION), out,
], { stdio: ["pipe", "inherit", "inherit"] });

const total = Math.round(FPS * DURATION);
for (let i = 0; i < total; i++) {
  await page.evaluate((t) => window.render(t), i / FPS);
  const buf = await page.screenshot({ type: "png" });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if (i % 150 === 0) console.log(`frame ${i}/${total}`);
}
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
await browser.close();
console.log("wrote", out);
