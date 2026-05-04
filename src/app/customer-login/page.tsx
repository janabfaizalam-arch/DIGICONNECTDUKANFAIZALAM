import { redirect } from "next/navigation";

import { getCurrentUser, getCurrentUserRole, getRoleHome, isCustomerRole } from "@/lib/auth";

export default async function CustomerLoginPage() {
  const user = await getCurrentUser();

  if (user) {
    const role = await getCurrentUserRole(user);
    redirect(isCustomerRole(role) ? "/customer/dashboard" : getRoleHome(role));
  }

  redirect("/login/customer");
}
