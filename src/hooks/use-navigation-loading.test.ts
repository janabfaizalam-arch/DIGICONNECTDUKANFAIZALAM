import { describe, expect, it } from "vitest";

import {
  NAV_LOADER_MAX_MS,
  NAV_LOADER_MIN_VISIBLE_MS,
  NAV_LOADER_SHOW_DELAY_MS,
  computeHideDelayMs,
  isInternalAppNavigation,
} from "@/hooks/use-navigation-loading";

describe("navigation loading helpers", () => {
  it("uses flicker-safe delay and min visible duration", () => {
    expect(NAV_LOADER_SHOW_DELAY_MS).toBeGreaterThanOrEqual(120);
    expect(NAV_LOADER_SHOW_DELAY_MS).toBeLessThanOrEqual(180);
    expect(NAV_LOADER_MIN_VISIBLE_MS).toBeGreaterThanOrEqual(250);
    expect(NAV_LOADER_MAX_MS).toBeGreaterThan(NAV_LOADER_MIN_VISIBLE_MS);
  });

  it("allows internal same-origin navigations", () => {
    expect(
      isInternalAppNavigation({
        href: "/admin/applications",
        currentOrigin: "https://www.rnos.in",
        currentPathWithSearch: "/admin",
      }),
    ).toBe(true);
  });

  it("ignores external, modified-click, download, and new-tab links", () => {
    expect(
      isInternalAppNavigation({
        href: "https://example.com/x",
        currentOrigin: "https://www.rnos.in",
        currentPathWithSearch: "/",
      }),
    ).toBe(false);

    expect(
      isInternalAppNavigation({
        href: "/admin",
        currentOrigin: "https://www.rnos.in",
        currentPathWithSearch: "/",
        metaKey: true,
      }),
    ).toBe(false);

    expect(
      isInternalAppNavigation({
        href: "/file.pdf",
        currentOrigin: "https://www.rnos.in",
        currentPathWithSearch: "/",
        download: true,
      }),
    ).toBe(false);

    expect(
      isInternalAppNavigation({
        href: "/admin",
        currentOrigin: "https://www.rnos.in",
        currentPathWithSearch: "/",
        target: "_blank",
      }),
    ).toBe(false);
  });

  it("ignores hash-only / same-path navigations", () => {
    expect(
      isInternalAppNavigation({
        href: "/admin#section",
        currentOrigin: "https://www.rnos.in",
        currentPathWithSearch: "/admin",
      }),
    ).toBe(false);
  });

  it("keeps loader visible for minimum duration after it appears", () => {
    expect(computeHideDelayMs({ shownAt: 1000, now: 1100, minVisibleMs: 250 })).toBe(150);
    expect(computeHideDelayMs({ shownAt: 1000, now: 1400, minVisibleMs: 250 })).toBe(0);
    expect(computeHideDelayMs({ shownAt: null, now: 1000 })).toBe(0);
  });
});
