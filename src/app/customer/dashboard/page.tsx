import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CustomerDashboard } from "@/components/portal/customer-dashboard";
import { getCurrentUser, getCurrentUserRole, getRoleHome, isCustomerRole, syncUserProfile } from "@/lib/auth";
import { getCustomerProfileStatus } from "@/lib/customer-profile";
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

  const customerProfileStatus = await getCustomerProfileStatus(user.id);

  if (!customerProfileStatus.complete) {
    redirect("/customer/profile");
  }

  const { applications, notifications } = await getCustomerDashboardData(user.id);
  const customerProfile = customerProfileStatus.profile;
  const name = customerProfile?.full_name ?? user.user_metadata.full_name ?? user.user_metadata.name ?? "Customer";
  const email = customerProfile?.email ?? user.email ?? "";
  const avatarUrl = customerProfile?.photo_url ?? user.user_metadata.avatar_url ?? user.user_metadata.picture ?? "";

  return (
    <CustomerDashboard
      applications={applications}
      notifications={notifications}
      profile={{ name, email, avatarUrl }}
      profileCompletion={{
        complete: customerProfileStatus.complete,
        percent: customerProfileStatus.completion.percent,
      }}
    />
  );
}
