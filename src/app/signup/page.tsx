import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UnifiedLoginExperience } from "@/components/auth/unified-login";
import { getCurrentUser, getCurrentUserRole, getRoleHome, isCustomerRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Welcome to RNOS | Signup",
  description: "Create a verified account and get your reward wallet.",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams?: Promise<{ ref?: string }>;
}) {
  const query = await searchParams;
  const user = await getCurrentUser();

  if (user) {
    const role = await getCurrentUserRole(user);
    redirect(isCustomerRole(role) ? "/customer/dashboard" : getRoleHome(role));
  }

  const referralCode = String(query?.ref ?? "").trim().toUpperCase();

  return (
    <UnifiedLoginExperience
      initialTab="user"
      initialMode="signup"
      referralCode={referralCode}
    />
  );
}
