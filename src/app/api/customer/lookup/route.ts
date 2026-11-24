import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/*
  Partner customer lookup — the partner's own customers only.

  This used to search every profile on the site by mobile number, which showed
  a partner people who had never walked into their shop (and their reward
  wallet), and in practice returned nothing for the walk-ins a partner had
  actually served: those customers rarely have a site account. The partner's
  customers are the people on the partner's own applications, so that is where
  the lookup now goes, and nowhere else.

  Who the partner is comes from agency_partners.user_id — the same record the
  wizard's payment path trusts — never from anything the caller can write.
*/

type DetailsRecord = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): DetailsRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as DetailsRecord;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as DetailsRecord;
    } catch {
      /* not JSON */
    }
  }
  return {};
}

/** The first non-empty value of `key` across the rows, newest first. */
function latest(rows: DetailsRecord[], key: string): string {
  for (const row of rows) {
    const value = text(row[key]);
    if (value) return value;
  }
  return "";
}

const formatDate = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })
    : "";

export async function GET(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: "Database connection failed" }, { status: 500 });
    }

    const { data: partner, error: partnerError } = await supabaseAdmin
      .from("agency_partners")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (partnerError) {
      console.error("[customer/lookup] partner_query_failed", { code: partnerError.code });
      return NextResponse.json({ success: false, error: "Lookup failed." }, { status: 500 });
    }
    if (!partner?.id) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const mobile = String(searchParams.get("mobile") ?? "").replace(/\D/g, "").slice(-10);

    if (mobile.length !== 10) {
      return NextResponse.json({ success: false, error: "Invalid mobile number" }, { status: 400 });
    }

    const { data: apps, error } = await supabaseAdmin
      .from("applications")
      .select("id, service_name, service_slug, status, amount, created_at, customer_details, form_data")
      .eq("agency_partner_id", partner.id)
      .eq("customer_mobile", mobile)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[customer/lookup] query_failed", { code: error.code });
      return NextResponse.json({ success: false, error: "Lookup failed." }, { status: 500 });
    }

    if (!apps || apps.length === 0) {
      return NextResponse.json({ success: true, found: false });
    }

    // customer_details carries name / address / city; the wizard's form_data
    // also carries pincode / state / district. Newest non-empty value wins.
    const records = apps.map((app) => ({ ...asRecord(app.form_data), ...asRecord(app.customer_details) }));

    const completedApplications = apps.filter((a) => a.status === "completed").length;
    const pendingApplications = apps.filter((a) => a.status !== "completed" && a.status !== "rejected").length;
    const recentServices = Array.from(new Set(apps.slice(0, 5).map((a) => a.service_name).filter(Boolean)));
    const recentApplications = apps.slice(0, 10).map((a) => ({
      id: a.id,
      serviceName: a.service_name,
      serviceSlug: a.service_slug,
      status: a.status,
      amount: Number(a.amount || 0),
      createdAt: a.created_at,
    }));

    return NextResponse.json({
      success: true,
      found: true,
      profile: {
        id: mobile,
        name: latest(records, "name") || "Customer",
        email: latest(records, "email"),
        mobile,
        city: latest(records, "city"),
        address: latest(records, "address"),
        pincode: latest(records, "pincode"),
        state: latest(records, "state"),
        district: latest(records, "district"),
        avatarUrl: "",
      },
      stats: {
        totalApplications: apps.length,
        completedApplications,
        pendingApplications,
        recentServices,
        recentApplications,
        customerSince: formatDate(apps[apps.length - 1]?.created_at),
        lastVisit: formatDate(apps[0]?.created_at),
      },
    });
  } catch (error) {
    console.error("[customer_lookup_api_error]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
