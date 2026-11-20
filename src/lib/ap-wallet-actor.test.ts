import { describe, expect, it } from "vitest";
import { ledgerActor } from "@/lib/ap-wallet";

describe("ledgerActor", () => {
  it("keeps a real user id", () => {
    expect(ledgerActor("9430b674-7892-4677-8a2f-8c9c9948b6cc")).toBe("9430b674-7892-4677-8a2f-8c9c9948b6cc");
  });

  it("drops a system label, which the uuid column would reject", () => {
    expect(ledgerActor("wallet-application-payment")).toBeNull();
    expect(ledgerActor("razorpayx-webhook")).toBeNull();
    expect(ledgerActor(null)).toBeNull();
    expect(ledgerActor(undefined)).toBeNull();
  });
});
