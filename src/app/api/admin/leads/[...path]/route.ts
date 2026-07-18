import { goneResponse } from "@/lib/http/gone";

export const dynamic = "force-dynamic";

function gone() {
  return goneResponse("Admin Leads module has been removed.", "LEADS_MODULE_GONE");
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
export async function DELETE() {
  return gone();
}
