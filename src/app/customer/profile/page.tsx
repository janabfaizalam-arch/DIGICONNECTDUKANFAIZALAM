import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CustomerProfileForm } from "@/components/portal/customer-profile-form";
import { getCurrentUser, getCurrentUserRole, getRoleHome, isCustomerRole, syncUserProfile } from "@/lib/auth";
import { getCustomerProfile, getInitialCustomerProfile } from "@/lib/customer-profile";

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

  const savedProfile = await getCustomerProfile(user.id);
  const initialProfile = getInitialCustomerProfile(user);

  return (
    <main className="relative isolate min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_8%,rgba(37,99,235,0.14),transparent_28%),radial-gradient(circle_at_88%_16%,rgba(249,115,22,0.1),transparent_24%),linear-gradient(180deg,#fbfdff_0%,#eef6ff_52%,#f8fbff_100%)]" />
      <div className="mx-auto w-full max-w-6xl">
        <CustomerProfileForm userId={user.id} initialProfile={initialProfile} savedProfile={savedProfile} />
      </div>
    </main>
  );
}
