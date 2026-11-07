import "server-only";

import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";

/**
 * The admin gate for every packages write: the signed-in user's role, read
 * on the server. Returns the user id, or the 403 response to send.
 */
export async function requireAdmin(): Promise<{ ok: true; userId: string } | { ok: false; response: NextResponse }> {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) {
    return { ok: false, response: NextResponse.json({ error: "Admin access required." }, { status: 403 }) };
  }
  return { ok: true, userId: user.id };
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
