import { redirect } from "next/navigation";

import { AuthScene } from "@/components/auth/ui";
import { ApLoginForm } from "@/components/auth/ap-login-form";
import { getCurrentUser, getCurrentUserRole } from "@/lib/auth";
import { DIGI_PARTNER_DASHBOARD_ROUTE } from "@/lib/auth/partner-access";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ loggedOut?: string }>;
};

export default async function APLoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const loggedOut = params?.loggedOut === "1";

  // After an explicit logout, never auto-bounce to dashboard — show the login form.
  if (!loggedOut) {
    const user = await getCurrentUser();
    const role = user ? await getCurrentUserRole(user) : null;

    if (role === "agency_partner") {
      redirect(DIGI_PARTNER_DASHBOARD_ROUTE);
    }
    if (role === "admin") {
      redirect("/admin");
    }

    return (
      <AuthScene eyebrow="Digi Partner Network">
        <ApLoginForm customerSignedIn={role === "customer"} />
      </AuthScene>
    );
  }

  return (
    <AuthScene eyebrow="Digi Partner Network">
      <ApLoginForm customerSignedIn={false} />
    </AuthScene>
  );
}
