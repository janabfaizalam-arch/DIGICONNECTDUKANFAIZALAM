import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import { payoutForAgentService } from "@/lib/agent-services";

const root = process.cwd();
const readSrc = (rel: string) => readFileSync(join(root, rel), "utf8");

const settlement = readSrc("src/lib/ap-commission-settlement.ts");
const wallet = readSrc("src/lib/ap-wallet.ts");
const apRoute = readSrc("src/app/api/ap/applications/[id]/transition/route.ts");
const adminRoute = readSrc("src/app/api/admin/applications/[id]/route.ts");

describe("what a partner is shown is what they are paid", () => {
  it("computes the service card payout the same way the AP panel renders it", () => {
    // The "+₹50 earn" badge and the settlement amount must not drift apart.
    expect(
      payoutForAgentService({ customer_fee: 1199, agent_payout: 400, payout_type: "fixed", payout_percentage: 0 }),
    ).toBe(400);
    expect(
      payoutForAgentService({ customer_fee: 2500, agent_payout: 0, payout_type: "percentage", payout_percentage: 20 }),
    ).toBe(500);
  });

  it("prefers the snapshot taken when the partner sold it", () => {
    // Editing a service's payout later must not retroactively change what an
    // already-sold application pays.
    const body = settlement.slice(settlement.indexOf("export async function resolveCommissionAmount"));
    const snapshotAt = body.indexOf("application_snapshot");
    const serviceAt = body.indexOf("service_payout");
    const ruleAt = body.indexOf("commission_rule\"");

    expect(snapshotAt).toBeGreaterThan(-1);
    expect(serviceAt).toBeGreaterThan(snapshotAt);
    expect(ruleAt).toBeGreaterThan(serviceAt);
  });

  it("falls back to commission rules only after the service payout", () => {
    // The rules table is the safety net, not the primary source — a service
    // with a configured payout must never be overridden by a global rule.
    expect(settlement).toContain("payoutForAgentService");
    expect(settlement).toContain("calculateCommission");
    expect(settlement.indexOf("payoutForAgentService")).toBeLessThan(
      settlement.indexOf("await calculateCommission("),
    );
  });
});

describe("completion cannot pay the same commission twice", () => {
  it("credits through creditCommission rather than writing the ledger by hand", () => {
    // The original bug: the inline credit wrote reference_id = commission
    // transaction id, while creditCommission and reverseCommissionCredit both
    // look up by the ap_commissions id. Nothing matched, so an admin approving
    // afterwards paid again and cancelling clawed nothing back.
    expect(settlement).toContain("creditCommission({");
    expect(settlement).toContain("commissionId,");
    expect(settlement).not.toContain('entry_type: "commission_credit"');
    expect(settlement).not.toContain("running_balance");
  });

  it("keeps creditCommission keyed on the commission id", () => {
    const credit = wallet.slice(
      wallet.indexOf("export async function creditCommission"),
      wallet.indexOf("export async function reverseCommissionCredit"),
    );
    expect(credit).toContain('"commission"');
    expect(credit).toContain("params.commissionId");
    expect(credit).toContain("deduped: true");
  });

  it("reuses an existing commission row instead of inserting a second one", () => {
    const body = settlement.slice(settlement.indexOf("export async function settleCommissionForCompletedApplication"));
    expect(body).toContain('.eq("application_id", params.applicationId)');
    expect(body).toContain("existing?.id");
    // A concurrent completion losing the insert race must adopt the winner's row.
    expect(body).toContain("23505");
  });

  it("reports whether the wallet actually moved", () => {
    // A repeat completion returns walletChanged: false, so callers do not
    // announce a credit that never happened.
    expect(settlement).toContain("walletChanged: !credited.deduped");
  });
});

describe("both completion paths settle", () => {
  it("the AP transition route delegates to the shared settlement", () => {
    expect(apRoute).toContain("settleCommissionForCompletedApplication");
    expect(apRoute).toContain('nextStep === "completed"');
  });

  it("the AP route no longer writes the wallet ledger itself", () => {
    // ~200 lines of inline rule-matching and hand-rolled ledger writes are what
    // made the double-credit possible.
    expect(apRoute).not.toContain('from("ap_wallet_ledger")');
    expect(apRoute).not.toContain("running_balance:");
    expect(apRoute).not.toContain('from("commission_transactions")');
  });

  it("admin completion settles too", () => {
    // Completing from the admin panel used to skip partner commissions
    // entirely, so a sale closed by an admin earned the partner nothing.
    expect(adminRoute).toContain("settleCommissionForCompletedApplication");
    expect(adminRoute).toContain('nextStatus === "completed"');
  });
});

describe("a zero payout is reported, not swallowed", () => {
  it("warns and names the fix when nothing prices the sale", () => {
    const body = settlement.slice(settlement.indexOf("if (resolved.amount <= 0)"));
    expect(body.slice(0, 800)).toContain("zero_commission_not_settled");
    expect(body.slice(0, 800)).toContain("/admin/commission-rules");
  });

  it("distinguishes 'nothing to settle' from failure", () => {
    // A non-partner application is not an error, and must not be retried or
    // logged as one.
    expect(settlement).toContain("settled: false");
    expect(settlement).toContain("ok: true, settled: false");
  });
});
