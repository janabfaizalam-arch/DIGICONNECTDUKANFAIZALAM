import { redirect } from "next/navigation";
import { Gift, UserCheck, UsersRound } from "lucide-react";

import { AdminPageHeader, AdminStatCard } from "@/components/admin/admin-shell";
import { Card } from "@/components/ui/card";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { formatCurrency } from "@/lib/portal-data";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(date));
}

export default async function AdminReferralsPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const supabase = getSupabaseAdmin();
  let referrals: {
    id: string;
    referrer_id: string;
    referred_user_id: string;
    referral_code: string;
    status: string;
    reward_amount: number;
    created_at: string;
    completed_at: string | null;
  }[] = [];

  if (supabase) {
    const { data } = await supabase.from("referrals").select("*").order("created_at", { ascending: false }).limit(200);
    referrals = data ?? [];
  }

  const completed = referrals.filter((referral) => referral.status === "completed");
  const pending = referrals.filter((referral) => referral.status === "pending");
  const rewardIssued = completed.reduce((total, referral) => total + Number(referral.reward_amount ?? 0), 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader eyebrow="Rewards" title="Referral Management" description="Track referral signups, credited wallet rewards, and pending referral records." />

      <section className="grid gap-3 sm:grid-cols-3">
        <AdminStatCard title="Total Referrals" value={referrals.length} icon={UsersRound} tone="blue" />
        <AdminStatCard title="Pending Referrals" value={pending.length} icon={Gift} tone="orange" />
        <AdminStatCard title="Completed Referrals" value={completed.length} icon={UserCheck} tone="green" />
      </section>

      <Card className="rounded-2xl p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-600">Issued</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">{formatCurrency(rewardIssued)} referral rewards</h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="py-3">Date</th>
                <th className="py-3">Code</th>
                <th className="py-3">Referrer</th>
                <th className="py-3">Referred User</th>
                <th className="py-3">Status</th>
                <th className="py-3">Reward</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {referrals.map((referral) => (
                <tr key={referral.id}>
                  <td className="py-3 text-slate-700">{formatDate(referral.created_at)}</td>
                  <td className="py-3 font-mono text-xs font-bold text-slate-700">{referral.referral_code}</td>
                  <td className="py-3 font-mono text-xs text-slate-500">{referral.referrer_id}</td>
                  <td className="py-3 font-mono text-xs text-slate-500">{referral.referred_user_id}</td>
                  <td className="py-3 font-bold text-slate-700">{referral.status}</td>
                  <td className="py-3 font-extrabold text-emerald-700">{formatCurrency(Number(referral.reward_amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {referrals.length === 0 ? <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">No referrals yet.</p> : null}
        </div>
      </Card>
    </div>
  );
}
