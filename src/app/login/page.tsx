import { redirect } from "next/navigation";

import { LoginCard } from "@/components/auth/login-card";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(15,93,184,0.16),transparent_35%),linear-gradient(180deg,#f8fbff_0%,#eef5fb_100%)]" />
      <LoginCard />
    </main>
  );
}
