/**
 * DC Partner chart palette.
 *
 * Built from the DigiConnect brand ramps (--dc-blue-600, --dc-orange-600) and
 * validated as a set against the white chart surface: lightness band, chroma
 * floor, adjacent-pair separation under deuteranopia / protanopia / tritanopia,
 * normal-vision separation, and 3:1 contrast.
 *
 * Note what is *not* here: a six-hue categorical palette. Every chart on the
 * partner home plots either one measure (the two trend charts, the service
 * ranking) or a set of states (the status bar), so no chart needs to hand out
 * identities by hue. A ranked bar chart in particular wears one flat hue —
 * colouring bars by their rank would make colour mean position, which changes
 * the moment the ranking does.
 */

/** Single-measure marks. Collection is money, applications are counts. */
export const CHART_COLLECTION = "#1268e8"; // brand blue
export const CHART_APPLICATIONS = "#f25a00"; // brand orange
/** The one hue the ranked service bars wear. */
export const CHART_RANKED_BAR = "#1268e8";
/** The folded tail. Deliberately achromatic so it reads as "not a category". */
export const CHART_OTHER = "#9fb0cc";

/**
 * Reserved state colours — never reused as a data series.
 *
 * The four chromatic steps validate as a set (worst adjacent pair
 * `#c98500`↔`#d1344a`: CVD ΔE 11.3, normal-vision ΔE 18.8, all ≥ 3:1 on white).
 * `neutral` is the deliberate de-emphasis step for a closed application; it
 * sits below the chroma floor by design, and its identity is carried by the
 * legend, the direct label and the 2px surface gap rather than by hue.
 */
export const CHART_STATUS = {
  critical: "#d1344a",
  warning: "#c98500",
  info: "#1268e8",
  good: "#0f9268",
  neutral: "#94a3b8",
} as const;

/** Chart surface and ink. Marks carry hue; text never does. */
export const CHART_SURFACE = "#ffffff";
export const CHART_GRID = "#e4ebf7";
export const CHART_AXIS_TEXT = "#64769a";

/** Mark specs the whole dashboard holds to. */
export const CHART_MARK = {
  /** Bars are capped, never filling the band — the leftover is deliberate air. */
  maxBarSize: 22,
  /** Rounded data-end, square at the baseline. */
  barRadiusVertical: [4, 4, 0, 0] as [number, number, number, number],
  barRadiusHorizontal: [0, 4, 4, 0] as [number, number, number, number],
  lineWidth: 2,
  dotRadius: 4,
  /** The 2px ring that keeps a dot legible where it crosses its own line. */
  dotRingWidth: 2,
  /** Area fill is a wash, never a saturated block. */
  areaOpacity: 0.1,
  /** The surface gap that separates touching stacked segments. */
  segmentGap: 2,
} as const;

/** Fixed hue per status bucket — a state, so it wears the status palette. */
export const STATUS_BUCKET_COLOR = {
  action_needed: CHART_STATUS.critical,
  awaiting_payment: CHART_STATUS.warning,
  in_progress: CHART_STATUS.info,
  completed: CHART_STATUS.good,
  closed: CHART_STATUS.neutral,
} as const;
