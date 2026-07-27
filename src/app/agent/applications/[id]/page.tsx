import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileText, MessageCircle, ReceiptText } from "lucide-react";

import { Card } from "@/components/ui/card";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { buildAgentWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { getCustomerMobile, getCustomerName, hydrateApplications } from "@/lib/crm";
import { isPartnerVisibleDocument } from "@/lib/applications/document-visibility";
import { PARTNER_APPLICATION_SELECT } from "@/lib/applications/safe-selects";
import { formatCurrency } from "@/lib/portal-data";
import type { Application } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}

export default async function AgentApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login/agent");
  }

  if (!(await isActiveAgent(user))) {
    redirect("/unauthorized");
  }

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    notFound();
  }

  const { data } = await supabase
    .from("applications")
    .select(PARTNER_APPLICATION_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (!data) {
    notFound();
  }

  const applicationRow = data as unknown as Application;
  const directlyAllowed =
    applicationRow.agent_id === user.id ||
    applicationRow.created_by === user.id ||
    applicationRow.created_by_agent_id === user.id ||
    applicationRow.assigned_agent_id === user.id;
  const { data: assignment } = directlyAllowed
    ? { data: null }
    : await supabase
        .from("assignments")
        .select("id")
        .eq("application_id", id)
        .eq("agent_id", user.id)
        .eq("active", true)
        .maybeSingle();

  if (!directlyAllowed && !assignment) {
    notFound();
  }

  const [hydrated] = (await hydrateApplications([applicationRow])) as Application[];
  const application: Application = {
    ...hydrated,
    final_document_url: null,
    documents: (hydrated.documents ?? []).filter(isPartnerVisibleDocument),
  };
  const commission = application.commissions?.[0];
  const mobile = getCustomerMobile(application);

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-5xl space-y-5">
        <Link href="/ap/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)]">
          <ArrowLeft className="h-4 w-4" />
          Back to agent panel
        </Link>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <Card className="p-4 md:p-6">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--secondary)]">Application</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">{application.service_name}</h1>
            <p className="mt-2 font-mono text-xs text-slate-500">{application.id}</p>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Customer</p>
                <p className="mt-1 font-bold text-slate-950">{getCustomerName(application)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Mobile</p>
                <p className="mt-1 font-mono font-bold text-slate-950">{mobile || "-"}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Amount</p>
                <p className="mt-1 font-bold text-slate-950">{formatCurrency(application.amount)}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Work Status</p>
                <p className="mt-1 font-bold capitalize text-slate-950">{application.status.replace(/_/g, " ")}</p>
              </div>
              <div className="rounded-2xl border p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Payment Status</p>
                <p className="mt-1 font-bold capitalize text-slate-950">{application.payment_status ?? "pending"}</p>
              </div>
            </div>

            <h2 className="mt-6 text-lg font-bold text-slate-950">Documents</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {application.documents?.length ? (
                application.documents.map((document) => (
                  <a key={document.id} href={document.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl border p-4 text-sm font-bold text-slate-900">
                    <FileText className="h-4 w-4 text-[var(--primary)]" />
                    {document.file_name}
                  </a>
                ))
              ) : (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No documents uploaded.</p>
              )}
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-4 md:p-5">
              <p className="text-sm font-medium text-slate-500">Commission</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{formatCurrency(commission?.amount ?? application.commission_amount ?? 0)}</p>
              <p className="mt-1 text-sm font-bold capitalize text-[var(--primary)]">{commission?.status ?? "pending"}</p>
            </Card>

            {application.invoices?.[0] ? (
              <Link href={`/invoice/${application.invoices[0].id}`} className="flex min-h-12 items-center justify-center gap-2 rounded-full border bg-white px-4 text-sm font-bold text-slate-900">
                <ReceiptText className="h-4 w-4" />
                Open Invoice
              </Link>
            ) : null}

            {mobile ? (
              <div className="grid gap-2">
                {[
                  ["Application support", "Agent support for this customer application"],
                  ["Documents support", "Agent needs help with pending customer documents"],
                  ["Completion support", "Agent needs help with completed application handover"],
                ].map(([label, topic]) => (
                  <a key={label} href={buildWhatsAppUrl(buildAgentWhatsAppMessage({ agentName: user.user_metadata.full_name ?? user.user_metadata.name ?? user.email, applicationId: application.id, serviceName: application.service_name, customerName: getCustomerName(application), topic }))} target="_blank" rel="noopener noreferrer" title={topic} className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-bold text-white">
                    <MessageCircle className="h-4 w-4" />
                    {label}
                  </a>
                ))}
              </div>
            ) : null}

            <p className="text-xs text-slate-500">Created {formatDate(application.created_at)}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
