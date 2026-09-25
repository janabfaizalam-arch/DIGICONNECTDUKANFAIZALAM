/**
 * Shrink a banner in the browser before it is uploaded.
 *
 * The upload route accepts 8MB, but the request never reaches it: a serverless
 * function's body is capped around 4.5MB by the platform, so a larger file
 * comes back as a bare 413 with no message the admin can act on. A PNG export
 * of a 2000px banner clears that limit easily.
 *
 * Re-encoding here fixes both ends of that. The request stays small enough to
 * arrive, and every partner downloads a banner that is a fraction of the PNG
 * rather than the PNG itself.
 *
 * It is best effort throughout: a browser without canvas, an image that will
 * not decode, an encoder that returns nothing -- each returns the original
 * file, and the server's own validation still applies.
 */

/** Wider than the banner is ever drawn (1338px in the work column, x2 for retina). */
const MAX_WIDTH = 2800;

/** Well under the platform's body cap, with room for a second image and the fields. */
const TARGET_BYTES = 1_400_000;

/** Stop before quality becomes visible on flat brand colour. */
const MIN_QUALITY = 0.6;

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function shrinkBannerImage(file: File): Promise<File> {
  if (typeof window === "undefined" || typeof document === "undefined") return file;
  if (!file.type.startsWith("image/")) return file;

  // Already small and already efficient: nothing to gain.
  if (file.size <= TARGET_BYTES && file.type !== "image/png") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_WIDTH / bitmap.width);
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    // WebP holds flat brand colour and gradients far better than JPEG at the
    // same size, and the upload route already accepts it.
    let quality = 0.92;
    let blob = await canvasToBlob(canvas, "image/webp", quality);

    while (blob && blob.size > TARGET_BYTES && quality > MIN_QUALITY) {
      quality = Math.max(MIN_QUALITY, quality - 0.1);
      blob = await canvasToBlob(canvas, "image/webp", quality);
    }

    if (!blob) return file;
    // If the re-encode somehow grew the file, keep what the admin chose.
    if (blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([blob], name, { type: "image/webp", lastModified: Date.now() });
  } catch {
    return file;
  }
}

/**
 * Replace every image in a form submission with its shrunk version.
 *
 * Entries that are not files, or are empty file inputs, are left exactly as
 * they are -- an untouched "replace image" field must stay untouched.
 */
export async function shrinkBannerFormImages(body: FormData, keys: string[]): Promise<FormData> {
  for (const key of keys) {
    const value = body.get(key);
    if (!(value instanceof File) || value.size === 0) continue;
    const shrunk = await shrinkBannerImage(value);
    if (shrunk !== value) body.set(key, shrunk);
  }
  return body;
}
