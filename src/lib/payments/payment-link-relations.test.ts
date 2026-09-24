import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative, sep } from "path";
import { describe, expect, it } from "vitest";

import { attachPaymentLinkRelations } from "./payment-link-relations";

/**
 * Two foreign keys run between `payment_links` and `applications`
 * (`payment_links.application_id` and `applications.payment_link_id`), and
 * `payment_links.customer_id` points at `auth.users`, not `public.profiles`.
 * PostgREST answers either situation by failing the whole query, so a select
 * that embeds those tables returns no rows at all — and a customer holding a
 * perfectly good link is told it does not exist.
 *
 * These tests pin both halves: the helper's behaviour, and the fact that no
 * `payment_links` query anywhere reaches for an embed again.
 */

type Row = { id: string; [key: string]: unknown };

/** A Supabase stand-in that records what was asked of it. */
function fakeClient(tables: Record<string, Row[]>, failing = new Set<string>()) {
  const selects: { table: string; columns: string; ids: string[] }[] = [];

  const client = {
    selects,
    from(table: string) {
      return {
        select(columns: string) {
          return {
            in(_column: string, ids: string[]) {
              selects.push({ table, columns, ids });
              if (failing.has(table)) {
                return Promise.resolve({ data: null, error: { message: "boom" } });
              }
              return Promise.resolve({
                data: (tables[table] ?? []).filter((row) => ids.includes(row.id)),
                error: null,
              });
            },
          };
        },
      };
    },
  };

  // The helper only needs `.from().select().in()`; the rest of the client type
  // is irrelevant to what is under test.
  return client as unknown as Parameters<typeof attachPaymentLinkRelations>[0] & {
    selects: typeof selects;
  };
}

const TABLES = {
  applications: [{ id: "app-1", service_name: "PAN Card", status: "submitted" }],
  profiles: [{ id: "cust-1", full_name: "Asha Devi", mobile: "9000000000" }],
  agency_partners: [{ id: "ap-1", full_name: "Faizalam" }],
};

describe("attachPaymentLinkRelations", () => {
  it("shapes relations like the embeds it replaces", async () => {
    const client = fakeClient(TABLES);

    const [link] = await attachPaymentLinkRelations(client, [
      { code: "APL-1", application_id: "app-1", customer_id: "cust-1", partner_id: "ap-1" },
    ]);

    expect(link.code).toBe("APL-1");
    expect(link.applications?.service_name).toBe("PAN Card");
    expect(link.profiles?.full_name).toBe("Asha Devi");
    expect(link.agency_partners?.full_name).toBe("Faizalam");
  });

  it("looks each relation up by primary key, never by relationship", async () => {
    const client = fakeClient(TABLES);

    await attachPaymentLinkRelations(client, [
      { application_id: "app-1", customer_id: "cust-1", partner_id: "ap-1" },
    ]);

    expect(client.selects.map((s) => s.table).sort()).toEqual([
      "agency_partners",
      "applications",
      "profiles",
    ]);
    for (const select of client.selects) {
      expect(select.columns).not.toMatch(/\(/);
    }
  });

  it("batches one query per table however many links there are", async () => {
    const client = fakeClient(TABLES);

    await attachPaymentLinkRelations(client, [
      { application_id: "app-1", customer_id: "cust-1", partner_id: "ap-1" },
      { application_id: "app-1", customer_id: "cust-1", partner_id: "ap-1" },
      { application_id: "app-1", customer_id: "cust-1", partner_id: "ap-1" },
    ]);

    expect(client.selects).toHaveLength(3);
    expect(client.selects.every((s) => s.ids.length === 1)).toBe(true);
  });

  it("keeps the link when a name is missing or its lookup fails", async () => {
    const client = fakeClient(TABLES, new Set(["profiles"]));

    const [link] = await attachPaymentLinkRelations(client, [
      { code: "APL-2", application_id: "gone", customer_id: "cust-1", partner_id: null },
    ]);

    expect(link.code).toBe("APL-2");
    expect(link.applications).toBeNull();
    expect(link.profiles).toBeNull();
    expect(link.agency_partners).toBeNull();
  });

  it("asks nothing of the database for an empty list", async () => {
    const client = fakeClient(TABLES);

    await expect(attachPaymentLinkRelations(client, null)).resolves.toEqual([]);
    expect(client.selects).toHaveLength(0);
  });
});

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...listSourceFiles(full));
    } else if (/\.tsx?$/.test(entry) && !entry.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

describe("payment_links queries", () => {
  it("never embeds a related table", () => {
    const root = process.cwd();
    const offenders: string[] = [];

    for (const file of listSourceFiles(join(root, "src"))) {
      // The helper's own doc comment quotes the bad query to explain it.
      if (file.endsWith("payment-link-relations.ts")) continue;

      const source = readFileSync(file, "utf8");
      // `.from("payment_links")` followed by its `.select(...)`, backtick or
      // quoted, before the next `.from(`.
      const pattern = /\.from\(\s*["'`]payment_links["'`]\s*\)([\s\S]*?)\.select\(\s*(`[^`]*`|"[^"]*"|'[^']*')/g;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(source))) {
        const columns = match[2];
        if (/\w\s*\(/.test(columns.slice(1, -1))) {
          offenders.push(`${relative(root, file).split(sep).join("/")}: ${columns}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
