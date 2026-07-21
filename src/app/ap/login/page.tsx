import { redirect } from "next/navigation";

import { AuthScene } from "@/components/auth/ui";
import { ApLoginForm } from "@/components/auth/ap-login-form";
import { getCurrentUser, getCurrentUserRole } from "@/lib/auth";
import { DIGI_PARTNER_DASHBOARD_ROUTE } from "@/lib/auth/partner-access";

export const dynamic = "force-dynamic";

export default async function APLoginPage() {
  const user = await getCurrentUser();
  const role = user ? await getCurrentUserRole(user) : null;

  // Smart, role-aware entry: partners and admins are sent to their home;
  // customers stay here and see a friendly "switch account" notice.
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
