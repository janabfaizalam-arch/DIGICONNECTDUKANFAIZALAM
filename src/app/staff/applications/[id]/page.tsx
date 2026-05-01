import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Download, FileText, MessageCircle } from "lucide-react";

import { StaffApplicationUpdateForm } from "@/components/staff-application-update-form";
import { StatusBadge } from "@/components/portal/status-badge";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser, getCurrentUserRole, isStaffRole } from "@/lib/auth";
import { asRecord, getCustomerMobile, getCustomerName, hydrateApplications } from "@/lib/crm";
import { formatCurrency } from "@/lib/portal-data";
import type { Application } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { generateWhatsAppLink } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}

function displayValue(value: unknown) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
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
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    notFound();
  }

  const { data } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .eq("assigned_staff_id", user.id)
    .single();

  if (!data) {
    notFound();
  }

  const [application] = (await hydrateApplications([data as Application])) as Application[];
  const formData = asRecord(application.form_data);
  const customerName = getCustomerName(application);
  const customerMobile = getCustomerMobile(application);

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <Link href="/staff/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)]">
          <ArrowLeft className="h-4 w-4" />
          Back to staff dashboard
        </Link>

        <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <Card className="rounded-2xl p-5 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--secondary)]">Assigned Application</p>
                <h1 className="mt-2 text-3xl font-bold text-slate-950">{application.service_name}</h1>
                <p className="mt-2 font-mono text-xs text-slate-500">Application ID: {application.id}</p>
              </div>
              <StatusBadge status={application.status} />
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-blue-50 p-4">
                <p className="text-xs font-bold uppercase text-blue-700">Customer</p>
                <p className="mt-2 font-bold text-slate-950">{customerName}</p>
                <p className="mt-1 text-sm text-slate-600">{customerMobile || "No mobile number"}</p>
              </div>
              <div className="rounded-2xl bg-orange-50 p-4">
                <p className="text-xs font-bold uppercase text-orange-700">Submitted</p>
                <p className="mt-2 font-bold text-slate-950">{formatDate(application.created_at)}</p>
                <p className="mt-1 text-sm text-slate-600">{formatCurrency(application.amount)}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {Object.entries(formData)
                .filter((entry) => displayValue(entry[1]))
                .map(([key, value]) => (
                  <div key={key} className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase text-slate-500">{key.replace(/([A-Z])/g, " $1")}</p>
                    <p className="mt-1 break-words text-sm font-bold text-slate-900">{displayValue(value)}</p>
                  </div>
                ))}
            </div>

            <div className="mt-6">
              <h2 className="text-lg font-bold text-slate-950">Uploaded Documents</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {application.documents?.length ? (
                  application.documents.map((document) => (
                    <a
                      key={document.id}
                      href={document.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-2xl border bg-white p-4 text-sm font-bold text-slate-900"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-[var(--primary)]" />
                      <span className="min-w-0 truncate">{document.file_name}</span>
                    </a>
                  ))
                ) : (
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No documents uploaded yet.</p>
                )}
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="rounded-2xl p-5">
              <h2 className="text-lg font-bold text-slate-950">Update Application</h2>
              <div className="mt-4">
                <StaffApplicationUpdateForm
                  applicationId={application.id}
                  currentStatus={application.status}
                  staffNote={application.staff_note}
                  customerMessage={application.customer_message}
                />
              </div>
            </Card>

            <a
              href={generateWhatsAppLink(application.service_name)}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "secondary", size: "lg", className: "w-full" })}
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp Customer
            </a>

            {application.final_document_url ? (
              <a
                href={application.final_document_url}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "outline", size: "lg", className: "w-full" })}
              >
                <Download className="h-4 w-4" />
                Download Final Document
              </a>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
