import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getCoupons, addCoupon, saveCoupons, type Coupon } from "@/lib/coupons";

async function requireAdmin() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  const coupons = getCoupons();
  return NextResponse.json({ success: true, coupons });
}

export async function POST(request: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const body = await request.json().catch(() => null);
    const code = String(body?.code ?? "").trim().toUpperCase();
    const discountType = String(body?.discountType ?? "fixed") as "fixed" | "percentage";
    const discountValue = Number(body?.discountValue ?? 0);
    const applicableService = String(body?.applicableService ?? "All").trim();
    const minOrderAmount = body?.minOrderAmount !== undefined && body.minOrderAmount !== "" ? Number(body.minOrderAmount) : undefined;
    const maxDiscount = body?.maxDiscount !== undefined && body.maxDiscount !== "" ? Number(body.maxDiscount) : undefined;
    const usageLimit = body?.usageLimit !== undefined && body.usageLimit !== "" ? Number(body.usageLimit) : undefined;
    const perUserUsageLimit = body?.perUserUsageLimit !== undefined && body.perUserUsageLimit !== "" ? Number(body.perUserUsageLimit) : undefined;
    const startDate = body?.startDate || undefined;
    const expiryDate = body?.expiryDate || undefined;
    const active = body?.active !== false; // defaults to true

    if (!code) {
      return NextResponse.json({ message: "Coupon code is required." }, { status: 400 });
    }

    if (discountValue <= 0) {
      return NextResponse.json({ message: "Discount value must be greater than 0." }, { status: 400 });
    }

    const newCoupon: Omit<Coupon, "usedCount"> = {
      code,
      discountType,
      discountValue,
      applicableService,
      minOrderAmount,
      maxDiscount,
      usageLimit,
      perUserUsageLimit,
      startDate,
      expiryDate,
      active,
    };

    const success = addCoupon(newCoupon);
    if (!success) {
      return NextResponse.json({ message: "A coupon with this code already exists." }, { status: 409 });
    }

    return NextResponse.json({ success: true, message: "Coupon created successfully." });
  } catch (error) {
    console.error("[api/admin/coupons] POST error:", error);
    return NextResponse.json({ message: "Failed to create coupon." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const body = await request.json().catch(() => null);
    const code = String(body?.code ?? "").trim().toUpperCase();
    const active = body?.active === true;

    if (!code) {
      return NextResponse.json({ message: "Coupon code is required." }, { status: 400 });
    }

    const coupons = getCoupons();
    const couponIndex = coupons.findIndex((c) => c.code === code);
    if (couponIndex === -1) {
      return NextResponse.json({ message: "Coupon not found." }, { status: 404 });
    }

    coupons[couponIndex].active = active;
    const success = saveCoupons(coupons);
    if (!success) {
      return NextResponse.json({ message: "Failed to update coupon status." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Coupon ${active ? "activated" : "deactivated"} successfully.` });
  } catch (error) {
    console.error("[api/admin/coupons] PUT error:", error);
    return NextResponse.json({ message: "Failed to update coupon." }, { status: 500 });
  }
}
