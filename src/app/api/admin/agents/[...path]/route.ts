import { goneResponse } from "@/lib/http/gone";

export const dynamic = "force-dynamic";

function gone() {
  return goneResponse(
    "Legacy /api/admin/agents is retired. Use /api/admin/agency-partners.",
    "LEGACY_ADMIN_AGENTS_GONE",
  );
}

export async function GET() {
  return gone();
}
export async function POST() {
  return gone();
}
export async function PUT() {
  return gone();
}
export async function PATCH() {
  return gone();
}
export async function DELETE() {
  return gone();
}
