import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";

export default async function CustomerLoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/customer/dashboard");
  }

  redirect("/login/customer");
}
