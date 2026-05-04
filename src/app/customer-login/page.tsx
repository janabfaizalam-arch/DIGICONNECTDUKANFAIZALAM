import { redirect } from "next/navigation";

import { getCurrentUser, getCurrentUserRole, getRoleHome, isCustomerRole } from "@/lib/auth";
import { getCustomerHomeForUser } from "@/lib/customer-profile";

export default async function CustomerLoginPage() {
  const user = await getCurrentUser();

  if (user) {
    const role = await getCurrentUserRole(user);
    redirect(isCustomerRole(role) ? await getCustomerHomeForUser(user.id) : getRoleHome(role));
  }

  redirect("/login/customer");
}
