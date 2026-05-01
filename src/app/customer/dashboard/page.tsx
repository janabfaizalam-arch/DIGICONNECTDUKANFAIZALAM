import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CustomerDashboard } from "@/components/portal/customer-dashboard";
import { getCurrentUser, getCurrentUserRole, getRoleHome, isCustomerRole, syncUserProfile } from "@/lib/auth";
import { getCustomerDashboardData } from "@/lib/customer-dashboard-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Customer Dashboard | DigiConnect Dukan",
  description: "Track DigiConnect Dukan applications, documents, invoices, payments, and admin updates.",
};

export default async function CustomerDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login/customer");
  }

  await syncUserProfile(user);
  const role = await getCurrentUserRole(user);

  if (!isCustomerRole(role)) {
    redirect(getRoleHome(role));
  }

  const { applications, notifications } = await getCustomerDashboardData(user.id);
  const name = user.user_metadata.full_name ?? user.user_metadata.name ?? user.phone ?? "Customer";
  const email = user.email ?? user.phone ?? "";
  const avatarUrl = user.user_metadata.avatar_url ?? user.user_metadata.picture ?? "";

  return <CustomerDashboard applications={applications} notifications={notifications} profile={{ name, email, avatarUrl }} />;
}
