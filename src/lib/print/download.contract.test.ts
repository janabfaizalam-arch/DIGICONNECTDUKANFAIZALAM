import { describe, expect, it } from "vitest";

import { readCode } from "@/lib/testing/source";

const route = readCode("src/app/api/ap/print-station/download/route.ts");
const setup = readCode("src/components/ap/print-station-setup.tsx");
const auth = readCode("src/lib/print/agent-auth.ts");

/**
 * The download carries a live credential.
 *
 * It is the one response on this site whose body is a working key to a shop's
 * print queue, so the things that keep it from reaching the wrong person are
 * pinned rather than left to a future edit.
 */

describe("the partner download", () => {
  it("resolves the partner from the session and never from the request", () => {
    expect(route).toContain("getCurrentUser");
    expect(route).toContain("isActiveAgent");
    expect(route).toContain("getAgencyPartnerByUserId");
    // A station id in the query string would let one partner download
    // another's key.
    expect(route).not.toMatch(/searchParams|params\.|body\./);
  });

  it("refuses a partner who has not set a counter up", () => {
    expect(route).toContain("Set your print counter up first.");
  });

  it("is never cached, anywhere", () => {
    // A bundle sitting in a CDN edge or a shared browser cache is a key
    // handed to whoever asks for the URL next.
    expect(route).toContain("no-store");
    expect(route).toContain("private");
  });

  it("issues the key rather than trying to recover the stored one", () => {
    // The stored value is a hash. There is no way back to the original, so a
    // download that did not rotate would ship a bundle with a blank key.
    expect(route).toContain("rotateAgentToken");
  });

  it("names the file after the counter, so two shops do not collide", () => {
    expect(route).toContain("Content-Disposition");
    expect(route).toContain("station.code");
  });

  it("builds the zip from compiled-in files, not from disk", () => {
    // public/ is not on a serverless function's filesystem: reading the
    // program at request time works locally and 500s in production.
    expect(route).toContain("bundle-files.generated");
    expect(route).not.toContain("readFileSync");
  });
});

describe("the partner's screen", () => {
  it("offers the download, and keeps the command folded away behind it", () => {
    /*
      The command is a fallback, not the instruction. A shop owner who can see
      both will paste the one that asks them to fetch their key from another
      card — which is the flow this download exists to replace.
    */
    expect(setup).toContain('href="/api/ap/print-station/download"');
    expect(setup).toContain("useState(false)");
    expect(setup).toMatch(/showCommand \? \(/);
    expect(setup).toMatch(/Download nahi ho raha/);
  });

  it("warns that a new download retires the old key", () => {
    // Two folders on two computers, one silently dead, is a shop wondering
    // why half its orders never print.
    expect(setup).toMatch(/nayi key banti hai aur purani band/i);
  });
});

describe("a refused key versus an unreachable database", () => {
  it("does not blame the shop for a server-side outage", () => {
    /*
      A partner sent a screenshot of a correct key being told it was refused.
      The key matched in the database; the route could not reach the database
      at all, and 401 was the only thing it knew how to say. These are now
      different answers.
    */
    expect(auth).toContain('reason: "unavailable"');
    expect(auth).toContain("503");
    expect(auth).toContain("This is not your key");
  });

  it("decides on the database before reading the lookup's null", () => {
    // getStationByAgentToken returns null for both "no such token" and
    // "could not ask" — it must, because it cannot throw into a polling
    // loop — so the two are told apart before it is called, not after.
    const check = auth.indexOf("if (!getSupabaseAdmin())");
    const lookup = auth.indexOf("await getStationByAgentToken");
    expect(check).toBeGreaterThan(-1);
    expect(lookup).toBeGreaterThan(check);
  });
});

describe("the whoami check", () => {
  const whoami = readCode("src/app/api/print/agent/whoami/route.ts");

  it("uses the same authentication as the endpoints it is meant to predict", () => {
    // A second implementation would drift, and then the check would pass on a
    // key the real endpoints refuse — worse than no check at all.
    expect(whoami).toContain("authenticateAgent(request)");
  });

  it("tells a retired key apart from a website that is down", () => {
    expect(whoami).toContain('reason: "unknown_key"');
    expect(whoami).toContain('reason: "server_unavailable"');
    expect(whoami).toContain("503");
  });

  it("says a closed counter is closed, since that looks exactly like a fault", () => {
    expect(whoami).toContain("accepting_orders");
    expect(whoami).toMatch(/counter is switched off/i);
  });

  it("returns the shop's name and code, and nothing else about it", () => {
    // Never the rates, the takings, or the token hash: this answers an
    // unauthenticated-until-proven caller.
    expect(whoami).toContain("station.display_name");
    expect(whoami).toContain("station.code");
    expect(whoami).not.toMatch(/rate_a4|agent_token_hash|partner_id/);
  });
});
