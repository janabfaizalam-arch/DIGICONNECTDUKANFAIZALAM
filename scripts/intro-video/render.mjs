// Renders scene.html frame-by-frame with headless Chromium and encodes an MP4 via ffmpeg.
// Usage: node scripts/intro-video/render.mjs [output.mp4] [--preview]
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("/opt/node22/lib/node_modules/playwright")); }

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(process.argv[2] || path.join(here, "../../public/videos/digiconnect-intro.mp4"));
const FPS = 30, DURATION = 24;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto("file://" + path.join(here, "scene.html"));
await page.evaluate(() => window.ready);

// Soft background pad: C major -> A minor -> F -> G, with fade in/out.
const chord = (t0, f) => f.map((hz) => `0.05*sin(2*PI*${hz}*t)*between(t,${t0},${t0 + 6})`).join("+");
const music = [chord(0, [261.63, 329.63, 392]), chord(6, [220, 261.63, 329.63]), chord(12, [174.61, 220, 261.63]), chord(18, [196, 246.94, 293.66])].join("+");

const ff = spawn("ffmpeg", [
  "-y", "-loglevel", "error",
  "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
  "-f", "lavfi", "-i", `aevalsrc='${music}':s=44100:d=${DURATION}`,
  "-af", `afade=t=in:d=1.5,afade=t=out:st=${DURATION - 2}:d=2,lowpass=f=1800`,
  "-c:v", "libx264", "-preset", "slow", "-crf", "22", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
  "-c:a", "aac", "-b:a", "128k", "-shortest", out,
], { stdio: ["pipe", "inherit", "inherit"] });

const total = FPS * DURATION;
for (let i = 0; i < total; i++) {
  await page.evaluate((t) => window.render(t), i / FPS);
  const buf = await page.screenshot({ type: "png" });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if (i % 90 === 0) console.log(`frame ${i}/${total}`);
}
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
await browser.close();
console.log("wrote", out);
