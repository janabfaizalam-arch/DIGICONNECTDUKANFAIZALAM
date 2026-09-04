/**
 * Finding the card inside a photograph of a card.
 *
 * Nobody scans an Aadhaar. They put it on the counter, on a desk, on their
 * own knee, and photograph it — so what arrives is a small bright rectangle
 * sitting in the middle of a wooden table, a dark bag, somebody's sleeve. Sent
 * to a printer as-is, that is what comes out: the table, in colour, with a
 * card somewhere in it.
 *
 * This finds the card and takes it out of the picture: its four corners, then
 * a perspective correction onto white paper at the true 85.6 x 53.98 mm
 * proportion. It runs entirely in the customer's browser — the photograph is
 * not sent anywhere to be looked at, here or by anybody else.
 *
 * Everything above `scanCard` is arithmetic on plain arrays and is tested. The
 * canvas at the bottom only feeds it pixels and draws the answer.
 */

export type Point = { x: number; y: number };
export type Quad = [Point, Point, Point, Point];

/** A picture as plain numbers: RGBA, row-major, exactly as a canvas gives it. */
export type Pixels = { data: Uint8ClampedArray; width: number; height: number };

/* ─────────────────────────────────────────────────────────────────────────
   Which colours are the background
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The colours found around the edge of the frame.
 *
 * A single average is the obvious thing and it is wrong: photograph a card on
 * a pale table with a dark phone case in shot and the average of the two is a
 * mid grey that matches neither, so everything reads as foreground and the
 * whole frame comes back as one blob.
 *
 * Instead the border is quantised into a coarse 4 x 4 x 4 colour cube and
 * every bin that holds a real share of it is remembered. Two very different
 * backgrounds are then simply two bins, and both are still background.
 */
const CUBE = 4;
const BIN_SHIFT = 6; // 256 >> 6 === 4 levels per channel

function binOf(r: number, g: number, b: number): number {
  return ((r >> BIN_SHIFT) * CUBE + (g >> BIN_SHIFT)) * CUBE + (b >> BIN_SHIFT);
}

export function backgroundBins(image: Pixels, ringFraction = 0.06): Set<number> {
  const ringX = Math.max(1, Math.round(image.width * ringFraction));
  const ringY = Math.max(1, Math.round(image.height * ringFraction));
  const counts = new Map<number, number>();
  let total = 0;

  for (let y = 0; y < image.height; y += 1) {
    const edgeRow = y < ringY || y >= image.height - ringY;
    for (let x = 0; x < image.width; x += 1) {
      if (!edgeRow && x >= ringX && x < image.width - ringX) continue;
      const at = (y * image.width + x) * 4;
      const bin = binOf(image.data[at], image.data[at + 1], image.data[at + 2]);
      counts.set(bin, (counts.get(bin) ?? 0) + 1);
      total += 1;
    }
  }

  // A bin has to account for a fiftieth of the border to count as background.
  // Below that it is a speck — a shadow line, a fingertip — and treating it as
  // background would punch holes in the card.
  const floor = total / 50;
  const bins = new Set<number>();
  for (const [bin, count] of counts) if (count >= floor) bins.add(bin);
  return bins;
}

/** True where the pixel is something other than the background. */
export function foregroundMask(image: Pixels, bins?: Set<number>): Uint8Array {
  const background = bins ?? backgroundBins(image);
  const mask = new Uint8Array(image.width * image.height);
  for (let index = 0; index < mask.length; index += 1) {
    const at = index * 4;
    mask[index] = background.has(binOf(image.data[at], image.data[at + 1], image.data[at + 2])) ? 0 : 1;
  }
  return mask;
}

/**
 * Close the gaps.
 *
 * A card's own white areas sometimes land in a background bin — a white card
 * on a white table is the obvious case — which leaves the mask looking like
 * lace. Dilating and then eroding fills those holes without growing the
 * outline, so the card stays the size it actually is.
 */
export function closeMask(mask: Uint8Array, width: number, height: number, radius = 2): Uint8Array {
  return erode(dilate(mask, width, height, radius), width, height, radius);
}

function dilate(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  return sweep(mask, width, height, radius, true);
}

function erode(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  return sweep(mask, width, height, radius, false);
}

/** One separable pass horizontally, one vertically — a square kernel, cheaply. */
function sweep(mask: Uint8Array, width: number, height: number, radius: number, grow: boolean): Uint8Array {
  const middle = new Uint8Array(mask.length);
  const out = new Uint8Array(mask.length);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let hit = grow ? 0 : 1;
      for (let d = -radius; d <= radius; d += 1) {
        const sx = x + d;
        if (sx < 0 || sx >= width) continue;
        const value = mask[y * width + sx];
        if (grow ? value === 1 : value === 0) {
          hit = grow ? 1 : 0;
          break;
        }
      }
      middle[y * width + x] = hit;
    }
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let hit = grow ? 0 : 1;
      for (let d = -radius; d <= radius; d += 1) {
        const sy = y + d;
        if (sy < 0 || sy >= height) continue;
        const value = middle[sy * width + x];
        if (grow ? value === 1 : value === 0) {
          hit = grow ? 1 : 0;
          break;
        }
      }
      out[y * width + x] = hit;
    }
  }

  return out;
}

/* ─────────────────────────────────────────────────────────────────────────
   The biggest thing in the picture
   ───────────────────────────────────────────────────────────────────────── */

export type Blob = { pixels: number[]; size: number };

/** The largest connected run of foreground, found without recursing. */
export function largestBlob(mask: Uint8Array, width: number, height: number): Blob | null {
  const seen = new Uint8Array(mask.length);
  const queue = new Int32Array(mask.length);
  let best: Blob | null = null;

  for (let start = 0; start < mask.length; start += 1) {
    if (mask[start] !== 1 || seen[start]) continue;

    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    seen[start] = 1;
    const pixels: number[] = [];

    while (head < tail) {
      const index = queue[head++];
      pixels.push(index);
      const x = index % width;
      const y = (index - x) / width;

      if (x > 0) push(index - 1);
      if (x < width - 1) push(index + 1);
      if (y > 0) push(index - width);
      if (y < height - 1) push(index + width);
    }

    if (!best || pixels.length > best.size) best = { pixels, size: pixels.length };

    function push(next: number) {
      if (mask[next] === 1 && !seen[next]) {
        seen[next] = 1;
        queue[tail++] = next;
      }
    }
  }

  return best;
}

/**
 * Four corners from a cloud of points.
 *
 * The extremes of x + y and x - y are the corners of any rectangle that is not
 * turned a full 45 degrees, which no photograph of a card on a table ever is.
 * It costs one pass and needs no hull.
 */
export function cornersOf(pixels: number[], width: number): Quad {
  let minSum = Infinity;
  let maxSum = -Infinity;
  let minDiff = Infinity;
  let maxDiff = -Infinity;
  let topLeft: Point = { x: 0, y: 0 };
  let bottomRight: Point = { x: 0, y: 0 };
  let topRight: Point = { x: 0, y: 0 };
  let bottomLeft: Point = { x: 0, y: 0 };

  for (const index of pixels) {
    const x = index % width;
    const y = (index - x) / width;
    const sum = x + y;
    const diff = x - y;
    if (sum < minSum) {
      minSum = sum;
      topLeft = { x, y };
    }
    if (sum > maxSum) {
      maxSum = sum;
      bottomRight = { x, y };
    }
    if (diff > maxDiff) {
      maxDiff = diff;
      topRight = { x, y };
    }
    if (diff < minDiff) {
      minDiff = diff;
      bottomLeft = { x, y };
    }
  }

  return [topLeft, topRight, bottomRight, bottomLeft];
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Shoelace area of the quad, in pixels. */
export function quadArea(quad: Quad): number {
  let sum = 0;
  for (let i = 0; i < 4; i += 1) {
    const a = quad[i];
    const b = quad[(i + 1) % 4];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

/**
 * Is this actually a card?
 *
 * The one thing worse than not cropping is cropping wrongly: a customer who
 * pays for an Aadhaar copy and receives half of one has lost real money. So
 * everything doubtful is refused, and a refusal simply prints the photograph
 * as the customer took it.
 */
export function looksLikeCard(quad: Quad, image: { width: number; height: number }): boolean {
  const frame = image.width * image.height;
  const area = quadArea(quad);
  if (area < frame * 0.06) return false; // a speck, not the subject
  if (area > frame * 0.97) return false; // already cropped; leave it alone

  const top = distance(quad[0], quad[1]);
  const bottom = distance(quad[3], quad[2]);
  const left = distance(quad[0], quad[3]);
  const right = distance(quad[1], quad[2]);
  if (Math.min(top, bottom, left, right) < 12) return false;

  // Opposite sides of a rectangle photographed from a phone's distance stay
  // within a third of each other. Wider than that and the quad has latched on
  // to something that is not a flat card.
  if (Math.max(top, bottom) / Math.min(top, bottom) > 1.35) return false;
  if (Math.max(left, right) / Math.min(left, right) > 1.35) return false;

  const ratio = ((top + bottom) / 2) / ((left + right) / 2);
  const upright = ratio < 1 ? 1 / ratio : ratio;
  // A card is 1.586:1. Allowing 1.15 to 2.3 covers a phone held at an angle
  // and still rejects a square-ish blob or a long strip of table edge.
  return upright >= 1.15 && upright <= 2.3;
}

/* ─────────────────────────────────────────────────────────────────────────
   Straightening it
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The 3 x 3 map taking four source points to four destination points.
 *
 * Eight unknowns, eight equations, solved by plain Gaussian elimination with
 * partial pivoting. Written out rather than pulled in: it is thirty lines and
 * a dependency that ships to every phone is not free.
 */
export function homography(from: Quad, to: Quad): number[] | null {
  const a: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i += 1) {
    const s = from[i];
    const d = to[i];
    a.push([s.x, s.y, 1, 0, 0, 0, -s.x * d.x, -s.y * d.x]);
    b.push(d.x);
    a.push([0, 0, 0, s.x, s.y, 1, -s.x * d.y, -s.y * d.y]);
    b.push(d.y);
  }

  for (let col = 0; col < 8; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < 8; row += 1) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    }
    if (Math.abs(a[pivot][col]) < 1e-9) return null; // degenerate: three points in a line
    [a[col], a[pivot]] = [a[pivot], a[col]];
    [b[col], b[pivot]] = [b[pivot], b[col]];

    for (let row = 0; row < 8; row += 1) {
      if (row === col) continue;
      const factor = a[row][col] / a[col][col];
      if (!factor) continue;
      for (let k = col; k < 8; k += 1) a[row][k] -= factor * a[col][k];
      b[row] -= factor * b[col];
    }
  }

  const h = [...b.map((value, index) => value / a[index][index]), 1];

  /*
    Solvable is not the same as usable.

    Send a rectangle to four points three of which are in a line and the
    elimination above succeeds — it simply returns a map that flattens the
    whole plane onto that line. Every output pixel would then sample the same
    row of the photograph, which prints as a smear rather than a card. The
    determinant is what tells the two apart, so it is checked rather than
    assumed.
  */
  const determinant =
    h[0] * (h[4] * h[8] - h[5] * h[7]) -
    h[1] * (h[3] * h[8] - h[5] * h[6]) +
    h[2] * (h[3] * h[7] - h[4] * h[6]);
  const scale = Math.max(...h.map(Math.abs));
  if (!Number.isFinite(determinant) || Math.abs(determinant) < scale ** 3 * 1e-8) return null;

  return h;
}

export function applyHomography(h: number[], point: Point): Point {
  const w = h[6] * point.x + h[7] * point.y + h[8];
  return {
    x: (h[0] * point.x + h[1] * point.y + h[2]) / w,
    y: (h[3] * point.x + h[4] * point.y + h[5]) / w,
  };
}

/** Corners scaled from the small copy the search ran on back to the real photo. */
export function scaleQuad(quad: Quad, factor: number): Quad {
  return quad.map((point) => ({ x: point.x * factor, y: point.y * factor })) as Quad;
}

/**
 * The card's corners, or nothing.
 *
 * Nothing is a perfectly good answer and is returned whenever the picture does
 * not clearly contain one flat rectangle. The caller prints the original.
 */
export function findCardQuad(image: Pixels): Quad | null {
  const mask = closeMask(foregroundMask(image), image.width, image.height, 2);
  const blob = largestBlob(mask, image.width, image.height);
  if (!blob || blob.size < image.width * image.height * 0.05) return null;

  const quad = cornersOf(blob.pixels, image.width);
  return looksLikeCard(quad, image) ? quad : null;
}

/* ─────────────────────────────────────────────────────────────────────────
   The browser end
   ───────────────────────────────────────────────────────────────────────── */

/** Long edge of the copy the search runs on. Big enough to see a card, small
 *  enough that a four-year-old phone does it without a visible pause. */
const SEARCH_SIZE = 420;

function pixelsFrom(source: CanvasImageSource, width: number, height: number): Pixels | null {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(source, 0, 0, width, height);
  const { data } = context.getImageData(0, 0, width, height);
  return { data, width, height };
}

export type ScannedCard = { canvas: HTMLCanvasElement; width: number; height: number };

/**
 * Cut the card out of the photograph and lay it flat on white.
 *
 * Returns null when the picture is not clearly a card on a background, and the
 * caller must then use the customer's own image untouched. There is no partial
 * success here: a half-cropped Aadhaar is worse than an uncropped one.
 */
export function scanCard(
  source: HTMLImageElement,
  options: { aspect?: number; longEdge?: number } = {},
): ScannedCard | null {
  const naturalWidth = source.naturalWidth || source.width;
  const naturalHeight = source.naturalHeight || source.height;
  if (!naturalWidth || !naturalHeight) return null;

  const scale = SEARCH_SIZE / Math.max(naturalWidth, naturalHeight);
  const small = pixelsFrom(
    source,
    Math.max(24, Math.round(naturalWidth * Math.min(1, scale))),
    Math.max(24, Math.round(naturalHeight * Math.min(1, scale))),
  );
  if (!small) return null;

  const found = findCardQuad(small);
  if (!found) return null;

  const back = naturalWidth / small.width;
  const quad = scaleQuad(found, back);

  // The output is the card's true proportion, not the quad's: a photograph
  // taken at an angle has a trapezoid for a card, and printing the trapezoid
  // is exactly the distortion this is here to undo.
  const aspect = options.aspect ?? 85.6 / 53.98;
  const top = distance(quad[0], quad[1]);
  const bottom = distance(quad[3], quad[2]);
  const sideways = (top + bottom) / 2 >= distance(quad[0], quad[3]);
  const longEdge = options.longEdge ?? 1400;
  const width = sideways ? longEdge : Math.round(longEdge / aspect);
  const height = sideways ? Math.round(longEdge / aspect) : longEdge;

  const corners: Quad = sideways
    ? [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: width, y: height },
        { x: 0, y: height },
      ]
    : // Held portrait: the card's long edge runs down the picture, so the
      // corner the search called "top left" is the destination's bottom left.
      [
        { x: 0, y: height },
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: width, y: height },
      ];

  const inverse = homography(corners, quad);
  if (!inverse) return null;

  const sourcePixels = pixelsFrom(source, naturalWidth, naturalHeight);
  if (!sourcePixels) return null;

  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const context = out.getContext("2d");
  if (!context) return null;

  const target = context.createImageData(width, height);
  sample(sourcePixels, inverse, target, width, height);
  context.putImageData(target, 0, 0);

  return { canvas: out, width, height };
}

/** Inverse mapping with bilinear sampling: every output pixel asks the
 *  photograph where it came from, so nothing is left unpainted. */
function sample(source: Pixels, inverse: number[], target: ImageData, width: number, height: number) {
  const { data, width: sw, height: sh } = source;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const from = applyHomography(inverse, { x: x + 0.5, y: y + 0.5 });
      const at = (y * width + x) * 4;

      if (from.x < 0 || from.y < 0 || from.x >= sw - 1 || from.y >= sh - 1) {
        target.data[at] = 255;
        target.data[at + 1] = 255;
        target.data[at + 2] = 255;
        target.data[at + 3] = 255;
        continue;
      }

      const x0 = Math.floor(from.x);
      const y0 = Math.floor(from.y);
      const fx = from.x - x0;
      const fy = from.y - y0;

      for (let channel = 0; channel < 3; channel += 1) {
        const a = data[(y0 * sw + x0) * 4 + channel];
        const b = data[(y0 * sw + x0 + 1) * 4 + channel];
        const c = data[((y0 + 1) * sw + x0) * 4 + channel];
        const d = data[((y0 + 1) * sw + x0 + 1) * 4 + channel];
        target.data[at + channel] =
          a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy;
      }
      target.data[at + 3] = 255;
    }
  }
}
