import { redirect } from "next/navigation";

import { LoginCard } from "@/components/auth/login-card";
import { getCurrentUser, getCurrentUserRole, getRoleHome } from "@/lib/auth";

export default async function AgentLoginPage() {
  const user = await getCurrentUser();

  if (user) {
    const role = await getCurrentUserRole(user);
    redirect(getRoleHome(role));
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.16),transparent_35%),linear-gradient(180deg,#fffaf5_0%,#eef5fb_100%)]" />
      <LoginCard title="Agent Login" description="Sign in to access assigned leads, customer records, applications, and commission updates." />
    </main>
  );
}
