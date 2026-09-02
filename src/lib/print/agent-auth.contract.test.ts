import { describe, expect, it } from "vitest";

import { bearerToken, stationScope } from "./agent-auth";

/**
 * The rules that keep two shops on one platform apart.
 *
 * These are small functions, and that is deliberate: the condition deciding
 * whose print job an agent may touch is written once, tested here, and
 * applied identically by the jobs listing, the claim and the status report.
 */

describe("bearerToken", () => {
  it("reads the value after Bearer", () => {
    expect(bearerToken("Bearer dcp_abc123")).toBe("dcp_abc123");
  });

  it("accepts the scheme in any case, because clients differ", () => {
    expect(bearerToken("bearer dcp_abc123")).toBe("dcp_abc123");
    expect(bearerToken("BEARER dcp_abc123")).toBe("dcp_abc123");
  });

  it("tolerates extra whitespace a copy-paste leaves behind", () => {
    expect(bearerToken("Bearer    dcp_abc123   ")).toBe("dcp_abc123");
  });

  it("accepts a bare token, so a misconfigured client still authenticates", () => {
    expect(bearerToken("dcp_abc123")).toBe("dcp_abc123");
  });

  it("returns an empty string for a missing header rather than throwing", () => {
    expect(bearerToken(null)).toBe("");
    expect(bearerToken(undefined)).toBe("");
    expect(bearerToken("")).toBe("");
  });

  it("returns an empty string for a header that is only the scheme", () => {
    expect(bearerToken("Bearer ")).toBe("");
  });
});

describe("stationScope", () => {
  const station = { id: "station-uuid-1", code: "K7M2QD" } as never;

  it("confines a shop to rows carrying its own station id", () => {
    expect(stationScope(station)).toEqual({ operator: "eq", value: "station-uuid-1" });
  });

  it("gives the platform counter the jobs that belong to no station", () => {
    expect(stationScope(null)).toEqual({ operator: "is", value: null });
  });

  it("never lets a shop match a null station_id", () => {
    // The failure this guards: `eq` with a null value matches nothing in
    // PostgREST, but `is` with a station id would be a syntax error the
    // client could swallow. The pair must always travel together.
    const scope = stationScope(station);
    expect(scope.operator).toBe("eq");
    expect(scope.value).not.toBeNull();
  });

  it("never hands the platform counter a shop's id", () => {
    expect(stationScope(null).value).toBeNull();
  });
});
