import { describe, expect, it } from "vitest";

import { readCode } from "@/lib/testing/source";

const provider = readCode("src/components/ap/score-visibility.tsx");
const form = readCode("src/components/ap/ap-application-form.tsx");
const layout = readCode("src/app/ap/layout.tsx");
const panel = readCode("src/components/ap/home/earnings-panel.tsx");
const catalogue = readCode("src/app/ap/services/services-client.tsx");
const detail = readCode("src/app/ap/services/[slug]/detail-client.tsx");

/* ─────────────────────────────────────────────────────────────────────────
   Off until the partner says otherwise
   ───────────────────────────────────────────────────────────────────────── */

describe("Score starts hidden", () => {
  it("initialises to false, which is also what the server renders", () => {
    // Starting from true would flash every figure on screen before the effect
    // could correct it — in front of whoever is looking at the phone.
    expect(provider).toContain("useState(false)");
  });

  it("falls back to hidden when storage cannot be read", () => {
    const effect = provider.slice(provider.indexOf("useEffect(() => {"));
    expect(effect).toContain('window.localStorage.getItem(STORAGE_KEY) === "true"');
  });

  it("reports hidden outside the provider rather than throwing", () => {
    const hook = provider.slice(provider.indexOf("export function useScoreVisibility"));
    expect(hook).toContain("visible: false");
    expect(hook).not.toContain("throw");
  });
});

describe("hidden means gone, not dotted out", () => {
  it("renders nothing by default when hidden", () => {
    expect(provider).toContain("fallback = null");
  });

  it("no screen falls back to a row of dots", () => {
    // Dots still tell the customer a number is being kept from them, which is
    // the conversation the partner was avoiding.
    for (const [name, file] of [
      ["the catalogue", catalogue],
      ["the service detail", detail],
      ["the application form", form],
    ] as const) {
      expect(file, `${name} still masks with dots`).not.toContain("••••");
    }
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   One switch, not one per page
   ───────────────────────────────────────────────────────────────────────── */

describe("the switch is shared", () => {
  it("is mounted above every screen in the panel", () => {
    expect(layout).toContain("ScoreVisibilityProvider");
  });

  it("no screen keeps its own copy of the state any more", () => {
    // The catalogue and the service detail each had their own useState and
    // their own read of the key, so they could disagree with each other and
    // no other screen knew about the setting at all.
    for (const [name, file] of [["the catalogue", catalogue], ["the service detail", detail]] as const) {
      expect(file, `${name} still has a local copy`).not.toContain("setShowScore");
      expect(file, `${name} still reads storage itself`).not.toContain("digipartner_show_score");
    }
  });

  it("keeps the key the catalogue already used, so the setting survives", () => {
    expect(provider).toContain('"digipartner_show_score"');
  });

  it("follows the switch being flipped in another tab", () => {
    expect(provider).toContain('addEventListener("storage"');
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   The screen the customer is shown
   ───────────────────────────────────────────────────────────────────────── */

describe("the payment and receipt screens never carry Score", () => {
  it("has no Score beside the amount the customer pays", () => {
    // "Your Score ₹120" next to "Total Payable ₹600" is the customer reading
    // the partner's cut off the glass. Not switch-governed — simply absent.
    expect(form).not.toContain("Your Score");
  });

  it("still shows the customer their own total", () => {
    expect(form).toContain("Total Payable");
    expect(form).toContain("Amount Paid");
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   What the partner's own money is called
   ───────────────────────────────────────────────────────────────────────── */

describe("the panel says Score", () => {
  it("renamed the dashboard panel and its figures", () => {
    expect(panel).toContain('<h2 className="dcp-h2">Score</h2>');
    expect(panel).toContain('label: "Score earned"');
    expect(panel).toContain('label: "Score pending"');
    expect(panel).not.toContain('label: "Commission earned"');
  });

  it("leaves the customer's own collection alone", () => {
    // What the partner collected is the customer's money, not the partner's
    // cut, so it stays on screen with the switch off.
    expect(panel).toContain('label: "This month", value: formatINR(data.monthCollection), rail: "var(--dcp-brand)", score: false');
    expect(panel).toContain("scoreVisible || !figure.score");
  });
});
