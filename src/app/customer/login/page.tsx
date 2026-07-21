import type { Metadata } from "next";

import { AuthScene } from "@/components/auth/ui";
import { CustomerPinLoginForm } from "@/components/auth/customer-pin-login-form";

export const metadata: Metadata = { title: "Customer Login" };

export default function CustomerLoginPage() {
  return (
    <AuthScene eyebrow="Customer Access">
      <CustomerPinLoginForm />
    </AuthScene>
  );
}
