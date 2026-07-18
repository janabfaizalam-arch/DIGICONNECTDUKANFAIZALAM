import { redirect } from "next/navigation";

import { getCurrentUser, getCurrentUserRole, isAgencyPartnerRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ApSupportPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/ap/login");
  const role = await getCurrentUserRole(user);
  if (!isAgencyPartnerRole(role)) redirect("/unauthorized");

  return (
    <div className="container-narrow py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight">Support</h1>
      <p className="mt-4 text-[var(--muted)]">
        Email <a className="underline" href="mailto:partners@digiconnectdukan.com">partners@digiconnectdukan.com</a> for
        Agency Partner support.
      </p>
    </div>
  );
}
