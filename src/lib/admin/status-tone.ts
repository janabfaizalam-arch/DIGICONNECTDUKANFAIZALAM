/**
 * The admin surface's status colours.
 *
 * Five files kept their own `Record<status, "bg-emerald-50 text-emerald-700
 * border-emerald-100">`, and seven more decided it inline with a ternary. The
 * same state was therefore a different green on different screens, and three
 * different palettes were in play for "this went wrong" — `rose`, `red` and
 * `amber` — depending on who wrote the page.
 *
 * The split here is deliberate:
 *
 *   **Tone → colour is universal.** Success is one green everywhere. That
 *   belongs in one place, and it is `STATUS_TONE_CLASS`.
 *
 *   **Status → tone is domain-specific.** `paid` is success on a payout queue,
 *   because the money reached the partner; it is *info* on the commission
 *   ledger, because approved money is already in the partner's wallet and paid
 *   money has left — two different events that must not share a colour. So each
 *   screen still decides what its own words mean, and only stops inventing the
 *   colour to say it with.
 */

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

/**
 * One tone, one set of classes.
 *
 * Three parts because that is how the panel renders a status: a tinted
 * background, readable text, and an outline that survives on a white card.
 *
 * The outline is a `ring`, not a `border`, and that is not a style preference.
 * `globals.css` carries an unlayered `* { border-color: var(--border) }` reset,
 * and an unlayered declaration outranks every rule inside a cascade layer —
 * which is where Tailwind puts its utilities. So `border-ds-danger-border`
 * compiles, ships, and then loses: measured in Chromium, all four tones came
 * out as the same grey `rgba(226, 232, 240, 0.8)` in both themes. Rings are
 * drawn as a shadow, are untouched by that reset, and were verified rendering
 * the right colour per tone in light and dark. `ring-1` is part of the record
 * rather than left to the call site, so no screen can lose its outline by
 * forgetting it.
 */
export const STATUS_TONE_CLASS: Record<StatusTone, string> = {
  success: "bg-ds-success-soft text-ds-success ring-1 ring-ds-success-border",
  warning: "bg-ds-warning-soft text-ds-warning ring-1 ring-ds-warning-border",
  danger: "bg-ds-danger-soft text-ds-danger ring-1 ring-ds-danger-border",
  info: "bg-ds-info-soft text-ds-info ring-1 ring-ds-info-border",
  neutral: "bg-ds-surface-sunken text-ds-text-muted ring-1 ring-ds-border",
};

/** Just the text colour, for a stat tile that has no pill around it. */
export const STATUS_TONE_TEXT: Record<StatusTone, string> = {
  success: "text-ds-success",
  warning: "text-ds-warning",
  danger: "text-ds-danger",
  info: "text-ds-info",
  neutral: "text-ds-text-muted",
};

/**
 * A pill that is also a button, so it needs a hover.
 *
 * Hover thickens and saturates the outline and leaves the fill alone. That is
 * deliberate: deepening the background to the next tint drops the label's
 * contrast with it below AA in light mode — measured at 4.03:1 for warning
 * against the 4.5:1 floor — and hover is exactly when somebody is reading the
 * label. A `brightness` filter is worse still, darkening in light mode and
 * lightening in dark, so one of the two always moves the wrong way. A ring
 * takes no part in layout, so nothing reflows under the cursor either.
 */
export const STATUS_TONE_INTERACTIVE: Record<StatusTone, string> = {
  success: "bg-ds-success-soft text-ds-success ring-1 ring-ds-success-border hover:ring-2 hover:ring-ds-success",
  warning: "bg-ds-warning-soft text-ds-warning ring-1 ring-ds-warning-border hover:ring-2 hover:ring-ds-warning",
  danger: "bg-ds-danger-soft text-ds-danger ring-1 ring-ds-danger-border hover:ring-2 hover:ring-ds-danger",
  info: "bg-ds-info-soft text-ds-info ring-1 ring-ds-info-border hover:ring-2 hover:ring-ds-info",
  neutral: "bg-ds-surface text-ds-text-secondary ring-1 ring-ds-border hover:ring-2 hover:ring-ds-border-strong",
};

/**
 * The common reading of a status word, for screens with no reason to differ.
 *
 * A screen that *does* have a reason — the commission ledger and its `paid` —
 * maps its own statuses and uses `STATUS_TONE_CLASS` directly. This is a
 * default, not a rule.
 */
const DEFAULT_TONE: Record<string, StatusTone> = {
  // Finished, and finished well.
  approved: "success",
  completed: "success",
  verified: "success",
  resolved: "success",
  credited: "success",
  active: "success",
  published: "success",

  // Waiting on somebody.
  pending: "warning",
  requested: "warning",
  hold: "warning",
  earned: "warning",
  reserved: "warning",
  draft: "warning",
  expired: "warning",

  // Finished, and finished badly.
  rejected: "danger",
  failed: "danger",
  cancelled: "danger",
  canceled: "danger",
  reversed: "danger",
  suspended: "danger",
  blacklisted: "danger",

  // Under way, or simply a fact.
  processing: "info",
  under_review: "info",
  in_process: "info",
  in_progress: "info",
  submitted: "info",
  paid: "info",
};

/**
 * Tone for a status word.
 *
 * Case and surrounding whitespace are ignored, matching how the SQL
 * aggregates compare status with `lower()`. An unrecognised word is neutral
 * rather than a guess: a grey chip reads as "a state we do not have an opinion
 * about", where a green one would assert something untrue.
 */
export function statusTone(status: unknown, fallback: StatusTone = "neutral"): StatusTone {
  const key = String(status ?? "").trim().toLowerCase();
  return DEFAULT_TONE[key] ?? fallback;
}

/**
 * Tone for a status, via a screen's own vocabulary.
 *
 * The map is the screen's reading of its own words — a payout queue says
 * `paid` is success, the commission ledger says it is info — and the fallback
 * covers a word the screen has not classified. Lookup is case-insensitive, as
 * in `statusTone`.
 */
export function toneFrom(
  map: Record<string, StatusTone>,
  status: unknown,
  fallback: StatusTone = "neutral",
): StatusTone {
  const key = String(status ?? "").trim().toLowerCase();
  return map[key] ?? fallback;
}

/** Pill classes for a status, via its default tone. */
export function statusToneClass(status: unknown, fallback: StatusTone = "neutral"): string {
  return STATUS_TONE_CLASS[statusTone(status, fallback)];
}
