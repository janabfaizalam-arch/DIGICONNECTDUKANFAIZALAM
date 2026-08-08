import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import {
  WALK_IN_FAILURE_CODES,
  describeWalkInFailure,
  isWalkInFailureCode,
  matchWalkInFailureCode,
} from "@/lib/crm/walk-in-application-core";

const root = process.cwd();
const readSrc = (rel: string) => readFileSync(join(root, rel), "utf8");

describe("walk-in failure codes", () => {
  it("covers every rejection the RPC can raise", () => {
    // Drift here means a real rejection falls through to the generic message.
    const migration = readSrc("supabase/migrations/20260805120000_crm_walk_in_application_foundation.sql");
    const raised = [...migration.matchAll(/raise exception '([a-z_]+)'/g)].map((m) => m[1]);
    const fromFunction = raised.filter((code) => code !== "assignment_history_append_only");

    for (const code of new Set(fromFunction)) {
      expect(WALK_IN_FAILURE_CODES).toContain(code);
    }
  });

  it("gives every code its own actionable message", () => {
    const messages = WALK_IN_FAILURE_CODES.map((code) => describeWalkInFailure(code).message);
    // No code may reuse another's wording — that was the original bug.
    expect(new Set(messages).size).toBe(messages.length);
    for (const message of messages) {
      expect(message.length).toBeGreaterThan(20);
      expect(message).not.toBe("Application could not be created.");
    }
  });

  it("maps codes to sensible HTTP statuses rather than a blanket 400", () => {
    expect(describeWalkInFailure("customer_not_found").status).toBe(404);
    expect(describeWalkInFailure("service_not_found").status).toBe(404);
    expect(describeWalkInFailure("inactive_service").status).toBe(400);
    expect(describeWalkInFailure("customer_auth_user_mismatch").status).toBe(409);
    expect(describeWalkInFailure("walk_in_application_failed").status).toBe(500);
  });

  it("finds the code inside a raw Postgres error string", () => {
    expect(matchWalkInFailureCode('P0001 inactive_service')).toBe("inactive_service");
    expect(matchWalkInFailureCode("some unrelated failure")).toBeNull();
    expect(matchWalkInFailureCode("")).toBeNull();
  });

  it("validates codes", () => {
    expect(isWalkInFailureCode("assignee_not_found")).toBe(true);
    expect(isWalkInFailureCode("nope")).toBe(false);
    expect(isWalkInFailureCode(null)).toBe(false);
  });
});

describe("walk-in create diagnostics", () => {
  const lib = readSrc("src/lib/crm/walk-in-application.ts");
  const route = readSrc("src/app/api/admin/crm/walk-in-application/route.ts");
  const wizard = readSrc("src/components/admin/walk-in-customer-wizard.tsx");

  it("reports the specific rejection instead of one dead-end string", () => {
    expect(lib).toContain("describeWalkInFailure");
    expect(lib).toContain("matchWalkInFailureCode");
    // The old generic message must be gone from the create path.
    expect(lib).not.toContain('error: "Application could not be created."');
  });

  it("only falls back to the manual insert when the RPC is genuinely absent", () => {
    // A rejected RPC previously risked being retried through the raw insert,
    // which skips the function's own rules.
    expect(lib).toContain("rpcMissing");
    expect(lib).toMatch(/const rpcMissing = \/PGRST202\|42883/);
  });

  it("keeps the Postgres code and message in server logs", () => {
    const insertBlock = lib.slice(lib.indexOf('console.error("[walk-in-app] insert_failed"'));
    expect(insertBlock.slice(0, 300)).toContain("applicationError?.code");
    expect(insertBlock.slice(0, 300)).toContain("applicationError?.message");
  });

  it("distinguishes the three server-fault paths from each other", () => {
    // These three are different problems — the database rolling the write back,
    // the RPC erroring unexpectedly, and the fallback insert failing. Sharing
    // one message left the operator unable to tell which had happened, which is
    // the same defect this file exists to prevent.
    const core = readSrc("src/lib/crm/walk-in-application-core.ts");
    const messages = [
      /The database rejected the application and rolled it back\./,
      /The application service returned an unexpected error\./,
      /The application record could not be written to the database\./,
    ];
    expect(core).toMatch(messages[0]);
    expect(lib).toMatch(messages[1]);
    expect(lib).toMatch(messages[2]);

    // And none of them is the old shared wording.
    const shared = "The application could not be saved. Nothing was created";
    expect(core).not.toContain(shared);
    expect(lib).not.toContain(shared);
  });

  it("ties the operator-visible reference to the server log line", () => {
    expect(route).toContain("create_rejected");
    expect(route).toContain("correlationId");
    expect(wizard).toContain("errorCorrelationId");
    expect(wizard).toContain("Reference:");
  });

  it("does not label the create button with a different action", () => {
    // Recovery after a failed create used to make "Create application" read
    // "Checking status…", which looked like the operator pressed the wrong button.
    expect(wizard).not.toContain('loadingText={checkingStatus ? "Checking status…" : "Creating…"}');
    expect(wizard).toContain('loadingText={checkingStatus ? "Confirming…" : "Creating…"}');
  });
});
