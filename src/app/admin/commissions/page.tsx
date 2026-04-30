import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { CommissionActions } from "@/components/portal/commission-actions";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { formatCurrency } from "@/lib/portal-data";
import type { Commission } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(date));
}

export default async function AdminCommissionsPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) {
    redirect("/login");
  }

  if (!isAdminRole(role)) {
    redirect("/dashboard");
  }

  const supabase = getSupabaseAdmin();
  let commissions = [] as Commission[];

  if (supabase) {
    const { data } = await supabase
      .from("commissions")
      .select("*, applications(id, service_name, amount, created_at), profiles(full_name, email, mobile)")
      .order("created_at", { ascending: false });
    commissions = (data ?? []) as Commission[];
  }

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl space-y-5">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)]">
          <ArrowLeft className="h-4 w-4" />
          Back to admin
        </Link>
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--secondary)]">Commissions</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Agent Commission Ledger</h1>
        </div>
        <Card className="overflow-hidden p-4 md:p-6">
          <div className="hidden overflow-hidden rounded-2xl border lg:block">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((commission) => (
                  <TableRow key={commission.id}>
                    <TableCell className="font-bold">{commission.profiles?.full_name || commission.profiles?.email || commission.agent_id}</TableCell>
                    <TableCell>{commission.applications?.service_name ?? commission.application_id}</TableCell>
                    <TableCell>{formatCurrency(commission.amount)}</TableCell>
                    <TableCell className="font-bold capitalize">{commission.status}</TableCell>
                    <TableCell>{formatDate(commission.created_at)}</TableCell>
                    <TableCell>
                      <CommissionActions commissionId={commission.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="grid gap-3 lg:hidden">
            {commissions.map((commission) => (
              <div key={commission.id} className="rounded-2xl border p-4">
                <p className="font-bold text-slate-950">{commission.profiles?.full_name || commission.profiles?.email || "Agent"}</p>
                <p className="mt-1 text-sm text-slate-600">{commission.applications?.service_name}</p>
                <p className="mt-2 text-xl font-bold text-slate-950">{formatCurrency(commission.amount)}</p>
                <p className="mb-3 text-sm font-bold capitalize text-[var(--primary)]">{commission.status}</p>
                <CommissionActions commissionId={commission.id} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </main>
  );
}
