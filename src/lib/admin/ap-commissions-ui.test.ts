import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import { flattenAdminNav, getAdminWorkspace } from "@/lib/admin/nav";

const root = process.cwd();
const readSrc = (rel: string) => readFileSync(join(root, rel), "utf8");

describe("partner commissions admin nav", () => {
  it("exposes the partner commission screen alongside the legacy one", () => {
    const hrefs = flattenAdminNav().map((item) => item.href);
    expect(hrefs).toContain("/admin/ap-commissions");
    // The legacy agent ledger drives a different table and must stay reachable.
    expect(hrefs).toContain("/admin/commissions");
  });

  it("labels the two ledgers distinctly so they cannot be confused", () => {
    // Both ledgers sit in the partner workspace now; the customer workspace's
    // Money group is what the shop takes from customers.
    const earnings = getAdminWorkspace("partner").groups.find((g) => g.id === "earnings");
    const labels = (earnings?.items ?? []).map((i) => i.label);
    expect(labels).toContain("Partner Commissions");
    expect(labels).toContain("Agent Commissions");
  });
});

describe("partner commissions page", () => {
  const page = readSrc("src/app/admin/ap-commissions/page.tsx");
  const actions = readSrc("src/components/admin/ap-commission-actions.tsx");
  const data = readSrc("src/lib/admin/ap-commissions-data.ts");

  it("is admin-guarded", () => {
    expect(page).toContain("isAdminRole");
    expect(page).toContain('redirect("/dashboard")');
  });

  it("posts to the ap-commissions route, not the legacy commissions route", () => {
    expect(actions).toContain("/api/admin/ap-commissions/");
    expect(actions).not.toContain("/api/admin/commissions/");
  });

  it("offers only transitions that make sense from the current status", () => {
    const fn = actions.slice(actions.indexOf("function actionsFor"), actions.indexOf("const TONE_CLASS"));
    expect(fn).toMatch(/"pending"[\s\S]{0,80}APPROVE/);
    // A paid commission cannot be approved again.
    expect(fn).toMatch(/status === "paid"\) return \[REVERSE\]/);
  });

  it("confirms before a transition that claws money back", () => {
    expect(actions).toContain("window.confirm");
    expect(actions).toMatch(/tone === "revoke"/);
  });

  it("reads wallet credit state from the ledger rather than inferring it", () => {
    // A commission marked approved whose credit failed must be visible, not
    // assumed settled from its status alone.
    expect(data).toContain("creditedToWallet");
    expect(data).toContain('eq("entry_type", "commission_credit")');
    expect(page).toContain("Not in wallet");
  });

  it("summarises pending, approved and paid money", () => {
    expect(data).toContain("pendingAmount");
    expect(data).toContain("approvedAmount");
    expect(data).toContain("paidAmount");
  });
});
