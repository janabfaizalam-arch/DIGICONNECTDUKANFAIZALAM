/**
 * Lightweight OTP flow assertions without Vitest/Rollup (Windows App Control).
 * Run: node --experimental-strip-types scripts/otp-signup-smoke.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// --- phone normalize (inline mirror of production rules) ---
function normalizeIndianPhone(input) {
  const digits = String(input ?? "").replace(/\D/g, "");
  let local = digits;
  if (local.startsWith("91") && local.length === 12) local = local.slice(2);
  if (local.length === 11 && local.startsWith("0")) local = local.slice(1);
  if (!/^[6-9]\d{9}$/.test(local)) return { ok: false };
  return { ok: true, local, e164: `+91${local}` };
}

assert.equal(normalizeIndianPhone("9876543210").e164, "+919876543210");
assert.equal(normalizeIndianPhone("+91 98765-43210").local, "9876543210");
assert.equal(normalizeIndianPhone("919876543210").local, "9876543210");
assert.equal(normalizeIndianPhone("12345").ok, false);

// --- service worker ---
const sw = readFileSync(join(root, "public/sw.js"), "utf8");
assert.match(sw, /digiconnect-static-v2/);
assert.ok(sw.includes('"/api/"'));
assert.ok(sw.includes('"/customer-auth"'));
assert.ok(sw.includes('request.method !== "GET"'));
assert.ok(sw.includes('url.pathname.startsWith("/_next/static/")'));
assert.match(sw, /\/_next\/static\/[\s\S]{0,200}return false/);

// --- canonical frontend route wiring ---
const signupFlow = readFileSync(join(root, "src/components/auth/customer-signup-flow.tsx"), "utf8");
assert.ok(signupFlow.includes('"/api/auth/customer/send-signup-otp"') || signupFlow.includes("SIGNUP_OTP_ROUTE"));
assert.ok(signupFlow.includes("signup_otp_button_clicked"));
assert.ok(signupFlow.includes("signup_otp_request_failed"));

const postJson = readFileSync(join(root, "src/components/auth/ui/request.ts"), "utf8");
assert.ok(postJson.includes("isExplicitSuccessPayload"));
assert.ok(postJson.includes('redirect: "manual"'));
assert.ok(postJson.includes("record.ok === true"));

const apiRoute = readFileSync(join(root, "src/app/api/auth/customer/send-signup-otp/route.ts"), "utf8");
assert.ok(apiRoute.includes("[signup-otp] request_received"));
assert.ok(apiRoute.includes("[signup-otp] send_accepted"));
assert.ok(apiRoute.includes("ok: true"));

const aisensy = readFileSync(join(root, "src/lib/whatsapp/aisensy.ts"), "utf8");
assert.ok(aisensy.includes("AISENSY_SIGNUP_CAMPAIGN"));
assert.ok(aisensy.includes("AISENSY_CAMPAIGN_NAME_SIGNUP"));
assert.ok(aisensy.includes("OTP_PROVIDER_CONFIG_MISSING"));
assert.ok(aisensy.includes("templateParams: [options.otp]"));

const middleware = readFileSync(join(root, "src/middleware.ts"), "utf8");
assert.ok(middleware.includes('pathname.startsWith("/api/")'));
assert.ok(middleware.includes("/customer-auth-v2/signup"));

console.log("otp-signup-smoke: all assertions passed");
