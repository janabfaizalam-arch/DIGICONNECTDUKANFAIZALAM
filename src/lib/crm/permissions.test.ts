import { describe, expect, it } from "vitest";

import { capabilitiesForRole, roleHasCapability } from "@/lib/crm/permissions-core";

describe("CRM permissions matrix", () => {
  it("grants walk_in.create to admin and partners", () => {
    expect(roleHasCapability("admin", "walk_in.create")).toBe(true);
    expect(roleHasCapability("agency_partner", "walk_in.create")).toBe(true);
    expect(roleHasCapability("customer", "walk_in.create")).toBe(false);
  });

  it("restricts merge and exports to admin", () => {
    expect(roleHasCapability("admin", "customers.merge")).toBe(true);
    expect(roleHasCapability("agency_partner", "customers.merge")).toBe(false);
    expect(roleHasCapability("admin", "exports.run")).toBe(true);
    expect(roleHasCapability("agency_partner", "exports.run")).toBe(false);
  });

  it("maps staff aliases through isAdminRole when passed as admin", () => {
    expect(capabilitiesForRole("admin").has("applications.assign")).toBe(true);
  });
});
