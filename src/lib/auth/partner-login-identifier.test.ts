import { describe, expect, it } from "vitest";

import {
  isValidLoginEmail,
  resolvePartnerContactEmailToAuthEmail,
  type PartnerLookupClient,
} from "./partner-login-identifier";

/**
 * A stand-in for the service-role client that records what it was asked and
 * answers from fixed tables. Only the three calls the resolver makes exist.
 */
function fakeClient(tables: {
  profiles?: { id: string; email: string; role: string }[];
  agency_partners?: { user_id: string; email: string }[];
  authUsers?: Record<string, string | null>;
}) {
  const calls: { table: string; column: string; value: string; roles?: string[] }[] = [];

  const client = {
    from(table: string) {
      return {
        select() {
          return {
            ilike(column: string, pattern: string) {
              // Stand-in for SQL ILIKE: case-insensitive, with \_ and \%
              // escaped back to literals before comparing.
              const literal = pattern.replace(/\\([\\%_])/g, "$1").toLowerCase();
              const match = (rows: Record<string, unknown>[]) =>
                rows.filter((row) => String(row[column] ?? "").toLowerCase() === literal);

              return {
                in(roleColumn: string, roles: string[]) {
                  calls.push({ table, column, value: pattern, roles });
                  return {
                    async limit(count: number) {
                      const rows = match(tables.profiles ?? []).filter((row) =>
                        roles.includes(String(row[roleColumn] ?? "")),
                      );
                      return { data: rows.slice(0, count) };
                    },
                  };
                },
                async limit(count: number) {
                  calls.push({ table, column, value: pattern });
                  const source =
                    table === "profiles" ? tables.profiles ?? [] : tables.agency_partners ?? [];
                  return { data: match(source).slice(0, count) };
                },
              };
            },
          };
        },
      };
    },
    auth: {
      admin: {
        async getUserById(id: string) {
          const email = tables.authUsers?.[id];
          return { data: { user: email === undefined ? null : { email } } };
        },
      },
    },
  } as unknown as PartnerLookupClient;

  return { client, calls };
}

describe("isValidLoginEmail", () => {
  it("accepts an address and rejects a username or mobile", () => {
    expect(isValidLoginEmail("salonichristy29@gmail.com")).toBe(true);
    expect(isValidLoginEmail("  Saloni@Example.co.in ")).toBe(true);
    expect(isValidLoginEmail("saloni")).toBe(false);
    expect(isValidLoginEmail("7007595931")).toBe(false);
    expect(isValidLoginEmail("saloni@")).toBe(false);
    expect(isValidLoginEmail("")).toBe(false);
  });
});

describe("resolvePartnerContactEmailToAuthEmail", () => {
  it("maps the address a partner knows to the internal one they sign in with", async () => {
    const { client } = fakeClient({
      profiles: [
        { id: "user-1", email: "salonichristy29@gmail.com", role: "agency_partner" },
      ],
      authUsers: { "user-1": "saloni@agency.rnos.internal" },
    });

    await expect(
      resolvePartnerContactEmailToAuthEmail(client, "salonichristy29@gmail.com"),
    ).resolves.toBe("saloni@agency.rnos.internal");
  });

  it("finds a partner whose address is only on the partner row", async () => {
    // Admin-created partners get the internal address on `profiles.email`
    // when no contact address was typed, but the partner row keeps theirs.
    const { client } = fakeClient({
      profiles: [{ id: "user-2", email: "muskan@agency.rnos.internal", role: "agency_partner" }],
      agency_partners: [{ user_id: "user-2", email: "kk6661172@gmail.com" }],
      authUsers: { "user-2": "muskan@agency.rnos.internal" },
    });

    await expect(
      resolvePartnerContactEmailToAuthEmail(client, "kk6661172@gmail.com"),
    ).resolves.toBe("muskan@agency.rnos.internal");
  });

  it("is case and whitespace insensitive about what was typed", async () => {
    const { client } = fakeClient({
      profiles: [{ id: "user-1", email: "ayaz@gmail.com", role: "agency_partner" }],
      authUsers: { "user-1": "ayaz@agency.rnos.internal" },
    });

    await expect(
      resolvePartnerContactEmailToAuthEmail(client, "  AYAZ@Gmail.COM  "),
    ).resolves.toBe("ayaz@agency.rnos.internal");
  });

  it("matches an address the admin stored with different casing", async () => {
    // /api/admin/agency-partners/create wrote body.email verbatim for a long
    // time, so live rows carry whatever casing was typed into the form.
    const { client } = fakeClient({
      profiles: [
        { id: "user-4", email: "SaloniChristy29@Gmail.com", role: "agency_partner" },
      ],
      authUsers: { "user-4": "saloni@agency.rnos.internal" },
    });

    await expect(
      resolvePartnerContactEmailToAuthEmail(client, "salonichristy29@gmail.com"),
    ).resolves.toBe("saloni@agency.rnos.internal");
  });

  it("escapes LIKE wildcards so an underscore stays a literal", async () => {
    const { client, calls } = fakeClient({
      profiles: [{ id: "user-6", email: "first_last@gmail.com", role: "agency_partner" }],
      authUsers: { "user-6": "firstlast@agency.rnos.internal" },
    });

    await expect(
      resolvePartnerContactEmailToAuthEmail(client, "first_last@gmail.com"),
    ).resolves.toBe("firstlast@agency.rnos.internal");

    // The pattern sent to the database escapes it rather than leaving it as
    // the single-character wildcard, which would also match firstXlast@…
    expect(calls[0]?.value).toBe("first\\_last@gmail.com");
  });

  it("only searches partner roles, so a customer's address resolves to nothing", async () => {
    const { client, calls } = fakeClient({
      profiles: [{ id: "cust-1", email: "buyer@gmail.com", role: "customer" }],
      authUsers: { "cust-1": "buyer@gmail.com" },
    });

    await expect(
      resolvePartnerContactEmailToAuthEmail(client, "buyer@gmail.com"),
    ).resolves.toBeNull();

    expect(calls.find((call) => call.table === "profiles")?.roles).toEqual([
      "agent",
      "agency_partner",
    ]);
  });

  it("refuses an address that two accounts share rather than guessing", async () => {
    const { client } = fakeClient({
      profiles: [
        { id: "user-1", email: "shared@shop.com", role: "agency_partner" },
        { id: "user-2", email: "shared@shop.com", role: "agent" },
      ],
      authUsers: {
        "user-1": "one@agency.rnos.internal",
        "user-2": "two@agency.rnos.internal",
      },
    });

    await expect(
      resolvePartnerContactEmailToAuthEmail(client, "shared@shop.com"),
    ).resolves.toBeNull();
  });

  it("treats the same partner found on both tables as one match", async () => {
    const { client } = fakeClient({
      profiles: [{ id: "user-9", email: "vikas892494@gmail.com", role: "agency_partner" }],
      agency_partners: [{ user_id: "user-9", email: "vikas892494@gmail.com" }],
      authUsers: { "user-9": "vikas@agency.rnos.internal" },
    });

    await expect(
      resolvePartnerContactEmailToAuthEmail(client, "vikas892494@gmail.com"),
    ).resolves.toBe("vikas@agency.rnos.internal");
  });

  it("resolves nothing for an address no partner holds", async () => {
    const { client } = fakeClient({ profiles: [], agency_partners: [] });

    await expect(
      resolvePartnerContactEmailToAuthEmail(client, "nobody@gmail.com"),
    ).resolves.toBeNull();
  });

  it("resolves nothing when the matched Auth user has no usable address", async () => {
    const { client } = fakeClient({
      profiles: [{ id: "user-3", email: "partner@gmail.com", role: "agency_partner" }],
      authUsers: { "user-3": null },
    });

    await expect(
      resolvePartnerContactEmailToAuthEmail(client, "partner@gmail.com"),
    ).resolves.toBeNull();
  });

  it("does not run a lookup for something that is not an address", async () => {
    const { client, calls } = fakeClient({
      profiles: [{ id: "user-1", email: "a@b.com", role: "agency_partner" }],
    });

    await expect(resolvePartnerContactEmailToAuthEmail(client, "7007595931")).resolves.toBeNull();
    expect(calls).toHaveLength(0);
  });
});
