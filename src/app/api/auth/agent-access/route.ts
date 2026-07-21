import { NextResponse } from "next/server";

import { getAgentAccessStatus, getCurrentUser } from "@/lib/auth";
import { partnerAccessPublicMessage } from "@/lib/auth/memberships";

export async function GET() {
  const user = await getCurrentUser();
  const access = await getAgentAccessStatus(user);

  if (!access.ok) {
    return NextResponse.json(
      {
        ok: false,
        reason: access.reason,
        role: access.role ?? null,
        message: partnerAccessPublicMessage(access.reason),
      },
      { status: access.reason === "missing_user" ? 401 : 403 },
    );
  }

  return NextResponse.json({
    ok: true,
    reason: access.reason,
    message: "Digi Partner access verified.",
  });
}
