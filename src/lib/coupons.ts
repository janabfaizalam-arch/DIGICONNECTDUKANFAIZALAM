import fs from "fs";
import path from "path";

export type Coupon = {
  code: string;
  discountType: "fixed" | "percentage";
  discountValue: number;
  applicableService: string; // "All" or specific service slug
  minOrderAmount?: number;
  maxDiscount?: number;
  usageLimit?: number;
  perUserUsageLimit?: number;
  startDate?: string;
  expiryDate?: string;
  active: boolean;
  usedCount: number;
};

const DB_FILE_PATH = path.join(process.cwd(), "src/lib/coupons-db.json");

const DEFAULT_COUPONS: Coupon[] = [
  {
    code: "DGCNT5K",
    discountType: "fixed",
    discountValue: 5000,
    applicableService: "cm-yuva-entrepreneur-loan-assistance",
    active: true,
    usedCount: 0,
  },
];

// Helper to read coupons from local file-based store
export function getCoupons(): Coupon[] {
  try {
    if (!fs.existsSync(DB_FILE_PATH)) {
      // Initialize with default coupon
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(DEFAULT_COUPONS, null, 2), "utf-8");
      return DEFAULT_COUPONS;
    }
    const data = fs.readFileSync(DB_FILE_PATH, "utf-8");
    return JSON.parse(data) as Coupon[];
  } catch (error) {
    console.error("[coupons-db] Error reading coupons database:", error);
    return DEFAULT_COUPONS;
  }
}

// Helper to save coupons to local file-based store
export function saveCoupons(coupons: Coupon[]): boolean {
  try {
    const dir = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(coupons, null, 2), "utf-8");
    return true;
  } catch (error) {
    console.error("[coupons-db] Error writing to coupons database:", error);
    return false;
  }
}

// Add a coupon
export function addCoupon(coupon: Omit<Coupon, "usedCount">): boolean {
  const coupons = getCoupons();
  // Check if coupon already exists
  const exists = coupons.some((c) => c.code.trim().toUpperCase() === coupon.code.trim().toUpperCase());
  if (exists) {
    return false;
  }
  coupons.push({
    ...coupon,
    code: coupon.code.trim().toUpperCase(),
    usedCount: 0,
  });
  return saveCoupons(coupons);
}

export type CouponValidationResult = {
  valid: boolean;
  discountAmount: number;
  message: string;
};

// Server-side Coupon validation helper
export function validateCoupon({
  couponCode,
  serviceSlug,
  amount,
}: {
  couponCode: string;
  serviceSlug?: string;
  userId?: string | null;
  amount: number;
}): CouponValidationResult {
  const code = String(couponCode ?? "").trim().toUpperCase();
  if (!code) {
    return { valid: false, discountAmount: 0, message: "Coupon code is empty." };
  }

  const coupons = getCoupons();
  const coupon = coupons.find((c) => c.code === code);

  if (!coupon) {
    return { valid: false, discountAmount: 0, message: "Invalid coupon code." };
  }

  if (!coupon.active) {
    return { valid: false, discountAmount: 0, message: "This coupon is inactive." };
  }

  // Service slug check
  if (serviceSlug && coupon.applicableService !== "All" && coupon.applicableService !== serviceSlug) {
    return {
      valid: false,
      discountAmount: 0,
      message: "This coupon is not applicable to the selected service.",
    };
  }

  // Minimum order amount check
  if (coupon.minOrderAmount !== undefined && amount < coupon.minOrderAmount) {
    return {
      valid: false,
      discountAmount: 0,
      message: `Minimum order amount of ₹${coupon.minOrderAmount} is required.`,
    };
  }

  // Expiry date check
  if (coupon.expiryDate) {
    const expiry = new Date(coupon.expiryDate);
    if (isNaN(expiry.getTime()) || expiry.getTime() < Date.now()) {
      return { valid: false, discountAmount: 0, message: "This coupon has expired." };
    }
  }

  // Start date check
  if (coupon.startDate) {
    const start = new Date(coupon.startDate);
    if (!isNaN(start.getTime()) && start.getTime() > Date.now()) {
      return { valid: false, discountAmount: 0, message: "This coupon is not active yet." };
    }
  }

  // Usage limit check
  if (coupon.usageLimit !== undefined && coupon.usedCount >= coupon.usageLimit) {
    return { valid: false, discountAmount: 0, message: "This coupon usage limit has been exceeded." };
  }

  // Calculate discount amount
  let discountAmount = 0;
  if (coupon.discountType === "fixed") {
    discountAmount = coupon.discountValue;
  } else if (coupon.discountType === "percentage") {
    discountAmount = Math.round(amount * (coupon.discountValue / 100));
  }

  // Cap with maximum discount if defined
  if (coupon.maxDiscount !== undefined && discountAmount > coupon.maxDiscount) {
    discountAmount = coupon.maxDiscount;
  }

  // Discount cannot exceed original amount
  discountAmount = Math.min(amount, discountAmount);

  return {
    valid: true,
    discountAmount,
    message: "Coupon applied successfully!",
  };
}
