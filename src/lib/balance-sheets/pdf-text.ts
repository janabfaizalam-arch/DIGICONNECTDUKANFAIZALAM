import "server-only";

import { DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";

/**
 * pdf.js (inside pdf-parse) needs DOMMatrix, ImageData and Path2D. In Node it
 * looks for @napi-rs/canvas with a runtime require that Vercel's file tracer
 * cannot see, so on Vercel the package was missing and loading the module
 * threw "DOMMatrix is not defined". Importing the canvas package here makes
 * it part of the bundle, and setting the globals before pdf-parse loads
 * means pdf.js never has to look for it.
 */
const scope = globalThis as Record<string, unknown>;
scope.DOMMatrix ??= DOMMatrix;
scope.ImageData ??= ImageData;
scope.Path2D ??= Path2D;

/** Load pdf-parse only after the globals above are in place. */
export function loadPdfParse() {
  return import("pdf-parse");
}
