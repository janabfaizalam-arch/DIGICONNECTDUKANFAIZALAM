import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser, getCurrentUserRole, isAgencyPartnerRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function ApApplicationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/ap/login");
  const role = await getCurrentUserRole(user);
  if (!isAgencyPartnerRole(role)) redirect("/unauthorized");

  const supabase = getSupabaseAdmin();
  const { data: partner } = supabase
    ? await supabase.from("agency_partners").select("id").eq("user_id", user.id).maybeSingle()
    : { data: null };

  const { data } = supabase && partner
    ? await supabase
        .from("applications")
        .select("id, service_name, status, payment_status, tracking_code, amount, created_at")
        .eq("agency_partner_id", partner.id)
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [] };

  return (
    <div className="container-narrow py-12">
      <div className="flex items-end justify-between gap-4">
        <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight">Applications</h1>
        <Link href="/ap/applications/new" className="btn btn-primary">
          New
        </Link>
      </div>
      <ul className="mt-8 divide-y divide-[var(--border)]">
        {(data ?? []).map((row) => (
          <li key={row.id as string} className="py-3 text-sm">
            <p className="font-medium">{String(row.service_name)}</p>
            <p className="text-[var(--muted)]">
              {String(row.tracking_code)} · {String(row.status)} · ₹{Number(row.amount ?? 0)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
