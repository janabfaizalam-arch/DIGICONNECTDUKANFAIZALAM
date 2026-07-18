import { goneResponse } from "@/lib/http/gone";

export const dynamic = "force-dynamic";

function gone() {
  return goneResponse(
    "CRM Leads pipeline has been removed from the product. The crm_leads table is retained for history only.",
    "CRM_LEADS_GONE",
  );
}

export async function GET() {
  return gone();
}
export async function POST() {
  return gone();
}
export async function PATCH() {
  return gone();
}
