import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentUserRole, getRoleHome, isCustomerRole, syncUserProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CustomerProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login/customer");
  }

  try {
    await syncUserProfile(user);
  } catch {
    // Sync fail ignored for redirect
  }

  const role = await getCurrentUserRole(user);

  if (!isCustomerRole(role)) {
    redirect(getRoleHome(role));
  }

  // Redirect customer directly to dashboard with profile tab active
  redirect("/customer/dashboard?tab=profile");
}
