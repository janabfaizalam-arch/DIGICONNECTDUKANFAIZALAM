import { describe, expect, it } from "vitest";

import {
  compactInr,
  nearestPoint,
  niceMax,
  niceTicks,
  trendGeometry,
  type TrendPoint,
} from "@/lib/admin/trend-chart";

const BOX = { width: 320, height: 120 };

/* ─────────────────────────────────────────────────────────────────────────
   An axis somebody can compare two weeks with
   ───────────────────────────────────────────────────────────────────────── */

/**
 * An axis that stops at 47 because the busiest day had 47 applications makes
 * every week look different from every other week — the line always reaches
 * the top, whatever happened.
 */
describe("choosing the top of the axis", () => {
  it("rounds up to something a person would say out loud", () => {
    expect(niceMax(47)).toBe(50);
    expect(niceMax(3)).toBe(5);
    expect(niceMax(11)).toBe(20);
    expect(niceMax(120)).toBe(200);
    expect(niceMax(1)).toBe(1);
  });

  it("never returns zero, which would divide the whole chart by nothing", () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(-5)).toBe(1);
    expect(niceMax(Number.NaN)).toBe(1);
  });

  it("is always at or above the real maximum", () => {
    for (const value of [1, 7, 23, 99, 101, 4999, 12345]) {
      expect(niceMax(value), `${value} was clipped`).toBeGreaterThanOrEqual(value);
    }
  });

  it("gives gridlines a person can do arithmetic with", () => {
    /*
      Thirds are what went wrong: a revenue axis topping out at 50,000 came
      out labelled 16.7k and 33.3k. niceMax only ever returns 1, 2 or 5 times
      a power of ten, and halving those always lands somewhere recognisable.
    */
    expect(niceTicks(50000)).toEqual([0, 25000, 50000]);
    expect(niceTicks(20)).toEqual([0, 10, 20]);
    expect(niceTicks(200)).toEqual([0, 100, 200]);
    expect(niceTicks(5000)).toEqual([0, 2500, 5000]);
  });

  it("keeps counts whole, because half an application is not a thing", () => {
    for (const tick of niceTicks(5)) expect(Number.isInteger(tick)).toBe(true);
    for (const tick of niceTicks(1)) expect(Number.isInteger(tick)).toBe(true);
  });

  it("never prints the same number on two gridlines", () => {
    // With a max of 1 the midpoint rounds to 1 as well.
    expect(niceTicks(1)).toEqual([0, 1]);
    expect(niceTicks(2)).toEqual([0, 1, 2]);
    for (const max of [1, 2, 5, 10, 20, 50, 100]) {
      const ticks = niceTicks(max);
      expect(new Set(ticks).size, `${max} repeated a gridline`).toBe(ticks.length);
    }
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   The shape itself
   ───────────────────────────────────────────────────────────────────────── */

describe("drawing the line", () => {
  const week: TrendPoint[] = [
    { label: "Mon", value: 4 },
    { label: "Tue", value: 9 },
    { label: "Wed", value: 2 },
    { label: "Thu", value: 12 },
  ];

  it("puts one point per day, in order, left to right", () => {
    const geometry = trendGeometry(week, BOX)!;
    expect(geometry.points).toHaveLength(4);
    for (let i = 1; i < geometry.points.length; i += 1) {
      expect(geometry.points[i].x).toBeGreaterThan(geometry.points[i - 1].x);
    }
  });

  it("draws a bigger number higher up the page", () => {
    // SVG y grows downwards, which is the easiest thing in a chart to invert.
    const geometry = trendGeometry(week, BOX)!;
    const [mon, tue, wed, thu] = geometry.points;
    expect(tue.y).toBeLessThan(mon.y);
    expect(wed.y).toBeGreaterThan(tue.y);
    expect(thu.y).toBeLessThan(tue.y);
  });

  it("keeps every point inside the box", () => {
    const geometry = trendGeometry(week, BOX)!;
    for (const point of geometry.points) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(BOX.width);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(BOX.height);
    }
  });

  it("closes the fill along the baseline rather than leaving it open", () => {
    // An unclosed area path fills as a wedge back to the first point.
    const geometry = trendGeometry(week, BOX)!;
    expect(geometry.area.startsWith(geometry.line)).toBe(true);
    expect(geometry.area.trimEnd().endsWith("Z")).toBe(true);
  });

  it("rests zero on the baseline, not floating above it", () => {
    const geometry = trendGeometry([{ label: "Mon", value: 0 }, { label: "Tue", value: 10 }], BOX)!;
    const baseline = Math.max(...geometry.ticks.map((tick) => tick.y));
    expect(geometry.points[0].y).toBeCloseTo(baseline, 6);
  });

  it("draws a flat line for a single day instead of an invisible dot", () => {
    // One day of data is still an answer to "how are we doing".
    const geometry = trendGeometry([{ label: "Mon", value: 6 }], BOX)!;
    expect(geometry.points).toHaveLength(1);
    expect(geometry.line).toMatch(/^M .* L .*$/);
    expect(geometry.area.trimEnd().endsWith("Z")).toBe(true);
  });

  it("returns nothing for no data, rather than a broken path", () => {
    expect(trendGeometry([], BOX)).toBeNull();
  });

  it("returns nothing rather than drawing outside a box with no room", () => {
    expect(trendGeometry([{ label: "Mon", value: 1 }], { width: 10, height: 10 })).toBeNull();
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Hover
   ───────────────────────────────────────────────────────────────────────── */

describe("finding the point under the pointer", () => {
  const geometry = trendGeometry(
    [
      { label: "Mon", value: 4 },
      { label: "Tue", value: 9 },
      { label: "Wed", value: 2 },
    ],
    BOX,
  )!;

  it("takes the nearest column, not a hit box on the dot", () => {
    // At a week's worth of points the dots are a few pixels apart and nobody
    // lands on one with a trackpad.
    const [mon, tue, wed] = geometry.points;
    expect(nearestPoint(geometry.points, mon.x)).toBe(0);
    expect(nearestPoint(geometry.points, tue.x + 3)).toBe(1);
    expect(nearestPoint(geometry.points, wed.x - 3)).toBe(2);
  });

  it("clamps to the ends rather than returning nothing", () => {
    expect(nearestPoint(geometry.points, -500)).toBe(0);
    expect(nearestPoint(geometry.points, 5000)).toBe(2);
  });

  it("says nothing is there when there is nothing", () => {
    expect(nearestPoint([], 10)).toBe(-1);
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Money on a narrow axis
   ───────────────────────────────────────────────────────────────────────── */

describe("short money", () => {
  it("uses the units an Indian office actually says", () => {
    expect(compactInr(2500)).toBe("₹2.5k");
    expect(compactInr(250000)).toBe("₹2.5L");
    expect(compactInr(30000000)).toBe("₹3Cr");
  });

  it("drops the decimal when it would be a zero", () => {
    expect(compactInr(3000)).toBe("₹3k");
    expect(compactInr(200000)).toBe("₹2L");
  });

  it("leaves small amounts alone", () => {
    expect(compactInr(0)).toBe("₹0");
    expect(compactInr(999)).toBe("₹999");
  });
});
