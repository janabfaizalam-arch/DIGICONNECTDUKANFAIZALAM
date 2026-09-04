/**
 * Put MediaPipe's WebAssembly runtime where the browser can fetch it.
 *
 * The passport-photo background is cut out on the customer's own phone, which
 * means the model and the runtime that executes it have to be served by this
 * site. They arrive with the npm package as an 11 MB binary — far too big to
 * keep in git, and pointless to keep there when npm already has it — so it is
 * copied into public/ at build time instead.
 *
 * Serving it ourselves rather than from a public CDN is deliberate: a shop on
 * a weak connection should depend on one origin, not two, and nothing about a
 * customer's photograph should reach a third party. The photograph itself
 * never leaves the phone either way; this keeps the code that processes it in
 * the same place as the page.
 */

import { copyFile, mkdir, readdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const to = join(root, "public", "mediapipe");

async function main() {
  let files;
  try {
    files = await readdir(from);
  } catch {
    // A checkout without node_modules, or an install that skipped the
    // package. The feature degrades to "background removal unavailable"
    // rather than failing the whole build.
    console.warn("[vision-wasm] @mediapipe/tasks-vision not installed; skipping.");
    return;
  }

  await mkdir(to, { recursive: true });
  let copied = 0;
  for (const name of files) {
    const source = join(from, name);
    if (!(await stat(source)).isFile()) continue;
    await copyFile(source, join(to, name));
    copied += 1;
  }
  console.log(`[vision-wasm] copied ${copied} files to public/mediapipe`);
}

await main();
