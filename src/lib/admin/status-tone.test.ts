import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  STATUS_TONE_CLASS,
  STATUS_TONE_INTERACTIVE,
  STATUS_TONE_TEXT,
  statusTone,
  statusToneClass,
  toneFrom,
  type StatusTone,
} from "./status-tone";

const TONES: StatusTone[] = ["success", "warning", "danger", "info", "neutral"];

describe("tone to colour", () => {
  it("gives every tone a three-part class set", () => {
    // A status renders as a tinted background, readable text and an outline
    // that survives on a white card. A tone missing one of them renders wrong.
    for (const tone of TONES) {
      const classes = STATUS_TONE_CLASS[tone];
      expect(classes, tone).toMatch(/\bbg-ds-/);
      expect(classes, tone).toMatch(/\btext-ds-/);
      expect(classes, tone).toMatch(/\bring-ds-/);
    }
  });

  it("outlines with a ring, never a border", () => {
    // Not a style preference. `globals.css` has an unlayered
    // `* { border-color: var(--border) }`, and an unlayered declaration
    // outranks everything inside a cascade layer — which is where Tailwind's
    // utilities live. `border-ds-danger-border` therefore compiles and then
    // loses: all four tones render as the same grey in Chromium, in both
    // themes. Rings are shadows and are not affected.
    for (const record of [STATUS_TONE_CLASS, STATUS_TONE_INTERACTIVE]) {
      for (const tone of TONES) {
        // Anchored to a class boundary: `ring-ds-border` is a ring whose colour
        // happens to be the border token, which is fine. A class that *starts*
        // `border-` is the one that loses to the reset.
        expect(record[tone], tone).not.toMatch(/(?:^|\s)border-/);
        expect(record[tone], tone).toMatch(/\bring-1\b/);
      }
    }
  });

  it("gives the interactive variant a hover, so a tinted button looks clickable", () => {
    for (const tone of TONES) {
      expect(STATUS_TONE_INTERACTIVE[tone], tone).toMatch(/\bhover:ring-2\b/);
      expect(STATUS_TONE_INTERACTIVE[tone], tone).toMatch(/\bhover:ring-ds-/);
    }
  });

  it("hovers on the outline, leaving the fill — and the label's contrast — alone", () => {
    // Deepening the fill to the next tint reads well but drops the label below
    // AA in light mode (4.03:1 for warning). A `brightness` filter is worse
    // still: it darkens in light mode and lightens in dark, so one of the two
    // always moves the wrong way. See the contrast suite below.
    for (const tone of TONES) {
      expect(STATUS_TONE_INTERACTIVE[tone], tone).not.toMatch(/hover:bg-/);
      expect(STATUS_TONE_INTERACTIVE[tone], tone).not.toMatch(/brightness/);
    }
  });

  it("uses only tokens — no raw palette survives", () => {
    // The whole point: one green, defined once. A raw emerald here would put
    // the panel straight back to a different green per screen.
    const palette =
      /\b(?:bg|text|border|ring)-(?:slate|gray|zinc|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|neutral|stone)-\d/;

    for (const tone of TONES) {
      expect(STATUS_TONE_CLASS[tone], tone).not.toMatch(palette);
      expect(STATUS_TONE_TEXT[tone], tone).not.toMatch(palette);
      expect(STATUS_TONE_INTERACTIVE[tone], tone).not.toMatch(palette);
    }
  });

  it("keeps the tones visually distinct from one another", () => {
    const seen = new Set(TONES.map((tone) => STATUS_TONE_CLASS[tone]));

    expect(seen.size).toBe(TONES.length);
  });
});

describe("status to tone", () => {
  it("reads a finished-well status as success", () => {
    for (const status of ["approved", "completed", "verified", "resolved", "credited", "active"]) {
      expect(statusTone(status), status).toBe("success");
    }
  });

  it("reads a waiting status as warning", () => {
    for (const status of ["pending", "requested", "hold", "earned", "reserved", "expired"]) {
      expect(statusTone(status), status).toBe("warning");
    }
  });

  it("reads a finished-badly status as danger", () => {
    // Both spellings of cancelled appear in this data.
    for (const status of ["rejected", "failed", "cancelled", "canceled", "reversed", "suspended"]) {
      expect(statusTone(status), status).toBe("danger");
    }
  });

  it("separates cancelled and rejected from merely pending", () => {
    // The commission ledger used to paint both of these the same amber as
    // pending, so a void commission read as one still waiting its turn.
    expect(statusTone("cancelled")).not.toBe(statusTone("pending"));
    expect(statusTone("rejected")).not.toBe(statusTone("pending"));
  });

  it("does not call paid a success by default", () => {
    // Approved money sits in the partner's wallet; paid money has left the
    // business. Different events, so they must not share a colour — the
    // commission ledger depends on the distinction.
    expect(statusTone("paid")).toBe("info");
    expect(statusTone("approved")).toBe("success");
  });

  it("matches case-insensitively, like the SQL aggregates do", () => {
    // The app writes lowercase, so this is a no-op for rows it wrote. It
    // rescues a legacy or imported "Approved", which would otherwise fall
    // through to neutral.
    expect(statusTone("Approved")).toBe("success");
    expect(statusTone("  REJECTED  ")).toBe("danger");
  });

  it("stays neutral on a word it does not know, rather than guessing", () => {
    // A grey chip says "a state we have no opinion about". A green one would
    // assert something untrue about a status nobody has classified.
    for (const status of ["archived", "something_new", "", null, undefined, 42]) {
      expect(statusTone(status)).toBe("neutral");
    }
  });

  it("honours a caller's fallback for its own vocabulary", () => {
    expect(statusTone("bespoke_state", "info")).toBe("info");
    // A known word still wins over the fallback.
    expect(statusTone("approved", "info")).toBe("success");
  });

  it("resolves straight to classes for the common case", () => {
    expect(statusToneClass("approved")).toBe(STATUS_TONE_CLASS.success);
    expect(statusToneClass("unknown_thing")).toBe(STATUS_TONE_CLASS.neutral);
  });
});

describe("a screen's own vocabulary", () => {
  // The payout queue's reading, which differs from the default on one word.
  const PAYOUT: Record<string, StatusTone> = {
    requested: "warning",
    processing: "info",
    paid: "success",
    rejected: "danger",
  };

  it("lets a screen disagree with the default", () => {
    // Success on the payout queue, info on the commission ledger. Both right.
    expect(toneFrom(PAYOUT, "paid")).toBe("success");
    expect(statusTone("paid")).toBe("info");
  });

  it("falls back for a word the screen has not classified", () => {
    expect(toneFrom(PAYOUT, "on_hold", "warning")).toBe("warning");
    // And neutral when the caller names no fallback, rather than undefined —
    // indexing the old maps directly put an unstyled chip on the page.
    expect(toneFrom(PAYOUT, "on_hold")).toBe("neutral");
  });

  it("matches case-insensitively, as statusTone does", () => {
    expect(toneFrom(PAYOUT, " PAID ")).toBe("success");
  });

  it("always lands on a tone that has classes", () => {
    for (const status of ["paid", "nonsense", "", null, undefined]) {
      expect(STATUS_TONE_CLASS[toneFrom(PAYOUT, status)]).toBeTruthy();
    }
  });
});

describe("every tone is readable, in both themes", () => {
  /**
   * The token values, read from the stylesheet rather than copied here.
   *
   * A copy would pass for ever while the real colours drifted. The light values
   * come from `:root` and the dark ones from the block that redefines them.
   */
  const css = readFileSync(join(process.cwd(), "src/app/admin-design-tokens.css"), "utf8");

  /** `--ds-success` and friends, light theme then dark. */
  function tokenValues(name: string): [string, string] {
    const found = [...css.matchAll(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`, "g"))].map(
      (match) => match[1],
    );
    expect(found.length, `--${name}`).toBeGreaterThanOrEqual(2);
    return [found[0], found[1]];
  }

  /** Relative luminance, per WCAG 2.1. */
  function luminance(hex: string): number {
    const channel = (pair: string) => {
      const value = Number.parseInt(pair, 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    };
    const body = hex.replace("#", "");
    return (
      0.2126 * channel(body.slice(0, 2)) +
      0.7152 * channel(body.slice(2, 4)) +
      0.0722 * channel(body.slice(4, 6))
    );
  }

  function contrast(foreground: string, background: string): number {
    const a = luminance(foreground);
    const b = luminance(background);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }

  /** Foreground, then the fill it sits on, per tone. */
  const PAIRS: Record<StatusTone, [string, string]> = {
    success: ["ds-success", "ds-success-soft"],
    warning: ["ds-warning", "ds-warning-soft"],
    danger: ["ds-danger", "ds-danger-soft"],
    info: ["ds-info", "ds-info-soft"],
    neutral: ["ds-text-muted", "ds-surface-sunken"],
  };

  /** WCAG AA for text below 18.66px bold / 24px regular. A status pill is. */
  const AA = 4.5;

  it.each(TONES)("keeps %s above AA on its own fill, light and dark", (tone) => {
    const [fg, bg] = PAIRS[tone];
    const [fgLight, fgDark] = tokenValues(fg);
    const [bgLight, bgDark] = tokenValues(bg);

    expect(contrast(fgLight, bgLight), `${tone} light`).toBeGreaterThanOrEqual(AA);
    expect(contrast(fgDark, bgDark), `${tone} dark`).toBeGreaterThanOrEqual(AA);
  });
});
