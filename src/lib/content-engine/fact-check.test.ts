import { describe, expect, it } from "vitest";

import { isOfficialSource, verdict } from "@/lib/content-engine/engines/fact-check";
import type { VerificationStatus } from "@/lib/content-engine/types";

/**
 * The verdict is arithmetic, not a judgement call.
 *
 * Asking a model to summarise its own findings invites it to round a set of
 * unverified claims up to "looks fine", and the approval screen and the
 * publishing gate both read this one word. So the rule is three lines of code
 * and these are the cases it has to get right.
 */

function claim(status: VerificationStatus, critical = false) {
  return { verificationStatus: status, critical };
}

describe("what a set of claims adds up to", () => {
  it("blocks when a critical claim has no source", () => {
    const result = verdict([claim("VERIFIED"), claim("UNVERIFIED", true)]);
    expect(result.status).toBe("NEEDS_REVIEW");
    expect(result.blocking).toBe(true);
  });

  it("blocks when a critical claim only partly checks out", () => {
    expect(verdict([claim("NEEDS_REVIEW", true)]).blocking).toBe(true);
  });

  it("blocks outright when a source contradicts the content", () => {
    const result = verdict([claim("VERIFIED", true), claim("REJECTED")]);
    expect(result.status).toBe("REJECTED");
    expect(result.blocking).toBe(true);
  });

  it("does not block on a non-critical gap, but does not call it verified either", () => {
    const result = verdict([claim("VERIFIED", true), claim("UNVERIFIED", false)]);
    expect(result.status).toBe("NEEDS_REVIEW");
    expect(result.blocking).toBe(false);
  });

  it("passes only when everything checks out", () => {
    const result = verdict([claim("VERIFIED", true), claim("VERIFIED")]);
    expect(result.status).toBe("VERIFIED");
    expect(result.blocking).toBe(false);
  });

  it("treats a post with no claims as nothing to verify", () => {
    // A post that asserts no facts is not an unverified post; it is a post
    // with nothing in it to check.
    expect(verdict([])).toEqual({ status: "VERIFIED", blocking: false });
  });
});

describe("what counts as an official source", () => {
  it("recognises Indian government domains", () => {
    expect(isOfficialSource("https://labour.gov.in/notification")).toBe(true);
    expect(isOfficialSource("https://uplabour.nic.in/scheme")).toBe(true);
  });

  it("does not accept a news article as official", () => {
    expect(isOfficialSource("https://timesofindia.indiatimes.com/story")).toBe(false);
    expect(isOfficialSource("https://somegovblog.wordpress.com/labour")).toBe(false);
  });

  it("is not fooled by a lookalike host", () => {
    expect(isOfficialSource("https://labour.gov.in.example.com/page")).toBe(false);
  });

  it("says no to something that is not a URL at all", () => {
    expect(isOfficialSource("labour department circular")).toBe(false);
  });
});
