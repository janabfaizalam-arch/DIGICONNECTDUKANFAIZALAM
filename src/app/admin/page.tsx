import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList, HandCoins, UserPlus, UsersRound } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { Card } from "@/components/ui/card";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { formatCurrency } from "@/lib/portal-data";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default async function AdminPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) {
    redirect("/login");
  }

  if (!isAdminRole(role)) {
    redirect("/dashboard");
  }

  const supabase = getSupabaseAdmin();
  const stats = {
    totalApplications: 0,
    todayLeads: 0,
    pending: 0,
    completed: 0,
    paymentPending: 0,
    totalAgents: 0,
    commissionPending: 0,
  };
  let recentApplications: {
    id: string;
    service_name: string;
    status: string;
    payment_status: string | null;
    created_at: string;
    form_data: Record<string, unknown> | null;
  }[] = [];

  if (supabase) {
    const [{ data: applications }, { data: agents }, { data: commissions }] = await Promise.all([
      supabase.from("applications").select("id, service_name, status, payment_status, created_at, form_data").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id").eq("role", "agent"),
      supabase.from("commissions").select("amount, status"),
    ]);

    const allApplications = applications ?? [];
    const today = todayIso();

    stats.totalApplications = allApplications.length;
    stats.todayLeads = allApplications.filter((application) => String(application.created_at).slice(0, 10) === today).length;
    stats.pending = allApplications.filter((application) => ["new", "documents_pending", "payment_pending"].includes(application.status)).length;
    stats.completed = allApplications.filter((application) => application.status === "completed").length;
    stats.paymentPending = allApplications.filter((application) => application.payment_status === "pending").length;
    stats.totalAgents = agents?.length ?? 0;
    stats.commissionPending = (commissions ?? [])
      .filter((commission) => commission.status === "pending")
      .reduce((total, commission) => total + Number(commission.amount ?? 0), 0);
    recentApplications = allApplications.slice(0, 6);
  }

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--secondary)]">Admin</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950 md:text-5xl">Admin Control Room</h1>
            <p className="mt-3 max-w-2xl text-slate-600">Manage agents, applications, customer records, payments, invoices, and commissions from one clean workspace.</p>
          </div>
          <LogoutButton className="h-11 w-full md:w-auto" />
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["/admin/agents/new", "Create Agent", UserPlus],
            ["/admin/customers", "Add Customer", UsersRound],
            ["/admin/commissions", "View Commissions", HandCoins],
            ["/admin/applications", "View Applications", ClipboardList],
          ].map(([href, label, Icon]) => (
            <Link key={String(href)} href={String(href)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-bold text-slate-900 shadow-soft ring-1 ring-[var(--border)]">
              <Icon className="h-4 w-4 text-[var(--primary)]" />
              {String(label)}
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          {[
            ["Total Applications", stats.totalApplications],
            ["Today Leads", stats.todayLeads],
            ["Pending", stats.pending],
            ["Completed", stats.completed],
            ["Payment Pending", stats.paymentPending],
            ["Total Agents", stats.totalAgents],
            ["Commission Pending", formatCurrency(stats.commissionPending)],
          ].map(([label, value]) => (
            <Card key={label} className="p-4">
              <p className="text-xs font-medium text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
            </Card>
          ))}
        </div>

        <Card className="p-4 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-950">Recent Applications</h2>
            <Link href="/admin/applications" className="text-sm font-bold text-[var(--primary)]">View all</Link>
          </div>
          <div className="mt-4 grid gap-3">
            {recentApplications.length ? (
              recentApplications.map((application) => {
                const formData = application.form_data ?? {};
                const customer = String(formData.name ?? "Customer");
                const mobile = String(formData.mobile ?? "");

                return (
                  <Link key={application.id} href={`/admin/applications/${application.id}`} className="grid gap-2 rounded-2xl border bg-white p-4 md:grid-cols-[1fr_160px_140px_140px]">
                    <div>
                      <p className="font-bold text-slate-950">{customer}</p>
                      <p className="text-sm text-slate-600">{application.service_name}</p>
                    </div>
                    <p className="font-mono text-sm text-slate-600">{mobile || "-"}</p>
                    <p className="text-sm font-bold capitalize text-slate-700">{application.status.replace(/_/g, " ")}</p>
                    <p className="text-sm font-bold capitalize text-[var(--primary)]">{application.payment_status ?? "pending"}</p>
                  </Link>
                );
              })
            ) : (
              <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">No applications yet.</p>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
