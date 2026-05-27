import Link from "next/link";
import { redirect } from "next/navigation";
import {
  FileText,
  Clock3,
  CheckCircle2,
  AlertTriangle,
  HandCoins,
  WalletCards,
  TrendingUp,
  Users,
  PlusCircle,
  ArrowRight,
  Bell,
  Sparkles,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import {
  getAgencyPartnerByUserId,
  getAPDashboardStats,
  getAPApplications,
  getActiveAnnouncements,
} from "@/lib/ap-data";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { formatCurrency } from "@/lib/portal-data";

export const dynamic = "force-dynamic";

export default async function APDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/ap/login");
  }

  const active = await isActiveAgent(user);
  if (!active) {
    redirect("/unauthorized");
  }

  const ap = await getAgencyPartnerByUserId(user.id);
  if (!ap) {
    redirect("/unauthorized");
  }

  const [stats, applications, announcements] = await Promise.all([
    getAPDashboardStats(ap.id),
    getAPApplications(ap.id, 5),
    getActiveAnnouncements(ap.id, ap.tier_id),
  ]);

  const recentApps = applications.slice(0, 5);

  const statsItems = [
    {
      label: "Total Applications",
      value: stats.totalApplications,
      subtext: `${stats.monthlyApplications} this month`,
      icon: FileText,
      gradient: "from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400",
    },
    {
      label: "Processing",
      value: stats.pendingApplications,
      subtext: "Action required on some",
      icon: Clock3,
      gradient: "from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400",
    },
    {
      label: "Completed Services",
      value: stats.completedApplications,
      subtext: "Delivered to customers",
      icon: CheckCircle2,
      gradient: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400",
    },
    {
      label: "Total Customers",
      value: stats.customerCount,
      subtext: "Linked via mobile",
      icon: Users,
      gradient: "from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400",
    },
    {
      label: "Wallet Balance",
      value: formatCurrency(stats.walletBalance),
      subtext: "Ready to withdraw",
      icon: WalletCards,
      gradient: "from-indigo-500/20 to-violet-500/20 border-indigo-500/30 text-indigo-400",
      highlight: true,
    },
    {
      label: "Approved Commission",
      value: formatCurrency(stats.commissionApproved),
      subtext: "Crediting to wallet",
      icon: HandCoins,
      gradient: "from-emerald-500/20 to-cyan-500/20 border-emerald-500/30 text-emerald-400",
    },
    {
      label: "Pending Commission",
      value: formatCurrency(stats.commissionPending),
      subtext: "Awaiting verification",
      icon: TrendingUp,
      gradient: "from-yellow-500/20 to-amber-500/20 border-yellow-500/30 text-yellow-400",
    },
    {
      label: "Total Paid Out",
      value: formatCurrency(stats.totalPaidPayout),
      subtext: "Settled to bank",
      icon: CheckCircle2,
      gradient: "from-slate-500/20 to-zinc-500/20 border-slate-500/30 text-slate-400",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Welcome Section */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/40 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-[80px]" />
          <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-[80px]" />

          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-500/10 to-indigo-500/10 px-3.5 py-1.5 border border-blue-500/20 text-xs font-bold text-blue-400">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                Agency Partner Ecosystem
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent sm:text-4xl md:text-5xl">
                {ap.full_name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 font-mono text-sm text-slate-400">
                <span className="rounded bg-white/5 px-2 py-0.5 border border-white/5 font-semibold text-slate-300">
                  {ap.partner_code}
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                <span className="font-semibold text-indigo-400 capitalize">
                  {ap.partner_type.replace("_", " ")}
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                <span className="inline-flex items-center gap-1 font-bold text-amber-400">
                  {ap.tier?.name || "AP Starter"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 shrink-0">
              <Link
                href="/ap/applications/new"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 px-6 font-bold text-white shadow-lg shadow-blue-500/25 hover:from-blue-600 hover:to-indigo-600 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                <PlusCircle className="h-5 w-5" />
                New Application
              </Link>
            </div>
          </div>
        </section>

        {/* KYC & Verification Notice */}
        {ap.kyc_status !== "approved" && (
          <section className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-4 md:p-5 backdrop-blur-xl">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-yellow-300">KYC Status: {ap.kyc_status.toUpperCase()}</h3>
                <p className="mt-1 text-sm text-yellow-200/70">
                  Your profile and services will be enabled once KYC is fully approved by our compliance team.
                  Please ensure Aadhaar, PAN, and shop documents are uploaded under profile.
                </p>
                <Link href="/ap/profile" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-yellow-400 hover:underline">
                  Go to Profile / Documents
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Stats Grid */}
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statsItems.map((item, idx) => (
            <Card
              key={idx}
              className={`relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/20 p-5 backdrop-blur-md transition-all duration-200 hover:border-white/10 hover:bg-slate-900/30 ${
                item.highlight ? "ring-1 ring-blue-500/30 shadow-md shadow-blue-500/5" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <p className="text-sm font-semibold text-slate-400">{item.label}</p>
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 border ${item.gradient.split(" ")[2]}`}>
                  <item.icon className="h-4.5 w-4.5" />
                </span>
              </div>
              <p className="mt-4 text-2xl font-black tracking-tight text-white md:text-3xl">
                {item.value}
              </p>
              <p className="mt-1.5 text-xs font-medium text-slate-500">
                {item.subtext}
              </p>
            </Card>
          ))}
        </section>

        {/* Dashboard Bottom Section */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Applications */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-400" />
                Recent Customer Applications
              </h2>
              <Link href="/ap/applications" className="inline-flex items-center gap-1 text-xs font-bold text-blue-400 hover:underline">
                View All
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <Card className="overflow-hidden border border-white/5 bg-slate-900/20 backdrop-blur-md rounded-2xl">
              {recentApps.length === 0 ? (
                <div className="p-10 text-center">
                  <FileText className="mx-auto h-12 w-12 text-slate-600" />
                  <h3 className="mt-4 text-lg font-semibold text-slate-300">No applications yet</h3>
                  <p className="mt-1 text-sm text-slate-500">Submit your first application to earn commission!</p>
                  <Link
                    href="/ap/applications/new"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-500/10 px-4 py-2 border border-blue-500/20 text-xs font-bold text-blue-400 hover:bg-blue-500/20 transition-all duration-200"
                  >
                    Submit Application
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {recentApps.map((app) => (
                    <div key={app.id} className="p-4 hover:bg-white/5 transition-all duration-150">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{app.customerName || app.customer_name}</span>
                            <span className="h-1 w-1 rounded-full bg-slate-600" />
                            <span className="text-xs text-slate-400">{app.service_name}</span>
                          </div>
                          <div className="mt-1 font-mono text-xs text-slate-500">
                            ID: {app.application_code || app.id.slice(0, 8)}
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold capitalize border ${
                              app.status === "completed"
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                : app.status === "rejected" || app.status === "cancelled"
                                ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                                : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                            }`}
                          >
                            {app.status.replace("_", " ")}
                          </span>

                          <Link
                            href={`/ap/applications/${app.id}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-white border border-white/5 hover:border-white/10 transition-all duration-150"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Announcements & Notifications */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Bell className="h-5 w-5 text-indigo-400" />
              Announcements
            </h2>

            <Card className="overflow-hidden border border-white/5 bg-slate-900/20 backdrop-blur-md rounded-2xl p-5 space-y-4">
              {announcements.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-sm">
                  No announcements at this time.
                </div>
              ) : (
                <div className="space-y-4">
                  {announcements.map((a) => (
                    <div
                      key={a.id}
                      className={`rounded-xl border p-4 space-y-2 bg-slate-900/40 backdrop-blur-sm ${
                        a.announcement_type === "urgent"
                          ? "border-rose-500/30 text-rose-200"
                          : a.announcement_type === "warning"
                          ? "border-amber-500/30 text-amber-200"
                          : a.announcement_type === "success"
                          ? "border-emerald-500/30 text-emerald-200"
                          : "border-blue-500/30 text-blue-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs uppercase tracking-wide opacity-75">
                          {a.announcement_type}
                        </span>
                        {a.published_at && (
                          <span className="text-[10px] text-slate-500 font-medium">
                            {new Date(a.published_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <h4 className="font-extrabold text-sm text-white">{a.title}</h4>
                      <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line">{a.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
