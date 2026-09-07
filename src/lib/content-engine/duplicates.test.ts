import { describe, expect, it } from "vitest";

import {
  DUPLICATE_THRESHOLD,
  dedupe,
  findDuplicate,
  freshnessAgainst,
  normalizeText,
  similarity,
  tokenize,
} from "@/lib/content-engine/duplicates";

/**
 * Not saying the same thing every week.
 *
 * The weekly mine runs against the same service catalogue every Monday, so
 * without this the account would post "Labour Card ke fayde" until it read
 * like a stuck record. The line has to sit somewhere useful: catching a
 * rephrasing while letting a genuinely different angle on the same scheme
 * through.
 */

describe("what counts as the same post", () => {
  it("catches a rephrasing", () => {
    expect(
      similarity("Labour Card banwane ke liye documents", "Documents required for Labour Card"),
    ).toBeGreaterThanOrEqual(DUPLICATE_THRESHOLD);
  });

  it("ignores word order, because a post is not a sentence", () => {
    expect(similarity("GST registration process India", "India GST process registration")).toBe(1);
  });

  it("lets a different angle on the same scheme through", () => {
    expect(
      similarity("Labour Card ke 5 fayde jo aap nahi jaante", "Labour Card renewal ki last date nikal rahi hai"),
    ).toBeLessThan(DUPLICATE_THRESHOLD);
  });

  it("is not fooled by Hinglish filler", () => {
    // Without the stop words these two match completely, and two genuinely
    // different posts get called duplicates.
    expect(similarity("Aapke liye ye zaruri hai", "Aapke liye ye jaruri hai")).toBeLessThan(1);
  });

  it("treats an empty string as matching nothing", () => {
    expect(similarity("", "Labour Card")).toBe(0);
    expect(similarity("Labour Card", "")).toBe(0);
  });
});

describe("normalising", () => {
  it("drops links and hashtags, which say nothing about the topic", () => {
    expect(normalizeText("Labour Card #sarkariyojana https://example.com/page")).toBe("labour card");
  });

  it("keeps Devanagari", () => {
    expect(tokenize("श्रमिक कार्ड योजना")).toContain("श्रमिक");
  });

  it("drops short words and filler", () => {
    expect(tokenize("ye ka ki labour card hai")).toEqual(["labour", "card"]);
  });
});

describe("dropping repeats from a batch", () => {
  it("removes a candidate too close to something already published", () => {
    const { kept, dropped } = dedupe(
      [{ title: "Documents required for Labour Card" }],
      [{ title: "Labour Card banwane ke liye documents" }],
      (item) => item.title,
    );

    expect(kept).toHaveLength(0);
    expect(dropped).toHaveLength(1);
    expect(dropped[0].score).toBeGreaterThanOrEqual(DUPLICATE_THRESHOLD);
  });

  it("removes two near-identical candidates in the same batch", () => {
    const { kept } = dedupe(
      [
        { title: "Labour Card ke documents kya hain" },
        { title: "Kya documents chahiye Labour Card ke liye" },
        { title: "PM Awas Yojana ki nayi list aa gayi" },
      ],
      [],
      (item) => item.title,
    );

    expect(kept).toHaveLength(2);
    expect(kept.map((item) => item.title)).toContain("PM Awas Yojana ki nayi list aa gayi");
  });

  it("keeps everything when nothing repeats", () => {
    const { kept, dropped } = dedupe(
      [{ title: "ITR filing ki last date" }, { title: "Passport photo ka sahi size" }],
      [{ title: "Labour Card ke fayde" }],
      (item) => item.title,
    );

    expect(kept).toHaveLength(2);
    expect(dropped).toHaveLength(0);
  });

  it("returns the closest match, not the first one over the line", () => {
    const match = findDuplicate(
      "Labour Card ke documents",
      [{ title: "Labour Card ka form" }, { title: "Labour Card ke documents kaunse" }],
      (item) => item.title,
    );

    expect(match?.item.title).toBe("Labour Card ke documents kaunse");
  });
});

describe("how fresh a hook is", () => {
  it("is completely fresh when nothing has been used", () => {
    expect(freshnessAgainst("Kya aapko pata hai?", [])).toBe(10);
  });

  it("drops when the shop has opened a post this way before", () => {
    const score = freshnessAgainst("Labour Card ke documents kaunse lagenge", [
      "Labour Card ke documents kaunse hain",
    ]);
    expect(score).toBeLessThan(5);
  });

  it("stays high for a genuinely new opener", () => {
    expect(
      freshnessAgainst("Kal ek majdoor bhai dukan par aaye the", ["Labour Card ke 5 fayde"]),
    ).toBeGreaterThan(7);
  });
});
