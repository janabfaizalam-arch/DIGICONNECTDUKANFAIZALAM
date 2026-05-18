import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText } from "lucide-react";

import { PaymentBadge, StatusBadge } from "@/components/portal/status-badge";
import { Card } from "@/components/ui/card";
import { getCurrentUser, getCurrentUserRole, isStaffRole } from "@/lib/auth";
import { getCustomerMobile, getCustomerName } from "@/lib/crm";
import { getAssignedStaffApplications } from "@/lib/staff-data";

export const dynamic = "force-dynamic";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));
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

  const applications = await getAssignedStaffApplications(user.id, 100);
  const activeCount = applications.filter((application) => application.status !== "completed" && application.status !== "cancelled").length;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-600">Staff Workspace</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Assigned Applications</h1>
          <p className="mt-2 text-sm text-slate-600">
            {applications.length} assigned, {activeCount} active.
          </p>
        </section>

        <Card className="rounded-2xl p-4 md:p-6">
          <div className="grid gap-3">
            {applications.length ? (
              applications.map((application) => (
                <Link
                  key={application.id}
                  href={`/staff/applications/${application.id}`}
                  className="grid gap-3 rounded-2xl border bg-white p-4 transition hover:border-blue-200 md:grid-cols-[1fr_140px_150px_150px] md:items-center"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-slate-950">{getCustomerName(application)}</p>
                    <p className="mt-1 text-sm text-slate-600">{application.service_name} | {getCustomerMobile(application) || "No mobile"}</p>
                    <p className="mt-1 truncate text-sm text-slate-500">{application.customer_message || application.staff_note || "No update yet."}</p>
                  </div>
                  <p className="text-sm font-medium text-slate-600">{formatDate(application.created_at)}</p>
                  <StatusBadge status={application.status} />
                  <PaymentBadge status={application.payment_status ?? application.payments?.[0]?.status ?? "pending"} />
                </Link>
              ))
            ) : (
              <div className="rounded-2xl bg-slate-50 p-6 text-center">
                <FileText className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-3 text-sm font-semibold text-slate-600">No applications are assigned to you yet.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
