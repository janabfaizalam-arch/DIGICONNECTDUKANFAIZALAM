import "server-only";

import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";

/** Admin check shared by every balance sheet route. The role is read from the database, never from the request. */
export async function requireAdmin() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) {
    return { user: null, denied: NextResponse.json({ message: "Admin access required." }, { status: 403 }) };
  }
  return { user, denied: null };
}
