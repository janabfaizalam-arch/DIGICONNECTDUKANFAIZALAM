import { redirect } from "next/navigation";

import {
  AdminDashboard,
  type DashboardApplicationRow,
  type DashboardChartData,
  type DashboardCustomerRow,
  type DashboardKpi,
  type DashboardQuotationRow,
} from "@/components/admin/admin-dashboard";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { safeCurrency, safeDate, safeDateValue, safeNumber } from "@/lib/admin-format";
import { getCustomerMobile, getCustomerName, hydrateApplications } from "@/lib/crm";
import type { Application, Customer, PortalUser } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type InsuranceQuotationRow = {
  id: string;
  customer_name: string | null;
  vehicle_number: string | null;
  total_amount: number | null;
  status: string | null;
  valid_till: string | null;
  created_at: string | null;
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  mobile: string | null;
  role: string | null;
  created_at: string | null;
};

type WalletRow = {
  user_id: string | null;
  balance?: number | null;
  lifetime_earned?: number | null;
};

type ReferralRow = {
  referrer_user_id: string | null;
  referred_user_id?: string | null;
};

function formatWeekday(date: Date) {
  return new Intl.DateTimeFormat("en-IN", { weekday: "short" }).format(date);
}

function formatTodayLabel(date: Date) {
  return new Intl.DateTimeFormat("en-IN", { weekday: "long", year: "numeric", month: "short", day: "numeric" }).format(date);
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

function sameDay(value: string | null | undefined, date: Date) {
  const candidate = safeDateValue(value);
  return !!candidate && candidate.getFullYear() === date.getFullYear() && candidate.getMonth() === date.getMonth() && candidate.getDate() === date.getDate();
}

function isCompleted(status: string | null | undefined) {
  return ["completed", "delivered", "approved", "done"].includes(String(status ?? "").toLowerCase());
}

function isPendingWork(status: string | null | undefined) {
  return ["new", "documents_pending", "in_process", "in_progress", "submitted", "pending"].includes(String(status ?? "").toLowerCase());
}

function isPaidApplication(application: Application) {
  return String(application.payment_status ?? application.payments?.[0]?.status ?? "").toLowerCase() === "verified";
}

function isFailedPayment(application: Application) {
  return String(application.payment_status ?? application.payments?.[0]?.status ?? "").toLowerCase() === "failed" || String(application.status ?? "").toLowerCase() === "payment_failed";
}

function verifiedPaymentAmount(application: Application) {
  if (!isPaidApplication(application)) {
    return 0;
  }

  const payment = application.payments?.[0];
  return Number(payment?.real_payment_amount ?? payment?.amount ?? application.fresh_payable_amount ?? application.real_payment_amount ?? 0);
}

function walletRedeemedAmount(application: Application) {
  return Number(application.wallet_redeemed_amount ?? application.wallet_used_amount ?? application.payments?.[0]?.wallet_used_amount ?? 0);
}

function firstText(...values: Array<string | null | undefined>) {
  return values.map((value) => value?.trim()).find(Boolean) || "";
}

function buildCustomers(customers: Customer[], profiles: ProfileRow[], applications: Application[], wallets: WalletRow[], referrals: ReferralRow[]) {
  const rowsByKey = new Map<string, DashboardCustomerRow>();
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const walletByUserId = new Map(wallets.filter((wallet) => wallet.user_id).map((wallet) => [String(wallet.user_id), wallet]));

  const applicationCounts = applications.reduce<Record<string, number>>((grouped, application) => {
    if (application.user_id) grouped[application.user_id] = (grouped[application.user_id] ?? 0) + 1;
    if (application.customer_id) grouped[application.customer_id] = (grouped[application.customer_id] ?? 0) + 1;
    return grouped;
  }, {});

  const referralCounts = referrals.reduce<Record<string, number>>((grouped, referral) => {
    if (referral.referrer_user_id) grouped[referral.referrer_user_id] = (grouped[referral.referrer_user_id] ?? 0) + 1;
    return grouped;
  }, {});

  for (const customer of customers) {
    const profile = customer.user_id ? profileById.get(customer.user_id) : null;
    const wallet = customer.user_id ? walletByUserId.get(customer.user_id) : null;
    const key = customer.user_id ?? customer.id;

    rowsByKey.set(key, {
      id: key,
      name: firstText(customer.full_name, profile?.full_name, "Customer"),
      mobile: firstText(customer.mobile, profile?.mobile),
      email: firstText(customer.email, profile?.email),
      walletBalance: safeCurrency(wallet?.balance),
      cashbackBalance: safeCurrency(wallet?.lifetime_earned),
      referralCount: customer.user_id ? referralCounts[customer.user_id] ?? 0 : 0,
      applicationsCount: (customer.user_id ? applicationCounts[customer.user_id] ?? 0 : 0) + (applicationCounts[customer.id] ?? 0),
      joinedDate: safeDate(customer.created_at),
      href: `/admin/customers/${customer.id}`,
    });
  }

  for (const profile of profiles.filter((item) => item.role === "customer")) {
    if (rowsByKey.has(profile.id)) continue;
    const wallet = walletByUserId.get(profile.id);
    rowsByKey.set(profile.id, {
      id: profile.id,
      name: firstText(profile.full_name, "Customer"),
      mobile: firstText(profile.mobile),
      email: firstText(profile.email),
      walletBalance: safeCurrency(wallet?.balance),
      cashbackBalance: safeCurrency(wallet?.lifetime_earned),
      referralCount: referralCounts[profile.id] ?? 0,
      applicationsCount: applicationCounts[profile.id] ?? 0,
      joinedDate: safeDate(profile.created_at),
      href: "/admin/customers",
    });
  }

  return Array.from(rowsByKey.values());
}

export default async function AdminPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const supabase = getSupabaseAdmin();
  let dashboardError = "";
  let applications: Application[] = [];
  let customers: Customer[] = [];
  let profiles: ProfileRow[] = [];
  let staff: PortalUser[] = [];
  let wallets: WalletRow[] = [];
  let referrals: ReferralRow[] = [];
  let insuranceQuotations: InsuranceQuotationRow[] = [];
  let totalApplications = 0;
  let completedApplications = 0;
  let quotationCount = 0;

  if (supabase) {
    try {
      const results = await Promise.allSettled([
        supabase.from("applications").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("customers").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("profiles").select("id, email, full_name, mobile, role, created_at").order("created_at", { ascending: false }).limit(1000),
        supabase.from("profiles").select("id, full_name, email, avatar_url, role, mobile").eq("role", "staff"),
        supabase.from("insurance_quotations").select("id, customer_name, vehicle_number, total_amount, status, valid_till, created_at").order("created_at", { ascending: false }).limit(10),
        supabase.from("applications").select("id", { count: "exact", head: true }),
        supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("insurance_quotations").select("id", { count: "exact", head: true }),
        supabase.from("reward_wallets").select("user_id, balance, lifetime_earned").limit(1000),
        supabase.from("referral_events").select("referrer_user_id, referred_user_id").limit(1000),
      ]);

      const [
        applicationResult,
        customerResult,
        profileResult,
        staffResult,
        quotationResult,
        totalApplicationsResult,
        completedApplicationsResult,
        quotationCountResult,
        walletResult,
        referralResult,
      ] = results.map((result) => result.status === "fulfilled" ? result.value : { data: null, error: { message: "Query failed" }, count: null });

      if (applicationResult.error) dashboardError = "Some dashboard data could not be loaded. Applications are showing with safe fallbacks.";

      applications = applicationResult.error ? [] : ((await hydrateApplications((applicationResult.data ?? []) as Application[])) as Application[]);
      customers = customerResult.error ? [] : (customerResult.data ?? []) as Customer[];
      profiles = profileResult.error ? [] : (profileResult.data ?? []) as ProfileRow[];
      staff = staffResult.error ? [] : (staffResult.data ?? []) as PortalUser[];
      insuranceQuotations = quotationResult.error ? [] : (quotationResult.data ?? []) as InsuranceQuotationRow[];
      wallets = walletResult.error ? [] : (walletResult.data ?? []) as WalletRow[];
      referrals = referralResult.error ? [] : (referralResult.data ?? []) as ReferralRow[];
      totalApplications = totalApplicationsResult.count ?? applications.length;
      completedApplications = completedApplicationsResult.count ?? applications.filter((application) => isCompleted(application.status)).length;
      quotationCount = quotationCountResult.count ?? insuranceQuotations.length;
    } catch (error) {
      console.error("[admin-dashboard] Failed to load dashboard data", error);
      dashboardError = "Dashboard data could not be loaded. Showing safe fallback UI.";
    }
  } else {
    dashboardError = "Supabase admin keys are missing, so live dashboard data is unavailable.";
  }

  const days = lastSevenDays();
  const today = startOfToday();
  const todayApplications = applications.filter((application) => sameDay(application.created_at, today)).length;
  const pendingWork = applications.filter((application) => isPendingWork(application.status)).length;
  const paidApplications = applications.filter(isPaidApplication).length;
  const paymentPendingApplications = applications.filter((application) => String(application.status ?? "").toLowerCase() === "payment_pending").length;
  const failedPayments = applications.filter(isFailedPayment).length;
  const verifiedRevenue = applications.reduce((total, application) => total + verifiedPaymentAmount(application), 0);
  const walletRedeemedTotal = applications.reduce((total, application) => total + walletRedeemedAmount(application), 0);
  const cashbackLiability = applications
    .filter((application) => isPaidApplication(application) && !application.cashback_awarded)
    .reduce((total, application) => total + Number(application.cashback_eligible_amount ?? application.real_payment_amount ?? 0), 0);
  const customerRows = buildCustomers(customers, profiles, applications, wallets, referrals);

  const charts: DashboardChartData = {
    workflow: days.map((date) => ({
      label: formatWeekday(date),
      applications: applications.filter((application) => sameDay(application.created_at, date)).length,
    })),
    revenue: days.map((date) => ({
      label: formatWeekday(date),
      revenue: applications
        .filter((application) => sameDay(application.created_at, date))
        .reduce((total, application) => total + verifiedPaymentAmount(application), 0),
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
    ).map(([service, count]) => ({ service, count })).sort((a, b) => b.count - a.count).slice(0, 6),
  };

  const kpis: DashboardKpi[] = [
    { title: "Today Applications", value: todayApplications, trend: `${totalApplications} total applications`, href: "/admin/applications", icon: "application" },
    { title: "Paid Applications", value: paidApplications, trend: `${paymentPendingApplications} payment pending`, href: "/admin/applications", icon: "revenue" },
    { title: "Pending Processing", value: pendingWork, trend: "Needs office action", href: "/admin/applications", icon: "pending" },
    { title: "Completed Applications", value: completedApplications, trend: `${failedPayments} failed payments`, href: "/admin/applications", icon: "completed" },
    { title: "Verified Revenue", value: safeCurrency(verifiedRevenue), trend: `${safeCurrency(walletRedeemedTotal)} wallet redeemed`, href: "/admin/applications", icon: "revenue" },
    { title: "Cashback Liability", value: safeCurrency(cashbackLiability), trend: `${safeNumber(quotationCount)} insurance quotes`, href: "/admin/rewards", icon: "quotation" },
  ];

  const staffById = new Map(staff.map((member) => [member.id, member.full_name || member.email || "Staff"]));
  const newApplications: DashboardApplicationRow[] = applications.slice(0, 10).map((application) => ({
    id: application.id,
    customerName: getCustomerName(application),
    mobile: getCustomerMobile(application),
    service: application.service_name,
    status: application.status,
    paymentStatus: application.payment_status ?? application.payments?.[0]?.status ?? "pending",
    assignedStaff: application.assigned_staff_id ? staffById.get(application.assigned_staff_id) ?? "Assigned" : "-",
    date: safeDate(application.created_at),
    href: `/admin/applications/${application.id}`,
  }));

  const recentInsuranceQuotations: DashboardQuotationRow[] = insuranceQuotations.map((quotation) => ({
    id: quotation.id,
    customerName: quotation.customer_name ?? "Customer",
    vehicleNumber: quotation.vehicle_number ?? "-",
    totalAmount: safeCurrency(quotation.total_amount),
    status: quotation.status ?? "draft",
    validTill: safeDate(quotation.valid_till),
    href: "/admin/insurance-quotations",
  }));

  return (
    <AdminDashboard
      todayLabel={formatTodayLabel(new Date())}
      kpis={kpis}
      charts={charts}
      newApplications={newApplications}
      latestCustomers={customerRows.slice(0, 10)}
      recentInsuranceQuotations={recentInsuranceQuotations.slice(0, 10)}
      error={dashboardError}
    />
  );
}
