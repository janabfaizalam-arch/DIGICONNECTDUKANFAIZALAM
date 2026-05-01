import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CustomerLoginCard } from "@/components/auth/customer-login-card";
import { getCurrentUser, getCurrentUserRole, getRoleHome } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Customer Login | DigiConnect Dukan",
  description: "Login to DigiConnect Dukan customer dashboard with mobile OTP or Google to track applications and invoices.",
};

export default async function CustomerLoginPage() {
  const user = await getCurrentUser();

  if (user) {
    const role = await getCurrentUserRole(user);
    redirect(getRoleHome(role));
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(15,93,184,0.16),transparent_35%),linear-gradient(180deg,#f8fbff_0%,#eef5fb_100%)]" />
      <CustomerLoginCard />
    </main>
  );
}
