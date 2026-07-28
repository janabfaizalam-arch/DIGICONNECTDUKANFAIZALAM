import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const fail = [];

function listFiles(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) listFiles(full, acc);
    else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith(".test.ts")) acc.push(full);
  }
  return acc;
}

const form = read("src/components/auth/admin-login-form.tsx");
if (!form.includes("admin-login-shared")) fail.push("form missing shared import");
if (form.includes("admin-login-core")) fail.push("form still imports core");
if (form.includes("customer-lookup") || form.includes("auth-v2/password") || form.includes("argon2")) {
  fail.push("form has forbidden imports");
}
if (!form.includes("/api/auth/admin/login")) fail.push("form missing admin login API call");

for (const f of [
  "src/lib/auth-v2/password.ts",
  "src/lib/auth/customer-lookup.ts",
  "src/lib/auth/admin-login-core.ts",
]) {
  if (!/import\s+["']server-only["']/.test(read(f))) fail.push(`${f} missing server-only`);
}

const shared = read("src/lib/auth/admin-login-shared.ts");
const sharedImports = shared
  .split("\n")
  .filter((line) => /^\s*import\b/.test(line))
  .join("\n");
if (/server-only|argon2|customer-lookup|auth-v2\/password|supabase\/admin|next\/headers/.test(sharedImports)) {
  fail.push("shared has server imports");
}

const forbidden = [
  /from\s+["']argon2["']/,
  /from\s+["']@\/lib\/auth-v2\/password["']/,
  /from\s+["']@\/lib\/auth\/customer-lookup["']/,
  /from\s+["']@\/lib\/auth\/admin-login-core["']/,
  /from\s+["']@\/lib\/auth\/customer-pin-auth["']/,
  /from\s+["']@\/lib\/supabase\/admin["']/,
];

for (const root of ["src/components", "src/app", "src/hooks"]) {
  if (!fs.existsSync(root)) continue;
  for (const file of listFiles(root)) {
    const src = fs.readFileSync(file, "utf8");
    if (!/^\s*["']use client["']\s*;/m.test(src)) continue;
    for (const p of forbidden) {
      if (p.test(src)) fail.push(`${path.relative(ROOT, file)} ${p}`);
    }
  }
}

const routes = [
  "src/app/api/auth/admin/login/route.ts",
  "src/app/api/auth/customer/login/route.ts",
  "src/app/api/auth/customer/forgot-pin/reset/route.ts",
  "src/app/api/customer-auth/login/route.ts",
  "src/app/api/customer-auth/set-pin/route.ts",
  "src/app/api/customer-auth/reset-pin/route.ts",
];
for (const r of routes) {
  if (!/export\s+const\s+runtime\s*=\s*["']nodejs["']/.test(read(r))) {
    fail.push(`${r} missing nodejs runtime`);
  }
}

const core = read("src/lib/auth/admin-login-core.ts");
if (core.includes("customer-lookup") || core.includes("argon2") || core.includes("password")) {
  fail.push("core still pulls server deps beyond reexport");
}

if (fail.length) {
  console.error("FAIL\n" + fail.join("\n"));
  process.exit(1);
}
console.log("PASS all argon2 boundary contracts");
