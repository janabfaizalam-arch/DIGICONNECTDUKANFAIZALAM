// ============================================================
// Credit API Route — Admin Retrieve All Reports List
// DigiConnect Dukan — Powered by RNOS India Pvt. Ltd.
// ============================================================

import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { getAdminCreditReports } from "@/lib/credit/client";
import { creditAdminFilterSchema } from "@/lib/credit/validators";

export async function GET(request: Request) {
  try {
    // 1. Authenticate user
    const user = await getCurrentUser();
    const isAdmin = isAdminUser(user);

    if (!user || !isAdmin) {
      return NextResponse.json({ error: "Unauthorized. Admin credentials required." }, { status: 401 });
    }

    // 2. Parse search parameters
    const { searchParams } = new URL(request.url);
    const filters = {
      search: searchParams.get("search") || undefined,
      status: searchParams.get("status") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      page: Number(searchParams.get("page") || 1),
      limit: Number(searchParams.get("limit") || 10),
    };

    const validation = creditAdminFilterSchema.safeParse(filters);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid filters schema details", details: validation.error.format() }, { status: 400 });
    }

    // 3. Fetch list
    const result = await getAdminCreditReports(validation.data);

    return NextResponse.json({
      success: true,
      data: result.data,
      total: result.total,
    });
  } catch (error) {
    console.error("[admin/credit-reports] List fetch error:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
