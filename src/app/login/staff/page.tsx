import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { StaffLoginCard } from "@/components/auth/staff-login-card";
import { getCurrentUser, getCurrentUserRole, getRoleHome, isStaffRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Staff Login | DigiConnect Dukan",
  description: "Staff login for assigned DigiConnect Dukan applications.",
};

export default async function StaffLoginPage() {
  const user = await getCurrentUser();

  if (user) {
    const role = await getCurrentUserRole(user);
    redirect(isStaffRole(role) ? "/staff/dashboard" : getRoleHome(role));
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.16),transparent_35%),linear-gradient(180deg,#fffaf5_0%,#eef5fb_100%)]" />
      <StaffLoginCard />
    </main>
  );
}
