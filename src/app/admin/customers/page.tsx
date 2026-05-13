import { redirect } from "next/navigation";
import { CalendarDays, Phone, UserRound } from "lucide-react";

import { AdminPageHeader, AdminStatCard } from "@/components/admin/admin-shell";
import { AdminCustomerManager, type AdminCustomerRow } from "@/components/admin/admin-customer-manager";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import type { Application, Customer } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  mobile: string | null;
  role: string | null;
  created_at: string | null;
};

type CustomerProfileRow = {
  id: string;
  full_name: string | null;
  mobile: string | null;
  email: string | null;
  created_at: string | null;
};

type AuthUserRow = {
  id: string;
  email?: string;
  created_at?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    mobile?: string;
    phone?: string;
    role?: string;
  };
};

type WalletRow = {
  user_id: string | null;
  balance?: number | null;
  total_cashback_earned?: number | null;
};

type ReferralRow = {
  referrer_id: string | null;
};

function firstText(...values: Array<string | null | undefined>) {
  return values.map((value) => value?.trim()).find(Boolean) || "";
}

export default async function AdminCustomersPage() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) redirect("/login");
  if (!isAdminRole(role)) redirect("/dashboard");

  const supabase = getSupabaseAdmin();
  let customers: Customer[] = [];
  let applications: Pick<Application, "customer_id" | "status" | "created_at">[] = [];
  let userApplications: Pick<Application, "user_id" | "status" | "created_at">[] = [];
  let profiles: ProfileRow[] = [];
  let customerProfiles: CustomerProfileRow[] = [];
  let authUsers: AuthUserRow[] = [];
  let wallets: WalletRow[] = [];
  let referrals: ReferralRow[] = [];

  if (supabase) {
    try {
      const [customerResult, applicationResult, userApplicationResult, profileResult, customerProfileResult, authUsersResult, walletResult, referralResult] = await Promise.all([
        supabase.from("customers").select("*").order("created_at", { ascending: false }),
        supabase.from("applications").select("customer_id, status, created_at").order("created_at", { ascending: false }),
        supabase.from("applications").select("user_id, status, created_at").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, email, full_name, mobile, role, created_at").order("created_at", { ascending: false }),
        supabase.from("customer_profiles").select("id, full_name, mobile, email, created_at").order("created_at", { ascending: false }),
        supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
        supabase.from("wallets").select("user_id, balance, total_cashback_earned").limit(1000),
        supabase.from("referrals").select("referrer_id").limit(1000),
      ]);

      customers = customerResult.error ? [] : (customerResult.data ?? []) as Customer[];
      applications = applicationResult.error ? [] : (applicationResult.data ?? []) as Pick<Application, "customer_id" | "status" | "created_at">[];
      userApplications = userApplicationResult.error ? [] : (userApplicationResult.data ?? []) as Pick<Application, "user_id" | "status" | "created_at">[];
      profiles = profileResult.error ? [] : (profileResult.data ?? []) as ProfileRow[];
      customerProfiles = customerProfileResult.error ? [] : (customerProfileResult.data ?? []) as CustomerProfileRow[];
      authUsers = authUsersResult.error ? [] : (authUsersResult.data?.users ?? []) as AuthUserRow[];
      wallets = walletResult.error ? [] : (walletResult.data ?? []) as WalletRow[];
      referrals = referralResult.error ? [] : (referralResult.data ?? []) as ReferralRow[];
    } catch (error) {
      console.error("[admin-customers] Failed to load customers", error);
    }
  }

  const rowsByKey = new Map<string, AdminCustomerRow>();
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const customerProfileById = new Map(customerProfiles.map((profile) => [profile.id, profile]));
  const authUserById = new Map(authUsers.map((authUser) => [authUser.id, authUser]));
  const walletByUserId = new Map(wallets.filter((wallet) => wallet.user_id).map((wallet) => [String(wallet.user_id), wallet]));
  const referralCounts = referrals.reduce<Record<string, number>>((grouped, referral) => {
    if (referral.referrer_id) grouped[referral.referrer_id] = (grouped[referral.referrer_id] ?? 0) + 1;
    return grouped;
  }, {});

  function applicationSummary(customerId: string | null, userId: string | null) {
    const matchedApplications = [
      ...applications.filter((application) => customerId && application.customer_id === customerId),
      ...userApplications.filter((application) => userId && application.user_id === userId),
    ];
    const seen = new Set<string>();
    const dedupedApplications = matchedApplications.filter((application) => {
      const key = `${application.created_at}-${application.status}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return {
      count: dedupedApplications.length,
      lastStatus: dedupedApplications[0]?.status ?? "",
    };
  }

  function upsertRow(row: AdminCustomerRow) {
    const key = row.userId ?? row.customerId ?? row.id;
    const existing = rowsByKey.get(key);

    if (!existing) {
      rowsByKey.set(key, row);
      return;
    }

    rowsByKey.set(key, {
      ...existing,
      ...row,
      customerId: existing.customerId ?? row.customerId,
      canOpenDetails: existing.canOpenDetails || row.canOpenDetails,
      full_name: firstText(existing.full_name, row.full_name),
      mobile: firstText(existing.mobile, row.mobile),
      email: firstText(existing.email, row.email),
      role: firstText(row.role, existing.role, "customer"),
      applicationsCount: Math.max(existing.applicationsCount, row.applicationsCount),
      lastStatus: firstText(row.lastStatus, existing.lastStatus),
      walletBalance: Math.max(existing.walletBalance, row.walletBalance),
      cashbackBalance: Math.max(existing.cashbackBalance, row.cashbackBalance),
      referralCount: Math.max(existing.referralCount, row.referralCount),
    });
  }

  customers.forEach((customer) => {
    const profile = customer.user_id ? profileById.get(customer.user_id) : null;
    const customerProfile = customer.user_id ? customerProfileById.get(customer.user_id) : null;
    const authUser = customer.user_id ? authUserById.get(customer.user_id) : null;
    const summary = applicationSummary(customer.id, customer.user_id);
    const wallet = customer.user_id ? walletByUserId.get(customer.user_id) : null;

    upsertRow({
      id: customer.user_id ?? customer.id,
      customerId: customer.id,
      userId: customer.user_id,
      full_name: firstText(customer.full_name, customerProfile?.full_name, profile?.full_name, authUser?.user_metadata?.full_name, authUser?.user_metadata?.name),
      mobile: firstText(customer.mobile, customerProfile?.mobile, profile?.mobile, authUser?.user_metadata?.mobile, authUser?.user_metadata?.phone),
      email: firstText(customer.email, customerProfile?.email, profile?.email, authUser?.email),
      role: firstText(profile?.role, authUser?.user_metadata?.role, "customer"),
      source: customer.source,
      created_at: customer.created_at,
      applicationsCount: summary.count,
      lastStatus: summary.lastStatus,
      walletBalance: Number(wallet?.balance ?? 0),
      cashbackBalance: Number(wallet?.total_cashback_earned ?? 0),
      referralCount: customer.user_id ? referralCounts[customer.user_id] ?? 0 : 0,
      canOpenDetails: true,
    });
  });

  profiles.forEach((profile) => {
    const customerProfile = customerProfileById.get(profile.id);
    const authUser = authUserById.get(profile.id);
    const summary = applicationSummary(null, profile.id);
    const wallet = walletByUserId.get(profile.id);

    upsertRow({
      id: profile.id,
      customerId: null,
      userId: profile.id,
      full_name: firstText(customerProfile?.full_name, profile.full_name, authUser?.user_metadata?.full_name, authUser?.user_metadata?.name),
      mobile: firstText(customerProfile?.mobile, profile.mobile, authUser?.user_metadata?.mobile, authUser?.user_metadata?.phone),
      email: firstText(customerProfile?.email, profile.email, authUser?.email),
      role: firstText(profile.role, authUser?.user_metadata?.role, "customer"),
      source: "profile",
      created_at: profile.created_at ?? authUser?.created_at ?? new Date(0).toISOString(),
      applicationsCount: summary.count,
      lastStatus: summary.lastStatus,
      walletBalance: Number(wallet?.balance ?? 0),
      cashbackBalance: Number(wallet?.total_cashback_earned ?? 0),
      referralCount: referralCounts[profile.id] ?? 0,
      canOpenDetails: false,
    });
  });

  authUsers.forEach((authUser) => {
    const profile = profileById.get(authUser.id);
    const customerProfile = customerProfileById.get(authUser.id);
    const summary = applicationSummary(null, authUser.id);
    const wallet = walletByUserId.get(authUser.id);

    upsertRow({
      id: authUser.id,
      customerId: null,
      userId: authUser.id,
      full_name: firstText(customerProfile?.full_name, profile?.full_name, authUser.user_metadata?.full_name, authUser.user_metadata?.name),
      mobile: firstText(customerProfile?.mobile, profile?.mobile, authUser.user_metadata?.mobile, authUser.user_metadata?.phone),
      email: firstText(customerProfile?.email, profile?.email, authUser.email),
      role: firstText(profile?.role, authUser.user_metadata?.role, "customer"),
      source: "auth",
      created_at: authUser.created_at ?? profile?.created_at ?? customerProfile?.created_at ?? new Date(0).toISOString(),
      applicationsCount: summary.count,
      lastStatus: summary.lastStatus,
      walletBalance: Number(wallet?.balance ?? 0),
      cashbackBalance: Number(wallet?.total_cashback_earned ?? 0),
      referralCount: referralCounts[authUser.id] ?? 0,
      canOpenDetails: false,
    });
  });

  const rows = Array.from(rowsByKey.values()).sort((a, b) => (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader eyebrow="Customers" title="Customers" description="Registered users and manually added customers in one CRM list." />
      <section className="grid gap-3 sm:grid-cols-3">
        <AdminStatCard title="Total Users" value={rows.length} icon={UserRound} tone="blue" />
        <AdminStatCard title="With Applications" value={rows.filter((customer) => customer.applicationsCount > 0).length} icon={CalendarDays} tone="green" />
        <AdminStatCard title="Signed Up Users" value={rows.filter((customer) => customer.userId).length} icon={Phone} tone="orange" />
      </section>
      <AdminCustomerManager customers={rows} />
    </div>
  );
}
