import type { Metadata } from "next";

import { AuthScene } from "@/components/auth/ui";
import { CustomerResetPasswordFlow } from "@/components/auth/customer-reset-password-flow";

export const metadata: Metadata = { title: "Set a new password" };

export default function CustomerResetPasswordPage() {
  return (
    <AuthScene eyebrow="Account Recovery">
      <CustomerResetPasswordFlow />
    </AuthScene>
  );
}
