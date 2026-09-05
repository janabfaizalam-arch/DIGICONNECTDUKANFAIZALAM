import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { isMissingTable, schemeToRow } from "@/lib/labour/rows";
import { SEED_SCHEMES } from "@/lib/labour/seed-schemes";

describe("schemeToRow", () => {
  it("writes every column the page reads back", () => {
    /*
      The drift this guards against is specific and has bitten before: the
      writer stops setting a column, the reader keeps selecting it, and the
      page renders an empty summary or loses its warnings with no error
      anywhere. Reading the select list out of the repository rather than
      restating it here means adding a column to one and not the other fails.
    */
    const source = readFileSync("src/lib/labour/repository.ts", "utf8");
    const match = source.match(/const COLUMNS\s*=\s*\n?\s*"([^"]+)"/);
    expect(match, "COLUMNS not found in repository.ts").toBeTruthy();

    const read = match![1].split(",").map((column) => column.trim());
    const written = new Set(Object.keys(schemeToRow(SEED_SCHEMES[0])));
    expect(read.filter((column) => !written.has(column))).toEqual([]);
  });

  it("turns an empty verification date into null, not an empty string", () => {
    // `verified_on` is a date column. "" is not a date, and Postgres rejects
    // the whole upsert rather than the one field.
    const scheme = SEED_SCHEMES[0];
    const row = schemeToRow({
      ...scheme,
      verification: { ...scheme.verification, verifiedOn: "" },
    });
    expect(row.verified_on).toBeNull();
  });

  it("keeps a real verification date", () => {
    const scheme = SEED_SCHEMES.find((entry) => entry.verification.verifiedOn);
    expect(scheme).toBeTruthy();
    expect(schemeToRow(scheme!).verified_on).toBe(scheme!.verification.verifiedOn);
  });

  it("never leaves an absent list undefined", () => {
    const scheme = SEED_SCHEMES[0];
    const row = schemeToRow({ ...scheme, warnings: undefined });
    expect(row.warnings).toEqual([]);
  });

  it("maps every seed scheme without throwing", () => {
    expect(SEED_SCHEMES.map(schemeToRow)).toHaveLength(SEED_SCHEMES.length);
  });
});

describe("isMissingTable", () => {
  it("recognises the Postgres and PostgREST forms", () => {
    expect(isMissingTable({ code: "42P01" })).toBe(true);
    expect(isMissingTable({ code: "PGRST205" })).toBe(true);
    expect(isMissingTable({ message: 'relation "public.labour_schemes" does not exist' })).toBe(true);
    expect(
      isMissingTable({ message: "Could not find the table 'public.labour_schemes' in the schema cache" }),
    ).toBe(true);
  });

  it("does not mistake an ordinary failure for a missing table", () => {
    // Answering "run the migration" to a permission error sends an
    // administrator to re-run SQL that is already applied.
    expect(isMissingTable(null)).toBe(false);
    expect(isMissingTable({ code: "42501", message: "permission denied for table labour_schemes" })).toBe(
      false,
    );
    expect(isMissingTable({ message: "network error" })).toBe(false);
  });
});
