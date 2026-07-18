import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UnifiedLoginExperience } from "@/components/auth/unified-login";
import { getCurrentUser, getCurrentUserRole, getRoleHome, isCustomerRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Welcome to DigiConnect | Customer Login",
  description: "Login securely to manage applications, wallet, and rewards.",
};

function getSafeRedirect(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/customer/dashboard";
  }

  if (
    value.startsWith("/admin") ||
    value.startsWith("/agent") ||
    value.startsWith("/ap") ||
    value.startsWith("/login") ||
    value.startsWith("/admin-login") ||
    value.startsWith("/customer-v2") ||
    value.startsWith("/customer-auth-v2")
  ) {
    return "/customer/dashboard";
  }

  return value;
}

/**
 * Canonical customer login. Session format: Supabase Auth cookies.
 * Parallel JWT v1/v2 UIs and APIs are retired (see AUTH_CONSOLIDATION_PLAN.md).
 */
export default async function CustomerLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ redirect?: string; next?: string; reset?: string; error?: string; ref?: string }>;
}) {
  const query = await searchParams;
  const redirectTo = getSafeRedirect(query?.redirect ?? query?.next);
  const referralCode = String(query?.ref ?? "").trim().toUpperCase();

  const initialMessage =
    query?.reset === "success"
      ? "Password updated successfully. Please login with your new password."
      : query?.error === "oauth_signup_details"
        ? "New Google or Facebook signup needs mobile number and PIN details. Switch to Sign Up and continue."
        : query?.error === "oauth"
          ? "Social login could not be completed. Please try again."
          : undefined;

  const user = await getCurrentUser();

  if (user) {
    const role = await getCurrentUserRole(user);
    redirect(isCustomerRole(role) ? redirectTo : getRoleHome(role));
  }

  return (
    <UnifiedLoginExperience
      initialTab="user"
      initialMode="login"
      initialMessage={initialMessage}
      referralCode={referralCode}
    />
  );
}
