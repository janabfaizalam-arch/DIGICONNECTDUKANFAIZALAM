import { safeDateValue } from "@/lib/admin-format";
import type { Customer } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const PAGE_SIZE = 500;
const AUTH_PAGE_SIZE = 100;
const MAX_AUTH_PAGES = 100;

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
  lifetime_earned?: number | null;
};

type ReferralRow = {
  referrer_user_id: string | null;
};

type ApplicationLinkRow = {
  id: string;
  customer_id: string | null;
  user_id: string | null;
  status: string | null;
  created_at: string;
};

export type AdminCustomerFilter = "all" | "with-applications" | "signed-up";

export type AdminCustomerRow = {
  id: string;
  customerId: string | null;
  userId: string | null;
  full_name: string;
  mobile: string;
  email: string | null;
  role: string;
  source: string;
  created_at: string;
  applicationsCount: number;
  lastStatus: string;
  walletBalance: number;
  cashbackBalance: number;
  referralCount: number;
  canOpenDetails: boolean;
};

export type AdminCustomersResult = {
  rows: AdminCustomerRow[];
  stats: {
    totalCustomers: number;
    withApplications: number;
    signedUpUsers: number;
  };
  filter: AdminCustomerFilter;
};

function firstText(...values: Array<string | null | undefined>) {
  return values.map((value) => value?.trim()).find(Boolean) || "";
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizeEmail(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeMobile(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

function timestamp(value: string | null | undefined) {
  return safeDateValue(value)?.getTime() ?? 0;
}

function isCustomerLike(profileRole?: string | null, metadataRole?: string | null) {
  const role = String(profileRole || metadataRole || "customer").toLowerCase();
  return !["super_admin", "admin", "agent", "staff"].includes(role);
}

function normalizeFilter(value: string | string[] | null | undefined): AdminCustomerFilter {
  const filter = Array.isArray(value) ? value[0] : value;
  return filter === "with-applications" || filter === "signed-up" ? filter : "all";
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

      const pageUsers = (result.data?.users ?? []) as AuthUserRow[];
      users.push(...pageUsers);

      if (pageUsers.length < AUTH_PAGE_SIZE) break;
    }
  } catch (error) {
    console.error("[admin-customers] auth users query threw", error);
  }

  return users;
}

function getRowKeys(row: Pick<AdminCustomerRow, "userId" | "customerId" | "email" | "mobile" | "id">) {
  const email = normalizeEmail(row.email);
  const mobile = normalizeMobile(row.mobile);

  return [
    row.userId ? `user:${row.userId}` : "",
    email ? `email:${email}` : "",
    mobile ? `mobile:${mobile}` : "",
    row.customerId ? `customer:${row.customerId}` : "",
    `id:${row.id}`,
  ].filter(Boolean);
}

function mergeRows(existing: AdminCustomerRow, row: AdminCustomerRow): AdminCustomerRow {
  return {
    ...existing,
    ...row,
    customerId: existing.customerId ?? row.customerId,
    userId: existing.userId ?? row.userId,
    canOpenDetails: existing.canOpenDetails || row.canOpenDetails,
    full_name: firstText(existing.full_name, row.full_name),
    mobile: firstText(existing.mobile, row.mobile),
    email: firstText(existing.email, row.email),
    role: firstText(row.role, existing.role, "customer"),
    source: firstText(existing.source, row.source, "profile"),
    created_at: timestamp(row.created_at) > timestamp(existing.created_at) ? row.created_at : existing.created_at,
    applicationsCount: Math.max(existing.applicationsCount, row.applicationsCount),
    lastStatus: firstText(row.lastStatus, existing.lastStatus),
    walletBalance: Math.max(existing.walletBalance, row.walletBalance),
    cashbackBalance: Math.max(existing.cashbackBalance, row.cashbackBalance),
    referralCount: Math.max(existing.referralCount, row.referralCount),
  };
}

export async function getAdminCustomers(input: { filter?: string | string[] | null | undefined } = {}): Promise<AdminCustomersResult> {
  const supabase = getSupabaseAdmin();
  const filter = normalizeFilter(input.filter);

  if (!supabase) {
    return {
      rows: [],
      stats: { totalCustomers: 0, withApplications: 0, signedUpUsers: 0 },
      filter,
    };
  }

  const results = await Promise.allSettled([
    safeRangeQuery<Customer>("customers", (from, to) => supabase.from("customers").select("*").order("created_at", { ascending: false }).range(from, to)),
    safeRangeQuery<ApplicationLinkRow>("applications", (from, to) =>
      supabase.from("applications").select("id, customer_id, user_id, status, created_at").order("created_at", { ascending: false }).range(from, to),
    ),
    safeRangeQuery<ProfileRow>("profiles", (from, to) =>
      supabase.from("profiles").select("id, email, full_name, mobile, role, created_at").order("created_at", { ascending: false }).range(from, to),
    ),
    safeRangeQuery<CustomerProfileRow>("customer_profiles", (from, to) =>
      supabase.from("customer_profiles").select("id, full_name, mobile, email, created_at").order("created_at", { ascending: false }).range(from, to),
    ),
    safeAuthUsers(supabase),
    safeRangeQuery<WalletRow>("reward_wallets", (from, to) => supabase.from("reward_wallets").select("user_id, balance, lifetime_earned").range(from, to)),
    safeRangeQuery<ReferralRow>("referral_events", (from, to) => supabase.from("referral_events").select("referrer_user_id").range(from, to)),
  ]);

  const customers = results[0].status === "fulfilled" ? results[0].value : [];
  const applicationLinks = results[1].status === "fulfilled" ? results[1].value : [];
  const profiles = results[2].status === "fulfilled" ? results[2].value : [];
  const customerProfiles = results[3].status === "fulfilled" ? results[3].value : [];
  const authUsers = results[4].status === "fulfilled" ? results[4].value : [];
  const wallets = results[5].status === "fulfilled" ? results[5].value : [];
  const referrals = results[6].status === "fulfilled" ? results[6].value : [];

  const rowsByKey = new Map<string, AdminCustomerRow>();
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const customerProfileById = new Map(customerProfiles.map((profile) => [profile.id, profile]));
  const authUserById = new Map(authUsers.map((authUser) => [authUser.id, authUser]));
  const walletByUserId = new Map(wallets.filter((wallet) => wallet.user_id).map((wallet) => [String(wallet.user_id), wallet]));
  const referralCounts = referrals.reduce<Record<string, number>>((grouped, referral) => {
    if (referral.referrer_user_id) grouped[referral.referrer_user_id] = (grouped[referral.referrer_user_id] ?? 0) + 1;
    return grouped;
  }, {});
  const applicationsByCustomerId = new Map<string, ApplicationLinkRow[]>();
  const applicationsByUserId = new Map<string, ApplicationLinkRow[]>();

  for (const application of applicationLinks) {
    if (application.customer_id) {
      const group = applicationsByCustomerId.get(application.customer_id) ?? [];
      group.push(application);
      applicationsByCustomerId.set(application.customer_id, group);
    }

    if (application.user_id) {
      const group = applicationsByUserId.get(application.user_id) ?? [];
      group.push(application);
      applicationsByUserId.set(application.user_id, group);
    }
  }

  function applicationSummary(customerId: string | null, userId: string | null) {
    const matchedApplications = [
      ...(customerId ? applicationsByCustomerId.get(customerId) ?? [] : []),
      ...(userId ? applicationsByUserId.get(userId) ?? [] : []),
    ];
    const deduped = Array.from(new Map(matchedApplications.map((application) => [application.id, application])).values())
      .sort((a, b) => timestamp(b.created_at) - timestamp(a.created_at));

    return {
      count: deduped.length,
      lastStatus: deduped[0]?.status ?? "",
    };
  }

  function upsertRow(row: AdminCustomerRow) {
    const keys = getRowKeys(row);
    const existingKey = keys.find((key) => rowsByKey.has(key));
    const merged = existingKey ? mergeRows(rowsByKey.get(existingKey)!, row) : row;

    for (const key of keys) {
      rowsByKey.set(key, merged);
    }
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
      cashbackBalance: Number(wallet?.lifetime_earned ?? 0),
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
      cashbackBalance: Number(wallet?.lifetime_earned ?? 0),
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
      cashbackBalance: Number(wallet?.lifetime_earned ?? 0),
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
      cashbackBalance: Number(wallet?.lifetime_earned ?? 0),
      referralCount: referralCounts[customerProfile.id] ?? 0,
      canOpenDetails: false,
    });
  });

  const rows = Array.from(new Set(rowsByKey.values())).sort((a, b) => timestamp(b.created_at) - timestamp(a.created_at));
  const stats = {
    totalCustomers: rows.length,
    withApplications: rows.filter((customer) => customer.applicationsCount > 0).length,
    signedUpUsers: rows.filter((customer) => customer.userId).length,
  };
  const filteredRows = rows.filter((customer) => {
    if (filter === "with-applications") return customer.applicationsCount > 0;
    if (filter === "signed-up") return Boolean(customer.userId);
    return true;
  });

  return {
    rows: filteredRows,
    stats,
    filter,
  };
}
