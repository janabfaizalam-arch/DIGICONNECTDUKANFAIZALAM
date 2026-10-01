import crypto from "crypto";

import { describe, expect, it } from "vitest";

import { readCode } from "@/lib/testing/source";
import {
  bankFingerprint,
  classifyPayoutFailure,
  outcomeForRazorpayStatus,
  resolvePayoutMode,
  redactPayoutSecrets,
  validateBankDetails,
  verifyPayoutWebhook,
} from "@/lib/payouts/razorpayx";
import { PAYOUT_STATUSES } from "@/lib/ap-payout-transitions";
import { autoCreditLimit } from "@/lib/ap-commission-settlement";

const lib = readCode("src/lib/payouts/razorpayx.ts");
const dispatch = readCode("src/lib/payouts/dispatch.ts");
const webhook = readCode("src/app/api/razorpayx/webhook/route.ts");
const wallet = readCode("src/lib/ap-wallet.ts");
const walletRoute = readCode("src/app/api/ap/wallet/route.ts");
const migration = readCode("supabase/migrations/20261001090000_ap_payouts_razorpayx.sql");

/* ─────────────────────────────────────────────────────────────────────────
   The bug this shipped with: 'rejected' was not a legal status
   ───────────────────────────────────────────────────────────────────────── */

describe("every status the code writes is one the database accepts", () => {
  const original = readCode("supabase/migrations/20260527140000_agency_partner_ecosystem.sql");

  it("the original constraint really did omit 'rejected'", () => {
    // Pinning the bug so the fix below cannot be read as belt-and-braces.
    const block = original.slice(original.indexOf("create table if not exists public.ap_payouts"));
    const check = block.slice(0, block.indexOf(");"));
    expect(check).toContain("'requested'");
    expect(check).not.toContain("'rejected'");
  });

  it("the new constraint allows every PAYOUT_STATUSES value", () => {
    const check = migration.slice(migration.indexOf("add constraint ap_payouts_status_check"));
    for (const status of PAYOUT_STATUSES) {
      expect(check, `${status} is not allowed by the constraint`).toContain(`'${status}'`);
    }
  });

  it("keeps the statuses older rows may already carry", () => {
    const check = migration.slice(migration.indexOf("add constraint ap_payouts_status_check"));
    for (const legacy of ["failed", "cancelled"]) {
      expect(check).toContain(`'${legacy}'`);
    }
  });
});

describe("a refund cannot be applied twice", () => {
  it("reverseEntry dedupes on the entry it reverses", () => {
    // Without this, the failed status write above meant every retry of a
    // rejection credited the partner again for the same withdrawal.
    const body = wallet.slice(
      wallet.indexOf("export async function reverseEntry"),
      wallet.indexOf("export async function debitPayout"),
    );
    expect(body).toContain("findLedgerEntryByReference");
    expect(body).toContain("deduped: true");
    expect(body.indexOf("findLedgerEntryByReference")).toBeLessThan(body.indexOf("appendLedgerEntry"));
  });

  it("only the webhook refunds, so two paths cannot both pay it back", () => {
    // `readCode` strips comments on purpose, so this asserts on the code: the
    // dispatcher has no refund call at all, and the webhook has exactly one.
    expect(dispatch).not.toContain("reverseEntry");
    expect(dispatch).not.toContain("manualCredit");
    expect(webhook.match(/reverseEntry\(/g) ?? []).toHaveLength(1);
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Money does not move by accident
   ───────────────────────────────────────────────────────────────────────── */

describe("payouts are off unless switched on", () => {
  it("only the exact word 'auto' sends money", () => {
    expect(resolvePayoutMode("auto")).toBe("auto");
    expect(resolvePayoutMode("  AUTO ")).toBe("auto");
    for (const value of ["", undefined, "disabled", "on", "true", "1", "Auto!", "automatic"]) {
      expect(resolvePayoutMode(value as string | undefined), `${String(value)} should not enable payouts`).toBe(
        "disabled",
      );
    }
  });

  it("a failed dispatch leaves the request for an admin rather than failing it", () => {
    expect(walletRoute).toContain("dispatchPayout");
    expect(walletRoute).toContain("Payout request submitted successfully.");
  });
});

describe("the keys that can move money", () => {
  it("live in their own variables, not the payment gateway's", () => {
    expect(lib).toContain("RAZORPAYX_KEY_ID");
    expect(lib).not.toContain("RAZORPAY_KEY_ID");
    expect(lib).toContain('import "server-only"');
  });

  it("are redacted before anything is logged", () => {
    const env = {
      RAZORPAYX_KEY_ID: "rzp_live_SECRETKEY123",
      RAZORPAYX_KEY_SECRET: "topsecretvalue",
      RAZORPAYX_ACCOUNT_NUMBER: "2323230099089",
    } as unknown as NodeJS.ProcessEnv;

    const dirty = "failed for rzp_live_SECRETKEY123 with topsecretvalue on 2323230099089";
    const clean = redactPayoutSecrets(dirty, env);
    expect(clean).not.toContain("rzp_live_SECRETKEY123");
    expect(clean).not.toContain("topsecretvalue");
    expect(clean).not.toContain("2323230099089");
  });

  it("the dispatcher logs only through the redactor", () => {
    const logs = dispatch.match(/console\.error\([\s\S]{0,400}?\)/g) ?? [];
    expect(logs.length).toBeGreaterThan(0);
    for (const log of logs) {
      if (log.includes("error:")) expect(log).toContain("redactPayoutSecrets");
    }
  });
});

describe("a retry cannot pay twice", () => {
  it("sends an idempotency key, and it is our own payout row", () => {
    expect(lib).toContain("X-Payout-Idempotency");
    expect(dispatch).toContain("idempotencyKey: input.payoutId");
  });

  it("the database refuses two rows for one Razorpay payout", () => {
    expect(migration).toContain("ap_payouts_razorpayx_payout_id_key");
    expect(migration).toContain("where razorpayx_payout_id is not null");
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Reading what Razorpay said
   ───────────────────────────────────────────────────────────────────────── */

describe("outcomeForRazorpayStatus", () => {
  it("treats a reversal as a failure, not as paid", () => {
    // The money left and came back. Calling this paid leaves the partner shown
    // as paid for money they never received.
    expect(outcomeForRazorpayStatus("reversed")).toBe("failed");
  });

  it("maps the terminal states", () => {
    expect(outcomeForRazorpayStatus("processed")).toBe("paid");
    for (const status of ["failed", "cancelled", "rejected", "reversed"]) {
      expect(outcomeForRazorpayStatus(status)).toBe("failed");
    }
  });

  it("holds the money for anything in flight or unrecognised", () => {
    for (const status of ["queued", "pending", "processing", "", undefined, "something_new"]) {
      expect(outcomeForRazorpayStatus(status)).toBe("pending");
    }
  });
});

describe("classifyPayoutFailure", () => {
  it("separates the ones worth retrying from the ones that are not", () => {
    expect(classifyPayoutFailure(401, {})).toBe("bad_key");
    expect(classifyPayoutFailure(403, {})).toBe("bad_key");
    expect(classifyPayoutFailure(429, {})).toBe("rate_limited");
    expect(classifyPayoutFailure(500, {})).toBe("upstream");
  });

  it("recognises an empty account and a wrong one", () => {
    expect(classifyPayoutFailure(400, { error: { description: "Insufficient balance" } })).toBe("insufficient_funds");
    expect(classifyPayoutFailure(400, { error: { description: "Invalid IFSC code" } })).toBe("invalid_account");
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Bank details
   ───────────────────────────────────────────────────────────────────────── */

describe("validateBankDetails", () => {
  const holder = { accountHolderName: "Faiz Alam" };

  it("accepts a real-looking account and IFSC", () => {
    expect(validateBankDetails({ ...holder, accountNumber: "50100123456789", ifsc: "HDFC0001234" })).toEqual({
      ok: true,
    });
  });

  it("refuses the typos that would pay a stranger", () => {
    // Razorpay does not check that an account belongs to the person named on
    // it, so these are the only checks standing between a typo and lost money.
    expect(validateBankDetails({ ...holder, accountNumber: "123", ifsc: "HDFC0001234" }).ok).toBe(false);
    expect(validateBankDetails({ ...holder, accountNumber: "50100123456789", ifsc: "HDFC1234" }).ok).toBe(false);
    expect(validateBankDetails({ ...holder, accountNumber: "5010012345678A", ifsc: "HDFC0001234" }).ok).toBe(false);
    expect(validateBankDetails({ ...holder, accountNumber: "", ifsc: "" }).ok).toBe(false);
    expect(validateBankDetails({ accountHolderName: "", accountNumber: "50100123456789", ifsc: "HDFC0001234" }).ok).toBe(
      false,
    );
  });

  it("takes a UPI id instead, when there is one", () => {
    expect(validateBankDetails({ ...holder, upiId: "faiz@okhdfcbank" })).toEqual({ ok: true });
    expect(validateBankDetails({ ...holder, upiId: "not-a-vpa" }).ok).toBe(false);
  });
});

describe("bankFingerprint", () => {
  it("changes when the account changes, so the fund account is rebuilt", () => {
    // A fund account at Razorpay cannot be edited. Without this the money
    // would keep going to the account the partner moved away from.
    const before = bankFingerprint({ accountHolderName: "Faiz", accountNumber: "111111", ifsc: "HDFC0001234" });
    const after = bankFingerprint({ accountHolderName: "Faiz", accountNumber: "222222", ifsc: "HDFC0001234" });
    expect(before).not.toBe(after);
  });

  it("is stable across spacing and case", () => {
    expect(bankFingerprint({ accountHolderName: " Faiz ", accountNumber: "111111", ifsc: "hdfc0001234" })).toBe(
      bankFingerprint({ accountHolderName: "faiz", accountNumber: "111111", ifsc: "HDFC0001234" }),
    );
  });

  it("does not contain the account number", () => {
    const fingerprint = bankFingerprint({ accountHolderName: "Faiz", accountNumber: "50100123456789", ifsc: "HDFC0001234" });
    expect(fingerprint).not.toContain("50100123456789");
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   The webhook
   ───────────────────────────────────────────────────────────────────────── */

describe("the payout webhook", () => {
  it("verifies a real signature and rejects a forged one", () => {
    const body = JSON.stringify({ event: "payout.processed" });
    const secret = "whsec_test";
    const good = crypto.createHmac("sha256", secret).update(body).digest("hex");

    expect(verifyPayoutWebhook(body, good, secret)).toBe(true);
    expect(verifyPayoutWebhook(body, good, "another_secret")).toBe(false);
    expect(verifyPayoutWebhook(`${body} `, good, secret)).toBe(false);
    expect(verifyPayoutWebhook(body, "", secret)).toBe(false);
    expect(verifyPayoutWebhook(body, good, "")).toBe(false);
  });

  it("uses its own secret, not the payment gateway's", () => {
    expect(webhook).toContain("RAZORPAYX_WEBHOOK_SECRET");
    expect(webhook).not.toContain("RAZORPAY_WEBHOOK_SECRET;");
  });

  it("refuses to act before the signature is checked", () => {
    expect(webhook.indexOf("verifyPayoutWebhook")).toBeLessThan(webhook.indexOf("from(\"ap_payouts\")"));
  });

  it("refunds before marking failed, so money is never left nowhere", () => {
    const failed = webhook.slice(webhook.indexOf('outcome === "failed"'));
    expect(failed.indexOf("reverseEntry")).toBeLessThan(failed.indexOf('patch.status = "failed"'));
  });

  it("ignores a redelivery of a payout already finished", () => {
    expect(webhook).toContain("already paid");
    expect(webhook).toContain("already failed");
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   The auto-credit limit
   ───────────────────────────────────────────────────────────────────────── */

describe("autoCreditLimit", () => {
  it("defaults to 2000", () => {
    expect(autoCreditLimit({} as NodeJS.ProcessEnv)).toBe(2000);
  });

  it("takes a number from the environment, including zero", () => {
    expect(autoCreditLimit({ AP_AUTO_CREDIT_MAX: "500" } as unknown as NodeJS.ProcessEnv)).toBe(500);
    expect(autoCreditLimit({ AP_AUTO_CREDIT_MAX: "0" } as unknown as NodeJS.ProcessEnv)).toBe(0);
  });

  it("falls back to the default rather than opening the gate on a typo", () => {
    for (const raw of ["abc", "-1", "  "]) {
      expect(autoCreditLimit({ AP_AUTO_CREDIT_MAX: raw } as unknown as NodeJS.ProcessEnv)).toBe(2000);
    }
  });

  it("holds a large commission instead of crediting it", () => {
    const settlement = readCode("src/lib/ap-commission-settlement.ts");
    const held = settlement.slice(settlement.indexOf("if (heldForApproval) {"));
    // The return must come before the wallet credit, or the limit means nothing.
    expect(held.indexOf("heldForApproval: true")).toBeLessThan(held.indexOf("creditCommission({"));
    expect(settlement).toContain('status: heldForApproval ? "pending" : "approved"');
  });
});
