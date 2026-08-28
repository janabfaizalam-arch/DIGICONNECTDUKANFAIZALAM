import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import { CUSTOMER_SECTIONS, LEGACY_TAB_SECTION, resolveSection, sectionHref } from "@/lib/customer/sections";

const root = process.cwd();

describe("customer portal sections", () => {
  it("resolves every section to itself", () => {
    for (const section of CUSTOMER_SECTIONS) {
      expect(resolveSection(section)).toBe(section);
    }
  });

  it("keeps every old tab name working", () => {
    expect(resolveSection("dashboard")).toBe("home");
    expect(resolveSection("referral")).toBe("wallet");
    // Documents stopped being a section: a filing's paperwork lives on the
    // filing. Both old names land on the list that holds those filings.
    expect(resolveSection("documents")).toBe("applications");
    expect(resolveSection("vault")).toBe("applications");
    expect(resolveSection("support")).toBe("help");
    expect(resolveSection("profile")).toBe("account");
  });

  it("falls back to home for anything unexpected", () => {
    expect(resolveSection(null)).toBe("home");
    expect(resolveSection("")).toBe("home");
    expect(resolveSection("  ")).toBe("home");
    expect(resolveSection("nonsense")).toBe("home");
    expect(resolveSection("../../etc/passwd")).toBe("home");
  });

  it("is case-insensitive, because the value comes from a URL", () => {
    expect(resolveSection("PROFILE")).toBe("account");
    expect(resolveSection("Wallet")).toBe("wallet");
  });

  it("leaves the home URL without a query parameter", () => {
    expect(sectionHref("home")).toBe("/customer/dashboard");
    expect(sectionHref("wallet")).toBe("/customer/dashboard?tab=wallet");
  });

  /**
   * The links that already exist elsewhere in the app must land somewhere
   * real. The bottom navigation and the site header were written against the
   * old eight tabs and are not part of this change.
   */
  it("covers every ?tab= value the rest of the app links to", () => {
    const sources = ["src/components/bottom-nav.tsx", "src/components/site-header.tsx"]
      .map((rel) => readFileSync(join(root, rel), "utf8"))
      .join("\n");

    const linked = new Set(
      [...sources.matchAll(/\/customer\/dashboard\?tab=([a-z-]+)/g)].map((match) => match[1]),
    );

    expect(linked.size).toBeGreaterThan(0);
    for (const tab of linked) {
      const known = (CUSTOMER_SECTIONS as readonly string[]).includes(tab) || tab in LEGACY_TAB_SECTION;
      expect(known, `?tab=${tab} is linked but resolves to nothing`).toBe(true);
    }
  });
});
