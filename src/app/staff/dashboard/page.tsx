import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardCheck, FileWarning, Hourglass, ListChecks } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { StatusBadge } from "@/components/portal/status-badge";
import { Card } from "@/components/ui/card";
import { getCurrentUser, getCurrentUserRole, isStaffRole } from "@/lib/auth";
import { getCustomerMobile, getCustomerName, hydrateApplications } from "@/lib/crm";
import type { Application } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));
}

function countByStatus(applications: Application[], statuses: string[]) {
  return applications.filter((application) => statuses.includes(application.status)).length;
}

export default async function StaffDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login/staff");
  }

  const role = await getCurrentUserRole(user);

  if (!isStaffRole(role)) {
    redirect("/unauthorized");
  }

  const supabase = getSupabaseAdmin();
  let applications: Application[] = [];

  if (supabase) {
    const { data } = await supabase
      .from("applications")
      .select("*")
      .eq("assigned_staff_id", user.id)
      .order("created_at", { ascending: false });

    applications = (await hydrateApplications((data ?? []) as Application[])) as Application[];
  }

  const stats = [
    ["Total Assigned", applications.length, ListChecks, "text-[var(--primary)]"],
    ["Pending Documents", countByStatus(applications, ["documents_pending"]), FileWarning, "text-orange-600"],
    ["In Process", countByStatus(applications, ["new", "payment_pending", "in_process", "submitted"]), Hourglass, "text-blue-700"],
    ["Completed", countByStatus(applications, ["completed"]), ClipboardCheck, "text-emerald-600"],
  ] as const;

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--secondary)]">Staff Panel</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950 md:text-5xl">Assigned Applications</h1>
            <p className="mt-3 max-w-2xl text-slate-600">
              View and update only the applications assigned to your staff account.
            </p>
          </div>
          <LogoutButton className="h-11 w-full md:w-auto" />
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map(([label, value, Icon, tone]) => (
            <Card key={label} className="rounded-2xl p-4 md:p-5">
              <Icon className={`h-5 w-5 ${tone}`} />
              <p className="mt-4 text-xs font-medium text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
            </Card>
          ))}
        </div>

        <Card className="rounded-2xl p-4 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-950">Assigned Applications</h2>
          </div>

          <div className="mt-5 grid gap-3">
            {applications.length ? (
              applications.map((application) => (
                <div key={application.id} className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-[1fr_150px_150px_130px] md:items-center">
                  <div>
                    <p className="font-bold text-slate-950">{getCustomerName(application)}</p>
                    <p className="mt-1 text-sm text-slate-600">{application.service_name}</p>
                    <p className="mt-1 font-mono text-xs text-slate-500">{getCustomerMobile(application) || "No mobile number"}</p>
                  </div>
                  <p className="text-sm font-medium text-slate-600">{formatDate(application.created_at)}</p>
                  <StatusBadge status={application.status} />
                  <Link
                    href={`/staff/applications/${application.id}`}
                    className="inline-flex h-10 items-center justify-center rounded-full bg-[var(--primary)] px-4 text-sm font-bold text-white"
                  >
                    View / Update
                  </Link>
                </div>
              ))
            ) : (
              <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">No applications assigned to you yet.</p>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
