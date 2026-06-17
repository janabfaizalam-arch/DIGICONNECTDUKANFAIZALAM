/**
 * File validation utility for RNOS platform.
 * Verifies magic numbers (file signatures) on the server-side to prevent extension-spoofing attacks.
 */

// Mapping of allowed MIME types to their signature match functions
const signatureValidators: Record<string, (header: Uint8Array) => boolean> = {
  "application/pdf": (header) =>
    header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46, // %PDF

  "image/png": (header) =>
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47 &&
    header[4] === 0x0d &&
    header[5] === 0x0a &&
    header[6] === 0x1a &&
    header[7] === 0x0a, // PNG signature

  "image/jpeg": (header) => header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff, // SOI (Start of Image)
  "image/jpg": (header) => header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff, // JPEG alias

  "image/webp": (header) =>
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46 && // RIFF
    header[8] === 0x57 &&
    header[9] === 0x45 &&
    header[10] === 0x42 &&
    header[11] === 0x50, // WEBP

  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": (header) =>
    header[0] === 0x50 && header[1] === 0x4b && header[2] === 0x03 && header[3] === 0x04, // PK\x03\x04 (zip/docx)
};

/**
 * Validates a file instance using both MIME metadata and magic bytes.
 */
export async function validateFileSignature(
  file: File,
  allowedMimes: string[]
): Promise<{ valid: boolean; error: string | null }> {
  const mimeType = file.type || "application/octet-stream";

  // 1. Basic type whitelist check
  if (!allowedMimes.includes(mimeType)) {
    return {
      valid: false,
      error: `Invalid file type: ${mimeType}. Allowed formats are: ${allowedMimes.join(", ")}`,
    };
  }

  // 2. Read first 12 bytes of the file
  try {
    const slice = file.slice(0, 12);
    const arrayBuffer = await slice.arrayBuffer();
    const header = new Uint8Array(arrayBuffer);

    if (header.length < 4) {
      return {
        valid: false,
        error: "File is too small to analyze.",
      };
    }

    const validator = signatureValidators[mimeType];
    if (!validator) {
      return {
        valid: false,
        error: `No magic bytes validator found for: ${mimeType}`,
      };
    }

    if (!validator(header)) {
      return {
        valid: false,
        error: `File signature mismatch. The file content does not match the declared type ${mimeType}.`,
      };
    }

    return { valid: true, error: null };
  } catch (err) {
    console.error("[file-validation] Signature extraction error:", err);
    return {
      valid: false,
      error: "Failed to verify file integrity on server.",
    };
  }
}
