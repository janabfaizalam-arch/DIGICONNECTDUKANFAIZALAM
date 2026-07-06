import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UnifiedLoginExperience } from "@/components/auth/unified-login";
import { CustomerAuthUI } from "@/components/auth/customer-auth";
import { getCurrentUser, getCurrentUserRole, getRoleHome, isCustomerRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Welcome to DigiConnect | Customer Login",
  description: "Login securely with your Mobile and PIN.",
};

function getSafeRedirect(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/customer/dashboard";
  }

  if (
    value.startsWith("/admin") ||
    value.startsWith("/agent") ||
    value.startsWith("/login") ||
    value.startsWith("/admin-login")
  ) {
    return "/customer/dashboard";
  }

  return value;
}

export default async function CustomerLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ redirect?: string; next?: string; reset?: string; error?: string; ref?: string }>;
}) {
  const query = await searchParams;
  const redirectTo = getSafeRedirect(query?.redirect ?? query?.next);
  const referralCode = String(query?.ref ?? "").trim().toUpperCase();

  if (process.env.NEXT_PUBLIC_ENABLE_WHATSAPP_AUTH === 'true') {
    return (
      <CustomerAuthUI redirectUrl={redirectTo} initialRef={referralCode} />
    );
  }

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
