import { describe, expect, it } from "vitest";

import { readCode } from "@/lib/testing/source";
import { describeAuthCreateFailure, isEmailTakenError } from "@/lib/ap/provision-partner";

const provision = readCode("src/lib/ap/provision-partner.ts");

/* ─────────────────────────────────────────────────────────────────────────
   The failure that had an admin stuck
   ───────────────────────────────────────────────────────────────────────── */

describe("isEmailTakenError", () => {
  it("recognises the codes GoTrue sends", () => {
    expect(isEmailTakenError({ code: "email_exists" })).toBe(true);
    expect(isEmailTakenError({ code: "user_already_exists" })).toBe(true);
  });

  it("recognises the older sentences too", () => {
    for (const message of [
      "User already registered",
      "A user with this email address has already been registered",
      "duplicate key value violates unique constraint",
      "Email already exists",
    ]) {
      expect(isEmailTakenError({ message }), message).toBe(true);
    }
  });

  it("does not mistake other failures for a collision", () => {
    // Treating one of these as a collision would send it down the adopt path
    // and reset somebody's password over an unrelated error.
    for (const message of [
      "Password should be at least 6 characters",
      "Database error creating new user",
      "rate limit exceeded",
      "",
    ]) {
      expect(isEmailTakenError({ message }), message).toBe(false);
    }
    expect(isEmailTakenError(null)).toBe(false);
  });
});

describe("describeAuthCreateFailure", () => {
  it("names a rejected password, because that one is fixable", () => {
    const text = describeAuthCreateFailure({ message: "Password should be at least 8 characters" });
    expect(text).toContain("Password should be at least 8 characters");
  });

  it("tells the admin to wait on a rate limit", () => {
    expect(describeAuthCreateFailure({ message: "Email rate limit exceeded" })).toMatch(/minute/i);
  });

  it("passes an unknown reason through rather than hiding it", () => {
    // The whole bug report was a message that said nothing. An unfamiliar
    // failure must still leave the admin something to act on or send on.
    expect(describeAuthCreateFailure({ message: "Database error creating new user" })).toContain(
      "Database error creating new user",
    );
  });

  it("still says something when Supabase says nothing", () => {
    expect(describeAuthCreateFailure({ message: "" })).toMatch(/koi wajah nahi batayi/);
    expect(describeAuthCreateFailure(null)).toMatch(/koi wajah nahi batayi/);
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Recovering from a login address that is already taken
   ───────────────────────────────────────────────────────────────────────── */

describe("a leftover auth user does not block approval forever", () => {
  it("looks the holder up only after a create has failed on a collision", () => {
    // Paging every auth user on the happy path would make approval slow for
    // everybody to cover a case that is rare.
    expect(provision.indexOf("isEmailTakenError(createError)")).toBeLessThan(
      provision.indexOf("findAuthUserByEmail(supabase, loginEmail)"),
    );
  });

  it("refuses rather than adopts when a real partner holds it", () => {
    // Adopting here would reset a working partner's password because somebody
    // approved a duplicate application.
    const block = provision.slice(provision.indexOf("const holder = await findAuthUserByEmail"));
    const refusal = block.indexOf("Is mobile number se ek partner pehle se bana hua hai");
    const adopt = block.indexOf("updateUserById");
    expect(refusal).toBeGreaterThan(-1);
    expect(refusal).toBeLessThan(adopt);
  });

  it("adopts the orphan rather than suffixing the username", () => {
    expect(provision).toContain("updateUserById(holder.id, authPayload)");
    expect(provision).toContain("userId = holder.id");
  });

  it("says which login id is taken when the holder cannot be found", () => {
    expect(provision).toContain("pehle se kisi aur ke paas hai");
  });
});

describe("rollback cannot delete somebody else's login", () => {
  it("tracks whether this call created the auth user", () => {
    expect(provision).toContain("let createdAuthUser");
    expect(provision).toContain("createdAuthUser = false");
  });

  it("deletes only what it created", () => {
    // The adopted user existed before this call. A failed table write must not
    // take its login away.
    expect(provision).toContain("if (createdAuthUser) await supabase.auth.admin.deleteUser(userId);");
    expect(provision).not.toMatch(/\n\s*await supabase\.auth\.admin\.deleteUser\(userId\);/);
  });

  it("says why the table write failed", () => {
    expect(provision).toContain("Partner account could not be created: ${reason}");
  });
});

describe("the adopted user gets the same treatment as a new one", () => {
  it("shares one payload between create and adopt", () => {
    // Two literals would drift, and an adopted partner would end up without
    // the role metadata the login depends on.
    expect(provision).toContain("const authPayload = {");
    expect(provision).toContain("...authPayload,");
    expect(provision).toContain("updateUserById(holder.id, authPayload)");
    expect(provision).toContain('app_metadata: { role: "agency_partner" }');
  });
});
