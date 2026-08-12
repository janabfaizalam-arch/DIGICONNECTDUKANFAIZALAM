import type { Metadata } from "next";

import { AuthScene } from "@/components/auth/ui";
import { CustomerForgotPasswordFlow } from "@/components/auth/customer-forgot-password-flow";

export const metadata: Metadata = { title: "Reset your password" };

export default function CustomerForgotPasswordPage() {
  return (
    <AuthScene eyebrow="Account Recovery">
      <CustomerForgotPasswordFlow />
    </AuthScene>
  );
}
