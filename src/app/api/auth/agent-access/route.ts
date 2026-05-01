import { NextResponse } from "next/server";

import { getAgentAccessStatus, getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  const access = await getAgentAccessStatus(user);

  if (!access.ok) {
    return NextResponse.json(
      {
        ok: false,
        reason: access.reason,
        role: access.role ?? null,
        message:
          access.reason === "inactive_profile"
            ? "Agent profile is inactive."
            : access.reason === "missing_profile"
              ? "Agent profile was not found for this user ID."
              : access.reason === "wrong_role"
                ? "This account is not assigned the agent role."
                : "Agent access is not available.",
      },
      { status: access.reason === "missing_user" ? 401 : 403 },
    );
  }

  return NextResponse.json({
    ok: true,
    reason: access.reason,
    message: "Agent access verified.",
  });
}
