import { readdirSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { readCode } from "@/lib/testing/source";

const root = process.cwd();
const APPLY = "src/components/apply";

const code = readCode;

const hook = code(`${APPLY}/use-apply-flow.ts`);
const shell = code(`${APPLY}/apply-flow.tsx`);
const shared = code(`${APPLY}/shared.ts`);

/**
 * The apply flow was one 1,781-line client component holding six steps of
 * markup wrapped around the cart, the catalogue, validation, a camera, uploads
 * and the Razorpay handshake. Redesigning it meant replacing every line of
 * markup — including the markup wrapped around payment code, which is the one
 * part of the app where a careless change costs a customer money.
 */
describe("the apply flow keeps its behaviour out of its markup", () => {
  it("holds the payment handshake in the hook, not in a screen", () => {
    for (const marker of ["/api/create-order", "/api/verify-payment", "/api/applications"]) {
      expect(hook, `${marker} must live in the hook`).toContain(marker);
    }

    for (const file of readdirSync(join(root, APPLY))) {
      if (!file.startsWith("step-")) continue;
      const step = code(`${APPLY}/${file}`);
      expect(step, `${file} must not talk to the payment or submission APIs`).not.toMatch(
        /\/api\/(create-order|verify-payment|applications)/,
      );
    }
  });

  /**
   * The server re-prices the basket and refuses a payment whose amount does
   * not match. Losing that check would mean trusting a total the browser
   * computed.
   */
  it("still refuses a payment whose amount does not match the basket", () => {
    expect(hook).toContain("Payment amount mismatch detected");
    expect(hook).toMatch(/reviewTotal !== backendTotal \|\| backendTotal !== razorpayAmount/);
  });

  it("still logs every stage of the handshake", () => {
    for (const stage of ["ORDER_CREATE", "RAZORPAY_OPEN", "PAYMENT_DONE", "VERIFY", "FINALIZE"]) {
      expect(hook, `the ${stage} breadcrumb is what tells us how far a failed payment got`).toContain(stage);
    }
  });

  /**
   * Statically imported children share the route chunk, so without this the
   * form, the camera-backed uploader, the review and the payment panel all
   * ship to somebody who opened Apply to browse and left.
   */
  it("loads the steps after the first on demand", () => {
    expect(shell).toMatch(/const StepCustomer = dynamic\(/);
    expect(shell).toMatch(/const StepDocuments = dynamic\(/);
    expect(shell).toMatch(/const StepReview = dynamic\(/);
    expect(shell).toMatch(/const StepPayment = dynamic\(/);
    expect(shell).toMatch(/const StepDone = dynamic\(/);
    // The picker is where everyone lands, so deferring it would only cost a
    // round trip.
    expect(shell).toMatch(/import \{ StepServices \} from/);
  });

  /**
   * The screen opened with its title twice — once in white on the brand field
   * and again in ink directly underneath — because the header and the step
   * each rendered their own.
   */
  it("names each step in exactly one place", () => {
    expect(shared).toMatch(/title: "What do you need\?"/);
    for (const file of readdirSync(join(root, APPLY))) {
      if (!file.startsWith("step-")) continue;
      expect(code(`${APPLY}/${file}`), `${file} must not render its own heading`).not.toContain(
        "PortalHeading",
      );
    }
  });

  it("uses the lazy motion bundle", () => {
    expect(shell).toContain("LazyMotion");
    expect(shell).toContain("domAnimation");
    expect(shell).not.toMatch(/\bmotion\.[a-z]/);
  });
});
