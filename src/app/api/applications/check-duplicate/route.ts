import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
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
      return NextResponse.json({ success: false, error: queryError.message }, { status: 500 });
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
    console.error("[duplicate_check_error]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
