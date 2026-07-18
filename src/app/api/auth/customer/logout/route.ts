import { NextResponse } from "next/server";

import { signOutCookies } from "@/lib/auth/session-cookies";

export const dynamic = "force-dynamic";

export async function POST() {
  await signOutCookies();
  return NextResponse.json({ ok: true });
}
