import { safeDateValue } from "@/lib/admin-format";
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

type CustomerRow = {
  id: string;
  user_id: string | null;
  full_name: string | null;
  mobile: string | null;
  email: string | null;
};

type CustomerProfileRow = {
  id: string;
  full_name: string | null;
  mobile: string | null;
  email: string | null;
};

type AuthUserRow = {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    mobile?: string;
    phone?: string;
  };
};

type WalletRow = {
  user_id: string | null;
  balance?: number | null;
  lifetime_earned?: number | null;
};

type WalletTransactionRow = {
  user_id: string | null;
  direction?: string | null;
  amount?: number | null;
  status?: string | null;
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
  userId: string;
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

function timestamp(value: string | null | undefined) {
  return safeDateValue(value)?.getTime() ?? 0;
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
    safeRangeQuery<ProfileRow>("profiles", (from, to) =>
      supabase.from("profiles").select("id, email, full_name, mobile, role, created_at").eq("role", "customer").order("created_at", { ascending: false }).range(from, to),
    ),
    safeRangeQuery<CustomerRow>("customers", (from, to) =>
      supabase.from("customers").select("id, user_id, full_name, mobile, email").order("created_at", { ascending: false }).range(from, to),
    ),
    safeRangeQuery<CustomerProfileRow>("customer_profiles", (from, to) =>
      supabase.from("customer_profiles").select("id, full_name, mobile, email").order("created_at", { ascending: false }).range(from, to),
    ),
    safeRangeQuery<ApplicationLinkRow>("applications", (from, to) =>
      supabase.from("applications").select("id, customer_id, user_id, status, created_at").order("created_at", { ascending: false }).range(from, to),
    ),
    safeRangeQuery<WalletRow>("reward_wallets", (from, to) => supabase.from("reward_wallets").select("user_id, balance, lifetime_earned").range(from, to)),
    safeRangeQuery<WalletTransactionRow>("wallet_transactions", (from, to) => supabase.from("wallet_transactions").select("user_id, direction, amount, status").range(from, to)),
    safeRangeQuery<ReferralRow>("referral_events", (from, to) => supabase.from("referral_events").select("referrer_user_id").range(from, to)),
    safeAuthUsers(supabase),
  ]);

  const profiles = results[0].status === "fulfilled" ? results[0].value : [];
  const customers = results[1].status === "fulfilled" ? results[1].value : [];
  const customerProfiles = results[2].status === "fulfilled" ? results[2].value : [];
  const applications = results[3].status === "fulfilled" ? results[3].value : [];
  const wallets = results[4].status === "fulfilled" ? results[4].value : [];
  const walletTransactions = results[5].status === "fulfilled" ? results[5].value : [];
  const referrals = results[6].status === "fulfilled" ? results[6].value : [];
  const authUsers = results[7].status === "fulfilled" ? results[7].value : [];

  const customersByUserId = new Map<string, CustomerRow[]>();
  const firstCustomerByUserId = new Map<string, CustomerRow>();
  const customerProfilesByUserId = new Map(customerProfiles.map((profile) => [profile.id, profile]));
  const walletsByUserId = new Map(wallets.filter((wallet) => wallet.user_id).map((wallet) => [String(wallet.user_id), wallet]));
  const authUsersById = new Map(authUsers.map((authUser) => [authUser.id, authUser]));
  const referralCounts = referrals.reduce<Record<string, number>>((grouped, referral) => {
    if (referral.referrer_user_id) grouped[referral.referrer_user_id] = (grouped[referral.referrer_user_id] ?? 0) + 1;
    return grouped;
  }, {});
  const walletCreditSums = walletTransactions.reduce<Record<string, number>>((grouped, transaction) => {
    if (!transaction.user_id || transaction.direction !== "credit") return grouped;
    if (transaction.status && ["reversed", "failed", "cancelled"].includes(transaction.status)) return grouped;
    grouped[transaction.user_id] = (grouped[transaction.user_id] ?? 0) + Number(transaction.amount ?? 0);
    return grouped;
  }, {});

  for (const customer of customers) {
    if (!customer.user_id) continue;
    const group = customersByUserId.get(customer.user_id) ?? [];
    group.push(customer);
    customersByUserId.set(customer.user_id, group);
    if (!firstCustomerByUserId.has(customer.user_id)) {
      firstCustomerByUserId.set(customer.user_id, customer);
    }
  }

  function applicationSummary(profileId: string) {
    const linkedCustomerIds = new Set((customersByUserId.get(profileId) ?? []).map((customer) => customer.id));
    linkedCustomerIds.add(profileId);
    const deduped = Array.from(
      new Map(
        applications
          .filter((application) => application.user_id === profileId || (application.customer_id ? linkedCustomerIds.has(application.customer_id) : false))
          .map((application) => [application.id, application]),
      ).values(),
    ).sort((a, b) => timestamp(b.created_at) - timestamp(a.created_at));

    return {
      count: deduped.length,
      lastStatus: deduped[0]?.status ?? "",
    };
  }

  const rows = profiles.map((profile) => {
    const customer = firstCustomerByUserId.get(profile.id);
    const customerProfile = customerProfilesByUserId.get(profile.id);
    const authUser = authUsersById.get(profile.id);
    const wallet = walletsByUserId.get(profile.id);
    const summary = applicationSummary(profile.id);

    return {
      id: profile.id,
      customerId: customer?.id ?? null,
      userId: profile.id,
      full_name: firstText(profile.full_name, customerProfile?.full_name, customer?.full_name, authUser?.user_metadata?.full_name, authUser?.user_metadata?.name, profile.email),
      mobile: firstText(profile.mobile, customerProfile?.mobile, customer?.mobile, authUser?.user_metadata?.mobile, authUser?.user_metadata?.phone),
      email: profile.email ?? customerProfile?.email ?? customer?.email ?? authUser?.email ?? null,
      role: "customer",
      source: "profile",
      created_at: profile.created_at ?? new Date(0).toISOString(),
      applicationsCount: summary.count,
      lastStatus: summary.lastStatus,
      walletBalance: Number(wallet?.balance ?? 0),
      cashbackBalance: Number(wallet?.lifetime_earned ?? walletCreditSums[profile.id] ?? 0),
      referralCount: referralCounts[profile.id] ?? 0,
      canOpenDetails: Boolean(customer?.id),
    } satisfies AdminCustomerRow;
  }).sort((a, b) => timestamp(b.created_at) - timestamp(a.created_at));

  const stats = {
    totalCustomers: rows.length,
    withApplications: rows.filter((customer) => customer.applicationsCount > 0).length,
    signedUpUsers: rows.length,
  };
  const filteredRows = rows.filter((customer) => {
    if (filter === "with-applications") return customer.applicationsCount > 0;
    return true;
  });

  return {
    rows: filteredRows,
    stats,
    filter,
  };
}
