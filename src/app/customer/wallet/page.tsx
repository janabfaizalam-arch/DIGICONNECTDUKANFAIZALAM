import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentUserRole, getRoleHome, isCustomerRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CustomerWalletPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login/customer");
  }

  const role = await getCurrentUserRole(user);

  if (!isCustomerRole(role)) {
    redirect(getRoleHome(role));
  }

  // Redirect to unified customer dashboard wallet tab
  redirect("/customer/dashboard?tab=wallet");
}
