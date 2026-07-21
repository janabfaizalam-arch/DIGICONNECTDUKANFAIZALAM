import { describe, expect, it } from "vitest";

import { speakINR, speakStatus } from "./a11y";

describe("speakINR", () => {
  it("provides a screen-reader friendly currency phrase", () => {
    expect(speakINR(125000)).toBe("1,25,000 rupees");
    expect(speakINR(null)).toBe("0 rupees");
  });
});

describe("speakStatus", () => {
  it("announces status without relying on color", () => {
    expect(speakStatus("paid")).toBe("Status: paid");
    expect(speakStatus("pending", "Pending review")).toBe("Status: Pending review");
  });
});
