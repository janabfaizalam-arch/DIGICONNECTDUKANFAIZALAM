import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser, getCurrentUserRole, getRoleHome, isCustomerRole, syncUserProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Profile | DigiConnect Dukan",
  description: "Manage your DigiConnect Dukan customer profile and service details.",
};

export default async function CustomerProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login/customer");
  }

  await syncUserProfile(user);
  const role = await getCurrentUserRole(user);

  if (!isCustomerRole(role)) {
    redirect(getRoleHome(role));
  }

  redirect("/customer/dashboard");
}
