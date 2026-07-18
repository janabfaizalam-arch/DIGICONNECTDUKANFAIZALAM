import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser, getCurrentUserRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getWalletBalance } from "@/lib/wallet";

export const dynamic = "force-dynamic";

export default async function CustomerDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const role = await getCurrentUserRole(user);
  if (role !== "customer") redirect("/unauthorized");

  const supabase = getSupabaseAdmin();
  const { data: applications } = supabase
    ? await supabase
        .from("applications")
        .select("id, service_name, status, payment_status, tracking_code, amount, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: [] };

  const balance = await getWalletBalance(user.id);

  return (
    <div className="container-narrow py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight">Dashboard</h1>
          <p className="mt-2 text-[var(--muted)]">Track applications, wallet and payments.</p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href="/customer/wallet" className="btn btn-secondary">
            Wallet ₹{balance.toFixed(0)}
          </Link>
          <Link href="/services" className="btn btn-primary">
            New application
          </Link>
        </div>
      </div>

      <ul className="mt-10 divide-y divide-[var(--border)]">
        {(applications ?? []).length === 0 ? (
          <li className="py-8 text-[var(--muted)]">No applications yet.</li>
        ) : (
          (applications ?? []).map((app) => (
            <li key={app.id as string} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="font-medium">{String(app.service_name)}</p>
                <p className="text-sm text-[var(--muted)]">
                  {String(app.tracking_code)} · {String(app.status)} · {String(app.payment_status)}
                </p>
              </div>
              <p className="text-sm font-medium">₹{Number(app.amount ?? 0)}</p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
