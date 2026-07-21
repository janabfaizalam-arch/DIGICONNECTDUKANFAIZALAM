import { AuthScene } from "@/components/auth/ui";
import { ApLoginForm } from "@/components/auth/ap-login-form";

export default function APLoginPage() {
  return (
    <AuthScene eyebrow="Partner Network">
      <ApLoginForm />
    </AuthScene>
  );
}
