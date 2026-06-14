import { NextResponse } from "next/server";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { getServiceConfig } from "@/lib/services-engine";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !(await isActiveAgent(user))) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const identifier = searchParams.get("slug") || searchParams.get("id");

    if (!identifier) {
      return NextResponse.json({ error: "Service slug or id is required." }, { status: 400 });
    }

    const config = await getServiceConfig(identifier);
    if (!config) {
      return NextResponse.json({ error: "Service config not found." }, { status: 444 });
    }

    return NextResponse.json({ config, ok: true });
  } catch (err) {
    console.error("[api/ap/services/config] GET error", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
