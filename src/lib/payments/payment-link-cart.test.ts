import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

/**
 * A payment link covers a whole cart.
 *
 * A wizard run with two services creates two applications, but a link used to
 * carry one `application_id`, so it charged for the first service while the
 * partner was shown the cart total and the customer underpaid. Four files have
 * to agree for that not to happen again, and each is pinned here: the wizard
 * sends every application, generation prices every application, checkout
 * settles every application, and settlement finds a link through its cart.
 */

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("the wizard", () => {
  const source = read("src/components/portal/partner-application-wizard.tsx");

  it("sends the whole cart to link generation, not its first application", () => {
    expect(source).toContain("applicationIds: orderData.application_ids");
    expect(source).not.toContain("applicationId: orderData.application_ids[0]");
  });

  it("reports the amount the server priced, not the cart total it guessed", () => {
    expect(source).toContain("Number(linkData.amount ?? cartTotal)");
  });
});

describe("link generation", () => {
  const source = read("src/app/api/payment-links/generate/route.ts");

  it("prices every application in the cart", () => {
    expect(source).toContain("applications.reduce(");
    expect(source).toContain("amount: totalAmount");
  });

  it("records every application against the link", () => {
    expect(source).toContain('from("payment_link_applications").insert');
  });

  it("still accepts a single application", () => {
    expect(source).toContain("payload.applicationId");
  });

  it("refuses a cart spanning two customers", () => {
    expect(source).toContain("customerIds.size > 1");
  });
});

describe("order creation", () => {
  const source = read("src/app/api/create-order/route.ts");

  it("accepts several applications and sums what they owe", () => {
    expect(source).toContain("body?.applicationIds?.length");
    expect(source).toContain("applications.reduce(");
  });

  it("treats a partial match as not found, never as a smaller order", () => {
    expect(source).toContain("applicationRows.length !== requestedIds.length");
  });
});

describe("settlement", () => {
  it("finds links through the cart table, in both payment paths", () => {
    for (const path of [
      "src/app/api/verify-payment/route.ts",
      "src/app/api/razorpay/webhook/route.ts",
    ]) {
      const source = read(path);
      expect(source).toContain("markPaymentLinksPaid");
      // The old per-application lookup could not see a link whose primary
      // application was a different one in the same cart.
      expect(source).not.toMatch(/from\("payment_links"\)[\s\S]{0,120}\.eq\("application_id"/);
    }
  });

  it("still settles links written before the cart table existed", () => {
    const source = read("src/lib/payments/mark-payment-links-paid.ts");
    expect(source).toContain('from("payment_links").select("id").in("application_id", ids)');
  });
});

describe("the customer's page", () => {
  it("is told every service the link charges for", () => {
    expect(read("src/app/api/payment-links/details/route.ts")).toContain(
      'from("payment_link_applications")',
    );
    expect(read("src/app/pay/[code]/page.tsx")).toContain("details.services.map");
  });
});

describe("the migration", () => {
  const source = read("supabase/migrations/20260924160000_payment_links_multi_application.sql");

  it("creates the cart table and backfills every existing link into it", () => {
    expect(source).toContain("CREATE TABLE IF NOT EXISTS public.payment_link_applications");
    expect(source).toContain("INSERT INTO public.payment_link_applications");
  });

  it("releases the constraint that allowed only one link per application", () => {
    expect(source).toContain("DROP CONSTRAINT");
    expect(source).toContain("con.contype = 'u'");
  });

  it("protects the new table with row level security", () => {
    expect(source).toContain("ALTER TABLE public.payment_link_applications ENABLE ROW LEVEL SECURITY");
    expect(source).toContain("CREATE POLICY");
  });
});
