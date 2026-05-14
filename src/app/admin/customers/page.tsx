import { redirect } from "next/navigation";

import { AdminPageHeader, AdminStatCard } from "@/components/admin/admin-shell";
import { AdminCustomerManager, type AdminCustomerRow } from "@/components/admin/admin-customer-manager";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { safeDateValue } from "@/lib/admin-format";
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

const PAGE_SIZE = 500;
const AUTH_PAGE_SIZE = 100;
const MAX_AUTH_PAGES = 100;

function firstText(...values: Array<string | null | undefined>) {
  return values.map((value) => value?.trim()).find(Boolean) || "";
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

async function safeRangeQuery<T>(
  label: string,
  run: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message?: string } | null }>,
) {
  const rows: T[] = [];

  try {
    for (let from = 0; ; from += PAGE_SIZE) {
      const to = from + PAGE_SIZE - 1;
      const result = await run(from, to);

      if (result.error) {
        console.error(`[admin-customers] ${label} query failed`, result.error.message ?? result.error);
        break;
      }

      const page = asArray<T>(result.data);
      rows.push(...page);

      if (page.length < PAGE_SIZE) break;
    }
  } catch (error) {
    console.error(`[admin-customers] ${label} query threw`, error);
  }

  return rows;
}

async function safeAuthUsers(supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>) {
  const users: AuthUserRow[] = [];

  try {
    for (let page = 1; page <= MAX_AUTH_PAGES; page += 1) {
      const result = await supabase.auth.admin.listUsers({ page, perPage: AUTH_PAGE_SIZE });

      if (result.error) {
        console.error("[admin-customers] auth users query failed", result.error.message);
        break;
      }

      const pageUsers = ((result.data?.users ?? []) as AuthUserRow[]);
      users.push(...pageUsers);

      if (pageUsers.length < AUTH_PAGE_SIZE) break;
    }
  } catch (error) {
    console.error("[admin-customers] auth users query threw", error);
  }

  return users;
}

function isCustomerLike(profileRole?: string | null, metadataRole?: string | null) {
  const role = String(profileRole || metadataRole || "customer").toLowerCase();
  return !["super_admin", "admin", "agent", "staff"].includes(role);
}

function timestamp(value: string | null | undefined) {
  return safeDateValue(value)?.getTime() ?? 0;
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
    const results = await Promise.allSettled([
      safeRangeQuery<Customer>("customers", (from, to) => supabase.from("customers").select("*").order("created_at", { ascending: false }).range(from, to)),
      safeRangeQuery<Pick<Application, "customer_id" | "status" | "created_at">>("application customer links", (from, to) =>
        supabase.from("applications").select("customer_id, status, created_at").order("created_at", { ascending: false }).range(from, to),
      ),
      safeRangeQuery<Pick<Application, "user_id" | "status" | "created_at">>("application user links", (from, to) =>
        supabase.from("applications").select("user_id, status, created_at").order("created_at", { ascending: false }).range(from, to),
      ),
      safeRangeQuery<ProfileRow>("profiles", (from, to) =>
        supabase.from("profiles").select("id, email, full_name, mobile, role, created_at").order("created_at", { ascending: false }).range(from, to),
      ),
      safeRangeQuery<CustomerProfileRow>("customer_profiles", (from, to) =>
        supabase.from("customer_profiles").select("id, full_name, mobile, email, created_at").order("created_at", { ascending: false }).range(from, to),
      ),
      safeAuthUsers(supabase),
      safeRangeQuery<WalletRow>("wallets", (from, to) => supabase.from("wallets").select("user_id, balance, total_cashback_earned").range(from, to)),
      safeRangeQuery<ReferralRow>("referrals", (from, to) => supabase.from("referrals").select("referrer_id").range(from, to)),
    ]);

    customers = results[0].status === "fulfilled" ? results[0].value : [];
    applications = results[1].status === "fulfilled" ? results[1].value : [];
    userApplications = results[2].status === "fulfilled" ? results[2].value : [];
    profiles = results[3].status === "fulfilled" ? results[3].value : [];
    customerProfiles = results[4].status === "fulfilled" ? results[4].value : [];
    authUsers = results[5].status === "fulfilled" ? results[5].value : [];
    wallets = results[6].status === "fulfilled" ? results[6].value : [];
    referrals = results[7].status === "fulfilled" ? results[7].value : [];
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
      userId: existing.userId ?? row.userId,
      canOpenDetails: existing.canOpenDetails || row.canOpenDetails,
      full_name: firstText(existing.full_name, row.full_name),
      mobile: firstText(existing.mobile, row.mobile),
      email: firstText(existing.email, row.email),
      role: firstText(row.role, existing.role, "customer"),
      source: firstText(row.source, existing.source, "profile"),
      created_at: timestamp(row.created_at) > timestamp(existing.created_at) ? row.created_at : existing.created_at,
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
    if (!isCustomerLike(profile.role, authUser?.user_metadata?.role)) return;
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
    if (!isCustomerLike(profile?.role, authUser.user_metadata?.role)) return;
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

  customerProfiles.forEach((customerProfile) => {
    const profile = profileById.get(customerProfile.id);
    const authUser = authUserById.get(customerProfile.id);
    if (!isCustomerLike(profile?.role, authUser?.user_metadata?.role)) return;
    const summary = applicationSummary(null, customerProfile.id);
    const wallet = walletByUserId.get(customerProfile.id);

    upsertRow({
      id: customerProfile.id,
      customerId: null,
      userId: customerProfile.id,
      full_name: firstText(customerProfile.full_name, profile?.full_name, authUser?.user_metadata?.full_name, authUser?.user_metadata?.name),
      mobile: firstText(customerProfile.mobile, profile?.mobile, authUser?.user_metadata?.mobile, authUser?.user_metadata?.phone),
      email: firstText(customerProfile.email, profile?.email, authUser?.email),
      role: firstText(profile?.role, authUser?.user_metadata?.role, "customer"),
      source: "customer_profile",
      created_at: customerProfile.created_at ?? profile?.created_at ?? authUser?.created_at ?? new Date(0).toISOString(),
      applicationsCount: summary.count,
      lastStatus: summary.lastStatus,
      walletBalance: Number(wallet?.balance ?? 0),
      cashbackBalance: Number(wallet?.total_cashback_earned ?? 0),
      referralCount: referralCounts[customerProfile.id] ?? 0,
      canOpenDetails: false,
    });
  });

  const rows = Array.from(rowsByKey.values()).sort((a, b) => timestamp(b.created_at) - timestamp(a.created_at));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader eyebrow="Customers" title="Customers" description="Registered users and manually added customers in one CRM list." />
      <section className="grid gap-3 sm:grid-cols-3">
        <AdminStatCard title="Total Customers" value={rows.length} icon="users" tone="blue" />
        <AdminStatCard title="With Applications" value={rows.filter((customer) => customer.applicationsCount > 0).length} icon="calendarDays" tone="green" />
        <AdminStatCard title="Signed Up Users" value={rows.filter((customer) => customer.userId).length} icon="phone" tone="orange" />
      </section>
      <AdminCustomerManager customers={rows} />
    </div>
  );
}
