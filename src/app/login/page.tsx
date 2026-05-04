import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser, getCurrentUserRole, getRoleHome, isCustomerRole } from "@/lib/auth";
import { getCustomerHomeForUser } from "@/lib/customer-profile";

export const metadata: Metadata = {
  title: "Login - DigiConnect Dukan",
  description:
    "Login to track your digital service applications, upload documents and manage your DigiConnect Dukan account.",
};

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    const role = await getCurrentUserRole(user);
    redirect(isCustomerRole(role) ? await getCustomerHomeForUser(user.id) : getRoleHome(role));
  }

  redirect("/login/customer");
}
