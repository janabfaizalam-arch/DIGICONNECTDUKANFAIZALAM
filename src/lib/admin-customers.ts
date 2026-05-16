import { safeDateValue } from "@/lib/admin-format";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveUserWalletFacts } from "@/lib/wallet-resolver";

const PAGE_SIZE = 500;
const AUTH_PAGE_SIZE = 100;
const MAX_AUTH_PAGES = 100;

type ProfileRow = {
  id: string;
  user_id?: string | null;
  email: string | null;
  full_name: string | null;
  name?: string | null;
  mobile: string | null;
  phone?: string | null;
  mobile_number?: string | null;
  role: string | null;
  created_at: string | null;
};

type CustomerRow = {
  id: string;
  user_id: string | null;
  full_name: string | null;
  mobile: string | null;
  phone?: string | null;
  mobile_number?: string | null;
  email: string | null;
};

type CustomerProfileRow = {
  id: string;
  user_id?: string | null;
  full_name: string | null;
  mobile: string | null;
  phone?: string | null;
  mobile_number?: string | null;
  email: string | null;
};

type AuthUserRow = {
  id: string;
  email?: string;
  phone?: string | null;
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

type ReferralRow = {
  referrer_user_id: string | null;
  referred_user_id?: string | null;
  referrer_id?: string | null;
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
  debug?: {
    profileId: string;
    possibleIds: string[];
    matchedWalletUserId: string | null;
    matchedCustomerId: string | null;
    matchedReferralCount: number;
  };
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

function normalizeMobile(value: string | null | undefined) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.length > 10 ? digits.slice(-10) : digits;
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

async function safeRpc<T>(label: string, run: () => PromiseLike<{ data: unknown; error: { message?: string } | null }>) {
  try {
    const result = await run();
    if (result.error) {
      console.error(`[admin-customers] ${label} rpc failed`, result.error.message ?? result.error);
      return null;
    }
    return result.data as T;
  } catch (error) {
    console.error(`[admin-customers] ${label} rpc threw`, error);
    return null;
  }
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
      supabase.from("profiles").select("*").eq("role", "customer").order("created_at", { ascending: false }).range(from, to),
    ),
    safeRangeQuery<CustomerRow>("customers", (from, to) =>
      supabase.from("customers").select("*").order("created_at", { ascending: false }).range(from, to),
    ),
    safeRangeQuery<CustomerProfileRow>("customer_profiles", (from, to) =>
      supabase.from("customer_profiles").select("*").order("created_at", { ascending: false }).range(from, to),
    ),
    safeRangeQuery<ApplicationLinkRow>("applications", (from, to) =>
      supabase.from("applications").select("id, customer_id, user_id, status, created_at").order("created_at", { ascending: false }).range(from, to),
    ),
    safeRangeQuery<WalletRow>("reward_wallets", (from, to) => supabase.from("reward_wallets").select("user_id, balance, lifetime_earned").range(from, to)),
    safeRangeQuery<ReferralRow>("referral_events", (from, to) => supabase.from("referral_events").select("referrer_user_id").range(from, to)),
    safeRangeQuery<ReferralRow>("referrals", (from, to) => supabase.from("referrals").select("*").range(from, to)),
    safeAuthUsers(supabase),
  ]);

  const profiles = results[0].status === "fulfilled" ? results[0].value : [];
  const customers = results[1].status === "fulfilled" ? results[1].value : [];
  const customerProfiles = results[2].status === "fulfilled" ? results[2].value : [];
  const applications = results[3].status === "fulfilled" ? results[3].value : [];
  const wallets = results[4].status === "fulfilled" ? results[4].value : [];
  const referrals = results[5].status === "fulfilled" ? results[5].value : [];
  const legacyReferrals = results[6].status === "fulfilled" ? results[6].value : [];
  const authUsers = results[7].status === "fulfilled" ? results[7].value : [];
  const walletRpcRows = await Promise.all(
    profiles.map((profile) =>
      safeRpc<WalletRow>("create_reward_wallet_if_missing", () => supabase.rpc("create_reward_wallet_if_missing", { p_user_id: profile.id })),
    ),
  );

  const customersByUserId = new Map<string, CustomerRow[]>();
  const customersById = new Map(customers.map((customer) => [customer.id, customer]));
  const customerProfilesByUserId = new Map(customerProfiles.map((profile) => [profile.id, profile]));
  const walletsByUserId = new Map(wallets.filter((wallet) => wallet.user_id).map((wallet) => [String(wallet.user_id), wallet]));
  for (const wallet of walletRpcRows) {
    if (wallet?.user_id) walletsByUserId.set(String(wallet.user_id), wallet);
  }
  const authUsersById = new Map(authUsers.map((authUser) => [authUser.id, authUser]));
  const referralCounts = referrals.reduce<Record<string, number>>((grouped, referral) => {
    if (referral.referrer_user_id) grouped[referral.referrer_user_id] = (grouped[referral.referrer_user_id] ?? 0) + 1;
    return grouped;
  }, {});
  for (const referral of legacyReferrals) {
    const referrerId = referral.referrer_user_id ?? referral.referrer_id;
    if (referrerId) referralCounts[referrerId] = (referralCounts[referrerId] ?? 0) + 1;
  }
  for (const customer of customers) {
    if (!customer.user_id) continue;
    const group = customersByUserId.get(customer.user_id) ?? [];
    group.push(customer);
    customersByUserId.set(customer.user_id, group);
  }

  function getPossibleIds(profileId: string) {
    const linkedCustomerIds = new Set<string>();
    const possibleIds = new Set<string>([profileId]);
    const profile = profiles.find((row) => row.id === profileId);
    if (profile?.user_id) possibleIds.add(profile.user_id);

    for (const customer of customersByUserId.get(profileId) ?? []) {
      linkedCustomerIds.add(customer.id);
      possibleIds.add(customer.id);
    }

    const customerProfile = customerProfilesByUserId.get(profileId);
    if (customerProfile?.id) {
      possibleIds.add(customerProfile.id);
    }
    if (customerProfile?.user_id) possibleIds.add(customerProfile.user_id);

    for (const application of applications) {
      if (application.user_id === profileId && application.customer_id) {
        linkedCustomerIds.add(application.customer_id);
        possibleIds.add(application.customer_id);
      }
    }

    return {
      possibleIds,
      linkedCustomerIds,
    };
  }

  function pickFirstByPossibleId<T extends { user_id: string | null }>(rowsById: Map<string, T>, possibleIds: Set<string>) {
    for (const id of possibleIds) {
      const row = rowsById.get(id);
      if (row) return row;
    }

    return null;
  }

  function sumByPossibleId(values: Record<string, number>, possibleIds: Set<string>) {
    let total = 0;
    for (const id of possibleIds) {
      total += values[id] ?? 0;
    }
    return total;
  }

  function applicationSummary(possibleIds: Set<string>, linkedCustomerIds: Set<string>) {
    const deduped = Array.from(
      new Map(
        applications
          .filter((application) =>
            (application.user_id ? possibleIds.has(application.user_id) : false) ||
            (application.customer_id ? linkedCustomerIds.has(application.customer_id) || possibleIds.has(application.customer_id) : false),
          )
          .map((application) => [application.id, application]),
      ).values(),
    ).sort((a, b) => timestamp(b.created_at) - timestamp(a.created_at));

    return {
      count: deduped.length,
      lastStatus: deduped[0]?.status ?? "",
    };
  }

  const rows = await Promise.all(profiles.map(async (profile) => {
    const { possibleIds, linkedCustomerIds } = getPossibleIds(profile.id);
    const customer = (customersByUserId.get(profile.id) ?? [])[0] ?? Array.from(linkedCustomerIds).map((id) => customersById.get(id)).find(Boolean) ?? null;
    const customerProfile = customerProfilesByUserId.get(profile.id);
    const authUser = authUsersById.get(profile.id);
    const wallet = pickFirstByPossibleId(walletsByUserId, possibleIds);
    const summary = applicationSummary(possibleIds, linkedCustomerIds);
    const walletFacts = await resolveUserWalletFacts({
      userIds: Array.from(possibleIds),
      customerIds: Array.from(linkedCustomerIds),
    });
    const referralCount = walletFacts.referralsCount || sumByPossibleId(referralCounts, possibleIds);
    const mobile = normalizeMobile(firstText(authUser?.phone, profile.mobile, profile.phone, profile.mobile_number, customer?.mobile, customer?.phone, customer?.mobile_number, customerProfile?.mobile, customerProfile?.phone, customerProfile?.mobile_number, authUser?.user_metadata?.mobile, authUser?.user_metadata?.phone));

    if (process.env.NODE_ENV === "development") {
      console.info("[admin-customers] user fact mapping", {
        profileId: profile.id,
        possibleIds: Array.from(possibleIds),
        matchedWalletUserId: wallet?.user_id ?? null,
        matchedCustomerId: customer?.id ?? null,
        matchedReferralCount: referralCount,
        walletSourceUsed: walletFacts.sourceUsed,
      });
    }

    return {
      id: profile.id,
      customerId: customer?.id ?? null,
      userId: profile.id,
      full_name: firstText(profile.full_name, profile.name, customerProfile?.full_name, customer?.full_name, authUser?.user_metadata?.full_name, authUser?.user_metadata?.name, profile.email),
      mobile,
      email: profile.email ?? customerProfile?.email ?? customer?.email ?? authUser?.email ?? null,
      role: "customer",
      source: "profile",
      created_at: profile.created_at ?? new Date(0).toISOString(),
      applicationsCount: summary.count,
      lastStatus: summary.lastStatus,
      walletBalance: walletFacts.walletBalance,
      cashbackBalance: walletFacts.cashbackEarned,
      referralCount,
      canOpenDetails: Boolean(customer?.id),
      debug: {
        profileId: profile.id,
        possibleIds: Array.from(possibleIds),
        matchedWalletUserId: wallet?.user_id ?? null,
        matchedCustomerId: customer?.id ?? null,
        matchedReferralCount: referralCount,
      },
    } satisfies AdminCustomerRow;
  })).then((items) => items.sort((a, b) => timestamp(b.created_at) - timestamp(a.created_at)));

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
