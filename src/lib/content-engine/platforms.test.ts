import { describe, expect, it } from "vitest";

import { buildDesignSpec, fillTemplate, specToBrief, trimHeadline, TEMPLATE_VARIABLES } from "@/lib/content-engine/design-spec";
import { DEFAULT_BRAND } from "@/lib/content-engine/brand-voice";
import {
  ALL_PLATFORMS,
  CANVASES,
  canvasFor,
  fitHashtags,
  fitToLimit,
  isPlatform,
  specFor,
} from "@/lib/content-engine/platforms";

/**
 * Every platform is different, and the versions have to know how.
 *
 * The failure this guards against is the one every small business commits:
 * the identical caption on Instagram, Facebook, LinkedIn and WhatsApp,
 * hashtags and all. On WhatsApp that reads as spam.
 */

describe("what each platform will accept", () => {
  it("has a spec for every platform, with nothing left blank", () => {
    for (const platform of ALL_PLATFORMS) {
      const spec = specFor(platform);
      expect(spec.captionLimit, platform).toBeGreaterThan(0);
      expect(spec.formats.length, platform).toBeGreaterThan(0);
      expect(spec.voiceNote.length, platform).toBeGreaterThan(20);
    }
  });

  it("knows WhatsApp never takes a hashtag", () => {
    expect(specFor("WHATSAPP").hashtags.max).toBe(0);
    expect(fitHashtags(["labourcard", "sarkariyojana"], "WHATSAPP")).toEqual([]);
  });

  it("knows an Instagram caption link is not clickable", () => {
    expect(specFor("INSTAGRAM").clickableLinks).toBe(false);
    expect(specFor("FACEBOOK").clickableLinks).toBe(true);
  });

  it("rejects a platform name it does not know", () => {
    expect(isPlatform("INSTAGRAM")).toBe(true);
    expect(isPlatform("MYSPACE")).toBe(false);
    expect(isPlatform(undefined)).toBe(false);
  });
});

describe("hashtags", () => {
  it("caps them at what the platform tolerates", () => {
    const tags = fitHashtags(
      ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n"],
      "INSTAGRAM",
    );
    expect(tags.length).toBe(specFor("INSTAGRAM").hashtags.max);
  });

  it("cleans them up rather than trusting the model's formatting", () => {
    expect(fitHashtags(["##labour card", " sarkari ", ""], "INSTAGRAM")).toEqual(["#labourcard", "#sarkari"]);
  });

  it("drops a repeat, whatever its case", () => {
    expect(fitHashtags(["LabourCard", "labourcard"], "INSTAGRAM")).toEqual(["#LabourCard"]);
  });
});

describe("fitting to a length", () => {
  it("leaves a short caption alone", () => {
    expect(fitToLimit("Labour Card banwaiye", 100)).toBe("Labour Card banwaiye");
  });

  it("never cuts a word in half", () => {
    const text = "Labour Card banwane ke liye aapko teen documents chahiye honge";
    const cut = fitToLimit(text, 30);
    expect(cut.length).toBeLessThanOrEqual(30);
    expect(text.startsWith(cut)).toBe(true);
    expect(cut.endsWith(" ")).toBe(false);
  });
});

describe("canvases", () => {
  it("gives a story a tall canvas and a post a portrait one", () => {
    expect(canvasFor("INSTAGRAM", "STORY")).toEqual(CANVASES.instagram_story);
    expect(canvasFor("INSTAGRAM", "CAROUSEL")).toEqual(CANVASES.instagram_carousel);
    expect(canvasFor("INSTAGRAM", "STATIC_POSTER")).toEqual(CANVASES.instagram_post);
  });

  it("uses the thumbnail size for YouTube", () => {
    expect(canvasFor("YOUTUBE", "YOUTUBE_SHORT")).toEqual(CANVASES.youtube_thumbnail);
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Design specifications
   ───────────────────────────────────────────────────────────────────────── */

describe("the design brief", () => {
  const spec = buildDesignSpec({
    platform: "INSTAGRAM",
    format: "STORY",
    hook: "Labour Card ki last date nikal rahi hai",
    copy: {
      headline: "Labour Card ki last date bahut jaldi nikal jaayegi is baar",
      subheadline: "31 March tak hi",
      body: ["Aadhaar chahiye", "90 din ka kaam", "Form dukan par bhar dijiye", "Ek extra line"],
      cta: "WhatsApp kijiye",
      visualSuggestion: "A worker at a counter holding a form",
    },
    brand: DEFAULT_BRAND,
  });

  it("keeps the headline to seven words, as the brand's visual rules require", () => {
    expect(spec.headline.split(" ")).toHaveLength(7);
    expect(trimHeadline("one two three four five six seven eight nine")).toBe("one two three four five six seven");
  });

  it("keeps at most three body lines, because a poster is not a page", () => {
    expect(spec.body).toHaveLength(3);
  });

  it("gives a story a deeper margin, because Instagram covers its top and bottom", () => {
    expect(spec.safeMargins.bottom).toBeGreaterThan(spec.safeMargins.right);
    expect(spec.safeMargins.top).toBeGreaterThan(spec.safeMargins.right);
  });

  it("takes colours and fonts from the brand rather than from a model", () => {
    expect(spec.colors.primary).toBe(DEFAULT_BRAND.primaryColors[0]);
    expect(spec.font).toEqual(DEFAULT_BRAND.fonts);
  });

  it("fills every template variable the templates use", () => {
    for (const variable of TEMPLATE_VARIABLES) {
      expect(Object.keys(spec.variables), variable).toContain(variable);
    }
    expect(spec.variables["{{HEADLINE}}"]).toBe(spec.headline);
  });

  it("is complete enough to build by hand, with no Canva anywhere", () => {
    const brief = specToBrief(spec, DEFAULT_BRAND);
    expect(brief).toContain("1080 × 1920");
    expect(brief).toContain("Safe margins");
    expect(brief).toContain("WhatsApp kijiye");
    expect(brief).toContain(DEFAULT_BRAND.fonts.heading);
  });
});

describe("filling a template", () => {
  it("replaces what it knows", () => {
    expect(fillTemplate("{{HEADLINE}} — {{CTA}}", { "{{HEADLINE}}": "Labour Card", "{{CTA}}": "Aaiye" })).toBe(
      "Labour Card — Aaiye",
    );
  });

  it("leaves an unknown placeholder alone rather than blanking it", () => {
    // A silently emptied field is a design that ships with a hole in it.
    expect(fillTemplate("{{HEADLINE}} {{UNKNOWN}}", { "{{HEADLINE}}": "Hi" })).toBe("Hi {{UNKNOWN}}");
  });
});
