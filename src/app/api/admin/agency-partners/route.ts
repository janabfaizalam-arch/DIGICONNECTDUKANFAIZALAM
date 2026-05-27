import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function normalizeMobile(value: string) {
  return value.replace(/\D/g, "").slice(-10);
}

function normalizePartnerCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const role = await getCurrentUserRole(user);

    if (!user || !isAdminRole(role)) {
      return jsonError("Admin access required.", 403);
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error("[admin-ap] Supabase admin client is missing.");
      return jsonError("Agency Partner creation is not available right now.", 500);
    }

    const body = await request.json();

    const fullName = String(body.fullName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const partnerCode = normalizePartnerCode(String(body.partnerCode ?? ""));
    const partnerType = String(body.partnerType ?? "field_executive");
    
    const mobile = normalizeMobile(String(body.mobile ?? ""));
    const whatsapp = normalizeMobile(String(body.whatsapp ?? ""));
    
    const businessName = String(body.businessName ?? "").trim();
    const address = String(body.address ?? "").trim();
    const district = String(body.district ?? "").trim();
    const state = String(body.state ?? "").trim();
    const pin = String(body.pin ?? "").replace(/\D/g, "").slice(0, 6);
    
    const aadhaarNumber = String(body.aadhaarNumber ?? "").replace(/\D/g, "").slice(0, 12);
    const panNumber = String(body.panNumber ?? "").trim().toUpperCase();
    const gstin = String(body.gstin ?? "").trim().toUpperCase();
    
    const bankAccountName = String(body.bankAccountName ?? "").trim();
    const bankAccountNumber = String(body.bankAccountNumber ?? "").trim();
    const bankIfsc = String(body.bankIfsc ?? "").trim().toUpperCase();
    const bankName = String(body.bankName ?? "").trim();
    const upiId = String(body.upiId ?? "").trim();
    
    const emergencyContact = String(body.emergencyContact ?? "").trim();
    const nomineeName = String(body.nomineeName ?? "").trim();
    const nomineeRelation = String(body.nomineeRelation ?? "").trim();
    const referralSource = String(body.referralSource ?? "").trim();
    
    const commissionType = String(body.commissionType ?? "fixed");
    const commissionValue = Number(body.commissionValue ?? 0);

    if (!fullName || !mobile || !email || !password || !partnerCode || !address) {
      return jsonError("Partner name, mobile, email, code, password, and address are required.", 400);
    }

    if (mobile.length !== 10) {
      return jsonError("Enter a valid 10-digit mobile number.", 400);
    }

    if (!isValidEmail(email)) {
      return jsonError("Enter a valid email address.", 400);
    }

    if (password.length < 8) {
      return jsonError("Password must be at least 8 characters.", 400);
    }

    if (!["fixed", "percentage", "tiered"].includes(commissionType)) {
      return jsonError("Invalid commission type.", 400);
    }

    // Check if code or email is already taken
    const { data: existingCode } = await supabase
      .from("agency_partners")
      .select("id")
      .ilike("partner_code", partnerCode)
      .maybeSingle();

    if (existingCode) {
      return jsonError("Partner code is already in use.", 409);
    }

    const { data: existingEmail } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingEmail) {
      return jsonError("Email is already in use.", 409);
    }

    // Get default tier standard/starter id
    const { data: tierData } = await supabase
      .from("agency_partner_tiers")
      .select("id")
      .eq("slug", "ap-starter")
      .maybeSingle();
    const tierId = tierData?.id ?? null;

    // Create Supabase Auth user
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: "agency_partner",
      },
    });

    if (createError || !created.user) {
      console.error("[admin-ap] Auth creation failed:", createError?.message);
      return jsonError("Partner credentials could not be registered.", 500);
    }

    // Prepare sync models
    const apPayload = {
      user_id: created.user.id,
      partner_code: partnerCode,
      full_name: fullName,
      business_name: businessName || null,
      partner_type: partnerType,
      mobile,
      whatsapp: whatsapp || null,
      email,
      address,
      state,
      district,
      pin,
      aadhaar_number: aadhaarNumber || null,
      pan_number: panNumber || null,
      gstin: gstin || null,
      bank_account_name: bankAccountName || null,
      bank_account_number: bankAccountNumber || null,
      bank_ifsc: bankIfsc || null,
      bank_name: bankName || null,
      upi_id: upiId || null,
      emergency_contact: emergencyContact || null,
      nominee_name: nomineeName || null,
      nominee_relation: nomineeRelation || null,
      referral_source: referralSource || null,
      tier_id: tierId,
      commission_type: commissionType,
      commission_value: commissionType === "percentage" ? 0 : commissionValue,
      commission_rate: commissionType === "percentage" ? commissionValue : 0,
      status: "active", // default active for direct admin onboard
      kyc_status: "approved", // default approved for direct admin onboard
    };

    const profilePayload = {
      id: created.user.id,
      full_name: fullName,
      email,
      mobile,
      role: "agency_partner",
      agent_code: partnerCode,
      address,
      area: address,
      shop_name: businessName || null,
      shop_address: address,
      pincode: pin,
      city: district,
      state,
      aadhaar_number: aadhaarNumber || null,
      pan_number: panNumber || null,
      gst_number: gstin || null,
      bank_account_name: bankAccountName || null,
      bank_account_number: bankAccountNumber || null,
      bank_ifsc: bankIfsc || null,
      bank_name: bankName || null,
      upi_id: upiId || null,
      commission_type: commissionType,
      commission_value: commissionType === "percentage" ? 0 : commissionValue,
      commission_rate: commissionType === "percentage" ? commissionValue : 0,
      kyc_status: "approved",
      active: true,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    const userPayload = {
      id: created.user.id,
      full_name: fullName,
      email,
      role: "agency_partner",
      avatar_url: "",
      updated_at: new Date().toISOString(),
    };

    // Upsert transactions
    const [apRes, profileRes, userRes] = await Promise.all([
      supabase.from("agency_partners").upsert(apPayload, { onConflict: "user_id" }),
      supabase.from("profiles").upsert(profilePayload, { onConflict: "id" }),
      supabase.from("users").upsert(userPayload, { onConflict: "id" }),
    ]);

    if (apRes.error || profileRes.error || userRes.error) {
      console.error("[admin-ap] Sync failed:", apRes.error?.message || profileRes.error?.message || userRes.error?.message);
      // rollback auth user
      await supabase.auth.admin.deleteUser(created.user.id);
      return jsonError("Sync profiles failed: " + (apRes.error?.message || profileRes.error?.message || userRes.error?.message), 500);
    }

    return NextResponse.json({
      message: "Agency Partner created successfully.",
      partnerId: created.user.id,
      partnerCode,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Internal error occurred.", 500);
  }
}
