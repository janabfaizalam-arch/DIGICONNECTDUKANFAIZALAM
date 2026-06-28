import Link from "next/link";
import { redirect } from "next/navigation";
import { FilePlus2, Search, ArrowRight, Calendar, User, Phone } from "lucide-react";

import { PaymentBadge, StatusBadge } from "@/components/portal/status-badge";
import { Card } from "@/components/ui/card";
import { getAgencyPartnerByUserId, getAPApplications } from "@/lib/ap-data";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { getCustomerMobile, getCustomerName } from "@/lib/crm";

export const dynamic = "force-dynamic";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export default async function APApplicationsPage(props: {
  searchParams: Promise<{ status?: string }>;
}) {
  const searchParams = await props.searchParams;
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

  let applications = await getAPApplications(ap.id);
  
  const statusFilter = searchParams.status;
  if (statusFilter) {
    applications = applications.filter((app) => {
      if (statusFilter === "draft") return ["draft", "new"].includes(app.status);
      if (statusFilter === "documents_pending") return ["documents_pending", "document_pending", "documents_required"].includes(app.status);
      if (statusFilter === "payment_pending") return app.status === "payment_pending";
      if (statusFilter === "submitted") return app.status === "submitted";
      if (statusFilter === "processing") return ["processing", "in_process", "in_progress", "assigned_to_agent"].includes(app.status);
      if (statusFilter === "completed") return ["completed", "delivered", "approved"].includes(app.status);
      if (statusFilter === "rejected") return ["rejected", "cancelled"].includes(app.status);
      return true;
    });
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 border border-blue-500/20 text-xs font-bold text-blue-600">
              DigiPartner Ecosystem
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
              Submitted Applications
            </h1>
            <p className="mt-2 text-slate-500 max-w-2xl text-sm font-medium">
              Track and manage all applications created or attributed to your DigiPartner network.
            </p>
          </div>
          <Link
            href="/ap/applications/new"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 font-bold text-white shadow-lg shadow-blue-500/15 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            <FilePlus2 className="h-4.5 w-4.5" />
            New Application
          </Link>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/50 bg-white/70 p-4 backdrop-blur-md shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search applications by customer name, mobile or service type..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Applications List */}
        <Card className="border border-slate-200/50 bg-white/70 backdrop-blur-md rounded-3xl p-4 md:p-6 overflow-hidden shadow-sm">
          <div className="space-y-4">
            {applications.length ? (
              applications.map((application) => {
                const customerName = getCustomerName(application);
                const mobile = getCustomerMobile(application) || "No mobile";
                const dateText = formatDate(application.created_at);
                const payStatus = application.payment_status ?? application.payments?.[0]?.status ?? "pending";

                return (
                  <Link
                    key={application.id}
                    href={`/ap/applications/${application.id}`}
                    className="group relative flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/50 p-5 transition-all duration-200 hover:border-blue-500/20 hover:bg-slate-50 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-slate-450" />
                        <span className="font-extrabold text-slate-850 group-hover:text-blue-600 transition-colors text-base">
                          {customerName}
                        </span>
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-200" />
                        <span className="text-xs text-slate-500 font-semibold">
                          {application.service_name}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-slate-450 font-semibold">
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3 text-slate-400" />
                          {mobile}
                        </span>
                        <span className="hidden sm:inline text-slate-200">|</span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          {dateText}
                        </span>
                        <span className="hidden sm:inline text-slate-200">|</span>
                        <span className="text-indigo-600 text-[10px] font-bold bg-indigo-50 px-2 py-0.5 border border-indigo-100 rounded-md">
                          {application.application_code || application.id.slice(0, 8).toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 sm:gap-5 shrink-0 self-end sm:self-center">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={application.status} />
                        <PaymentBadge status={payStatus} />
                      </div>

                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-455 hover:text-slate-800 border border-slate-200 hover:scale-105 active:scale-95 transition-all duration-150 shadow-sm">
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center">
                <FilePlus2 className="mx-auto h-12 w-12 text-slate-400 animate-pulse" />
                <h3 className="mt-4 text-lg font-bold text-slate-850">No applications created yet</h3>
                <p className="mt-2 text-sm text-slate-450 font-medium">Submit your first customer application to see it here.</p>
                <Link
                  href="/ap/applications/new"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white shadow-lg shadow-blue-500/10 hover:bg-blue-700 transition-all"
                >
                  Create Application
                </Link>
              </div>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
