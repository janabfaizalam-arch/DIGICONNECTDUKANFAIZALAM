import { redirect } from "next/navigation";

import { AdminDashboard, type DashboardChartData, type DashboardKpi, type DashboardTableRow } from "@/components/admin/admin-dashboard";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import type { Application, Lead } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type InsuranceQuotationRow = {
  id: string;
  customer_name: string;
  mobile: string;
  insurance_type: string;
  status: string;
  created_at: string;
};

type PaymentRow = {
  id: string;
  application_id: string;
  amount: number;
  status: string;
  created_at: string;
  applications?: {
    id: string;
    service_name: string;
    status: string;
    form_data: Record<string, unknown> | null;
  } | null;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(date));
}

function customerFromForm(formData: Record<string, unknown> | null) {
  return String(formData?.name ?? formData?.fullName ?? formData?.customerName ?? "Customer");
}

function mobileFromForm(formData: Record<string, unknown> | null) {
  return String(formData?.mobile ?? formData?.phone ?? "");
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function lastSevenDays() {
  const today = startOfToday();
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    return date;
  });
}

function sameDay(value: string, date: Date) {
  const candidate = new Date(value);
  return candidate.getFullYear() === date.getFullYear() && candidate.getMonth() === date.getMonth() && candidate.getDate() === date.getDate();
}

function isCompleted(status: string | null | undefined) {
  return ["completed", "delivered", "approved", "done"].includes(String(status ?? "").toLowerCase());
}

function isPendingWork(status: string | null | undefined) {
  return ["new", "documents_pending", "payment_pending", "in_process", "submitted"].includes(String(status ?? "").toLowerCase());
}

export default async function AdminPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const supabase = getSupabaseAdmin();
  let dashboardError = "";
  let leads: Lead[] = [];
  let applications: Application[] = [];
  let payments: PaymentRow[] = [];
  let insuranceQuotations: InsuranceQuotationRow[] = [];
  let totalApplications = 0;
  let completedApplications = 0;
  let pendingPaymentCount = 0;

  if (supabase) {
    const [
      leadResult,
      applicationResult,
      paymentResult,
      quotationResult,
      totalApplicationsResult,
      completedApplicationsResult,
      pendingPaymentsResult,
    ] = await Promise.all([
      supabase
        .from("leads")
        .select("id, name, mobile, service, message, status, file_name, file_url, file_type, storage_path, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("applications")
        .select("id, user_id, service_slug, service_name, amount, form_data, status, final_document_url, final_document_name, assigned_to, internal_notes, payment_status, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("payments")
        .select("id, application_id, amount, status, created_at, applications(id, service_name, status, form_data)")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("insurance_quotations")
        .select("id, customer_name, mobile, insurance_type, status, created_at")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase.from("applications").select("id", { count: "exact", head: true }),
      supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "completed"),
      supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);

    if (leadResult.error || applicationResult.error) {
      dashboardError = "Some dashboard data could not be loaded. Please check Supabase configuration.";
    }

    leads = (leadResult.data ?? []) as Lead[];
    applications = (applicationResult.data ?? []) as Application[];
    payments = (paymentResult.data ?? []) as unknown as PaymentRow[];
    insuranceQuotations = (quotationResult.data ?? []) as InsuranceQuotationRow[];
    totalApplications = totalApplicationsResult.count ?? applications.length;
    completedApplications = completedApplicationsResult.count ?? applications.filter((application) => isCompleted(application.status)).length;
    pendingPaymentCount = pendingPaymentsResult.count ?? payments.length;
  } else {
    dashboardError = "Supabase admin keys are missing, so live dashboard data is unavailable.";
  }

  const days = lastSevenDays();
  const today = startOfToday();
  const todayLeads = leads.filter((lead) => sameDay(lead.created_at, today)).length;
  const todayApplications = applications.filter((application) => sameDay(application.created_at, today)).length;
  const pendingWork = applications.filter((application) => isPendingWork(application.status)).length;
  const revenueEstimate = applications
    .filter((application) => application.payment_status === "verified" || isCompleted(application.status))
    .reduce((total, application) => total + Number(application.amount ?? 0), 0);

  const charts: DashboardChartData = {
    workflow: days.map((date) => ({
      label: new Intl.DateTimeFormat("en-IN", { weekday: "short" }).format(date),
      leads: leads.filter((lead) => sameDay(lead.created_at, date)).length,
      applications: applications.filter((application) => sameDay(application.created_at, date)).length,
    })),
    revenue: days.map((date) => ({
      label: new Intl.DateTimeFormat("en-IN", { weekday: "short" }).format(date),
      revenue: applications
        .filter((application) => sameDay(application.created_at, date))
        .filter((application) => application.payment_status === "verified" || isCompleted(application.status))
        .reduce((total, application) => total + Number(application.amount ?? 0), 0),
    })),
    statuses: Array.from(
      applications.reduce((grouped, application) => {
        const status = String(application.status ?? "new").replace(/_/g, " ");
        grouped.set(status, (grouped.get(status) ?? 0) + 1);
        return grouped;
      }, new Map<string, number>()),
    ).map(([name, value]) => ({ name, value })),
    services: Array.from(
      applications.reduce((grouped, application) => {
        const service = String(application.service_name ?? "Service");
        grouped.set(service, (grouped.get(service) ?? 0) + 1);
        return grouped;
      }, new Map<string, number>()),
    )
      .map(([service, count]) => ({ service, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
  };

  const kpis: DashboardKpi[] = [
    { title: "Today Leads", value: todayLeads, trend: `+${todayLeads} today`, href: "/admin/leads", icon: "lead" },
    {
      title: "New Applications",
      value: todayApplications,
      trend: `+${todayApplications} today`,
      href: "/admin/applications",
      icon: "application",
    },
    { title: "Pending Work", value: pendingWork, trend: "Needs office action", href: "/admin/applications", icon: "pending" },
    {
      title: "Completed Work",
      value: completedApplications,
      trend: `${totalApplications} total applications`,
      href: "/admin/applications",
      icon: "completed",
    },
    {
      title: "Revenue Estimate",
      value: `Rs ${revenueEstimate.toLocaleString("en-IN")}`,
      trend: "Verified and completed",
      href: "/admin/applications",
      icon: "revenue",
    },
    {
      title: "Payment Pending",
      value: pendingPaymentCount,
      trend: "Follow up required",
      href: "/admin/applications",
      icon: "payment",
    },
  ];

  const recentLeads: DashboardTableRow[] = leads.slice(0, 8).map((lead) => ({
    id: lead.id,
    customerName: lead.name,
    mobile: lead.mobile,
    service: lead.service,
    status: lead.status,
    date: formatDate(lead.created_at),
    href: "/admin/leads",
  }));

  const recentApplications: DashboardTableRow[] = applications.slice(0, 8).map((application) => ({
    id: application.id,
    customerName: customerFromForm(application.form_data),
    mobile: mobileFromForm(application.form_data),
    service: application.service_name,
    status: application.status,
    date: formatDate(application.created_at),
    href: `/admin/applications/${application.id}`,
  }));

  const pendingPayments: DashboardTableRow[] = payments.map((payment) => ({
    id: payment.id,
    customerName: customerFromForm(payment.applications?.form_data ?? null),
    mobile: mobileFromForm(payment.applications?.form_data ?? null),
    service: payment.applications?.service_name ?? `Payment ${Number(payment.amount ?? 0).toLocaleString("en-IN")}`,
    status: payment.status,
    date: formatDate(payment.created_at),
    href: payment.application_id ? `/admin/applications/${payment.application_id}` : "/admin/applications",
  }));

  const recentInsuranceQuotations: DashboardTableRow[] = insuranceQuotations.map((quotation) => ({
    id: quotation.id,
    customerName: quotation.customer_name,
    mobile: quotation.mobile,
    service: quotation.insurance_type,
    status: quotation.status,
    date: formatDate(quotation.created_at),
    href: "/admin/insurance-quotations",
  }));

  return (
    <AdminDashboard
      todayLabel={new Intl.DateTimeFormat("en-IN", { weekday: "long", dateStyle: "long" }).format(new Date())}
      kpis={kpis}
      charts={charts}
      recentLeads={recentLeads}
      recentApplications={recentApplications}
      pendingPayments={pendingPayments}
      recentInsuranceQuotations={recentInsuranceQuotations}
      error={dashboardError}
    />
  );
}
