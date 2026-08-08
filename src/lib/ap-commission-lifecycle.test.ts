import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import { AP_COMMISSION_STATUSES, isApCommissionStatus } from "@/lib/ap-commission-engine";

const root = process.cwd();
const readSrc = (rel: string) => readFileSync(join(root, rel), "utf8");

describe("AP commission status vocabulary", () => {
  it("matches the ap_commissions check constraint", () => {
    // Drift here means the API accepts a status the database will reject.
    const migration = readSrc("supabase/migrations/20260527140000_agency_partner_ecosystem.sql");
    const block = migration.slice(migration.indexOf("create table if not exists public.ap_commissions"));
    for (const status of AP_COMMISSION_STATUSES) {
      expect(block).toContain(`'${status}'`);
    }
  });

  it("rejects statuses outside the vocabulary", () => {
    expect(isApCommissionStatus("approved")).toBe(true);
    expect(isApCommissionStatus("paid")).toBe(true);
    expect(isApCommissionStatus("settled")).toBe(false);
    expect(isApCommissionStatus("")).toBe(false);
    expect(isApCommissionStatus(null)).toBe(false);
  });
});

describe("earn → wallet → payout chain is wired", () => {
  const engine = readSrc("src/lib/ap-commission-engine.ts");
  const wallet = readSrc("src/lib/ap-wallet.ts");
  const route = readSrc("src/app/api/admin/ap-commissions/[id]/route.ts");

  it("approving a commission credits the partner wallet", () => {
    // The original gap: ap_commissions rows were created and displayed, but
    // creditCommission had no caller, so a partner's balance never grew.
    expect(engine).toContain("setApCommissionStatus");
    expect(engine).toContain("creditCommission");
    expect(engine).toMatch(/CREDITED_STATUSES[\s\S]{0,120}"approved"/);
  });

  it("revoking a credited commission claws the money back", () => {
    expect(engine).toContain("reverseCommissionCredit");
    expect(engine).toMatch(/REVOKED_STATUSES[\s\S]{0,120}"cancelled"/);
  });

  it("settles the wallet before writing the status", () => {
    // Otherwise a wallet failure would leave a commission marked paid with no
    // money moved.
    const body = engine.slice(engine.indexOf("export async function setApCommissionStatus"));
    expect(body.indexOf("creditCommission({")).toBeLessThan(body.indexOf('.update(updates)'));
  });

  it("credits and reversals are idempotent per commission", () => {
    expect(wallet).toContain("findLedgerEntryByReference");
    const credit = wallet.slice(
      wallet.indexOf("export async function creditCommission"),
      wallet.indexOf("export async function reverseCommissionCredit"),
    );
    expect(credit).toContain("deduped: true");
  });

  it("is reachable through an admin-guarded route", () => {
    expect(route).toContain("isAdminRole");
    expect(route).toContain("setApCommissionStatus");
    expect(route).toContain("isApCommissionStatus");
  });
});

describe("payout safety", () => {
  const wallet = readSrc("src/lib/ap-wallet.ts");
  const migration = readSrc("supabase/migrations/20260808050000_ap_payout_concurrency_guard.sql");

  it("rejects non-positive payout amounts", () => {
    const debit = wallet.slice(wallet.indexOf("export async function debitPayout"));
    expect(debit).toMatch(/amount <= 0/);
  });

  it("refuses to spend against an unreadable balance", () => {
    // getWalletBalance returns 0 on failure, which would silently reject or
    // mis-approve; the spend path must check ok explicitly.
    const debit = wallet.slice(wallet.indexOf("export async function debitPayout"));
    expect(debit).toContain("calculateWalletBalance");
    expect(debit).toMatch(/if \(!current\.ok\)/);
  });

  it("never writes running_balance from a failed balance read", () => {
    const append = wallet.slice(
      wallet.indexOf("async function appendLedgerEntry"),
      wallet.indexOf("export async function creditCommission"),
    );
    expect(append).toMatch(/if \(!current\.ok\)/);
  });

  it("pages the ledger instead of relying on one capped response", () => {
    expect(wallet).toContain("LEDGER_PAGE_SIZE");
    expect(wallet).toMatch(/\.range\(from, from \+ LEDGER_PAGE_SIZE - 1\)/);
  });

  it("has a database guarantee of one active payout per partner", () => {
    expect(migration).toContain("ap_payouts_one_active_per_partner_idx");
    expect(migration).toMatch(/where status in \('requested', 'processing'\)/);
    expect(migration).toContain("ap_payouts_amount_positive_chk");
  });

  it("surfaces the unique violation as a friendly message", () => {
    const debit = wallet.slice(wallet.indexOf("export async function debitPayout"));
    expect(debit).toContain("23505");
    expect(debit).toContain("already have an active payout request");
  });
});
