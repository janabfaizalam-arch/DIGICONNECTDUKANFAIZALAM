import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  categorizeAdminLoginFailure,
  isSupabaseAuthCookieName,
  pickAdminProfile,
  TimeoutError,
  withTimeout,
  type AdminProfileRow,
} from "./admin-login-shared";

describe("withTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves when the promise settles before the deadline", async () => {
    await expect(withTimeout(Promise.resolve("ok"), 15_000, "login")).resolves.toBe("ok");
  });

  it("rejects with TimeoutError when the promise never settles (hang protection)", async () => {
    const neverSettles = new Promise<never>(() => {});
    const raced = withTimeout(neverSettles, 15_000, "login_request");
    const assertion = expect(raced).rejects.toBeInstanceOf(TimeoutError);
    await vi.advanceTimersByTimeAsync(15_000);
    await assertion;
  });

  it("does not time out before the deadline", async () => {
    let settled = false;
    const slow = new Promise<string>((resolve) => setTimeout(() => resolve("done"), 14_000));
    const raced = withTimeout(slow, 15_000, "login").then((value) => {
      settled = true;
      return value;
    });
    await vi.advanceTimersByTimeAsync(14_000);
    await expect(raced).resolves.toBe("done");
    expect(settled).toBe(true);
  });

  it("propagates the original rejection", async () => {
    const raced = withTimeout(Promise.reject(new Error("boom")), 15_000, "login");
    await expect(raced).rejects.toThrow("boom");
  });
});

describe("pickAdminProfile (duplicate admin profile rows)", () => {
  const primaryEmail = "janabfaizalam@gmail.com";

  const adminRow = (overrides: Partial<AdminProfileRow> & { id: string }): AdminProfileRow => ({
    role: null,
    email: null,
    mobile: null,
    phone: null,
    full_name: null,
    active: true,
    is_active: true,
    ...overrides,
  });

  it("never throws with duplicate rows and picks the admin-role row", () => {
    const rows = [
      adminRow({ id: "b", role: "customer", email: primaryEmail }),
      adminRow({ id: "a", role: "admin", email: primaryEmail }),
      adminRow({ id: "c", role: "customer", mobile: "7007595931" }),
    ];
    const { profile, duplicates } = pickAdminProfile(rows, { primaryEmail, localMobile: "7007595931" });
    expect(profile?.id).toBe("a");
    expect(duplicates).toBe(2);
  });

  it("is deterministic regardless of input order", () => {
    const rows = [
      adminRow({ id: "z", role: "admin" }),
      adminRow({ id: "a", role: "admin" }),
    ];
    const forward = pickAdminProfile(rows, { primaryEmail });
    const reversed = pickAdminProfile([...rows].reverse(), { primaryEmail });
    expect(forward.profile?.id).toBe("a");
    expect(reversed.profile?.id).toBe("a");
  });

  it("dedupes the same row returned by both email and mobile queries", () => {
    const row = adminRow({ id: "a", role: "admin", email: primaryEmail, mobile: "917007595931" });
    const { profile, duplicates } = pickAdminProfile([row, { ...row }], { primaryEmail });
    expect(profile?.id).toBe("a");
    expect(duplicates).toBe(0);
  });

  it("falls back to primary email match, then mobile match", () => {
    const byEmail = pickAdminProfile(
      [adminRow({ id: "e", role: "customer", email: primaryEmail })],
      { primaryEmail },
    );
    expect(byEmail.profile?.id).toBe("e");

    const byMobile = pickAdminProfile(
      [adminRow({ id: "m", role: "customer", mobile: "+917007595931" })],
      { primaryEmail, localMobile: "7007595931" },
    );
    expect(byMobile.profile?.id).toBe("m");
  });

  it("returns null when nothing matches", () => {
    const { profile } = pickAdminProfile(
      [adminRow({ id: "x", role: "customer", email: "someone@else.com" })],
      { primaryEmail, localMobile: "7007595931" },
    );
    expect(profile).toBeNull();
  });
});

describe("isSupabaseAuthCookieName (stale customer cookie cleanup)", () => {
  it("matches Supabase auth cookies including chunked variants", () => {
    expect(isSupabaseAuthCookieName("sb-abcdefgh-auth-token")).toBe(true);
    expect(isSupabaseAuthCookieName("sb-abcdefgh-auth-token.0")).toBe(true);
    expect(isSupabaseAuthCookieName("sb-abcdefgh-auth-token.1")).toBe(true);
  });

  it("never matches the admin or customer JWT cookies", () => {
    expect(isSupabaseAuthCookieName("v2_admin_access_token")).toBe(false);
    expect(isSupabaseAuthCookieName("v2_customer_access_token")).toBe(false);
    expect(isSupabaseAuthCookieName("v2_customer_refresh_token")).toBe(false);
    expect(isSupabaseAuthCookieName("sb-abcdefgh-code-verifier")).toBe(false);
  });
});

describe("categorizeAdminLoginFailure (UI error messages)", () => {
  it("maps timeouts to the required message", () => {
    const failure = categorizeAdminLoginFailure({ kind: "timeout" });
    expect(failure.category).toBe("timeout");
    expect(failure.message).toBe("Login request timed out. Please try again.");
  });

  it("maps network failures", () => {
    expect(categorizeAdminLoginFailure({ kind: "network" }).category).toBe("network");
  });

  it("maps 401 to invalid credentials with the server message", () => {
    const failure = categorizeAdminLoginFailure({
      kind: "http",
      status: 401,
      message: "Invalid email or password.",
    });
    expect(failure.category).toBe("invalid_credentials");
    expect(failure.message).toBe("Invalid email or password.");
  });

  it("distinguishes inactive accounts from access denied on 403", () => {
    expect(
      categorizeAdminLoginFailure({ kind: "http", status: 403, message: "Admin account is inactive." })
        .category,
    ).toBe("account_inactive");
    expect(
      categorizeAdminLoginFailure({ kind: "http", status: 403, message: "Admin access denied for this account." })
        .category,
    ).toBe("access_denied");
  });

  it("maps 503 to server configuration error and 504 to timeout", () => {
    expect(categorizeAdminLoginFailure({ kind: "http", status: 503 }).category).toBe("server_config");
    expect(categorizeAdminLoginFailure({ kind: "http", status: 504 }).category).toBe("timeout");
  });

  it("always produces a user-visible message (never silent)", () => {
    for (const status of [400, 401, 403, 408, 500, 503, 504]) {
      const failure = categorizeAdminLoginFailure({ kind: "http", status, message: null });
      expect(failure.message.length).toBeGreaterThan(0);
    }
  });
});
