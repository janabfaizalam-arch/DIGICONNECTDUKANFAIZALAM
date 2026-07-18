import { goneResponse } from "@/lib/http/gone";

export const dynamic = "force-dynamic";

/**
 * Retired public lead endpoint. Use POST /api/enquiry.
 * The `leads` table is retained for history; new writes go through /api/enquiry.
 */
export async function POST() {
  return goneResponse(
    "This endpoint has moved to POST /api/enquiry.",
    "LEAD_API_MOVED",
  );
}

export async function GET() {
  return goneResponse(
    "This endpoint has moved to POST /api/enquiry.",
    "LEAD_API_MOVED",
  );
}
