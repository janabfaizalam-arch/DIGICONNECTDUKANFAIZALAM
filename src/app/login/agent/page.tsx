import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UnifiedLoginExperience } from "@/components/auth/unified-login";
import { getAgentAccessStatus, getCurrentUser, getCurrentUserRole, getRoleHome } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Welcome to RNOS | Agent Login",
  description: "Agent login for leads, applications, and commissions.",
};

export default async function AgentLoginPage() {
  const user = await getCurrentUser();

  if (user) {
    const access = await getAgentAccessStatus(user);

    if (access.ok) {
      redirect("/agent/dashboard");
    }

    const role = await getCurrentUserRole(user);
    if (role === "agency_partner") {
      redirect("/unauthorized");
    }

    redirect(getRoleHome(role));
  }

  return (
    <UnifiedLoginExperience
      initialTab="partner"
      initialMode="login"
    />
  );
}
