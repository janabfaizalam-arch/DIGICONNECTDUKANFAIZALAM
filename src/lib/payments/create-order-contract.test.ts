import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  resolveApplicationSourceEnum,
  resolveSourceChannel,
  rupeesToPaise,
} from "./application-source";

describe("DC Partner payment preparation contract", () => {
  it("maps ITR Original ₹999 to 99900 paise server-side", () => {
    expect(rupeesToPaise(999)).toBe(99900);
  });

  it("never trusts a client-supplied amount for partner enum mapping", () => {
    // Partner prepare flow always uses agent_pos regardless of client price.
    expect(resolveApplicationSourceEnum(true)).toBe("agent_pos");
    expect(resolveSourceChannel({ isPartnerFlow: true })).toBe("agency_partner");
  });

  it("create-order uses membership-safe portal hint and enum helpers", () => {
    const contents = readFileSync(join(process.cwd(), "src/app/api/create-order/route.ts"), "utf8");
    expect(contents).toContain("getPartnerMembership");
    expect(contents).toContain("resolveApplicationSourceEnum");
    expect(contents).toContain("rupeesToPaise");
    expect(contents).toContain("application_source_enum_mismatch");
    expect(contents).toContain("razorpay_not_configured");
    expect(contents).toContain("already_paid");
    expect(contents.includes(`source: ap?.id ? "agency_partner"`)).toBe(false);
  });

  it("partner wizard marks portal=ap and does not send client amount as authority", () => {
    const contents = readFileSync(join(process.cwd(), "src/components/portal/partner-application-wizard.tsx"), "utf8");
    expect(contents).toContain(`portal:   "ap"`);
    expect(contents).toContain("Retry Payment");

    // The wizard never tells the server what to charge. It sends the service
    // slugs and reads the amount back; a client-supplied `amount` here would
    // be a price the customer could edit.
    expect(contents).not.toMatch(/body: JSON\.stringify\(\{\s*\n\s*amount:/);
    expect(contents).toContain("serviceSlugs: slugs");

    // Card checkout still waits for Razorpay's script before it can open.
    expect(contents).toContain("!isScriptReady");
  });

  it("partner wizard prepares the payment on arrival, with no Generate step", () => {
    const contents = readFileSync(join(process.cwd(), "src/components/portal/partner-application-wizard.tsx"), "utf8");

    // Reaching the payment step creates the applications, the order and the
    // link, so the QR is on screen without the partner pressing anything.
    expect(contents).toContain("preparePayment");
    expect(contents).toContain("if (currentStep !== 5) return;");
    expect(contents).toContain("preparedSignatureRef.current === paymentSignature");

    // The method toggle and its Generate button are gone.
    expect(contents).not.toContain("paymentMethodType");
    expect(contents).not.toContain("Generate Payment Link");

    // Card checkout reuses the prepared order rather than making a second one.
    expect(contents).toContain("preparedOrder?.orderId");
    expect(contents).toContain("openRazorpayCheckout(");
  });

  it("payment-links generate uses membership-first AP authorization", () => {
    const contents = readFileSync(join(process.cwd(), "src/app/api/payment-links/generate/route.ts"), "utf8");
    expect(contents).toContain("getPartnerMembership");
    expect(contents).toContain("agency_partner_id");
  });

  /*
    The customer waits through every one of these with the checkout still
    closed, and the database is not in the same region as this function, so a
    round trip is expensive. Independent lookups must not go back to running
    one after the other.
  */
  describe("nothing independent waits its turn", () => {
    const source = readFileSync(join(process.cwd(), "src/app/api/create-order/route.ts"), "utf8");

    it("asks for the referral, the partner and the membership together", () => {
      expect(source).toContain("const [referralResult, ap, partnerMembership] = await Promise.all(");
    });

    it("prices a whole cart in one round trip, not one per service", () => {
      expect(source).toContain("await Promise.all(serviceSlugs.map((slug) => getAgentServiceBySlug(slug)))");
      // The old shape: a lookup awaited inside the loop over the cart.
      expect(source).not.toContain("for (const slug of serviceSlugs) {");
    });

    it("links the order, writes the pending payment and enqueues CRM together", () => {
      expect(source).toContain(
        "const [{ error: applicationUpdateError }, { error: paymentInsertError }] = await Promise.all(",
      );
      expect(source).toContain('scheduleCrmSyncMany(applicationIds, "application_created")');
    });
  });
});
