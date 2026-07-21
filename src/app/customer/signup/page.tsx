import type { Metadata } from "next";

import { AuthScene } from "@/components/auth/ui";
import { CustomerSignupFlow } from "@/components/auth/customer-signup-flow";

export const metadata: Metadata = { title: "Customer Signup" };

export default function CustomerSignupPage() {
  return (
    <AuthScene eyebrow="New Customer">
      <CustomerSignupFlow />
    </AuthScene>
  );
}
