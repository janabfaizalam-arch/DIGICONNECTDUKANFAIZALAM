import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { checkRateLimitDurable } from "@/lib/rate-limit-durable";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const MAX_IDENTIFIERS = 5;

export async function POST(request: Request) {
  try {
    // This endpoint scans application form data by identity numbers (PAN,
    // Aadhaar, etc.). It must never be usable anonymously as an enumeration
    // oracle, so it requires a logged-in user and is rate limited.
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Please login to continue." }, { status: 401 });
    }

    const rateLimit = await checkRateLimitDurable(`check-duplicate:${user.id}:${getClientIp(request)}`, 10, 60_000);
    if (!rateLimit.ok) {
      return rateLimitResponse(rateLimit.retryAfter);
    }

    const body = await request.json().catch(() => null);
    const serviceSlug = String(body?.serviceSlug ?? "").trim();
    const identifiers = (body?.identifiers ?? {}) as Record<string, unknown>;

    if (!serviceSlug) {
      return NextResponse.json({ success: false, error: "Service Slug is required" }, { status: 400 });
    }

    const identifierValues = Object.values(identifiers)
      .map((value) => String(value ?? "").trim().toUpperCase())
      .filter(Boolean)
      .slice(0, MAX_IDENTIFIERS);

    if (!identifierValues.length) {
      return NextResponse.json({ success: true, duplicateFound: false });
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: "Database connection failed" }, { status: 500 });
    }

    const { data: apps, error: queryError } = await supabaseAdmin
      .from("applications")
      .select("id, user_id, status, form_data")
      .eq("service_slug", serviceSlug)
      .not("status", "eq", "rejected");

    if (queryError) {
      console.error("[duplicate_check_error]", queryError);
      return NextResponse.json({ success: false, error: "Duplicate check failed. Please try again." }, { status: 500 });
    }

    let duplicateFound = false;
    let ownDuplicateApplicationId: string | null = null;

    for (const app of apps ?? []) {
      const formData = (app.form_data || {}) as Record<string, unknown>;
      const formValues = Object.values(formData).map((value) => String(value ?? "").trim().toUpperCase());
      const matched = identifierValues.some((identifier) => formValues.includes(identifier));

      if (matched) {
        duplicateFound = true;
        // Only reveal the application ID when it belongs to the requester.
        if (app.user_id === user.id) {
          ownDuplicateApplicationId = app.id;
          break;
        }
      }
    }

    return NextResponse.json({
      success: true,
      duplicateFound,
      // Details are intentionally limited: other customers' application IDs,
      // statuses, and matched values must not be disclosed.
      ownApplicationId: ownDuplicateApplicationId,
    });
  } catch (error) {
    console.error("[duplicate_check_error]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
