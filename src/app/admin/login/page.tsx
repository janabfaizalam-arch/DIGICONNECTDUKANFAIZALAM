import type { Metadata } from "next";

import { AuthScene } from "@/components/auth/ui";
import { AdminLoginForm } from "@/components/auth/admin-login-form";

export const metadata: Metadata = { title: "Admin Login" };

export default function AdminLoginPage() {
  return (
    <AuthScene eyebrow="Control Room">
      <AdminLoginForm />
    </AuthScene>
  );
}
