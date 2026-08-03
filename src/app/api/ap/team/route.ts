import { NextResponse } from "next/server";

import {
  canManagePartnerTeam,
  isTeamCreatablePartnerType,
  normalizePartnerType,
  teamCreatablePartnerTypes,
} from "@/lib/ap/partner-type";
import { getCurrentUser, getCurrentUserRole, isAgencyPartnerRole } from "@/lib/auth";
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

// ── Helper: get the current user's AP record ────────────────────────────────

async function getAuthenticatedTeamManager() {
  const user = await getCurrentUser();

  if (!user) {
    return { error: jsonError("Authentication required.", 401), user: null, ap: null };
  }

  const role = await getCurrentUserRole(user);

  if (!isAgencyPartnerRole(role)) {
    return { error: jsonError("Partner access required.", 403), user: null, ap: null };
  }

  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return { error: jsonError("Service unavailable.", 500), user: null, ap: null };
  }

  const { data: ap } = await supabase
    .from("agency_partners")
    .select("id, user_id, partner_code, partner_type, status, kyc_status, full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!ap) {
    return { error: jsonError("Partner profile not found.", 404), user: null, ap: null };
  }

  if (ap.status !== "active") {
    return { error: jsonError("Partner account is not active.", 403), user: null, ap: null };
  }

  if (!canManagePartnerTeam(ap.partner_type)) {
    return {
      error: jsonError("Only Company Partners can manage team members.", 403),
      user: null,
      ap: null,
    };
  }

  return { error: null, user, ap, supabase };
}

// ── GET: List team members created by this CEO ──────────────────────────────

export async function GET() {
  try {
    const auth = await getAuthenticatedTeamManager();

    if (auth.error) {
      return auth.error;
    }

    const { user, supabase } = auth;

    const { data: teamMembers, error } = await supabase!
      .from("agency_partners")
      .select("id, user_id, partner_code, full_name, partner_type, mobile, email, status, kyc_status, district, state, created_at")
      .eq("created_by_user_id", user!.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[partner-team] Team list query failed:", error.message);
      return jsonError("Failed to load team members.", 500);
    }

    // Fetch basic application counts for each team member
    const teamWithStats = await Promise.all(
      (teamMembers ?? []).map(async (member) => {
        const { count: totalApps } = await supabase!
          .from("applications")
          .select("id", { count: "exact", head: true })
          .or(`created_by.eq.${member.user_id},assigned_agent_id.eq.${member.user_id}`);

        return {
          ...member,
          totalApplications: totalApps ?? 0,
        };
      })
    );

    return NextResponse.json({
      teamMembers: teamWithStats,
      count: teamWithStats.length,
    });
  } catch (error) {
    console.error("[partner-team] GET error:", error);
    return jsonError("Internal error.", 500);
  }
}

// ── POST: Create a team member (Business Partner / Field Executive / Office Staff)

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedTeamManager();

    if (auth.error) {
      return auth.error;
    }

    const { user, ap, supabase } = auth;

    const body = await request.json();

    const fullName = String(body.fullName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const partnerTypeRaw = String(body.partnerType ?? "field_executive");
    const partnerType = normalizePartnerType(partnerTypeRaw);
    const mobile = normalizeMobile(String(body.mobile ?? ""));
    const whatsapp = normalizeMobile(String(body.whatsapp ?? ""));
    const businessName = String(body.businessName ?? "").trim();
    const address = String(body.address ?? "").trim();
    const district = String(body.district ?? "").trim();
    const state = String(body.state ?? "").trim();
    const pin = String(body.pin ?? "").replace(/\D/g, "").slice(0, 6);

    // ── Validation ──────────────────────────────────────────────────────

    if (!fullName || !mobile || !email || !password || !address) {
      return jsonError("Name, mobile, email, password, and address are required.", 400);
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

    // Company Partners may create Business Partner / Field Executive / Office Staff — not Company Partner
    if (!partnerType || !isTeamCreatablePartnerType(partnerType)) {
      return jsonError(
        `Team members can only be: ${teamCreatablePartnerTypes().join(", ")}.`,
        400,
      );
    }

    // ── Uniqueness checks ───────────────────────────────────────────────

    const { data: existingEmail } = await supabase!
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingEmail) {
      return jsonError("Email is already registered.", 409);
    }

    // ── Generate partner code ───────────────────────────────────────────

    // Count existing team members for sequential code generation
    const { count: teamCount } = await supabase!
      .from("agency_partners")
      .select("id", { count: "exact", head: true })
      .eq("created_by_user_id", user!.id);

    const sequence = String((teamCount ?? 0) + 1).padStart(3, "0");
    const managerCode = ap!.partner_code;
    const partnerCode = `${managerCode}-T${sequence}`;

    // ── Get default tier ────────────────────────────────────────────────

    const { data: tierData } = await supabase!
      .from("agency_partner_tiers")
      .select("id")
      .eq("slug", "ap-starter")
      .maybeSingle();

    const tierId = tierData?.id ?? null;

    // ── Create Supabase Auth user ───────────────────────────────────────

    const { data: created, error: createError } = await supabase!.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: "agency_partner",
      },
    });

    if (createError || !created.user) {
      console.error("[partner-team] Auth creation failed:", createError?.message);
      return jsonError("Team member credentials could not be registered.", 500);
    }

    // ── Create records ──────────────────────────────────────────────────

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
      tier_id: tierId,
      commission_type: "fixed",
      commission_value: 0,
      commission_rate: 0,
      status: "active",
      kyc_status: "approved",
      created_by_user_id: user!.id, // Company Partner team scoping
      reporting_to_partner_id: ap!.id,
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

    console.info("[partner-team] inserting_records", {
      managerId: user!.id,
      managerPartnerId: ap!.id,
      memberCode: partnerCode,
      partnerType,
    });

    const [apRes, profileRes, userRes] = await Promise.all([
      supabase!.from("agency_partners").upsert(apPayload, { onConflict: "user_id" }),
      supabase!.from("profiles").upsert(profilePayload, { onConflict: "id" }),
      supabase!.from("users").upsert(userPayload, { onConflict: "id" }),
    ]);

    if (apRes.error || profileRes.error || userRes.error) {
      const errMsg = apRes.error?.message || profileRes.error?.message || userRes.error?.message || "unknown";
      const errCode = apRes.error?.code || profileRes.error?.code || userRes.error?.code;
      const errDetails = apRes.error?.details || profileRes.error?.details || userRes.error?.details;
      console.error("[partner-team] Record sync failed:", {
        message: errMsg,
        code: errCode,
        details: errDetails,
        partnerType,
        partnerCode,
      });
      // Rollback auth user
      await supabase!.auth.admin.deleteUser(created.user.id);

      const isPartnerTypeCheck =
        /agency_partners_partner_type_check/i.test(errMsg) ||
        (/partner_type/i.test(errMsg) && /check constraint/i.test(errMsg));

      if (isPartnerTypeCheck) {
        return jsonError(
          `Team member creation failed: database partner_type check still rejects "${partnerType}". ` +
            `Apply migration 20260803120000_partner_types_v2_repair.sql so allowed values are ` +
            `business_partner, company_partner, field_executive, office_staff.`,
          500,
        );
      }

      return jsonError("Team member creation failed: " + errMsg, 500);
    }

    console.log("[partner-team] Team member created:", {
      managerId: user!.id,
      managerCode,
      memberId: created.user.id,
      memberCode: partnerCode,
      partnerType,
    });

    return NextResponse.json({
      message: "Team member created successfully.",
      partnerId: created.user.id,
      partnerCode,
      partnerType,
    });
  } catch (error) {
    console.error("[partner-team] POST error:", error);
    return jsonError(error instanceof Error ? error.message : "Internal error.", 500);
  }
}
