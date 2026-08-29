import { describe, expect, it } from "vitest";
import { readCode } from "@/lib/testing/source";


const code = readCode;

const middleware = code("src/middleware.ts");
const nav = code("src/components/bottom-nav.tsx");

/**
 * Middleware runs in front of every protected route and Vercel kills the
 * invocation if it overruns — which the visitor sees as a 504 on the page,
 * not as a slow page. The portal went down this way: `getUser()`, then a
 * `profiles` read, then an `agency_partners` probe, then `agency_partners`
 * again, all in series, all to another service.
 */
describe("middleware stays inside its invocation budget", () => {
  it("reads agency_partners at most once", () => {
    const reads = [...middleware.matchAll(/from\("agency_partners"\)/g)];
    expect(reads, "the probe selected a column of the row the other read returns").toHaveLength(1);
  });

  it("runs the role and membership reads together, not one after the other", () => {
    expect(middleware).toMatch(/await Promise\.all\(\[[\s\S]*?from\("profiles"\)[\s\S]*?agency_partners/);
  });

  it("gives up on a lookup rather than spending the whole budget on it", () => {
    expect(middleware).toContain("ROLE_LOOKUP_TIMEOUT_MS");
    expect(middleware).toMatch(/withLookupTimeout\(/);
  });

  /**
   * A prefetch of a force-dynamic, auth-protected route is not free: it is a
   * full authenticated request through this middleware. From a component the
   * root layout mounts on every page, that multiplies every page view into
   * several of them.
   */
  it("is not fed extra authenticated requests by the tab bar", () => {
    expect(nav).not.toMatch(/<Link[^>]*\sprefetch/);
  });
});

/**
 * Signed out, the bar shows a different set of tabs. If the only answer comes
 * from a network round trip, a customer watches the wrong bar until it
 * arrives — or keeps it, when the round trip is slow.
 */
describe("the chrome knows who is signed in without waiting for the network", () => {
  it("paints from the stored session before validating it", () => {
    const provider = code("src/components/providers/session-provider.tsx");
    const session = provider.indexOf("auth.getSession()");
    const user = provider.indexOf("auth.getUser()");
    expect(session, "getSession must be called").toBeGreaterThan(-1);
    expect(user, "getUser must still confirm it").toBeGreaterThan(-1);
    expect(session, "the local read has to come first").toBeLessThan(user);
  });
});
