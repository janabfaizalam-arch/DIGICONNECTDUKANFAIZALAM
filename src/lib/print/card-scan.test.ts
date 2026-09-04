import { describe, expect, it } from "vitest";

import {
  applyHomography,
  backgroundBins,
  closeMask,
  cornersOf,
  findCardQuad,
  foregroundMask,
  homography,
  largestBlob,
  looksLikeCard,
  quadArea,
  scaleQuad,
  type Pixels,
  type Point,
  type Quad,
} from "@/lib/print/card-scan";

/* ─────────────────────────────────────────────────────────────────────────
   Pictures to look at
   ───────────────────────────────────────────────────────────────────────── */

type Rgb = [number, number, number];

function blank(width: number, height: number, colour: Rgb): Pixels {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    data[i * 4] = colour[0];
    data[i * 4 + 1] = colour[1];
    data[i * 4 + 2] = colour[2];
    data[i * 4 + 3] = 255;
  }
  return { data, width, height };
}

function put(image: Pixels, x: number, y: number, colour: Rgb) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  const at = (Math.round(y) * image.width + Math.round(x)) * 4;
  image.data[at] = colour[0];
  image.data[at + 1] = colour[1];
  image.data[at + 2] = colour[2];
  image.data[at + 3] = 255;
}

/** A filled quadrilateral, so a card can be drawn already turned. */
function fillQuad(image: Pixels, quad: Quad, colour: Rgb) {
  const xs = quad.map((p) => p.x);
  const ys = quad.map((p) => p.y);
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y += 1) {
    for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x += 1) {
      if (inside(quad, { x, y })) put(image, x, y, colour);
    }
  }
}

function inside(quad: Quad, point: Point): boolean {
  let sign = 0;
  for (let i = 0; i < 4; i += 1) {
    const a = quad[i];
    const b = quad[(i + 1) % 4];
    const cross = (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);
    if (cross === 0) continue;
    const here = cross > 0 ? 1 : -1;
    if (sign === 0) sign = here;
    else if (sign !== here) return false;
  }
  return true;
}

/** A pale card lying on a dark desk — the ordinary case. */
function cardOnDesk(): Pixels {
  const image = blank(300, 220, [58, 44, 34]);
  fillQuad(
    image,
    [
      { x: 60, y: 60 },
      { x: 240, y: 60 },
      { x: 240, y: 173 },
      { x: 60, y: 173 },
    ],
    [232, 238, 230],
  );
  return image;
}

/* ─────────────────────────────────────────────────────────────────────────
   Telling card from table
   ───────────────────────────────────────────────────────────────────────── */

describe("what counts as background", () => {
  it("learns the desk from the edge of the frame", () => {
    const bins = backgroundBins(cardOnDesk());
    // The desk is one colour, so one bin should carry it.
    expect(bins.size).toBeGreaterThan(0);
    expect(bins.size).toBeLessThanOrEqual(3);
  });

  it("holds on to two different backgrounds at once", () => {
    /*
      A card photographed on a pale table with a dark phone case in shot. The
      obvious implementation averages the border into a mid grey that matches
      neither, so nothing reads as background and the whole frame comes back
      as one blob. Both have to survive as background.
    */
    const image = blank(300, 220, [225, 222, 215]);
    for (let y = 0; y < 220; y += 1) {
      for (let x = 0; x < 70; x += 1) put(image, x, y, [24, 24, 30]);
    }
    fillQuad(
      image,
      [
        { x: 110, y: 60 },
        { x: 270, y: 60 },
        { x: 270, y: 161 },
        { x: 110, y: 161 },
      ],
      [120, 200, 140],
    );

    const quad = findCardQuad(image);
    expect(quad, "the card was lost among two backgrounds").not.toBeNull();
    expect(quad![0].x).toBeGreaterThan(95);
    expect(quad![1].x).toBeLessThan(285);
  });

  it("marks the card, not the desk, as foreground", () => {
    const image = cardOnDesk();
    const mask = foregroundMask(image);
    const at = (x: number, y: number) => mask[y * image.width + x];
    expect(at(150, 110), "the middle of the card").toBe(1);
    expect(at(10, 10), "the corner of the desk").toBe(0);
  });
});

describe("closing the gaps", () => {
  it("fills a hole punched in the middle of a shape", () => {
    const mask = new Uint8Array(40 * 40).fill(0);
    for (let y = 8; y < 32; y += 1) for (let x = 8; x < 32; x += 1) mask[y * 40 + x] = 1;
    mask[20 * 40 + 20] = 0;

    const closed = closeMask(mask, 40, 40, 2);
    expect(closed[20 * 40 + 20]).toBe(1);
  });

  it("does not grow the shape it closed", () => {
    const mask = new Uint8Array(40 * 40).fill(0);
    for (let y = 8; y < 32; y += 1) for (let x = 8; x < 32; x += 1) mask[y * 40 + x] = 1;

    const closed = closeMask(mask, 40, 40, 2);
    expect(closed[20 * 40 + 4], "spread four pixels to the left").toBe(0);
    expect(closed[2 * 40 + 20], "spread six pixels upwards").toBe(0);
  });
});

describe("the largest thing in the frame", () => {
  it("takes the card and leaves the crumb", () => {
    const mask = new Uint8Array(50 * 50).fill(0);
    for (let y = 10; y < 40; y += 1) for (let x = 10; x < 40; x += 1) mask[y * 50 + x] = 1;
    mask[2 * 50 + 2] = 1; // a speck of dust in the corner

    const blob = largestBlob(mask, 50, 50);
    expect(blob?.size).toBe(30 * 30);
  });

  it("returns nothing for an empty mask", () => {
    expect(largestBlob(new Uint8Array(100), 10, 10)).toBeNull();
  });
});

describe("finding the corners", () => {
  it("puts them in reading order: top-left, top-right, bottom-right, bottom-left", () => {
    const width = 100;
    const pixels: number[] = [];
    for (let y = 20; y < 60; y += 1) for (let x = 30; x < 80; x += 1) pixels.push(y * width + x);

    const [tl, tr, br, bl] = cornersOf(pixels, width);
    expect(tl).toEqual({ x: 30, y: 20 });
    expect(tr).toEqual({ x: 79, y: 20 });
    expect(br).toEqual({ x: 79, y: 59 });
    expect(bl).toEqual({ x: 30, y: 59 });
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Refusing to guess
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The one thing worse than not cropping is cropping wrongly. A customer who
 * pays for an Aadhaar copy and gets half of one has lost real money, so every
 * doubtful case has to come back null and print the photograph as taken.
 */
describe("when it should refuse", () => {
  const frame = { width: 300, height: 220 };

  it("refuses a speck", () => {
    expect(
      looksLikeCard(
        [
          { x: 10, y: 10 },
          { x: 30, y: 10 },
          { x: 30, y: 24 },
          { x: 10, y: 24 },
        ],
        frame,
      ),
    ).toBe(false);
  });

  it("refuses a picture that is already just the card", () => {
    // Nothing to crop; cropping anyway would shave the edges off.
    expect(
      looksLikeCard(
        [
          { x: 0, y: 0 },
          { x: 300, y: 0 },
          { x: 300, y: 220 },
          { x: 0, y: 220 },
        ],
        frame,
      ),
    ).toBe(false);
  });

  it("refuses a square, which no card is", () => {
    expect(
      looksLikeCard(
        [
          { x: 60, y: 40 },
          { x: 200, y: 40 },
          { x: 200, y: 180 },
          { x: 60, y: 180 },
        ],
        frame,
      ),
    ).toBe(false);
  });

  it("refuses a wedge, which no flat card photographs as", () => {
    expect(
      looksLikeCard(
        [
          { x: 40, y: 40 },
          { x: 260, y: 40 },
          { x: 180, y: 170 },
          { x: 60, y: 170 },
        ],
        frame,
      ),
    ).toBe(false);
  });

  it("accepts a card at the proportions a card actually has", () => {
    expect(
      looksLikeCard(
        [
          { x: 60, y: 60 },
          { x: 240, y: 60 },
          { x: 240, y: 173 },
          { x: 60, y: 173 },
        ],
        frame,
      ),
    ).toBe(true);
  });

  it("accepts one held the other way up", () => {
    // Photographed portrait: the same card, 1:1.586 instead of 1.586:1.
    expect(
      looksLikeCard(
        [
          { x: 90, y: 20 },
          { x: 200, y: 20 },
          { x: 200, y: 195 },
          { x: 90, y: 195 },
        ],
        frame,
      ),
    ).toBe(true);
  });

  it("finds nothing in a photograph of nothing", () => {
    expect(findCardQuad(blank(200, 150, [200, 190, 180]))).toBeNull();
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   End to end on a picture
   ───────────────────────────────────────────────────────────────────────── */

describe("a card on a desk", () => {
  it("comes back at the corners it was drawn at", () => {
    const quad = findCardQuad(cardOnDesk());
    expect(quad).not.toBeNull();

    const [tl, tr, br, bl] = quad!;
    for (const [found, drawn] of [
      [tl, { x: 60, y: 60 }],
      [tr, { x: 240, y: 60 }],
      [br, { x: 240, y: 173 }],
      [bl, { x: 60, y: 173 }],
    ] as const) {
      expect(Math.abs(found.x - drawn.x), `x off by too much`).toBeLessThanOrEqual(4);
      expect(Math.abs(found.y - drawn.y), `y off by too much`).toBeLessThanOrEqual(4);
    }
  });

  it("still finds it when the card is lying crooked", () => {
    // Nobody lines a card up with the edge of the phone.
    const image = blank(320, 240, [40, 40, 48]);
    fillQuad(
      image,
      [
        { x: 70, y: 74 },
        { x: 246, y: 52 },
        { x: 258, y: 158 },
        { x: 82, y: 180 },
      ],
      [235, 240, 232],
    );

    const quad = findCardQuad(image);
    expect(quad, "a tilted card was refused").not.toBeNull();
    expect(quad![0].y, "the top-left corner sits lower than the top-right").toBeGreaterThan(quad![1].y);
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   Straightening
   ───────────────────────────────────────────────────────────────────────── */

describe("the perspective map", () => {
  const rectangle: Quad = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 60 },
    { x: 0, y: 60 },
  ];

  it("lands every corner exactly where it was told to", () => {
    const tilted: Quad = [
      { x: 12, y: 30 },
      { x: 210, y: 8 },
      { x: 224, y: 130 },
      { x: 26, y: 158 },
    ];
    const h = homography(rectangle, tilted)!;
    expect(h).not.toBeNull();

    for (let i = 0; i < 4; i += 1) {
      const mapped = applyHomography(h, rectangle[i]);
      expect(mapped.x).toBeCloseTo(tilted[i].x, 6);
      expect(mapped.y).toBeCloseTo(tilted[i].y, 6);
    }
  });

  it("undoes itself when run the other way", () => {
    const tilted: Quad = [
      { x: 12, y: 30 },
      { x: 210, y: 8 },
      { x: 224, y: 130 },
      { x: 26, y: 158 },
    ];
    const there = homography(rectangle, tilted)!;
    const back = homography(tilted, rectangle)!;
    const middle = applyHomography(there, { x: 50, y: 30 });
    const home = applyHomography(back, middle);
    expect(home.x).toBeCloseTo(50, 4);
    expect(home.y).toBeCloseTo(30, 4);
  });

  it("gives up rather than returning nonsense for a flattened quad", () => {
    // Three points in a line: there is no such photograph of a card.
    expect(
      homography(rectangle, [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 100, y: 0 },
        { x: 0, y: 60 },
      ]),
    ).toBeNull();
  });
});

describe("scaling back to the real photograph", () => {
  it("multiplies every corner by the same factor", () => {
    const quad = scaleQuad(
      [
        { x: 10, y: 20 },
        { x: 40, y: 20 },
        { x: 40, y: 39 },
        { x: 10, y: 39 },
      ],
      4,
    );
    expect(quad[2]).toEqual({ x: 160, y: 156 });
  });

  it("keeps the area in proportion", () => {
    const small: Quad = [
      { x: 0, y: 0 },
      { x: 30, y: 0 },
      { x: 30, y: 19 },
      { x: 0, y: 19 },
    ];
    expect(quadArea(scaleQuad(small, 3))).toBeCloseTo(quadArea(small) * 9, 6);
  });
});
