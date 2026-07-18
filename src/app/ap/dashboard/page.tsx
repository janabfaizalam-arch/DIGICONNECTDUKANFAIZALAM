import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser, getCurrentUserRole, isAgencyPartnerRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function ApDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/ap/login");
  const role = await getCurrentUserRole(user);
  if (!isAgencyPartnerRole(role)) redirect("/unauthorized");

  const supabase = getSupabaseAdmin();
  const { data: partner } = supabase
    ? await supabase.from("agency_partners").select("id, business_name, status").eq("user_id", user.id).maybeSingle()
    : { data: null };

  const { count } = supabase && partner
    ? await supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("agency_partner_id", partner.id)
    : { count: 0 };

  return (
    <div className="container-narrow py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight">Agency Partner</h1>
      <p className="mt-2 text-[var(--muted)]">
        {partner?.business_name || "Partner"} · {partner?.status || "pending"}
      </p>
      <p className="mt-6 text-sm">Applications: {count ?? 0}</p>
      <ul className="mt-8 grid gap-2 sm:grid-cols-2">
        {[
          ["/ap/customers", "Customers"],
          ["/ap/applications", "Applications"],
          ["/ap/applications/new", "Submit application"],
          ["/ap/commissions", "Commissions"],
          ["/ap/wallet", "Wallet & payouts"],
          ["/ap/support", "Support"],
        ].map(([href, label]) => (
          <li key={href}>
            <Link href={href} className="block rounded-xl border border-[var(--border)] bg-white px-4 py-3">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
