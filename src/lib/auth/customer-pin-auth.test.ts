import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCampaignName } from "@/lib/whatsapp/aisensy";
import { hashPin, verifyPin } from "@/lib/auth-v2/password";
import { isValidPinFormat } from "@/lib/auth/pin";
import { resolveCustomerMatches } from "@/lib/auth/customer-lookup";

describe("customer PIN hashing (login-compatible)", () => {
  it("hashes and verifies a 6-digit PIN with argon2 helper", async () => {
    const pin = "482913";
    expect(isValidPinFormat(pin)).toBe(true);
    expect(/^\d{6}$/.test(pin)).toBe(true);

    const hashed = await hashPin(pin);
    expect(hashed).toBeTruthy();
    expect(hashed).not.toBe(pin);
    expect(await verifyPin(pin, hashed)).toBe(true);
    expect(await verifyPin("000000", hashed)).toBe(false);
  });
});

describe("forgot / create PIN campaign + recovery contract", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("forgot_pin purpose maps to password_reset campaign", () => {
    expect(getCampaignName("forgot_pin")).toBe("password_reset");
  });

  it("simulates OTP verification updating customers.hashed_pin for legacy row", async () => {
    const lookup = resolveCustomerMatches({
      localPhone: "9876543210",
      customers: [
        {
          id: "legacy-cust",
          mobile: "9876543210",
          name: "Ramesh",
          is_active: true,
        },
      ],
      profiles: [],
    });

    expect(lookup.ok).toBe(true);
    if (!lookup.ok) return;

    const newPin = "739182";
    const hashedPin = await hashPin(newPin);

    // Simulated DB row after forgot-pin reset (no auth.users required)
    const customerRow = {
      id: lookup.customerId,
      mobile: lookup.mobile,
      hashed_pin: hashedPin,
      is_active: true,
      wallet_balance: 250,
    };

    expect(customerRow.id).toBe("legacy-cust");
    expect(customerRow.wallet_balance).toBe(250);
    expect(await verifyPin(newPin, customerRow.hashed_pin)).toBe(true);
  });

  it("allows login with new PIN after hashed_pin update", async () => {
    const pin = "654321";
    const hashed = await hashPin(pin);

    const customer = {
      id: "c1",
      mobile: "9876543210",
      hashed_pin: hashed,
      is_active: true,
    };

    const loginOk =
      customer.is_active &&
      (await verifyPin(pin, customer.hashed_pin)) &&
      customer.mobile === "9876543210";

    expect(loginOk).toBe(true);
  });

  it("handles inactive customer safely at login time", () => {
    const lookup = resolveCustomerMatches({
      localPhone: "9876543210",
      customers: [
        {
          id: "inactive-1",
          mobile: "9876543210",
          name: "Inactive",
          is_active: false,
        },
      ],
      profiles: [],
    });

    expect(lookup.ok).toBe(true);
    if (lookup.ok) {
      expect(lookup.isActive).toBe(false);
    }
  });
});
