import type { Metadata } from "next";

import { AuthScene } from "@/components/auth/ui";
import { CustomerEmailLoginFlow } from "@/components/auth/customer-email-login-flow";

export const metadata: Metadata = { title: "Sign in" };

export default async function CustomerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthScene eyebrow="Customer Access">
      <CustomerEmailLoginFlow initialError={error} />
    </AuthScene>
  );
}
