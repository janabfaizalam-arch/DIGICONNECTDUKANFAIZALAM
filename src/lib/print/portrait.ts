"use client";

/**
 * Taking the wall out from behind a passport photograph.
 *
 * A studio has a plain backdrop. A customer standing at a print counter has a
 * phone photo of themselves in front of a wooden door, a bedsheet, a shop
 * shutter — and every office that asks for a passport photo asks for a plain
 * white or light blue one. That gap is the whole job here.
 *
 * Two things about how it is done matter more than the result:
 *
 * The face never leaves the phone. Segmentation runs in WebAssembly in the
 * customer's own browser, on a model this site serves; no photograph is
 * uploaded anywhere to be looked at, by us or by anyone we would otherwise
 * have had to pay to do it. Sending a stranger's face to a third party to
 * save 11 MB of download was not a trade worth making.
 *
 * And it only ever changes what is behind the person. Nothing here reshapes a
 * face, smooths a skin, or puts a collar on anybody: a passport photograph
 * that no longer matches the person holding it is a rejected application, and
 * that cost lands on the customer, not on us.
 */

import type { ImageSegmenter } from "@mediapipe/tasks-vision";

export type BackdropId = "original" | "white" | "blue" | "grey" | "cream";

export const BACKDROPS: Array<{ id: BackdropId; label: string; colour: string | null }> = [
  { id: "original", label: "Jaisa hai", colour: null },
  { id: "white", label: "Safed", colour: "#ffffff" },
  { id: "blue", label: "Neela", colour: "#cfe0f5" },
  { id: "grey", label: "Halka grey", colour: "#e8ebee" },
  { id: "cream", label: "Cream", colour: "#f6f1e6" },
];

export function backdropColour(id: BackdropId): string | null {
  return BACKDROPS.find((backdrop) => backdrop.id === id)?.colour ?? null;
}

/* ─────────────────────────────────────────────────────────────────────────
   The model
   ───────────────────────────────────────────────────────────────────────── */

const WASM_PATH = "/mediapipe";
const MODEL_PATH = "/models/selfie_segmenter.tflite";

let segmenter: Promise<ImageSegmenter> | null = null;

/**
 * Loaded once, on the first tap, and never as part of the page.
 *
 * The runtime is 11 MB. A customer printing an Aadhaar copy should not pay
 * for it, so the import is dynamic and nothing is fetched until somebody
 * actually asks for a different background.
 */
export function loadSegmenter(): Promise<ImageSegmenter> {
  if (!segmenter) {
    segmenter = (async () => {
      const vision = await import("@mediapipe/tasks-vision");
      const fileset = await vision.FilesetResolver.forVisionTasks(WASM_PATH);
      return vision.ImageSegmenter.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_PATH },
        runningMode: "IMAGE",
        outputConfidenceMasks: true,
        outputCategoryMask: false,
      });
    })().catch((caught) => {
      // A failed load must not poison every later attempt: a shop's wifi drops
      // mid-download more often than anything else in this codebase.
      segmenter = null;
      throw caught;
    });
  }
  return segmenter;
}

/** Whether this browser can do it at all, without downloading anything. */
export function canChangeBackground(): boolean {
  return typeof window !== "undefined" && typeof WebAssembly === "object";
}

/* ─────────────────────────────────────────────────────────────────────────
   The mask
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Soften the edge of the cutout.
 *
 * The model's confidence falls off over two or three pixels, which on a face
 * printed at 35 mm is a hard sawtooth along the hairline and the shoulders. A
 * small separable box blur turns that into the same gradual edge a studio
 * backdrop has, and costs one pass in each direction.
 */
export function featherMask(mask: Float32Array, width: number, height: number, radius = 2): Float32Array {
  if (radius < 1) return mask;
  const across = new Float32Array(mask.length);
  const out = new Float32Array(mask.length);
  const span = radius * 2 + 1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let total = 0;
      for (let d = -radius; d <= radius; d += 1) {
        const sx = Math.min(width - 1, Math.max(0, x + d));
        total += mask[y * width + sx];
      }
      across[y * width + x] = total / span;
    }
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let total = 0;
      for (let d = -radius; d <= radius; d += 1) {
        const sy = Math.min(height - 1, Math.max(0, y + d));
        total += across[sy * width + x];
      }
      out[y * width + x] = total / span;
    }
  }

  return out;
}

/**
 * Which of the two masks is the person.
 *
 * The selfie model returns one confidence mask per class and the order is a
 * property of the model file, not of this code. Rather than hard-code an
 * index that a model update could quietly invert — printing a hundred sheets
 * of a customer-shaped hole — the answer is read off the picture: whichever
 * mask is concentrated in the middle of the frame is the person, because that
 * is where somebody photographing themselves puts themselves.
 */
export function personMaskIndex(masks: Float32Array[], width: number, height: number): number {
  let best = 0;
  let bestScore = -Infinity;

  masks.forEach((mask, index) => {
    let middle = 0;
    let edge = 0;
    const x0 = Math.round(width * 0.3);
    const x1 = Math.round(width * 0.7);
    const y0 = Math.round(height * 0.15);
    const y1 = Math.round(height * 0.6);

    for (let y = 0; y < height; y += 1) {
      const central = y >= y0 && y <= y1;
      for (let x = 0; x < width; x += 1) {
        const value = mask[y * width + x];
        if (central && x >= x0 && x <= x1) middle += value;
        else if (x < width * 0.06 || x > width * 0.94 || y < height * 0.04) edge += value;
      }
    }

    const centreArea = Math.max(1, (x1 - x0) * (y1 - y0));
    const edgeArea = Math.max(1, width * height - centreArea);
    const score = middle / centreArea - edge / edgeArea;
    if (score > bestScore) {
      bestScore = score;
      best = index;
    }
  });

  return best;
}

/* ─────────────────────────────────────────────────────────────────────────
   Putting it together
   ───────────────────────────────────────────────────────────────────────── */

/** Long edge the segmentation runs at. The model is trained near this size and
 *  a phone does it in well under a second; the mask is then scaled up. */
const SEGMENT_SIZE = 512;

export type BackdropResult = { canvas: HTMLCanvasElement; width: number; height: number };

/**
 * The same photograph with a plain colour behind the person.
 *
 * Throws rather than returning a half-done picture: the caller keeps the
 * customer's original and tells them it did not work, which is the honest
 * outcome and leaves a printable photo either way.
 */
export async function replaceBackground(
  source: HTMLImageElement,
  colour: string,
): Promise<BackdropResult> {
  const width = source.naturalWidth || source.width;
  const height = source.naturalHeight || source.height;
  if (!width || !height) throw new Error("That photo could not be read.");

  const scale = Math.min(1, SEGMENT_SIZE / Math.max(width, height));
  const smallWidth = Math.max(32, Math.round(width * scale));
  const smallHeight = Math.max(32, Math.round(height * scale));

  const small = document.createElement("canvas");
  small.width = smallWidth;
  small.height = smallHeight;
  const smallContext = small.getContext("2d", { willReadFrequently: true });
  if (!smallContext) throw new Error("This browser cannot prepare the photo.");
  smallContext.drawImage(source, 0, 0, smallWidth, smallHeight);

  const model = await loadSegmenter();
  const result = model.segment(small);
  const masks = (result.confidenceMasks ?? []).map((mask) => mask.getAsFloat32Array());
  if (!masks.length) {
    result.close();
    throw new Error("The background could not be separated.");
  }

  const maskWidth = result.confidenceMasks![0].width;
  const maskHeight = result.confidenceMasks![0].height;
  const person = featherMask(
    masks[personMaskIndex(masks, maskWidth, maskHeight)],
    maskWidth,
    maskHeight,
    2,
  );
  result.close();

  /*
    Composited at the photograph's own size, not the model's.

    A 512-pixel cutout scaled up to a 35 mm print at 300 DPI is a blurred
    outline; the mask is what gets scaled, and the photograph's own pixels are
    the ones that end up on paper.
  */
  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const context = out.getContext("2d");
  if (!context) throw new Error("This browser cannot prepare the photo.");

  context.fillStyle = colour;
  context.fillRect(0, 0, width, height);
  context.drawImage(source, 0, 0, width, height);

  const frame = context.getImageData(0, 0, width, height);
  const backdrop = parseColour(colour);

  for (let y = 0; y < height; y += 1) {
    const my = Math.min(maskHeight - 1, Math.floor((y / height) * maskHeight));
    for (let x = 0; x < width; x += 1) {
      const mx = Math.min(maskWidth - 1, Math.floor((x / width) * maskWidth));
      const alpha = Math.min(1, Math.max(0, person[my * maskWidth + mx]));
      if (alpha > 0.995) continue;
      const at = (y * width + x) * 4;
      frame.data[at] = frame.data[at] * alpha + backdrop[0] * (1 - alpha);
      frame.data[at + 1] = frame.data[at + 1] * alpha + backdrop[1] * (1 - alpha);
      frame.data[at + 2] = frame.data[at + 2] * alpha + backdrop[2] * (1 - alpha);
      frame.data[at + 3] = 255;
    }
  }

  context.putImageData(frame, 0, 0);
  return { canvas: out, width, height };
}

export function parseColour(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const value = Number.parseInt(full, 16);
  if (!Number.isFinite(value)) return [255, 255, 255];
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}
