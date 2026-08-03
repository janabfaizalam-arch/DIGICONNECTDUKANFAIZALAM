/**
 * Windows Application Control blocks @tailwindcss/oxide-win32-*.node, so Oxide
 * falls back to WASI. That fallback cannot glob the filesystem (scan() => []),
 * which leaves Tailwind utilities empty and the UI unstyled.
 *
 * This patch reimplements Scanner.scan / files / globs with Node fs while still
 * using Oxide's content tokenizer (getCandidatesWithPositions), which works under WASI.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

let patched = false;

function walkFiles(base, pattern) {
  const out = [];
  if (!base || !fs.existsSync(base)) return out;

  // Oxide patterns are typically **/* or **/*.{tsx,ts,...}
  const extMatch = /\.\{([^}]+)\}/.exec(pattern || "");
  const exts = extMatch
    ? extMatch[1].split(",").map((e) => (e.startsWith(".") ? e : `.${e}`))
    : null;
  const acceptAll = !exts && (pattern === "**/*" || pattern === "*" || !pattern);

  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name);
      if (acceptAll) {
        if (/\.(tsx?|jsx?|mdx|css|html)$/.test(entry.name)) out.push(full);
      } else if (exts) {
        if (exts.includes(ext)) out.push(full);
      } else if (pattern?.endsWith(entry.name)) {
        out.push(full);
      } else if (/\.(tsx?|jsx?|mdx|css|html)$/.test(entry.name)) {
        out.push(full);
      }
    }
  };

  const stat = fs.statSync(base);
  if (stat.isFile()) {
    out.push(base);
    return out;
  }
  walk(base);
  return out;
}

export function patchTailwindOxideScanner() {
  if (patched) return;
  patched = true;

  const oxide = require("@tailwindcss/oxide");
  const Scanner = oxide.Scanner;
  if (!Scanner?.prototype) return;

  const originalScan = Scanner.prototype.scan;

  Object.defineProperty(Scanner.prototype, "files", {
    configurable: true,
    enumerable: true,
    get() {
      if (!this.__nodeFiles) {
        const sources = this.normalizedSources || [];
        const files = [];
        for (const source of sources) {
          if (source.negated) continue;
          files.push(...walkFiles(source.base, source.pattern));
        }
        this.__nodeFiles = [...new Set(files)];
      }
      return this.__nodeFiles;
    },
  });

  Object.defineProperty(Scanner.prototype, "globs", {
    configurable: true,
    enumerable: true,
    get() {
      return (this.normalizedSources || [])
        .filter((s) => !s.negated)
        .map((s) => ({ base: s.base, pattern: s.pattern }));
    },
  });

  Scanner.prototype.scan = function patchedScan() {
    // Prefer native/WASI scan when it actually finds files.
    try {
      const native = originalScan.call(this);
      if (Array.isArray(native) && native.length > 0) return native;
    } catch {
      /* fall through to Node fs */
    }

    const candidates = new Set();
    for (const file of this.files) {
      let content;
      try {
        content = fs.readFileSync(file, "utf8");
      } catch {
        continue;
      }
      const extension = path.extname(file).slice(1) || "tsx";
      try {
        for (const { candidate } of this.getCandidatesWithPositions({ content, extension })) {
          candidates.add(candidate);
        }
      } catch {
        /* ignore tokenizer errors on odd files */
      }
    }
    return [...candidates];
  };
}
