import { goneResponse } from "@/lib/http/gone";

export const dynamic = "force-dynamic";

export async function GET() {
  return goneResponse(
    "Legacy agent-access probe is retired. Agency Partners use /ap/login.",
    "LEGACY_AGENT_ACCESS_GONE",
  );
}

export async function POST() {
  return goneResponse(
    "Legacy agent-access probe is retired. Agency Partners use /ap/login.",
    "LEGACY_AGENT_ACCESS_GONE",
  );
}
