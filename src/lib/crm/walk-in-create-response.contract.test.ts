import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function readSrc(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("Walk-in create response + recovery contracts", () => {
  const route = readSrc("src/app/api/admin/crm/walk-in-application/route.ts");
  const identity = readSrc("src/lib/customer-identity.ts");
  const wizard = readSrc("src/components/admin/walk-in-customer-wizard.tsx");
  const walkIn = readSrc("src/lib/crm/walk-in.ts");
  const walkInApp = readSrc("src/lib/crm/walk-in-application.ts");

  it("API never returns 204 and always uses NextResponse.json for create branches", () => {
    expect(route).toMatch(/NextResponse\.json/);
    expect(route).not.toMatch(/status:\s*204/);
    expect(route).toMatch(/ok:\s*true/);
    expect(route).toMatch(/applicationId/);
    expect(route).toMatch(/idempotentReplay/);
    expect(route).toMatch(/notificationStatus/);
    expect(route).toMatch(/correlationId/);
    expect(route).toMatch(/INTERNAL_ERROR/);
  });

  it("exposes actor-scoped GET recovery that never creates", () => {
    expect(route).toMatch(/export async function GET/);
    expect(route).toMatch(/lookupWalkInApplicationByIdempotency/);
    expect(route).toMatch(/recoveryStatus/);
    expect(walkInApp).toMatch(/lookupWalkInApplicationByIdempotency/);
    expect(walkInApp).toMatch(/eq\("actor_id", input\.actorId\)/);
  });

  it("identity checks do not query nonexistent customers.user_id", () => {
    // Production schema: customers.id == auth.users.id; no customers.user_id.
    expect(identity).toMatch(/from\("customers"\)\.select\("id"\)\.ilike\("email"/);
    expect(identity).toMatch(/from\("customers"\)\.select\("id"\)\.eq\("mobile"/);
    // Onboarding duplicate + assertMobileAvailable must not filter customers by user_id.
    const onboardingBlock = identity.slice(
      identity.indexOf("export async function assertCustomerIdentityAvailable"),
      identity.indexOf("export async function assertMobileAvailableForAuthenticatedUser"),
    );
    expect(onboardingBlock).not.toMatch(/from\("customers"\)[\s\S]{0,200}user_id/);
    const mobileBlock = identity.slice(
      identity.indexOf("export async function assertMobileAvailableForAuthenticatedUser"),
      identity.indexOf("export async function consolidateCustomerRows"),
    );
    expect(mobileBlock).not.toMatch(/from\("customers"\)[\s\S]{0,200}user_id/);
    expect(identity).toMatch(/isMissingTableOrColumnError/);
  });

  it("walk-in create catches identity throws and returns safe failure", () => {
    expect(walkIn).toMatch(/identity_check_threw/);
    expect(walkIn).toMatch(/Identity check failed/);
  });

  it("client uses safe parser and never shows raw Response.json exceptions", () => {
    expect(wizard).toMatch(/parseApiResponse/);
    expect(wizard).toMatch(/extractSafeApiError/);
    expect(wizard).toMatch(/isRawJsonParseExceptionMessage/);
    expect(wizard).toMatch(/Check application status/);
    expect(wizard).toMatch(/recoverByIdempotencyKey/);
    expect(wizard).not.toMatch(/await response\.json\(\)/);
  });

  it("keeps idempotency key on ambiguous response and disables double submit", () => {
    expect(wizard).toMatch(/submitLock/);
    expect(wizard).toMatch(/Creating…/);
    expect(wizard).toMatch(/Keep the same idempotency key/);
    expect(wizard).toMatch(/setIdempotencyKey\(newIdempotencyKey\(\)\)/);
  });

  it("notification failure after commit cannot replace success JSON", () => {
    expect(walkInApp).toMatch(/whatsapp_enqueue_failed|whatsapp_audit_after_failed/);
    expect(route).toMatch(/unhandled_error/);
    expect(route).toMatch(/Application could not be created\. Please check status before retrying\./);
  });
});
