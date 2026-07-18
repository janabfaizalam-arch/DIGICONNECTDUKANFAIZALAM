import { goneResponse } from "@/lib/http/gone";

export const dynamic = "force-dynamic";

function gone() {
  return goneResponse("AP Leads desk has been removed.", "AP_LEADS_GONE");
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
