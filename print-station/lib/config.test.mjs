import { describe, expect, it } from "vitest";

import { DEFAULTS, configProblems, isReady, normalizeConfig, redactConfig } from "./config.mjs";

/**
 * Everything a shop owner can type wrong.
 *
 * This program is set up once, by somebody who is not going to read a manual,
 * on a computer behind a counter. Every value below is one they can get wrong
 * in a way that would otherwise show up as "the printer just stopped".
 */

describe("normalizeConfig", () => {
  it("fills in defaults for an empty config", () => {
    expect(normalizeConfig({})).toEqual(DEFAULTS);
    expect(normalizeConfig(null)).toEqual(DEFAULTS);
    expect(normalizeConfig(undefined)).toEqual(DEFAULTS);
  });

  it("strips the trailing slash a pasted address usually carries", () => {
    expect(normalizeConfig({ serverUrl: "https://rnos.in/" }).serverUrl).toBe("https://rnos.in");
    expect(normalizeConfig({ serverUrl: "https://rnos.in///" }).serverUrl).toBe("https://rnos.in");
  });

  it("trims the whitespace a copied key brings with it", () => {
    expect(normalizeConfig({ agentToken: "  dcp_abc  " }).agentToken).toBe("dcp_abc");
    expect(normalizeConfig({ printerName: " HP LaserJet " }).printerName).toBe("HP LaserJet");
  });

  it("keeps a blank address on the default rather than an empty string", () => {
    expect(normalizeConfig({ serverUrl: "   " }).serverUrl).toBe(DEFAULTS.serverUrl);
  });

  it("clamps the poll interval instead of trusting it", () => {
    // 0 would be a loop with no pause in it, hammering the server all day.
    expect(normalizeConfig({ pollSeconds: 0 }).pollSeconds).toBe(2);
    expect(normalizeConfig({ pollSeconds: -30 }).pollSeconds).toBe(2);
    // A mistyped 600 would leave a paying customer waiting ten minutes.
    expect(normalizeConfig({ pollSeconds: 600 }).pollSeconds).toBe(60);
    expect(normalizeConfig({ pollSeconds: 8 }).pollSeconds).toBe(8);
  });

  it("falls back when the interval is not a number at all", () => {
    expect(normalizeConfig({ pollSeconds: "soon" }).pollSeconds).toBe(DEFAULTS.pollSeconds);
    expect(normalizeConfig({ pollSeconds: null }).pollSeconds).toBe(DEFAULTS.pollSeconds);
  });

  it("rounds a fractional interval rather than sleeping on a fraction", () => {
    expect(normalizeConfig({ pollSeconds: 7.6 }).pollSeconds).toBe(8);
  });

  it("reads duplex as a plain boolean whatever the form sent", () => {
    expect(normalizeConfig({ duplex: "on" }).duplex).toBe(true);
    expect(normalizeConfig({ duplex: "" }).duplex).toBe(false);
    expect(normalizeConfig({}).duplex).toBe(false);
  });
});

describe("configProblems", () => {
  const ready = normalizeConfig({
    serverUrl: "https://rnos.in",
    agentToken: "dcp_abcdefgh",
    printerName: "HP LaserJet",
  });

  it("passes a complete config", () => {
    expect(configProblems(ready)).toEqual([]);
    expect(isReady(ready)).toBe(true);
  });

  it("asks for the key when it is missing", () => {
    const problems = configProblems({ ...ready, agentToken: "" });
    expect(problems[0]).toMatch(/key/i);
    expect(isReady({ ...ready, agentToken: "" })).toBe(false);
  });

  it("catches a key that is not a key — usually the station code pasted by mistake", () => {
    expect(configProblems({ ...ready, agentToken: "K7M2QD" })[0]).toMatch(/dcp_/);
  });

  it("asks for a printer, because a job with nowhere to go fails silently", () => {
    expect(configProblems({ ...ready, printerName: "" })[0]).toMatch(/printer/i);
  });

  it("rejects an address without a scheme", () => {
    expect(configProblems({ ...ready, serverUrl: "rnos.in" })[0]).toMatch(/http/);
  });

  it("reports every problem at once, not one per save", () => {
    expect(configProblems({ serverUrl: "rnos.in", agentToken: "", printerName: "" })).toHaveLength(3);
  });
});

describe("redactConfig", () => {
  it("shows enough of the key to recognise it and not enough to use it", () => {
    const redacted = redactConfig({ agentToken: "dcp_abcdefghijklmnop" });
    expect(redacted.agentToken).toBe("dcp_abcd…mnop");
    expect(redacted.agentToken).not.toContain("efghijkl");
  });

  it("leaves an empty key empty rather than printing ellipses", () => {
    expect(redactConfig({ agentToken: "" }).agentToken).toBe("");
  });
});

describe("a bundle downloaded onto a computer that was already set up", () => {
  /*
    The failure this reproduces, from a real shop's screen:

    A partner had set the program up by hand. They then pressed Download on
    their dashboard, which issued a new key and retired the old one, unzipped
    the folder and ran it — and were told "Your key was refused". The saved
    settings held the dead key; the working one sat unread in the folder they
    had just double-clicked.
  */
  const bundled = { agentToken: "dcp_newkey", serverUrl: "https://rnos.in" };

  it("takes the newer key out of the folder it was run from", () => {
    const stored = { agentToken: "dcp_oldkey", printerName: "EPSON L8050", seededFrom: "" };
    const merged = normalizeConfig({
      ...stored,
      agentToken: bundled.agentToken,
      seededFrom: bundled.agentToken,
    });
    expect(merged.agentToken).toBe("dcp_newkey");
  });

  it("keeps the printer this shop chose on this computer", () => {
    // A download knows the shop's key. It does not know which of the three
    // printers on the counter they picked, and must not guess.
    const merged = normalizeConfig({
      agentToken: bundled.agentToken,
      printerName: "EPSON L8050",
      pollSeconds: 12,
      duplex: true,
      seededFrom: bundled.agentToken,
    });
    expect(merged.printerName).toBe("EPSON L8050");
    expect(merged.pollSeconds).toBe(12);
    expect(merged.duplex).toBe(true);
  });

  it("remembers which bundle it took, so it adopts each one only once", () => {
    expect(normalizeConfig({ seededFrom: "dcp_newkey" }).seededFrom).toBe("dcp_newkey");
  });

  it("treats a key typed in afterwards as the shop's own choice", () => {
    // seededFrom still names the bundle's key, so a later restart sees no
    // new bundle and leaves the hand-entered key alone.
    const afterManualEdit = normalizeConfig({ agentToken: "dcp_typed", seededFrom: "dcp_newkey" });
    expect(afterManualEdit.agentToken).toBe("dcp_typed");
    expect(afterManualEdit.seededFrom).not.toBe(afterManualEdit.agentToken);
  });

  it("carries seededFrom through a save, or the adoption repeats forever", () => {
    expect(DEFAULTS).toHaveProperty("seededFrom", "");
    expect(normalizeConfig({}).seededFrom).toBe("");
  });
});
