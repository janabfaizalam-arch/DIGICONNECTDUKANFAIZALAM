import { describe, expect, it } from "vitest";

import { BACKDROPS, backdropColour, featherMask, parseColour, personMaskIndex } from "@/lib/print/portrait";

/* ─────────────────────────────────────────────────────────────────────────
   Which mask is the person
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The model hands back one confidence mask per class and the order is a
 * property of the model file, not of this code. Reading index 1 and hoping is
 * how a shop ends up printing a hundred sheets of a customer-shaped hole, so
 * the person is identified from the picture instead.
 */
describe("telling the person from the wall", () => {
  const width = 40;
  const height = 50;

  function subject(): Float32Array {
    // A head-and-shoulders blob where a face goes: middle, upper half.
    const mask = new Float32Array(width * height);
    for (let y = 8; y < 34; y += 1) {
      for (let x = 13; x < 27; x += 1) mask[y * width + x] = 1;
    }
    return mask;
  }

  function wall(person: Float32Array): Float32Array {
    return person.map((value) => 1 - value);
  }

  it("picks the blob in the middle, whichever way round they arrive", () => {
    const person = subject();
    expect(personMaskIndex([person, wall(person)], width, height)).toBe(0);
    expect(personMaskIndex([wall(person), person], width, height)).toBe(1);
  });

  it("does not pick the mask that fills the edges of the frame", () => {
    const person = subject();
    const chosen = personMaskIndex([wall(person), person], width, height);
    // The background mask is 1 along every border; the person's is 0 there.
    expect(chosen).not.toBe(0);
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   The edge of the cutout
   ───────────────────────────────────────────────────────────────────────── */

describe("softening the outline", () => {
  const width = 21;
  const height = 21;

  function hardEdge(): Float32Array {
    const mask = new Float32Array(width * height);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) mask[y * width + x] = x < 10 ? 1 : 0;
    }
    return mask;
  }

  it("turns a step into a ramp", () => {
    // Printed at 35 mm a hard mask is a visible sawtooth along the hairline.
    const soft = featherMask(hardEdge(), width, height, 2);
    const row = 10;
    const at = (x: number) => soft[row * width + x];

    expect(at(9)).toBeLessThan(1);
    expect(at(10)).toBeGreaterThan(0);
    expect(at(9)).toBeGreaterThan(at(10));
    expect(at(10)).toBeGreaterThan(at(11));
  });

  it("leaves the middle of the person completely opaque", () => {
    const soft = featherMask(hardEdge(), width, height, 2);
    expect(soft[10 * width + 2]).toBeCloseTo(1, 5);
  });

  it("leaves the far background completely transparent", () => {
    const soft = featherMask(hardEdge(), width, height, 2);
    expect(soft[10 * width + 18]).toBeCloseTo(0, 5);
  });

  it("returns the mask untouched when there is nothing to soften", () => {
    const mask = hardEdge();
    expect(featherMask(mask, width, height, 0)).toBe(mask);
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Colours
   ───────────────────────────────────────────────────────────────────────── */

describe("backdrop colours", () => {
  it("reads both the short and the long form", () => {
    expect(parseColour("#ffffff")).toEqual([255, 255, 255]);
    expect(parseColour("#fff")).toEqual([255, 255, 255]);
    expect(parseColour("cfe0f5")).toEqual([207, 224, 245]);
  });

  it("offers leaving the photo alone as a first-class choice", () => {
    // Somebody who took their photo against a plain wall already has what
    // they need, and should not have to undo an automatic change.
    expect(BACKDROPS[0].id).toBe("original");
    expect(backdropColour("original")).toBeNull();
  });

  it("offers the two backgrounds Indian offices actually ask for", () => {
    expect(backdropColour("white")).toBe("#ffffff");
    expect(backdropColour("blue")).not.toBeNull();
  });
});
