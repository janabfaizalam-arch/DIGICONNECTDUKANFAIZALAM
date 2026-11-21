import { describe, expect, it } from "vitest";
import { getSafeNext } from "@/lib/safe-next";

describe("getSafeNext", () => {
  it("keeps a path on this site", () => {
    expect(getSafeNext("/customer/dashboard?tab=1")).toBe("/customer/dashboard?tab=1");
  });

  it("drops anything that leaves the site", () => {
    for (const value of ["//evil.com", "/\\evil.com", "/\\/evil.com", "https://evil.com", "evil.com", "", null]) {
      expect(getSafeNext(value)).toBe("/");
    }
  });

  it("cannot carry raw markup into the page", () => {
    expect(getSafeNext("/x</script><script>alert(1)</script>")).not.toContain("<");
  });
});
