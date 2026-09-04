import { describe, expect, it } from "vitest";

import {
  ID_CARD,
  PAPER_SIZES,
  PHOTO_SIZES,
  coverCrop,
  gridPlan,
  idCardPlan,
  mmToPx,
  sheetPixels,
} from "@/lib/print/sheet-layout";

const A4 = PAPER_SIZES.A4;

/* ─────────────────────────────────────────────────────────────────────────
   Nothing is ever distorted
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The one rule that cannot bend. A passport photo 2mm short is not a passport
 * photo, and an Aadhaar card stretched to fill a box is a document somebody
 * gets turned away for. Every slot below is checked against the size that was
 * asked for, not against how it looks.
 */
describe("a photo comes out the size it was ordered", () => {
  it("gives every slot exactly the requested millimetres", () => {
    const plan = gridPlan(A4, PHOTO_SIZES["35x45"], 12);
    for (const slot of plan.slots) {
      expect(slot.width).toBe(35);
      expect(slot.height).toBe(45);
    }
  });

  it("crops to fill rather than squashing", () => {
    // A 4:3 phone photo into a 35 × 45 slot: the sides go, the face does not
    // get narrower.
    const crop = coverCrop({ width: 4000, height: 3000 }, { width: 35, height: 45 });
    expect(crop.sHeight).toBe(3000);
    expect(Math.round(crop.sWidth)).toBe(2333);
    expect(crop.sx).toBeGreaterThan(0);
    expect(crop.sy).toBe(0);
    // Centre crop: what is taken off the left equals what is taken off the right.
    expect(crop.sx * 2 + crop.sWidth).toBeCloseTo(4000, 6);
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   How many fit
   ───────────────────────────────────────────────────────────────────────── */

describe("filling a sheet", () => {
  it("fits an A4 of passport photos the way a shop does", () => {
    // 210 × 297 with a 5mm margin and 2mm between: five across, six down.
    const plan = gridPlan(A4, PHOTO_SIZES["35x45"], 30);
    expect(plan.perSheet).toBe(30);
    expect(plan.sheets).toBe(1);
  });

  it("asks for a second sheet when the order does not fit on one", () => {
    const plan = gridPlan(A4, PHOTO_SIZES["35x45"], 36);
    expect(plan.perSheet).toBe(30);
    expect(plan.sheets).toBe(2);
  });

  it("lays twelve photos out tidily rather than in one long row", () => {
    const plan = gridPlan(A4, PHOTO_SIZES["35x45"], 12);
    expect(plan.slots).toHaveLength(12);

    const columns = new Set(plan.slots.map((slot) => Math.round(slot.x)));
    const rows = new Set(plan.slots.map((slot) => Math.round(slot.y)));
    /*
      3 × 4, not 4 × 3.

      Both waste nothing, so the tie goes to the block shaped most like the
      paper: on a portrait A4, 109 × 186 mm sits with even margins where
      146 × 139 mm leaves a wide band of white above and below.
    */
    expect(columns.size).toBe(3);
    expect(rows.size).toBe(4);
  });

  it("centres the block on the paper", () => {
    const plan = gridPlan(A4, PHOTO_SIZES["35x45"], 12);
    const left = Math.min(...plan.slots.map((slot) => slot.x));
    const right = Math.max(...plan.slots.map((slot) => slot.x + slot.width));
    expect(left).toBeCloseTo(A4.width - right, 6);

    const top = Math.min(...plan.slots.map((slot) => slot.y));
    const bottom = Math.max(...plan.slots.map((slot) => slot.y + slot.height));
    expect(top).toBeCloseTo(A4.height - bottom, 6);
  });

  it("turns the item when more fit that way", () => {
    // A wide card on a portrait sheet: upright wins here, so nothing turns.
    const cards = gridPlan(A4, ID_CARD, 8);
    expect(cards.perSheet).toBeGreaterThanOrEqual(8);

    // A tall narrow strip fits far better on its side.
    const strip = gridPlan(A4, { width: 20, height: 200 }, 20);
    expect(strip.rotated).toBe(true);
  });

  it("keeps everything inside the paper", () => {
    for (const count of [1, 6, 12, 24, 30]) {
      const plan = gridPlan(A4, PHOTO_SIZES["35x45"], count);
      for (const slot of plan.slots) {
        expect(slot.x).toBeGreaterThanOrEqual(0);
        expect(slot.y).toBeGreaterThanOrEqual(0);
        expect(slot.x + slot.width).toBeLessThanOrEqual(A4.width + 0.001);
        expect(slot.y + slot.height).toBeLessThanOrEqual(A4.height + 0.001);
      }
    }
  });

  it("never overlaps two photos", () => {
    const plan = gridPlan(A4, PHOTO_SIZES["35x45"], 30);
    for (let a = 0; a < plan.slots.length; a += 1) {
      for (let b = a + 1; b < plan.slots.length; b += 1) {
        const one = plan.slots[a];
        const two = plan.slots[b];
        const apart =
          one.x + one.width <= two.x + 0.001 ||
          two.x + two.width <= one.x + 0.001 ||
          one.y + one.height <= two.y + 0.001 ||
          two.y + two.height <= one.y + 0.001;
        expect(apart, `slots ${a} and ${b} overlap`).toBe(true);
      }
    }
  });

  it("says zero rather than guessing when the item is bigger than the paper", () => {
    const plan = gridPlan(PAPER_SIZES.A5, { width: 300, height: 400 }, 1);
    expect(plan.perSheet).toBe(0);
    expect(plan.slots).toEqual([]);
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   An ID card's two sides
   ───────────────────────────────────────────────────────────────────────── */

describe("front and back of an ID", () => {
  it("stacks them in one column, both at card size", () => {
    const plan = idCardPlan(A4, "stacked");
    expect(plan.slots).toHaveLength(2);
    expect(plan.slots[0].x).toBeCloseTo(plan.slots[1].x, 6);
    expect(plan.slots[0].y).toBeLessThan(plan.slots[1].y);
    expect(plan.slots[0].width).toBeCloseTo(ID_CARD.width, 6);
    expect(plan.slots[0].height).toBeCloseTo(ID_CARD.height, 6);
  });

  it("keeps the card's own proportions in every arrangement", () => {
    const ratio = ID_CARD.width / ID_CARD.height;
    for (const arrangement of ["stacked", "side-by-side", "actual-size"] as const) {
      const plan = idCardPlan(A4, arrangement);
      for (const slot of plan.slots) {
        const slotRatio = slot.width / slot.height;
        // Either the card's ratio, or its ratio turned on its side.
        const matches =
          Math.abs(slotRatio - ratio) < 0.001 || Math.abs(slotRatio - 1 / ratio) < 0.001;
        expect(matches, `${arrangement} distorted the card`).toBe(true);
      }
    }
  });

  it("puts both sides side by side when asked", () => {
    const plan = idCardPlan(A4, "side-by-side");
    expect(plan.slots).toHaveLength(2);
    expect(plan.slots[0].y).toBeCloseTo(plan.slots[1].y, 6);
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Paper to pixels
   ───────────────────────────────────────────────────────────────────────── */

describe("turning millimetres into a canvas", () => {
  it("uses 300 DPI, which is what a shop printer expects", () => {
    expect(mmToPx(25.4)).toBe(300);
    expect(mmToPx(25.4, 150)).toBe(150);
  });

  it("gives A4 its known pixel size", () => {
    // 210 × 297 mm at 300 DPI is 2480 × 3508 — the number every print shop
    // knows. If this changes, something is wrong with the conversion.
    expect(sheetPixels(A4)).toEqual({ width: 2480, height: 3508 });
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   One side is one card
   ───────────────────────────────────────────────────────────────────────── */

/**
 * A customer photographs the front of their Aadhaar, taps nothing else, and
 * pays. The sheet used to lay out two slots regardless, and a sheet with more
 * slots than pictures repeats from the start — so they were handed a page with
 * the same side printed twice. Right for twelve passport photos, wrong here.
 */
describe("an ID card sheet with only one side uploaded", () => {
  const a4 = PAPER_SIZES.A4;

  it("puts one card on the page, not the front twice", () => {
    expect(idCardPlan(a4, "stacked", 1, 1).slots).toHaveLength(1);
    expect(idCardPlan(a4, "side-by-side", 1, 1).slots).toHaveLength(1);
    expect(idCardPlan(a4, "actual-size", 1, 1).slots).toHaveLength(1);
  });

  it("still lays out both when both arrive", () => {
    expect(idCardPlan(a4, "stacked", 1, 2).slots).toHaveLength(2);
    expect(idCardPlan(a4, "side-by-side", 1, 2).slots).toHaveLength(2);
  });

  it("centres the single card rather than leaving it high on the page", () => {
    const [only] = idCardPlan(a4, "stacked", 1, 1).slots;
    expect(only.y + only.height / 2).toBeCloseTo(a4.height / 2, 6);
    expect(only.x + only.width / 2).toBeCloseTo(a4.width / 2, 6);
  });

  it("keeps the card at its true proportions either way", () => {
    for (const sides of [1, 2] as const) {
      for (const arrangement of ["stacked", "side-by-side", "actual-size"] as const) {
        for (const slot of idCardPlan(a4, arrangement, 1, sides).slots) {
          expect(
            slot.width / slot.height,
            `${arrangement} with ${sides} side(s) distorted the card`,
          ).toBeCloseTo(ID_CARD.width / ID_CARD.height, 6);
        }
      }
    }
  });

  it("keeps two sides side by side when that is what was asked", () => {
    const [first, second] = idCardPlan(a4, "side-by-side", 1, 2).slots;
    expect(second.x).toBeGreaterThan(first.x);
    expect(second.y).toBeCloseTo(first.y, 6);
  });
});

/**
 * The turn that fits one more card is not worth making.
 *
 * gridPlan turns an item 90° when more of it fits that way, which is right for
 * photographs and wrong here: nine Aadhaar cards lying sideways on an A4 is a
 * page an office hands back, and the ninth card is worth nothing to somebody
 * printing one copy of their own ID.
 */
describe("an ID card is never printed sideways", () => {
  it("keeps every arrangement upright", () => {
    for (const sides of [1, 2] as const) {
      for (const arrangement of ["stacked", "side-by-side", "actual-size"] as const) {
        const plan = idCardPlan(PAPER_SIZES.A4, arrangement, 1, sides);
        expect(plan.rotated, `${arrangement} with ${sides} side(s) turned the card`).toBe(false);
        for (const slot of plan.slots) {
          expect(slot.width).toBeGreaterThan(slot.height);
        }
      }
    }
  });

  it("still turns a photograph when that fits more of them", () => {
    // The behaviour being switched off above must stay on where it earns its
    // keep: this is what makes thirty 35 × 45s fit an A4 instead of twenty-eight.
    const plan = gridPlan(PAPER_SIZES.A4, { width: 45, height: 35 }, 30);
    expect(plan.rotated).toBe(true);
  });
});
