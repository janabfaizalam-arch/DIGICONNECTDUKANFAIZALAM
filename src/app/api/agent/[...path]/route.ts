import { goneResponse } from "@/lib/http/gone";

export const dynamic = "force-dynamic";

function gone() {
  return goneResponse(
    "Legacy /api/agent endpoints are retired. Use /api/ap/* for Agency Partner operations.",
    "LEGACY_AGENT_API_GONE",
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
