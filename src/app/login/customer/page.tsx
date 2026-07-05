import type { Metadata } from "next";
import { CustomerAuthUI } from "@/components/auth/customer-auth";

export const metadata: Metadata = {
  title: "Welcome to DigiConnect | Customer Login",
  description: "Login securely with your Mobile and PIN.",
};

export default async function CustomerLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ redirect?: string; next?: string; ref?: string }>;
}) {
  const query = await searchParams;
  let redirectTo = query?.redirect ?? query?.next ?? "/dashboard";
  
  // Ensure valid redirect
  if (!redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
    redirectTo = "/dashboard";
  }

  const referralCode = String(query?.ref ?? "").trim().toUpperCase();

  return (
    <CustomerAuthUI redirectUrl={redirectTo} initialRef={referralCode} />
  );
}
