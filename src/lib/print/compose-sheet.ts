"use client";

/**
 * Drawing the finished sheet in the customer's own browser.
 *
 * The printer receives a file. Everything Smart Print promises — twelve
 * passport photos ready to cut, an Aadhaar front and back on one A4, four ID
 * cards to a page — is that file being composed before it is uploaded. Doing
 * it here rather than on a server has one property worth more than the
 * convenience: the picture the customer approves and the file the printer
 * prints are produced by the same code from the same numbers, so they cannot
 * drift apart.
 *
 * The geometry lives in sheet-layout.ts and is tested. This file only turns
 * those millimetres into pixels on a canvas.
 */

import {
  coverCrop,
  mmToPx,
  sheetPixels,
  type Rect,
  type SheetPlan,
} from "@/lib/print/sheet-layout";

export type LoadedImage = { element: HTMLImageElement; width: number; height: number };

/** Simple adjustments a phone photo usually needs before it is printed. */
export type ImageAdjustments = {
  brightness?: number;
  contrast?: number;
  saturation?: number;
  /** Quarter turns clockwise. */
  rotate?: 0 | 1 | 2 | 3;
  mono?: boolean;
};

export async function loadImage(source: File | string): Promise<LoadedImage> {
  const url = typeof source === "string" ? source : URL.createObjectURL(source);
  try {
    const element = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("That picture could not be opened."));
      image.src = url;
    });
    return { element, width: element.naturalWidth, height: element.naturalHeight };
  } finally {
    if (typeof source !== "string") {
      // Revoked on the next tick: Safari needs the URL alive until decode ends.
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }
  }
}

function filterFor(adjustments?: ImageAdjustments): string {
  if (!adjustments) return "none";
  const parts: string[] = [];
  if (adjustments.brightness && adjustments.brightness !== 1) {
    parts.push(`brightness(${adjustments.brightness})`);
  }
  if (adjustments.contrast && adjustments.contrast !== 1) {
    parts.push(`contrast(${adjustments.contrast})`);
  }
  if (adjustments.saturation && adjustments.saturation !== 1) {
    parts.push(`saturate(${adjustments.saturation})`);
  }
  if (adjustments.mono) parts.push("grayscale(1)");
  return parts.length ? parts.join(" ") : "none";
}

/**
 * Draw one image into one slot, cropped to fill and never squashed.
 *
 * A rotation is applied about the slot's own centre so a turned photo still
 * lands exactly where the layout put it.
 */
function drawInto(
  context: CanvasRenderingContext2D,
  image: LoadedImage,
  slot: Rect,
  dpi: number,
  adjustments?: ImageAdjustments,
) {
  const x = mmToPx(slot.x, dpi);
  const y = mmToPx(slot.y, dpi);
  const width = mmToPx(slot.width, dpi);
  const height = mmToPx(slot.height, dpi);

  const quarter = ((adjustments?.rotate ?? 0) % 4) as 0 | 1 | 2 | 3;
  const swapped = quarter === 1 || quarter === 3;
  const crop = coverCrop(
    swapped ? { width: image.height, height: image.width } : image,
    { width: slot.width, height: slot.height },
  );

  context.save();
  context.filter = filterFor(adjustments);
  context.translate(x + width / 2, y + height / 2);
  if (quarter) context.rotate((quarter * Math.PI) / 2);

  const boxWidth = swapped ? height : width;
  const boxHeight = swapped ? width : height;

  context.drawImage(
    image.element,
    swapped ? crop.sy : crop.sx,
    swapped ? crop.sx : crop.sy,
    swapped ? crop.sHeight : crop.sWidth,
    swapped ? crop.sWidth : crop.sHeight,
    -boxWidth / 2,
    -boxHeight / 2,
    boxWidth,
    boxHeight,
  );
  context.restore();
}

export type ComposeInput = {
  plan: SheetPlan;
  /** One image per slot; a shorter list repeats from the start. */
  images: LoadedImage[];
  adjustments?: ImageAdjustments;
  /** Faint cut guides help a shop's scissors and cost nothing to print. */
  cutMarks?: boolean;
  dpi?: number;
};

/**
 * The whole sheet, on a canvas, at print resolution.
 *
 * White first: photo paper is white, but a canvas is transparent, and a
 * transparent PNG sent to a printer comes out with black where the paper
 * should be.
 */
export function composeSheet(input: ComposeInput): HTMLCanvasElement {
  const dpi = input.dpi ?? 300;
  const size = sheetPixels(input.plan.paper, dpi);

  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot prepare the print sheet.");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  input.plan.slots.forEach((slot, index) => {
    const image = input.images[index % Math.max(1, input.images.length)];
    if (image) drawInto(context, image, slot, dpi, input.adjustments);
  });

  if (input.cutMarks) {
    context.save();
    context.strokeStyle = "rgba(0,0,0,0.25)";
    context.lineWidth = Math.max(1, Math.round(dpi / 300));
    for (const slot of input.plan.slots) {
      context.strokeRect(
        mmToPx(slot.x, dpi),
        mmToPx(slot.y, dpi),
        mmToPx(slot.width, dpi),
        mmToPx(slot.height, dpi),
      );
    }
    context.restore();
  }

  return canvas;
}

/**
 * The sheet as a file, ready to upload.
 *
 * PNG, because a passport photo through JPEG twice is a passport photo with
 * visible blocks around the eyes, and because the Print Station prints a PNG
 * through Windows' own drawing library without help.
 */
export async function sheetToFile(canvas: HTMLCanvasElement, name: string): Promise<File> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("The print sheet could not be prepared.");
  return new File([blob], name, { type: "image/png" });
}

/** A small version for the screen. Full resolution on a phone is wasted memory. */
export function previewDataUrl(canvas: HTMLCanvasElement, maxWidth = 700): string {
  if (canvas.width <= maxWidth) return canvas.toDataURL("image/jpeg", 0.86);

  const scale = maxWidth / canvas.width;
  const small = document.createElement("canvas");
  small.width = Math.round(canvas.width * scale);
  small.height = Math.round(canvas.height * scale);

  const context = small.getContext("2d");
  if (!context) return canvas.toDataURL("image/jpeg", 0.86);
  context.imageSmoothingQuality = "high";
  context.drawImage(canvas, 0, 0, small.width, small.height);
  return small.toDataURL("image/jpeg", 0.86);
}
