import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Phone, UsersRound, type LucideIcon } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { AdminCustomerManager } from "@/components/admin/admin-customer-manager";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getAdminCustomers } from "@/lib/admin-customers";
import { safeNumber } from "@/lib/admin-format";

export const dynamic = "force-dynamic";

type AdminCustomersPageProps = {
  searchParams?: Promise<{
    filter?: string;
  }>;
};

type StatLinkCardProps = {
  title: string;
  value: number;
  href: string;
  icon: LucideIcon;
  tone: "blue" | "green" | "orange";
  active?: boolean;
};

function StatLinkCard({ title, value, href, icon: Icon, tone, active }: StatLinkCardProps) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    orange: "bg-orange-50 text-orange-700",
  }[tone];

  return (
    <Link
      href={href}
      className={`group block cursor-pointer rounded-2xl border bg-white p-4 shadow-sm outline-none transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-[0.99] ${
        active ? "border-blue-200 shadow-md" : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-bold text-slate-950">{safeNumber(value)}</p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition group-hover:scale-105 ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}

export default async function AdminCustomersPage({ searchParams }: AdminCustomersPageProps) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const params = await searchParams;
  const result = await getAdminCustomers({ filter: params?.filter });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        eyebrow="Users"
        title="Registered Users"
        description="Canonical customer users from profiles, enriched with application, wallet, and referral facts."
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <StatLinkCard
          title="Total Users"
          value={result.stats.totalCustomers}
          href="/admin/customers"
          icon={UsersRound}
          tone="blue"
          active={result.filter === "all"}
        />
        <StatLinkCard
          title="With Applications"
          value={result.stats.withApplications}
          href="/admin/customers?filter=with-applications"
          icon={CalendarDays}
          tone="green"
          active={result.filter === "with-applications"}
        />
        <StatLinkCard
          title="Signed Up Users"
          value={result.stats.signedUpUsers}
          href="/admin/customers?filter=signed-up"
          icon={Phone}
          tone="orange"
          active={result.filter === "signed-up"}
        />
      </section>

      <AdminCustomerManager customers={result.rows} />
    </div>
  );
}
