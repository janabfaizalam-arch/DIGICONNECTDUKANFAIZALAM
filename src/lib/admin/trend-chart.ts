/**
 * The geometry of the little chart on the admin home page.
 *
 * Drawn as plain SVG rather than with a charting library. Recharts is already
 * a dependency and would have been the quick answer, but this page is the one
 * an agent opens forty times a day on whatever laptop the branch has, and a
 * charting runtime is a lot of JavaScript to parse for one line and an axis.
 * The maths is thirty lines, it is pure, and it is tested — which a library's
 * layout never is.
 *
 * Everything here is unit-space arithmetic: points in, path strings out. No
 * DOM, no React, no colours.
 */

export type TrendPoint = { label: string; value: number };

export type TrendGeometry = {
  /** `d` for the line itself. */
  line: string;
  /** `d` for the filled area beneath it, closed along the baseline. */
  area: string;
  /** Where each point landed, for hover targets and dots. */
  points: Array<{ x: number; y: number; label: string; value: number }>;
  /** Horizontal grid lines, with the value each one represents. */
  ticks: Array<{ y: number; value: number }>;
  max: number;
};

export type TrendOptions = {
  width: number;
  height: number;
  /** Room for the axis labels along the bottom and the value labels. */
  padding?: { top?: number; right?: number; bottom?: number; left?: number };
  /** Intervals, not labels: 2 gives three gridlines. */
  tickCount?: number;
};

/**
 * A round number at or above the highest value.
 *
 * An axis that stops at 47 because the busiest day had 47 applications makes
 * every week look different from every other week. Rounding up to 50 means two
 * weeks can be compared by looking at them.
 */
export function niceMax(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalised = value / magnitude;
  const step = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10;
  return step * magnitude;
}

/**
 * Evenly spaced round values from zero to `max`, inclusive.
 *
 * Two intervals rather than three, because `niceMax` only ever returns 1, 2 or
 * 5 times a power of ten and halving those gives numbers a person recognises.
 * Thirds do not: a revenue axis topping out at ₹50,000 came out labelled
 * ₹16.7k and ₹33.3k, which is three labels nobody can do arithmetic with.
 *
 * Duplicates are dropped. With a max of 1 the midpoint rounds to 1 as well,
 * and two gridlines carrying the same number at different heights is worse
 * than one gridline.
 */
export function niceTicks(max: number, count = 2): number[] {
  const safeCount = Math.max(1, Math.floor(count));
  const step = max / safeCount;
  const values = Array.from({ length: safeCount + 1 }, (_, index) => {
    const value = index * step;
    // Halves of a small max are meaningful for money (₹2.5k) and nonsense for
    // a count of applications, so only whole numbers survive below ten.
    return max >= 10 || Number.isInteger(value) ? roundTick(value) : Math.round(value);
  });
  return values.filter((value, index) => index === 0 || value !== values[index - 1]);
}

/** Keeps one decimal for the halves that need it, whole numbers otherwise. */
function roundTick(value: number): number {
  return Math.abs(value - Math.round(value)) < 1e-9 ? Math.round(value) : Math.round(value * 10) / 10;
}

/**
 * Turn a series into paths.
 *
 * A single point gets a flat line across the plot rather than a dot nobody can
 * see: one day of data is still an answer to "how are we doing".
 */
export function trendGeometry(series: TrendPoint[], options: TrendOptions): TrendGeometry | null {
  if (!series.length) return null;

  const padding = {
    top: options.padding?.top ?? 8,
    right: options.padding?.right ?? 8,
    bottom: options.padding?.bottom ?? 18,
    left: options.padding?.left ?? 28,
  };

  const plotWidth = options.width - padding.left - padding.right;
  const plotHeight = options.height - padding.top - padding.bottom;
  if (plotWidth <= 0 || plotHeight <= 0) return null;

  const max = niceMax(Math.max(...series.map((point) => point.value)));
  const step = series.length === 1 ? 0 : plotWidth / (series.length - 1);

  const points = series.map((point, index) => ({
    x: padding.left + (series.length === 1 ? plotWidth / 2 : index * step),
    // Zero sits on the baseline, max at the top of the plot.
    y: padding.top + plotHeight - (point.value / max) * plotHeight,
    label: point.label,
    value: point.value,
  }));

  const line =
    series.length === 1
      ? `M ${padding.left} ${points[0].y} L ${padding.left + plotWidth} ${points[0].y}`
      : points.map((point, index) => `${index ? "L" : "M"} ${round(point.x)} ${round(point.y)}`).join(" ");

  const baseline = padding.top + plotHeight;
  const first = series.length === 1 ? padding.left : points[0].x;
  const last = series.length === 1 ? padding.left + plotWidth : points[points.length - 1].x;
  const area = `${line} L ${round(last)} ${round(baseline)} L ${round(first)} ${round(baseline)} Z`;

  const ticks = niceTicks(max, options.tickCount ?? 2).map((value) => ({
    value,
    y: padding.top + plotHeight - (value / max) * plotHeight,
  }));

  return { line, area, points, ticks, max };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Which point the pointer is nearest.
 *
 * Nearest-x rather than a hit box on the dot: at a week's worth of points the
 * dots are eight pixels apart and nobody lands on one with a trackpad.
 */
export function nearestPoint(points: TrendGeometry["points"], x: number): number {
  if (!points.length) return -1;
  let best = 0;
  let bestDistance = Infinity;
  points.forEach((point, index) => {
    const distance = Math.abs(point.x - x);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });
  return best;
}

/** Short money, for an axis where "₹1,20,000" would not fit. */
export function compactInr(value: number): string {
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(value % 10_000_000 ? 1 : 0)}Cr`;
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(value % 100_000 ? 1 : 0)}L`;
  if (value >= 1_000) return `₹${(value / 1_000).toFixed(value % 1_000 ? 1 : 0)}k`;
  return `₹${value}`;
}
