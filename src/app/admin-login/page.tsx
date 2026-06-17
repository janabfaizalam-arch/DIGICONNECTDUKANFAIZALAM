import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UnifiedLoginExperience } from "@/components/auth/unified-login";
import { getCurrentUser, getCurrentUserRole, getRoleHome } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Welcome to RNOS | Operations Console",
  description: "Operations console login for staff and administrators.",
};

export default async function AdminLoginPage() {
  const user = await getCurrentUser();

  if (user) {
    const role = await getCurrentUserRole(user);
    redirect(getRoleHome(role));
  }

  return (
    <UnifiedLoginExperience
      initialTab="ops"
      initialMode="login"
    />
  );
}
