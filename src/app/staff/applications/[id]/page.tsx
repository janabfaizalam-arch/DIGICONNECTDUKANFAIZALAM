import { redirect } from "next/navigation";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";

import { StaffApplicationUpdateForm } from "@/components/staff-application-update-form";
import { PaymentBadge, StatusBadge } from "@/components/portal/status-badge";
import { Card } from "@/components/ui/card";
import { getCurrentUser, getCurrentUserRole, isStaffRole } from "@/lib/auth";
import { getCustomerMobile, getCustomerName } from "@/lib/crm";
import { formatCurrency } from "@/lib/portal-data";
import { getAssignedStaffApplication } from "@/lib/staff-data";

export const dynamic = "force-dynamic";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}

export default async function StaffApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login/staff");
  }

  const role = await getCurrentUserRole(user);

  if (!isStaffRole(role)) {
    redirect("/unauthorized");
  }

  const { id } = await params;
  const application = await getAssignedStaffApplication(user.id, id);

  if (!application) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/staff/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700">
          <ArrowLeft className="h-4 w-4" />
          Back to staff dashboard
        </Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="rounded-2xl p-5 md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-orange-600">Assigned Application</p>
                <h1 className="mt-2 text-3xl font-bold text-slate-950">{application.service_name}</h1>
                <p className="mt-2 font-mono text-xs text-slate-500">ID: {application.id}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={application.status} />
                <PaymentBadge status={application.payment_status ?? application.payments?.[0]?.status ?? "pending"} />
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Customer</p>
                <p className="mt-1 font-bold text-slate-950">{getCustomerName(application)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Mobile</p>
                <p className="mt-1 font-mono font-bold text-slate-950">{getCustomerMobile(application) || "-"}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Amount</p>
                <p className="mt-1 font-bold text-slate-950">{formatCurrency(application.amount)}</p>
              </div>
            </div>

            <h2 className="mt-6 text-lg font-bold text-slate-950">Documents</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {application.documents?.length ? (
                application.documents.map((document) => (
                  <a key={document.id} href={document.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl border bg-white p-4 text-sm font-bold text-slate-900">
                    <FileText className="h-4 w-4 text-blue-600" />
                    {document.file_name}
                  </a>
                ))
              ) : (
                <p className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">No documents uploaded.</p>
              )}
            </div>

            <p className="mt-6 text-xs font-semibold text-slate-500">Created {formatDate(application.created_at)}</p>
          </Card>

          <Card className="rounded-2xl p-5">
            <h2 className="text-lg font-bold text-slate-950">Update Assigned Work</h2>
            <div className="mt-4">
              <StaffApplicationUpdateForm
                applicationId={application.id}
                currentStatus={application.status}
                staffNote={application.staff_note}
                customerMessage={application.customer_message}
              />
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
