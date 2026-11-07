import "server-only";

import { redirect } from "next/navigation";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";

/** Server-page gate for the packages admin screens. */
export async function requireAdminPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");
  return user;
}
