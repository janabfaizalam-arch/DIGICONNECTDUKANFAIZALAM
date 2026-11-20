import { ApForgotPassword } from "@/components/auth/ap-forgot-password";
import { AuthScene } from "@/components/auth/ui";

export const dynamic = "force-dynamic";

export default function APForgotPasswordPage() {
  return (
    <AuthScene eyebrow="DC Partner Network">
      <ApForgotPassword />
    </AuthScene>
  );
}
