import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileText, MessageCircle, ReceiptText, User, Phone, Wallet } from "lucide-react";

import { Card } from "@/components/ui/card";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { buildAgentWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { getCustomerMobile, getCustomerName, hydrateApplications } from "@/lib/crm";
import { formatCurrency } from "@/lib/portal-data";
import type { Application } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getAgencyPartnerByUserId } from "@/lib/ap-data";
import { WorkflowStepper } from "@/components/engines/workflow-stepper";
import { DprApplicationDetails } from "@/components/services/dpr/dpr-application-details";
import { ItrApplicationDetails } from "@/components/services/itr/itr-application-details";

export const dynamic = "force-dynamic";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export default async function APApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/ap/login");
  }

  if (!(await isActiveAgent(user))) {
    redirect("/unauthorized");
  }

  const ap = await getAgencyPartnerByUserId(user.id);
  if (!ap) {
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
    .maybeSingle();

  if (!data) {
    notFound();
  }

  const applicationRow = data as Application;

  interface DBWorkflow {
    id: string;
    service_id: string;
    step_key: string;
    label: string;
    sort_order: number;
    allowed_transitions: unknown;
  }

  interface DBStatusLog {
    id: string;
    new_status: string;
    note: string | null;
    created_at: string;
    profiles: { full_name: string | null; role: string | null } | null;
  }

  // Fetch workflows
  const { data: workflowsData } = await supabase
    .from("service_workflows")
    .select("*")
    .eq("service_id", applicationRow.service_id)
    .order("sort_order", { ascending: true });

  const workflows = ((workflowsData ?? []) as unknown as DBWorkflow[]).map((w) => ({
    id: w.id,
    service_id: w.service_id,
    step_key: w.step_key,
    label: w.label,
    sort_order: w.sort_order,
    allowed_transitions: Array.isArray(w.allowed_transitions) ? (w.allowed_transitions as string[]) : []
  }));

  // Fetch both timelines and status logs to present a merged activity timeline
  const [timelineRes, logsRes] = await Promise.all([
    supabase
      .from("entity_timelines")
      .select("*")
      .eq("entity_type", "application")
      .eq("entity_id", id),
    supabase
      .from("status_logs")
      .select("*, profiles:changed_by(full_name, role)")
      .eq("application_id", id)
  ]);

  interface TimelineItem {
    id: string;
    event_title: string;
    event_description: string | null;
    created_at: string;
    metadata?: {
      actor_name?: string | null;
      actor_role?: string | null;
      [key: string]: unknown;
    } | null;
  }

  interface DBTimelineRow {
    id: string;
    event_title: string;
    event_description: string | null;
    created_at: string;
    metadata?: {
      actor_name?: string | null;
      actor_role?: string | null;
      [key: string]: unknown;
    } | null;
  }

  const rawTimeline = (timelineRes.data || []) as unknown as DBTimelineRow[];
  const rawLogs = logsRes.data || [];

  const timelineItems: TimelineItem[] = rawTimeline.map((item) => ({
    id: item.id,
    event_title: item.event_title,
    event_description: item.event_description,
    created_at: item.created_at,
    metadata: {
      actor_name: item.metadata?.actor_name || null,
      actor_role: item.metadata?.actor_role || null,
      source: "timeline",
      ...item.metadata
    }
  }));

  const logItems: TimelineItem[] = (rawLogs as unknown as DBStatusLog[]).map((log) => ({
    id: log.id,
    event_title: `Status: ${log.new_status.replace(/_/g, " ")}`,
    event_description: log.note,
    created_at: log.created_at,
    metadata: {
      actor_name: log.profiles?.full_name || null,
      actor_role: log.profiles?.role || null,
      source: "status_log"
    }
  }));

  // Merge and sort chronologically by created_at DESC
  const mergedTimelines = [...timelineItems, ...logItems];
  mergedTimelines.sort((a, b) => {
    const tA = new Date(a.created_at).getTime();
    const tB = new Date(b.created_at).getTime();
    if (Math.abs(tA - tB) < 2000) {
      // Put timeline first so it's kept in deduplication
      const isTimelineA = a.metadata?.source === "timeline" ? 1 : 0;
      const isTimelineB = b.metadata?.source === "timeline" ? 1 : 0;
      return isTimelineB - isTimelineA;
    }
    return tB - tA;
  });

  // Deduplicate entries that occur within 2 seconds of each other representing the same transition
  const dedupedTimelines: TimelineItem[] = [];
  for (const item of mergedTimelines) {
    const isDuplicate = dedupedTimelines.some((existing) => {
      const timeDiff = Math.abs(new Date(existing.created_at).getTime() - new Date(item.created_at).getTime());
      if (timeDiff < 2000) {
        const isAStatus = existing.event_title.toLowerCase().includes("status") || existing.event_title.toLowerCase().includes("transition");
        const isBStatus = item.event_title.toLowerCase().includes("status") || item.event_title.toLowerCase().includes("transition");
        if (isAStatus && isBStatus) {
          return true;
        }
      }
      return false;
    });

    if (!isDuplicate) {
      dedupedTimelines.push(item);
    }
  }

  let timelines = dedupedTimelines;

  // Fallback to application creation event if no timeline exists
  if (timelines.length === 0 && applicationRow.created_at) {
    timelines = [
      {
        id: "fallback-creation",
        event_title: "Application Created",
        event_description: "The application was submitted and registered in the system.",
        created_at: applicationRow.created_at,
        metadata: {
          actor_name: "System",
          actor_role: "system"
        }
      }
    ];
  }

  // Verify AP ownership of this application
  const directlyAllowed =
    applicationRow.agency_partner_id === ap.id ||
    applicationRow.agent_id === user.id ||
    applicationRow.created_by === user.id ||
    applicationRow.created_by_agent_id === user.id ||
    applicationRow.assigned_agent_id === user.id;

  if (!directlyAllowed) {
    notFound();
  }

  const [application] = (await hydrateApplications([applicationRow])) as Application[];
  
  // Fetch commission from ap_commissions instead of legacy commissions table
  const { data: apCommission } = await supabase
    .from("ap_commissions")
    .select("*")
    .eq("application_id", id)
    .eq("agency_partner_id", ap.id)
    .maybeSingle();

  const mobile = getCustomerMobile(application);

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          href="/ap/applications"
          className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Applications
        </Link>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Card className="border border-slate-200/50 bg-white/70 p-5 md:p-8 rounded-3xl backdrop-blur-xl shadow-sm space-y-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                Application Detail
              </p>
              <h1 className="mt-2 text-2xl md:text-3xl font-black text-slate-900">
                {application.service_name}
              </h1>
              <p className="mt-1 font-mono text-xs text-slate-400">
                ID: {application.id}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50/50 p-4 border border-slate-200/60">
                <p className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  Customer
                </p>
                <p className="mt-1 text-sm font-extrabold text-slate-900">
                  {getCustomerName(application)}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50/50 p-4 border border-slate-200/60">
                <p className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  Mobile
                </p>
                <p className="mt-1 text-sm font-mono font-bold text-slate-800">
                  {mobile || "—"}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50/50 p-4 border border-slate-200/60">
                <p className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5 text-slate-400" />
                  Paid Amount
                </p>
                <p className="mt-1 text-sm font-extrabold text-slate-900">
                  {formatCurrency(application.amount)}
                </p>
              </div>
            </div>

            <DprApplicationDetails
              formData={application.form_data}
              serviceSlug={application.service_slug}
              status={application.status}
              finalDocumentUrl={application.final_document_url}
            />

            <ItrApplicationDetails
              formData={application.form_data}
              serviceSlug={application.service_slug}
              status={application.status}
              finalDocumentUrl={application.final_document_url}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/60 bg-slate-50/30 p-5 space-y-1">
                <p className="text-xs font-semibold text-slate-400">Work Status</p>
                <p className="font-extrabold capitalize text-slate-900 text-base">
                  {application.status.replace(/_/g, " ")}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/60 bg-slate-50/30 p-5 space-y-1">
                <p className="text-xs font-semibold text-slate-400">Payment Status</p>
                <p className="font-extrabold capitalize text-slate-900 text-base">
                  {application.payment_status ?? "pending"}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900">Uploaded Documents</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {application.documents?.length ? (
                  application.documents.map((document) => (
                    <a
                      key={document.id}
                      href={document.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white p-4 text-sm font-bold text-slate-700 hover:border-blue-500/40 hover:text-blue-600 transition-all duration-150 shadow-sm"
                    >
                      <FileText className="h-4.5 w-4.5 text-blue-500 shrink-0" />
                      <span className="truncate">{document.file_name}</span>
                    </a>
                  ))
                ) : (
                  <p className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-400 text-center col-span-2">
                    No documents uploaded.
                  </p>
                )}
              </div>
            </div>

            {/* Workflow Stepper Engine */}
            <div className="border-t border-slate-100 pt-6">
              <WorkflowStepper
                applicationId={application.id}
                currentStep={(application as unknown as { current_step?: string | null }).current_step || application.status}
                workflows={workflows}
                timelines={timelines}
              />
            </div>
          </Card>

          <div className="space-y-4">
            {/* Score Widget */}
            <Card className="border border-slate-200/50 bg-white/70 p-5 rounded-3xl backdrop-blur-xl text-center space-y-2 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Partner Score
              </p>
              <p className="text-3xl font-black text-emerald-600">
                {apCommission?.calculated_amount ??
                  application.commission_amount ??
                  0}
              </p>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold capitalize border ${
                  apCommission?.status === "paid"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : apCommission?.status === "approved"
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : "bg-amber-50 border-amber-200 text-amber-700"
                }`}
              >
                {apCommission?.status ?? "pending"}
              </span>
            </Card>

            {/* Invoice Button */}
            {application.invoices?.[0] ? (
              <Link
                href={`/invoice/${application.invoices[0].id}`}
                className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-800 hover:bg-slate-50 transition-all duration-150 shadow-sm"
              >
                <ReceiptText className="h-4.5 w-4.5 text-blue-500" />
                View Invoice Bill
              </Link>
            ) : null}

            {/* Internal WhatsApp Support generated wa.me links */}
            {mobile ? (
              <div className="grid gap-2">
                {[
                  ["Application Support", "AP support for this customer application"],
                  ["Documents Support", "AP needs help with pending customer documents"],
                  ["Completion Support", "AP needs help with completed application handover"],
                ].map(([label, topic]) => (
                  <a
                    key={label}
                    href={buildWhatsAppUrl(
                      buildAgentWhatsAppMessage({
                        agentName: ap.full_name,
                        applicationId: application.id,
                        serviceName: application.service_name,
                        customerName: getCustomerName(application),
                        topic,
                      })
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={topic}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-600 font-bold text-white hover:bg-emerald-500 transition-all duration-150 text-xs shadow-md shadow-emerald-950/10"
                  >
                    <MessageCircle className="h-4 w-4 shrink-0" />
                    {label}
                  </a>
                ))}
              </div>
            ) : null}

            <p className="text-center text-[10px] text-slate-400 font-semibold">
              Submitted: {formatDate(application.created_at)}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
