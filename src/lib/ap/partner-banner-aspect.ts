/** Digi Partner mobile banner target ratio: 1400×600 = 7:3 */
export const PARTNER_MOBILE_BANNER_RATIO = 7 / 3;
export const PARTNER_MOBILE_BANNER_SIZE_HINT = "1400 × 600 px (7:3)";

/** Allow ~8% tolerance before warning (covers minor crop/export variance). */
export const PARTNER_MOBILE_BANNER_RATIO_TOLERANCE = 0.08;

export function isNearPartnerMobileBannerRatio(
  width: number,
  height: number,
  tolerance = PARTNER_MOBILE_BANNER_RATIO_TOLERANCE,
): boolean {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return false;
  }
  const ratio = width / height;
  const target = PARTNER_MOBILE_BANNER_RATIO;
  return Math.abs(ratio - target) / target <= tolerance;
}

export function partnerMobileBannerRatioWarning(width: number, height: number): string | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }
  if (isNearPartnerMobileBannerRatio(width, height)) return null;
  const ratio = (width / height).toFixed(2);
  return `Mobile image is ${width}×${height} (≈${ratio}:1). Recommended ${PARTNER_MOBILE_BANNER_SIZE_HINT} so the slider does not crop unexpectedly.`;
}

export function readImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !file.type.startsWith("image/")) {
      resolve(null);
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      URL.revokeObjectURL(url);
      resolve({ width, height });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    image.src = url;
  });
}
