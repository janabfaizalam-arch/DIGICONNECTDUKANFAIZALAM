import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-v2/session";
import { verifyAccessToken } from "@/lib/auth-v2/jwt";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyAccessToken(accessToken);

    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // In a real application, you might want to fetch the latest details from DB.
    // For V2 Foundation, returning the JWT payload is sufficient.
    return NextResponse.json({ 
      user: {
        id: payload.sub,
        mobile: payload.mobile,
        role: payload.role
      }
    });
  } catch (error) {
    console.error("[Auth V2] me error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
