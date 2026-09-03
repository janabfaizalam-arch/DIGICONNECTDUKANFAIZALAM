import { describe, expect, it } from "vitest";

import { readCode } from "@/lib/testing/source";

const stations = readCode("src/lib/print/stations.ts");
const agentJobs = readCode("src/app/api/print/agent/jobs/route.ts");
const agentClaim = readCode("src/app/api/print/agent/claim-job/route.ts");
const agentStatus = readCode("src/app/api/print/agent/update-status/route.ts");
const agentAuth = readCode("src/lib/print/agent-auth.ts");
const api = readCode("src/app/api/ap/print-station/route.ts");
const migration = readCode("supabase/migrations/20260901160000_partner_print_stations.sql");
const customer = readCode("src/components/print/station-print-flow.tsx");

/* ─────────────────────────────────────────────────────────────────────────
   One shop cannot reach another
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The print system was built for one printer: a single global agent key and
 * jobs belonging to nobody. Handing that to partners without scoping it would
 * mean any shop's Print Station could pull down every other shop's customers'
 * documents.
 */
describe("a shop sees only its own counter", () => {
  it("scopes all three agent endpoints by station, not just the listing", () => {
    /*
      Listing alone is not enough, and for a while that is all there was.

      A job id is guessable and was visible to any station that had listed a
      queue, so a shop could claim a neighbour's job — and be handed a signed
      URL to that customer's document — or mark it printed. Every endpoint
      that touches a job row applies the same condition.
    */
    for (const route of [agentJobs, agentClaim, agentStatus]) {
      expect(route).toContain('.filter("station_id"');
      expect(route).toContain("authenticateAgent(request)");
      expect(route).toContain("stationScope(");
    }
  });

  it("resolves the station from the token the agent presented", () => {
    expect(agentAuth).toContain("getStationByAgentToken(presented)");
  });

  it("still serves the platform's own counter on the environment key", () => {
    // The existing installation has to keep working while shops onboard.
    expect(agentAuth).toContain("PRINT_AGENT_SECRET_KEY");
    expect(agentAuth).toContain('return { ok: true, station: null');
  });

  it("gives a shop its own id and the platform counter the unowned rows", () => {
    // The pair that makes the filter above mean anything.
    expect(agentAuth).toContain('operator: "eq"');
    expect(agentAuth).toContain('operator: "is"');
  });

  it("never takes a station id from the partner's request", () => {
    // Every handler works on the row belonging to the session's partner.
    expect(api).toContain("partnerFromSession");
    expect(api).not.toMatch(/body\.stationId|params\.stationId/);
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   The agent key
   ───────────────────────────────────────────────────────────────────────── */

describe("the agent key is never stored in the clear", () => {
  it("stores only a hash", () => {
    expect(stations).toContain("createHash(\"sha256\")");
    expect(stations).toContain("agent_token_hash");
    expect(migration).toContain("agent_token_hash");
  });

  it("looks a station up by hash, never by the plain token", () => {
    expect(stations).toContain('.eq("agent_token_hash", hashAgentToken(clean))');
  });

  it("rotates only when asked, never as a side effect of an edit", () => {
    // Rotating on every save would break a working shop's printer each time
    // somebody corrected a typo in the address.
    expect(api).toContain('body.action === "rotate_token"');
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   The code on the counter
   ───────────────────────────────────────────────────────────────────────── */

describe("a station code survives a phone camera", () => {
  it("excludes the characters that look or sound alike", () => {
    const alphabet = stations.slice(stations.indexOf("const CODE_ALPHABET"));
    const value = alphabet.slice(alphabet.indexOf('"') + 1, alphabet.indexOf('";'));
    for (const character of ["O", "0", "I", "1", "L", "U"]) {
      expect(value, `${character} is still in the alphabet`).not.toContain(character);
    }
  });

  it("retries a collision rather than assuming it away", () => {
    // The column is unique; "unlikely" is not a guarantee.
    expect(stations).toContain('error.code !== "23505"');
  });

  it("matches a typed code regardless of case", () => {
    expect(stations).toContain('.ilike("code", clean)');
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Money and rates
   ───────────────────────────────────────────────────────────────────────── */

describe("the shop sets the price and the server computes it", () => {
  it("keeps rates on the station, not in the code", () => {
    for (const column of ["rate_a4_mono", "rate_a4_color", "rate_a3_mono", "rate_a3_color"]) {
      expect(migration, `${column} is missing`).toContain(column);
    }
  });

  it("bounds what a shop may charge", () => {
    expect(stations).toContain("RATE_LIMITS");
    expect(stations).toContain("clampRate");
  });

  it("never lets the browser name the price", () => {
    // The one field on this page a customer has an incentive to change.
    expect(stations).toContain("export function priceFor");
    expect(customer).not.toMatch(/amount:\s*total/);
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   What is actually being sold
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The pitch is that the shop cannot see your document. If the page says it,
 * the schema has to enforce it.
 */
describe("the privacy promise is on the page and in the schema", () => {
  it("bounds the deletion window rather than trusting a form", () => {
    expect(migration).toContain("auto_delete_minutes int not null default 15 check (auto_delete_minutes between 5 and 120)");
  });

  it("tells the customer, in words, before they pay", () => {
    expect(customer).toContain("Nobody here opens your file");
    expect(customer).toContain("autoDeleteMinutes");
  });

  it("says the counter is closed before taking money, not after", () => {
    expect(customer).toContain("This counter is closed");
    expect(customer).toContain("Nothing has been charged");
  });

  it("refuses the payment outright when the shop's computer is not answering", () => {
    /*
      This used to be a note at the bottom of the page with the Pay button
      still live underneath it. A customer read past it, paid two rupees, and
      the job queued at a counter with nothing running to collect it.
    */
    expect(customer).toContain("computer is not responding");
    expect(customer).toContain("const offline = !station.agentConnected");
    expect(customer).toContain("disabled={closed || offline ||");
  });

  it("tells the customer what actually happened to the pages", () => {
    // "Paid. Printing now." was shown the moment the payment cleared and
    // never changed, so a job nobody printed looked exactly like success.
    expect(customer).toContain("/api/print/jobs/status?job_id=");
    expect(customer).toContain("Not printed yet.");
    expect(customer).toContain("The print did not go through.");
  });

  it("asks a customer for no account", () => {
    // Somebody standing at a counter will not sign up to print one page.
    expect(customer).not.toContain("login");
    expect(customer).not.toContain("password");
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Nothing leaks through the anon key
   ───────────────────────────────────────────────────────────────────────── */

describe("the stations table is server-only", () => {
  it("refuses every browser read and write", () => {
    // A public select here would expose every shop's token hash and takings.
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("using (false)");
    expect(migration).toContain("with check (false)");
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   A key that was never stored
   ───────────────────────────────────────────────────────────────────────── */

describe("issuing a key", () => {
  it("proves a row was written before handing the key out", () => {
    /*
      An update that matches nothing is not an error in PostgREST — it
      succeeds, having changed nothing. Without checking the affected rows,
      a partner would be shown a brand new key, told to paste it in, and then
      be refused forever by a server that had never seen it. From outside,
      that is indistinguishable from a wrong key, which is exactly the loop it
      put a real shop through.
    */
    const rotate = stations.slice(stations.indexOf("export async function rotateAgentToken"));
    const body = rotate.slice(0, rotate.indexOf("\n}"));

    expect(body).toContain('.select("id")');
    expect(body).toContain("data.length === 0");
    expect(body).toMatch(/return null/);
  });

  it("refuses to issue against an empty partner id", () => {
    // An empty id would match no row, and previously still returned a token.
    const rotate = stations.slice(stations.indexOf("export async function rotateAgentToken"));
    expect(rotate.slice(0, 400)).toContain("!partnerId");
  });
});
