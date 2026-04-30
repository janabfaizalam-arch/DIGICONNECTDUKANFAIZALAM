import { redirect } from "next/navigation";

import { LoginCard } from "@/components/auth/login-card";
import { getCurrentUser, getCurrentUserRole, getRoleHome } from "@/lib/auth";

export default async function SuperAdminLoginPage() {
  const user = await getCurrentUser();

  if (user) {
    const role = await getCurrentUserRole(user);
    redirect(getRoleHome(role));
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.18),transparent_35%),linear-gradient(180deg,#f8fafc_0%,#e2e8f0_100%)]" />
      <LoginCard
        title="Super Admin Login"
        eyebrow="Restricted Access"
        description="Sign in with an authorized super admin account to access the central administration area."
      />
    </main>
  );
}
