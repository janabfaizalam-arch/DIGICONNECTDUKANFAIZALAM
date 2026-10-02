import { describe, expect, it } from "vitest";

import {
  ALL_REWARD_TRANSACTION_TYPES,
  CREDIT_REWARD_TYPES,
  REDEEM_REWARD_TYPES,
  REFERRAL_REWARD_TYPES,
} from "./wallet-totals";
import { getRewardDirection } from "@/lib/wallet";

describe("reward type partitioning", () => {
  it("pushes the same credit/debit split into the query that the UI displays", () => {
    // The sums are filtered server-side now, so if this list and
    // `getRewardDirection` ever disagreed, a transaction type's money would
    // vanish from the total while still rendering with a "+" in the ledger.
    for (const type of ALL_REWARD_TRANSACTION_TYPES) {
      const isCredit = getRewardDirection(type) === "credit" && type !== "expiry";
      expect(CREDIT_REWARD_TYPES.includes(type as never)).toBe(isCredit);
    }
  });

  it("covers every type exactly once, with no overlap between credit and redeem", () => {
    expect(new Set(ALL_REWARD_TRANSACTION_TYPES).size).toBe(ALL_REWARD_TRANSACTION_TYPES.length);

    for (const type of REDEEM_REWARD_TYPES) {
      expect(CREDIT_REWARD_TYPES.includes(type as never)).toBe(false);
    }
  });

  it("excludes the debit types from issued", () => {
    // Counting a redemption or an expiry as "issued" would inflate the
    // business's reported cashback liability.
    for (const type of ["redeem", "redemption", "expiry"] as const) {
      expect(CREDIT_REWARD_TYPES.includes(type as never)).toBe(false);
    }
  });

  it("keeps reversal classified as a credit, as the existing logic has it", () => {
    // Pinned deliberately. Whether a reversal should reduce "issued" instead is
    // a business question; this change is a correctness fix and must not alter
    // the answer silently. If that decision is revisited, this test is the
    // place it will surface.
    expect(getRewardDirection("reversal")).toBe("credit");
    expect(CREDIT_REWARD_TYPES.includes("reversal" as never)).toBe(true);
  });

  it("totals referral rewards from the two bonus types the card names", () => {
    expect([...REFERRAL_REWARD_TYPES]).toEqual([
      "referrer_signup_bonus",
      "referrer_first_service_bonus",
    ]);

    for (const type of REFERRAL_REWARD_TYPES) {
      expect(ALL_REWARD_TRANSACTION_TYPES.includes(type)).toBe(true);
    }
  });
});
