import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const links = [
  ["Customers", "/admin/customers"],
  ["Applications", "/admin/applications"],
  ["Services", "/admin/services"],
  ["Payments", "/admin/payments"],
  ["Agency Partners", "/admin/agency-partners"],
  ["Coupons", "/admin/coupons"],
  ["Wallet", "/admin/wallet"],
  ["Notifications", "/admin/notifications"],
  ["Website Settings", "/admin/settings"],
  ["Reports", "/admin/reports"],
] as const;

export default async function AdminHomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const role = await getCurrentUserRole(user);
  if (!isAdminRole(role)) redirect("/unauthorized");

  const supabase = getSupabaseAdmin();
  const [customers, applications, payments] = supabase
    ? await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("applications").select("id", { count: "exact", head: true }),
        supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "paid"),
      ])
    : [{ count: 0 }, { count: 0 }, { count: 0 }];

  return (
    <div className="container-narrow py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight">Admin</h1>
      <div className="mt-8 grid grid-cols-3 gap-4 text-center">
        <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
          <p className="text-2xl font-semibold">{customers.count ?? 0}</p>
          <p className="text-sm text-[var(--muted)]">Customers</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
          <p className="text-2xl font-semibold">{applications.count ?? 0}</p>
          <p className="text-sm text-[var(--muted)]">Applications</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
          <p className="text-2xl font-semibold">{payments.count ?? 0}</p>
          <p className="text-sm text-[var(--muted)]">Paid</p>
        </div>
      </div>
      <ul className="mt-10 grid gap-2 sm:grid-cols-2">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="block rounded-xl border border-[var(--border)] bg-white px-4 py-3 hover:border-[var(--fg)]">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
