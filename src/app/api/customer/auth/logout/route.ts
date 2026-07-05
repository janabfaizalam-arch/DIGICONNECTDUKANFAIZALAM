import { NextResponse } from "next/server";
import { revokeSession } from "@/lib/auth/session";
import { clearAuthCookies, getRefreshToken } from "@/lib/auth/cookies";

export async function POST() {
  try {
    const refreshToken = await getRefreshToken();

    if (refreshToken) {
      await revokeSession(refreshToken);
    }

    await clearAuthCookies();

    return NextResponse.json({ success: true, message: "Logged out successfully." });
  } catch (error) {
    console.error("Logout Error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
