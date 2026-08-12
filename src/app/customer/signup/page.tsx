import type { Metadata } from "next";

import { AuthScene } from "@/components/auth/ui";
import { CustomerEmailSignupFlow } from "@/components/auth/customer-email-signup-flow";

export const metadata: Metadata = { title: "Create your account" };

export default function CustomerSignupPage() {
  return (
    <AuthScene eyebrow="New Customer">
      <CustomerEmailSignupFlow />
    </AuthScene>
  );
}
