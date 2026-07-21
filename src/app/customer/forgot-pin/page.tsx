import type { Metadata } from "next";

import { AuthScene } from "@/components/auth/ui";
import { CustomerForgotPinFlow } from "@/components/auth/customer-forgot-pin-flow";

export const metadata: Metadata = { title: "Forgot / Create PIN" };

export default function CustomerForgotPinPage() {
  return (
    <AuthScene eyebrow="Account Recovery">
      <CustomerForgotPinFlow />
    </AuthScene>
  );
}
