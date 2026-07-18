import { redirect } from "next/navigation";

import { getCurrentUser, getCurrentUserRole, isAgencyPartnerRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function ApCustomersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/ap/login");
  const role = await getCurrentUserRole(user);
  if (!isAgencyPartnerRole(role)) redirect("/unauthorized");

  const supabase = getSupabaseAdmin();
  const { data } = supabase
    ? await supabase
        .from("customers")
        .select("id, full_name, mobile, email, created_at")
        .or(`created_by.eq.${user.id},assigned_agent_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [] };

  return (
    <div className="container-narrow py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight">Customers</h1>
      <ul className="mt-8 divide-y divide-[var(--border)]">
        {(data ?? []).map((row) => (
          <li key={row.id as string} className="py-3 text-sm">
            <p className="font-medium">{String(row.full_name)}</p>
            <p className="text-[var(--muted)]">
              {String(row.mobile)} · {String(row.email)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
