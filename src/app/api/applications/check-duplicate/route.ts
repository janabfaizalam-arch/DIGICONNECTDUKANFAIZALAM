import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentUserRole, isAgentRole } from "@/lib/auth";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Staff-only duplicate check across applications.
 *
 * It searches every application's form data for an identifier (PAN, Aadhaar,
 * mobile…) and says which application holds it. That answer is personal data
 * about whoever applied, so the endpoint was an enumeration oracle while it
 * was open to anonymous callers. It is now limited to admins and DC Partners
 * (who check before filing on a walk-in customer's behalf) and rate-limited.
 */
export async function POST(request: Request) {
  try {
    const rate = checkRateLimit(`check-duplicate:${getClientIp(request)}`, 30, 60_000);
    if (!rate.ok) return rateLimitResponse(rate.retryAfter);

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Please log in." }, { status: 401 });
    }
    if (!isAgentRole(await getCurrentUserRole(user))) {
      return NextResponse.json({ success: false, error: "Not allowed." }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const serviceSlug = String(body?.serviceSlug ?? "").trim();
    const identifiers = body?.identifiers ?? {}; // key-value pairs (e.g. { panNumber: '...', aadhaar: '...' })

    if (!serviceSlug) {
      return NextResponse.json({ success: false, error: "Service Slug is required" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: "Database connection failed" }, { status: 500 });
    }

    const duplicateApps: {
      applicationId: string;
      serviceName: string;
      status: string;
      createdAt: string;
      matchedField: string;
      matchedValue: string;
    }[] = [];

    // Query non-rejected applications for this service
    const { data: apps, error: queryError } = await supabaseAdmin
      .from("applications")
      .select("id, service_name, status, created_at, form_data")
      .eq("service_slug", serviceSlug)
      .not("status", "eq", "rejected");

    if (queryError) {
      console.error("[duplicate_check] query_failed", { code: queryError.code });
      return NextResponse.json({ success: false, error: "Duplicate check failed." }, { status: 500 });
    }

    if (apps && apps.length > 0) {
      for (const app of apps) {
        const formData = (app.form_data || {}) as Record<string, unknown>;

        for (const val of Object.values(identifiers)) {
          if (!val) continue;

          const cleanVal = String(val).trim().toUpperCase();
          if (!cleanVal) continue;

          // Check if value matches any field in form_data (case-insensitive check)
          const matchedKey = Object.keys(formData).find((formKey) => {
            const formVal = formData[formKey];
            return formVal && String(formVal).trim().toUpperCase() === cleanVal;
          });

          if (matchedKey) {
            duplicateApps.push({
              applicationId: app.id,
              serviceName: app.service_name,
              status: app.status,
              createdAt: app.created_at,
              matchedField: matchedKey,
              matchedValue: String(val)
            });
            break; // Matched this application, proceed to check the next one
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      duplicateFound: duplicateApps.length > 0,
      duplicates: duplicateApps
    });
  } catch (error) {
    console.error("[duplicate_check_error]", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
