"use client";

/**
 * The formats a phone produces, turned into ones a printer accepts.
 *
 * A shop printed nothing for a customer who had paid, because Windows has no
 * PrintTo handler for WebP and GDI+ cannot decode it either — and a modern
 * Android camera saves WebP by default. The fix is to convert before the file
 * ever leaves the phone, where the browser that made the format is the thing
 * best placed to read it.
 *
 * Shared, because both the Smart Print flow and anything else that uploads a
 * customer's picture needs it, and a second copy is a second thing to forget.
 */

export async function toPrintableImage(file: File): Promise<File> {
  const isWebp = file.type === "image/webp" || /\.webp$/i.test(file.name);
  if (!isWebp) return file;

  try {
    const bitmap = await createImageBitmap(file);

    /*
      Capped on the long edge.

      A4 at 300dpi is about 2480 × 3508, so 3000 is more resolution than any
      counter printer will use — and it keeps a phone photo from becoming a
      lossless PNG too large to upload.
    */
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = longest > 3000 ? 3000 / longest : 1;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    const asBlob = (type: string, quality?: number) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

    // PNG first, because a webp is as often a screenshot full of text as it
    // is a photograph, and JPEG artefacts around text are visible on paper.
    let blob = await asBlob("image/png");
    let extension = "png";
    if (blob && blob.size > 15 * 1024 * 1024) {
      const smaller = await asBlob("image/jpeg", 0.92);
      if (smaller) {
        blob = smaller;
        extension = "jpg";
      }
    }
    if (!blob) return file;

    const base = file.name.replace(/\.webp$/i, "") || "photo";
    return new File([blob], `${base}.${extension}`, { type: blob.type });
  } catch {
    return file;
  }
}
