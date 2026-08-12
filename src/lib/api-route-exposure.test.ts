import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative, sep } from "path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const apiRoot = join(root, "src", "app", "api");

function listRouteFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...listRouteFiles(full));
    } else if (entry === "route.ts" || entry === "route.tsx") {
      out.push(full);
    }
  }
  return out;
}

function routeName(file: string): string {
  return relative(apiRoot, file).split(sep).slice(0, -1).join("/");
}

const routeFiles = listRouteFiles(apiRoot);

/** A caller identity was established — session, capability, or shared secret. */
const GUARD_PATTERNS =
  /getCurrentUser|isAdminRole|isActiveAgent|currentUserHasCapability|requireAdmin|verifyAdminAccessToken|verifyAccessToken|getSession\(|CRON_SECRET|WEBHOOK_SECRET|SECRET_KEY|resolveCommsCronSecret|secretsEqual|x-razorpay-signature|verifyWebhookSignature|timingSafeEqual/;

/**
 * Routes that hold the service-role client and write without establishing a
 * session. Each is a deliberate public surface — the auth endpoints themselves
 * (which run before a session exists), public capture forms, and link lookups.
 *
 * This is an inventory, not a blessing: it exists so a NEW unauthenticated
 * service-role write fails this test and gets a decision, instead of landing
 * quietly the way /api/debug/doc-test and /api/test/verify-phase3 did.
 *
 * Known blind spot: this matches on `getSupabaseAdmin` appearing in the route
 * file itself, so a route that reaches the service role through a helper is not
 * caught. The customer auth routes (register / signin / forgot-password) are
 * exactly that shape — deliberately public, with their privileged work in
 * `lib/auth/customer-account.ts`, which is covered by its own tests.
 */
const KNOWN_UNAUTHENTICATED_WRITES = [
  // Auth endpoints themselves — they run before a session can exist.
  "auth/admin/login",
  "auth/ap/login",

  // Public capture surfaces — anonymous visitors are the intended callers.
  "crm/event",
  "lead",
  "services/track",

  // Public print-shop counter: a walk-up customer creates a job and pays for it.
  "print/jobs/create",
  "print/payment/create-order",

  // Reads a link by its own secret code; the only write is auto-expiry.
  "payment-links/details",
];

describe("API surface exposure", () => {
  it("finds routes to check", () => {
    expect(routeFiles.length).toBeGreaterThan(100);
  });

  it("ships no debug or test endpoints", () => {
    // /api/debug/test-env leaked env var names. /api/debug/doc-test and
    // /api/test/verify-phase3 ran unauthenticated service-role writes against
    // applications, storage and the wallet tables. /api/ap/debug/seed let any
    // partner wipe service configuration. None had been referenced by the app.
    const offenders = routeFiles
      .map(routeName)
      .filter((p) => p.split("/").some((segment) => segment === "debug" || segment === "test"));
    expect(offenders).toEqual([]);
  });

  it("keeps every cron endpoint behind a shared secret", () => {
    // /api/cron/process-notifications was open to anyone and wrote simulated
    // send outcomes into the real notification_queue.
    const unguarded = routeFiles
      .filter((f) => routeName(f).startsWith("cron/"))
      .filter((f) => !GUARD_PATTERNS.test(readFileSync(f, "utf8")))
      .map(routeName);
    expect(unguarded).toEqual([]);
  });

  it("does not add new unauthenticated service-role writes", () => {
    const found: string[] = [];

    for (const file of routeFiles) {
      const source = readFileSync(file, "utf8");
      if (!source.includes("getSupabaseAdmin")) continue;
      if (!/\.(insert|update|upsert|delete)\s*\(/.test(source)) continue;
      if (GUARD_PATTERNS.test(source)) continue;
      found.push(routeName(file));
    }

    expect(found.sort()).toEqual([...KNOWN_UNAUTHENTICATED_WRITES].sort());
  });
});
