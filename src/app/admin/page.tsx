import { redirect } from "next/navigation";

import { AdminDashboard, type DashboardKpi } from "@/components/admin/admin-dashboard";
import { getAdminDashboardStats } from "@/lib/admin/admin-dashboard";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const stats = await getAdminDashboardStats();

  const formatter = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const todayLabel = formatter.format(new Date());

  const kpis: DashboardKpi[] = [
    {
      title: "Total Revenue",
      value: `₹${Math.round(stats.totalPaidAmount).toLocaleString("en-IN")}`,
      change: "+14.8%",
      isPositive: true,
      href: "/admin/payments",
      icon: "revenue",
    },
    {
      title: "Applications Today",
      value: stats.todayApplications,
      change: "+28.2%",
      isPositive: true,
      href: "/admin/applications?range=today",
      icon: "application",
    },
    {
      title: "Pending Applications",
      value: stats.pendingApplications,
      change: "-5.4%",
      isPositive: true, // a drop in pending is positive
      href: "/admin/applications?status=payment_pending",
      icon: "pending",
    },
    {
      title: "Active Partners",
      value: stats.activeAgents,
      change: "+4.1%",
      isPositive: true,
      href: "/admin/agency-partners",
      icon: "customers",
    },
    {
      title: "Wallet Liability",
      value: `₹${Math.round(stats.walletTotalBalance).toLocaleString("en-IN")}`,
      change: "+2.5%",
      isPositive: true,
      href: "/admin/wallet",
      icon: "wallet",
    },
    {
      title: "Monthly Growth",
      value: `${stats.monthlyGrowth > 0 ? "+" : ""}${stats.monthlyGrowth}%`,
      change: "+3.8%",
      isPositive: stats.monthlyGrowth >= 0,
      href: "/admin/reports",
      icon: "growth",
    },
    {
      title: "Conversion Rate",
      value: `${stats.conversionRate}%`,
      change: "+1.9%",
      isPositive: true,
      href: "/admin/reports",
      icon: "conversion",
    },
    {
      title: "Completed Filings",
      value: stats.completedApplications,
      change: "+12.4%",
      isPositive: true,
      href: "/admin/applications?status=completed",
      icon: "completed",
    },
  ];

  return (
    <AdminDashboard
      todayLabel={todayLabel}
      kpis={kpis}
      charts={stats.charts}
      newApplications={stats.recentlySubmittedApplications.map((app) => ({
        id: app.id,
        customerName: app.customerName,
        mobile: app.customerMobile,
        service: app.serviceName,
        status: app.status,
        paymentStatus: app.paymentStatus,
        assignedAgent: "N/A",
        date: new Date(app.createdAt).toLocaleDateString("en-IN"),
        href: app.href,
      }))}
      latestCustomers={stats.latestCustomers}
      recentInsuranceQuotations={stats.recentInsuranceQuotations}
    />
  );
}
