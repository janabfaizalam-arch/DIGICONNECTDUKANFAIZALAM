/** DC Partner mobile banner target ratio: 1680×720 = 7:3 */
export const PARTNER_MOBILE_BANNER_RATIO = 7 / 3;
export const PARTNER_MOBILE_BANNER_SIZE_HINT = "1680 × 720 px (7:3)";

/**
 * DC Partner desktop banner target ratio: 2000×800 = 5:2.
 *
 * The slider draws the desktop banner at a fixed 5:2 in the work column, so
 * anything else is cropped by object-cover. The admin form used to recommend
 * 1920×823 (21:9), which was the ratio before the banner moved into that
 * column -- a 21:9 upload now loses a third of its height.
 */
export const PARTNER_DESKTOP_BANNER_RATIO = 5 / 2;
export const PARTNER_DESKTOP_BANNER_SIZE_HINT = "2000 × 800 px (5:2)";

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

export function isNearPartnerDesktopBannerRatio(
  width: number,
  height: number,
  tolerance = PARTNER_MOBILE_BANNER_RATIO_TOLERANCE,
): boolean {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return false;
  }
  const ratio = width / height;
  const target = PARTNER_DESKTOP_BANNER_RATIO;
  return Math.abs(ratio - target) / target <= tolerance;
}

export function partnerDesktopBannerRatioWarning(width: number, height: number): string | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }
  if (isNearPartnerDesktopBannerRatio(width, height)) return null;
  const ratio = (width / height).toFixed(2);
  return `Desktop image is ${width}×${height} (≈${ratio}:1). Recommended ${PARTNER_DESKTOP_BANNER_SIZE_HINT} so the slider does not crop it.`;
}
