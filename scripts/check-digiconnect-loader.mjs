import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

const loader = read("src/components/ui/digiconnect-loader.tsx");
assert.match(loader, /variant\?: "inline" \| "section" \| "fullscreen"/);
assert.match(loader, /role="status"/);
assert.equal((loader.match(/styles\.square/g) || []).length, 5);

const css = read("src/components/ui/digiconnect-loader.module.css");
assert.match(css, /prefers-reduced-motion/);
assert.match(css, /square-path/);
assert.match(css, /2\.4s/);

const rootLoading = read("src/app/loading.tsx");
assert.match(rootLoading, /DigiConnectLoader/);
assert.match(rootLoading, /fullscreen/);

const button = read("src/components/ui/button.tsx");
assert.match(button, /isLoading\?/);
assert.match(button, /DigiConnectLoader/);

const partner = read("src/app/admin/agency-partners/[id]/loading.tsx");
assert.match(partner, /animate-pulse/);
assert.doesNotMatch(partner, /DigiConnectLoader/);

// navigation helpers via dynamic import of compiled? just re-check source constants
const nav = read("src/hooks/use-navigation-loading.ts");
assert.match(nav, /NAV_LOADER_SHOW_DELAY_MS = 150/);
assert.match(nav, /NAV_LOADER_MIN_VISIBLE_MS = 250/);
assert.match(nav, /NAV_LOADER_MAX_MS = 8_000/);

console.log("PASS digiconnect loader contracts");
