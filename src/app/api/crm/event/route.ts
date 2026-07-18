import { goneResponse } from "@/lib/http/gone";

export const dynamic = "force-dynamic";

export async function POST() {
  return goneResponse(
    "CRM event tracking endpoint has been retired with the Leads module.",
    "CRM_EVENT_GONE",
  );
}
