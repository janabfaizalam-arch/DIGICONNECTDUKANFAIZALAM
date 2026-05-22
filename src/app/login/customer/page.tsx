import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CustomerLoginCard } from "@/components/auth/customer-login-card";
import { getCurrentUser, getCurrentUserRole, getRoleHome, isCustomerRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Login - DigiConnect Dukan",
  description:
    "Login to track your digital service applications, upload documents and manage your DigiConnect Dukan account.",
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

export default async function CustomerLoginPage({ searchParams }: { searchParams?: Promise<{ redirect?: string; next?: string; reset?: string; error?: string }> }) {
  const query = await searchParams;
  const redirectTo = getSafeRedirect(query?.redirect ?? query?.next);
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
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-6">
      <div className="w-full max-w-[420px]">
        <CustomerLoginCard initialMessage={initialMessage} />
      </div>
    </main>
  );
}
