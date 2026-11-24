import { describe, expect, it } from "vitest";

import { isMissingColumnError } from "@/lib/supabase/schema-drift";
import { readCode } from "@/lib/testing/source";

describe("recognising a database that is a migration behind", () => {
  it("knows Postgres and PostgREST missing-column errors", () => {
    expect(isMissingColumnError({ code: "42703" })).toBe(true);
    expect(isMissingColumnError({ code: "PGRST204" })).toBe(true);
    expect(isMissingColumnError({ message: "Could not find the 'paid_at' column of 'print_jobs' in the schema cache" })).toBe(true);
  });

  it("does not mistake other failures for it", () => {
    expect(isMissingColumnError(null)).toBe(false);
    expect(isMissingColumnError({ code: "23505", message: "duplicate key" })).toBe(false);
  });
});

/**
 * Migrations here are applied by hand (SQL editor / MCP) and the remote
 * history does not track every file, so any of them can be run twice. A
 * print migration that is not safe to re-run would break the second time.
 */
describe("Digi Print migrations can be run again safely", () => {
  const files = [
    "supabase/migrations/20260901160000_partner_print_stations.sql",
    "supabase/migrations/20260903160000_smart_print.sql",
    "supabase/migrations/20261124090000_digi_print_wallet_approval_printers.sql",
  ];

  it.each(files)("%s only creates and alters idempotently", (file) => {
    const sql = readCode(file)
      .replace(/--.*$/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    for (const match of sql.matchAll(/create\s+(unique\s+)?(table|index)\s+(?!if not exists)/gi)) {
      throw new Error(`${file}: "${match[0].trim()}" without IF NOT EXISTS`);
    }
    for (const match of sql.matchAll(/add\s+column\s+(?!if not exists)/gi)) {
      throw new Error(`${file}: "${match[0].trim()}" without IF NOT EXISTS`);
    }
    // Every added constraint is dropped first in the same file.
    for (const match of sql.matchAll(/add\s+constraint\s+(\w+)/gi)) {
      expect(sql, `${match[1]} is not dropped before being added`).toMatch(
        new RegExp(`drop\\s+constraint\\s+if\\s+exists\\s+${match[1]}`, "i"),
      );
    }
  });
});

describe("the print system survives a missing column", () => {
  it("reads stations with every column rather than a list that can fail", () => {
    expect(readCode("src/lib/print/stations.ts")).toContain('const COLUMNS = "*"');
  });

  it("still marks a paid job paid on an older schema", () => {
    const source = readCode("src/lib/payments/complete-non-application-payment.ts");
    expect(source).toContain("isMissingColumnError(error)");
    expect(source).toContain("schema_fallback");
  });

  it("keeps the printer heartbeat when the printer list cannot be stored", () => {
    expect(readCode("src/lib/print/stations.ts")).toMatch(/isMissingColumnError\(error\)[\s\S]{0,200}agent_last_seen_at: seenAt/);
  });
});
