import { NextResponse } from "next/server";

import { logAuditEvent } from "@/lib/ap-audit";
import { getAdminAgencyPartnerList } from "@/lib/ap-data";
import {
  agencyPartnerExportFileName,
  buildAgencyPartnerWorkbook,
} from "@/lib/admin/agency-partner-export";
import {
  filterAgencyPartners,
  parseAgencyPartnerFilters,
} from "@/lib/admin/agency-partner-filters";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { XLSX_CONTENT_TYPE } from "@/lib/export/xlsx";

/** The workbook writer deflates with node:zlib, so this cannot run on edge. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/agency-partners/export?q=&type=
 *
 * Streams the Digi Partner directory as a full-detail Excel workbook, scoped to
 * the same search and partner-type filters the admin console is showing.
 *
 * The sheet carries KYC identifiers and bank details, so it is admin-only and
 * every download is written to the audit trail.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user || !isAdminRole(role)) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const url = new URL(request.url);
  const filters = parseAgencyPartnerFilters({
    q: url.searchParams.get("q"),
    type: url.searchParams.get("type"),
  });

  const partners = filterAgencyPartners(await getAdminAgencyPartnerList(), filters);

  let workbook: Buffer;
  try {
    workbook = buildAgencyPartnerWorkbook(partners);
  } catch (error) {
    console.error("[admin-ap-export] Failed to build workbook", error);
    return NextResponse.json(
      { message: "Could not generate the Digi Partner Excel file." },
      { status: 500 },
    );
  }

  await logAuditEvent({
    actorId: user.id,
    actorRole: role,
    action: "ap_exported",
    entityType: "agency_partner",
    metadata: {
      exportedCount: partners.length,
      query: filters.query || null,
      partnerType: filters.type,
      format: "xlsx",
    },
  });

  const fileName = agencyPartnerExportFileName();

  return new NextResponse(new Uint8Array(workbook), {
    status: 200,
    headers: {
      "Content-Type": XLSX_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": String(workbook.length),
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
