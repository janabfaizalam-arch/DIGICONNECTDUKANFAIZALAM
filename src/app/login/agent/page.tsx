import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AgentLoginCard } from "@/components/auth/agent-login-card";
import { getCurrentUser, getCurrentUserRole, getRoleHome, isActiveAgent } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Agent Login | DigiConnect Dukan",
  description: "Agent login for DigiConnect Dukan leads, applications, and commissions.",
};

export default async function AgentLoginPage() {
  const user = await getCurrentUser();

  if (user) {
    if (await isActiveAgent(user)) {
      redirect("/agent/dashboard");
    }

    const role = await getCurrentUserRole(user);
    redirect(getRoleHome(role));
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.16),transparent_35%),linear-gradient(180deg,#fffaf5_0%,#eef5fb_100%)]" />
      <AgentLoginCard />
    </main>
  );
}
