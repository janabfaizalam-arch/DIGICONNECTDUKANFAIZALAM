import { redirect } from "next/navigation";
import { CalendarDays, FileText, UsersRound, type LucideIcon } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { getAdminDashboardStats } from "@/lib/admin-dashboard";
import { safeNumber } from "@/lib/admin-format";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

type StatCardProps = {
  title: string;
  value: number;
  description: string;
  icon: LucideIcon;
  tone: "blue" | "green" | "orange";
};

function StatCard({ title, value, description, icon: Icon, tone }: StatCardProps) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    orange: "bg-orange-50 text-orange-700",
  }[tone];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <p className="mt-4 text-4xl font-bold tracking-normal text-slate-950">{safeNumber(value)}</p>
        </div>
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-5 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

export default async function AdminPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const stats = await getAdminDashboardStats();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AdminPageHeader
        eyebrow="Admin"
        title="Dashboard"
        description="A minimal server-side snapshot of users and application volume."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          description="Customer profiles only, excluding admin, staff, and agent accounts."
          icon={UsersRound}
          tone="blue"
        />
        <StatCard
          title="Total Applications"
          value={stats.totalApplications}
          description="Unique rows counted directly from applications."
          icon={FileText}
          tone="green"
        />
        <StatCard
          title="Today Applications"
          value={stats.todayApplications}
          description="Applications created during the current Asia/Kolkata calendar day."
          icon={CalendarDays}
          tone="orange"
        />
      </section>
    </div>
  );
}
