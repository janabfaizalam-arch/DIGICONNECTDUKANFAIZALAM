import { NextRequest, NextResponse } from "next/server";
import { rotateSession } from "@/lib/auth/session";
import { getRefreshToken } from "@/lib/auth/cookies";

export async function POST(req: NextRequest) {
  try {
    const refreshToken = await getRefreshToken();

    if (!refreshToken) {
      return NextResponse.json({ error: "No refresh token provided." }, { status: 401 });
    }

    const ipAddress = req.headers.get("x-forwarded-for") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    const { accessToken } = await rotateSession(refreshToken, userAgent, ipAddress);

    return NextResponse.json({ success: true, accessToken });
  } catch (error) {
    console.error("Refresh Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to refresh session." }, { status: 401 });
  }
}
