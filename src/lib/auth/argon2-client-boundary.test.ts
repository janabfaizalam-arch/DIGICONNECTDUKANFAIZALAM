import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");

function readSrc(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function listFilesRecursive(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listFilesRecursive(full, acc);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".test.ts")) {
      acc.push(full);
    }
  }
  return acc;
}

function isClientComponent(source: string) {
  return /^\s*["']use client["']\s*;/m.test(source);
}

const FORBIDDEN_IMPORT_PATTERNS = [
  /from\s+["']argon2["']/,
  /from\s+["']@\/lib\/auth-v2\/password["']/,
  /from\s+["']@\/lib\/auth\/customer-lookup["']/,
  /from\s+["']@\/lib\/auth\/admin-login-core["']/,
  /from\s+["']@\/lib\/auth\/customer-pin-auth["']/,
  /from\s+["']@\/lib\/supabase\/admin["']/,
];

describe("argon2 client-boundary contracts", () => {
  it("admin-login-form imports only client-safe shared helpers", () => {
    const source = readSrc("src/components/auth/admin-login-form.tsx");
    expect(source).toMatch(/["']use client["']/);
    expect(source).toContain('@/lib/auth/admin-login-shared');
    expect(source).not.toContain("admin-login-core");
    expect(source).not.toContain("customer-lookup");
    expect(source).not.toContain("auth-v2/password");
    expect(source).not.toContain("argon2");
  });

  it("marks password.ts and customer-lookup as server-only", () => {
    expect(readSrc("src/lib/auth-v2/password.ts")).toMatch(/import\s+["']server-only["']/);
    expect(readSrc("src/lib/auth/customer-lookup.ts")).toMatch(/import\s+["']server-only["']/);
    expect(readSrc("src/lib/auth/admin-login-core.ts")).toMatch(/import\s+["']server-only["']/);
  });

  it("does not allow Client Components to import argon2 or server auth modules", () => {
    const roots = [
      path.join(ROOT, "src/components"),
      path.join(ROOT, "src/app"),
      path.join(ROOT, "src/hooks"),
    ];
    const violations: string[] = [];

    for (const root of roots) {
      if (!fs.existsSync(root)) continue;
      for (const file of listFilesRecursive(root)) {
        const source = fs.readFileSync(file, "utf8");
        if (!isClientComponent(source)) continue;
        for (const pattern of FORBIDDEN_IMPORT_PATTERNS) {
          if (pattern.test(source)) {
            violations.push(`${path.relative(ROOT, file)} matches ${pattern}`);
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("API routes that execute Argon2 declare Node.js runtime", () => {
    const routes = [
      // Customer PIN routes were retired with the WhatsApp-OTP auth system;
      // customer credentials are now hashed by Supabase Auth, not by us.
      "src/app/api/auth/admin/login/route.ts",
    ];

    for (const route of routes) {
      const source = readSrc(route);
      expect(source, route).toMatch(/export\s+const\s+runtime\s*=\s*["']nodejs["']/);
    }
  });

  it("admin-login-shared stays free of server/native imports", () => {
    const source = readSrc("src/lib/auth/admin-login-shared.ts");
    const importLines = source
      .split("\n")
      .filter((line) => /^\s*import\b/.test(line))
      .join("\n");
    expect(importLines).not.toMatch(
      /server-only|argon2|customer-lookup|auth-v2\/password|supabase\/admin|next\/headers/,
    );
    expect(importLines).toContain("@/lib/auth/mobile");
  });

  it("password.ts remains the only argon2 import surface for PIN hashing", () => {
    const source = readSrc("src/lib/auth-v2/password.ts");
    expect(source).toContain('from "argon2"');
    expect(source).toContain("hashPin");
    expect(source).toContain("verifyPin");
  });
});
