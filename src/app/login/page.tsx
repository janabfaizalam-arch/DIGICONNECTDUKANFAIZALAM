import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UnifiedLoginExperience } from "@/components/auth/unified-login";
import { getCurrentUser, getCurrentUserRole, getRoleHome, isCustomerRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Welcome to RNOS | Login",
  description:
    "Login to track your digital service applications, upload documents and manage your account workspace.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ redirect?: string; next?: string; reset?: string; error?: string; ref?: string }>;
}) {
  const user = await getCurrentUser();

  if (user) {
    const role = await getCurrentUserRole(user);
    redirect(isCustomerRole(role) ? "/customer/dashboard" : getRoleHome(role));
  }

  const query = await searchParams;
  const initialMessage =
    query?.reset === "success"
      ? "Password updated successfully. Please login with your new password."
      : query?.error === "oauth_signup_details"
      ? "New Google or Facebook signup needs mobile number and PIN details. Switch to Sign Up and continue."
      : query?.error === "oauth"
      ? "Social login could not be completed. Please try again."
      : undefined;

  const referralCode = String(query?.ref ?? "").trim().toUpperCase();

  return (
    <UnifiedLoginExperience
      initialTab="user"
      initialMode="login"
      initialMessage={initialMessage}
      referralCode={referralCode}
    />
  );
}
