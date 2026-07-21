import Link from "next/link";
import { redirect } from "next/navigation";
import { FilePlus2, Phone, Search } from "lucide-react";

import { EmptyState, GlassPanel, PageHeader, StatusBadge } from "@/components/ap/ui";
import { getAgencyPartnerByUserId, getAPApplications } from "@/lib/ap-data";
import { formatINR } from "@/lib/ap/format";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { getCustomerMobile, getCustomerName } from "@/lib/crm";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_TABS: { id: string; label: string; match: string[] | null }[] = [
  { id: "all", label: "All", match: null },
  { id: "draft", label: "Draft", match: ["draft", "new"] },
  { id: "submitted", label: "Submitted", match: ["submitted"] },
  { id: "pending_documents", label: "Pending Documents", match: ["documents_pending", "document_pending", "documents_required"] },
  { id: "under_review", label: "Under Review", match: ["under_review", "payment_pending"] },
  { id: "in_process", label: "In Process", match: ["processing", "in_process", "in_progress", "assigned_to_agent"] },
  { id: "completed", label: "Completed", match: ["completed", "delivered", "approved"] },
  { id: "rejected", label: "Rejected", match: ["rejected", "cancelled"] },
];

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function nextAction(status: string, paymentStatus?: string | null): string {
  const s = String(status || "").toLowerCase();
  const pay = String(paymentStatus || "").toLowerCase();
  if (s.includes("document")) return "Upload document";
  if (pay === "payment_pending" || s === "payment_pending") return "Payment pending";
  if (s === "submitted" || s === "under_review") return "Awaiting admin review";
  if (s === "draft" || s === "new") return "Complete and submit";
  if (["completed", "delivered", "approved", "rejected", "cancelled"].includes(s)) return "No action required";
  return "Review status";
}

export default async function APApplicationsPage(props: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const searchParams = await props.searchParams;
  const user = await getCurrentUser();

  if (!user) redirect("/ap/login");
  if (!(await isActiveAgent(user))) redirect("/unauthorized");

  const ap = await getAgencyPartnerByUserId(user.id);
  if (!ap) redirect("/unauthorized");

  let applications = await getAPApplications(ap.id);
  const activeTab = STATUS_TABS.find((t) => t.id === searchParams.status) ?? STATUS_TABS[0];
  const query = String(searchParams.q ?? "").trim().toLowerCase();

  if (activeTab.match) {
    const allowed = activeTab.match;
    applications = applications.filter((app) => allowed.includes(app.status));
  }

  if (query) {
    applications = applications.filter((app) => {
      const haystack = [
        getCustomerName(app),
        getCustomerMobile(app),
        app.service_name,
        app.application_code,
        app.status,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#F6F8FC] pb-24 text-[#0F172A] md:pb-10">
      <div className="relative mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-10">
        <PageHeader
          eyebrow="Applications"
          title="Application workspace"
          description="Track every customer filing — status, payment, next action and commission path."
          actions={
            <Link
              href="/ap/applications/new"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              <FilePlus2 className="h-4 w-4" />
              New Application
            </Link>
          }
        />

        {/* Status tabs */}
        <div className="-mx-1 overflow-x-auto px-1" role="tablist" aria-label="Application status">
          <div className="flex min-w-max gap-1.5 pb-1">
            {STATUS_TABS.map((tab) => {
              const selected = tab.id === activeTab.id;
              const href =
                tab.id === "all"
                  ? query
                    ? `/ap/applications?q=${encodeURIComponent(query)}`
                    : "/ap/applications"
                  : `/ap/applications?status=${tab.id}${query ? `&q=${encodeURIComponent(query)}` : ""}`;
              return (
                <Link
                  key={tab.id}
                  href={href}
                  role="tab"
                  aria-selected={selected}
                  className={cn(
                    "rounded-full px-3.5 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                    selected
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "border border-slate-200 bg-white/80 text-slate-600 hover:bg-white",
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Search */}
        <form className="relative" action="/ap/applications" method="get">
          {activeTab.id !== "all" ? <input type="hidden" name="status" value={activeTab.id} /> : null}
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            name="q"
            defaultValue={searchParams.q ?? ""}
            placeholder="Search customer, mobile, service or application ID…"
            className="h-12 w-full rounded-2xl border border-white/70 bg-white/75 pl-11 pr-4 text-sm font-semibold text-slate-800 shadow-sm outline-none ring-1 ring-slate-900/[0.03] backdrop-blur-xl placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500"
            aria-label="Search applications"
          />
        </form>

        {applications.length === 0 ? (
          <EmptyState
            title="No applications yet"
            description="Submit your first customer application to start earning."
            actionLabel="Apply New Service"
            actionHref="/ap/applications/new"
          />
        ) : (
          <>
            {/* Desktop table */}
            <GlassPanel padding="none" className="hidden overflow-hidden lg:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Next action</th>
                    <th className="px-4 py-3">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {applications.map((application) => {
                    const payStatus = application.payment_status ?? application.payments?.[0]?.status ?? "pending";
                    return (
                      <tr key={application.id} className="transition hover:bg-slate-50/80">
                        <td className="px-4 py-3">
                          <Link href={`/ap/applications/${application.id}`} className="font-bold text-slate-900 hover:text-indigo-700">
                            {getCustomerName(application)}
                          </Link>
                          <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                            <Phone className="h-3 w-3" />
                            {getCustomerMobile(application) || "—"}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-600">{application.service_name}</td>
                        <td className="px-4 py-3 font-mono text-[11px] font-bold text-indigo-600">
                          {application.application_code || application.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-slate-500">{formatDate(application.created_at)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={String(payStatus)} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={application.status} />
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-indigo-600">
                          {nextAction(application.status, String(payStatus))}
                        </td>
                        <td className="px-4 py-3 font-extrabold tabular-nums text-slate-800">
                          {formatINR(application.amount ?? 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </GlassPanel>

            {/* Mobile cards */}
            <div className="grid gap-2.5 lg:hidden">
              {applications.map((application) => {
                const payStatus = application.payment_status ?? application.payments?.[0]?.status ?? "pending";
                return (
                  <Link key={application.id} href={`/ap/applications/${application.id}`}>
                    <GlassPanel padding="md" className="transition hover:border-indigo-200">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-extrabold text-slate-900">{getCustomerName(application)}</p>
                          <p className="mt-0.5 truncate text-xs font-medium text-slate-500">{application.service_name}</p>
                        </div>
                        <StatusBadge status={application.status} />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-400">
                        <span className="font-mono text-indigo-600">
                          {application.application_code || application.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span>·</span>
                        <span>{formatDate(application.created_at)}</span>
                        <span>·</span>
                        <span className="tabular-nums text-slate-700">{formatINR(application.amount ?? 0)}</span>
                      </div>
                      <p className="mt-2 text-[11px] font-bold text-indigo-600">
                        {nextAction(application.status, String(payStatus))}
                      </p>
                    </GlassPanel>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
