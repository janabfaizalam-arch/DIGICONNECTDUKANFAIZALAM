import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LayoutDashboard, LogIn, LogOut, ShieldAlert } from "lucide-react";

import { Card } from "@/components/ui/card";
import { getCurrentUser, getCurrentUserRole, getRoleHome, isAdminRole, isActiveAgent } from "@/lib/auth";
import { getLoginDestinationForPortal } from "@/lib/auth/logout-destinations";
import { partnerAccessPublicMessage } from "@/lib/auth/memberships";
import { DIGI_PARTNER_LOGIN_ROUTE } from "@/lib/auth/partner-access";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ reason?: string }>;
};

/**
 * Authenticated denial page.
 * Guests (no valid session) are never shown this UI — they go to the role login page.
 */
export default async function UnauthorizedPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    const headerStore = await headers();
    const referer = headerStore.get("referer");
    let pathHint = "/";
    try {
      if (referer) pathHint = new URL(referer).pathname;
    } catch {
      pathHint = "/";
    }
    redirect(`${getLoginDestinationForPortal(pathHint)}?loggedOut=1`);
  }

  const query = await searchParams;
  const reason = String(query?.reason ?? "").trim();
  const role = await getCurrentUserRole(user);
  const hasPartnerAccess = await isActiveAgent(user);
  const dashboardHref = hasPartnerAccess
    ? "/ap/dashboard"
    : isAdminRole(role)
      ? "/admin"
      : getRoleHome(role);

  const switchAccountHref = isAdminRole(role) && !hasPartnerAccess
    ? "/admin/login?loggedOut=1"
    : hasPartnerAccess || role === "agency_partner"
      ? `${DIGI_PARTNER_LOGIN_ROUTE}?loggedOut=1`
      : "/customer/login?loggedOut=1";

  const detail =
    reason === "ap_not_active" ||
    reason === "kyc_not_approved" ||
    reason === "not_linked" ||
    reason === "admin_portal_only" ||
    reason === "wrong_role" ||
    reason === "inactive_profile" ||
    reason === "missing_profile"
      ? partnerAccessPublicMessage(reason)
      : "Your account does not have permission to access this area of DigiConnect Dukan.";

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md rounded-[2rem] p-6 text-center shadow-soft md:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
          <ShieldAlert className="h-7 w-7" aria-hidden />
        </div>
        <h1 className="mt-5 text-3xl font-bold text-slate-950">Unauthorized Access</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{detail}</p>
        <p className="mt-2 text-xs text-slate-500">
          If this Digi Partner account needs repair, contact support. Do not use Admin login to open the partner portal.
        </p>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Link
            href={dashboardHref}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-5 text-sm font-bold text-white"
          >
            <LayoutDashboard className="h-4 w-4" aria-hidden />
            Go to My Dashboard
          </Link>
          <Link
            href={switchAccountHref}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700"
          >
            <LogIn className="h-4 w-4" aria-hidden />
            Switch Account
          </Link>
        </div>

        <Link
          href={`/api/auth/logout?portal=${hasPartnerAccess ? "ap" : isAdminRole(role) ? "admin" : "customer"}`}
          className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold text-rose-600 hover:bg-rose-50"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Sign Out
        </Link>
      </Card>
    </main>
  );
}
