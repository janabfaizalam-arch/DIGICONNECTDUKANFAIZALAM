import { DPR_SERVICE_SLUG } from "@/lib/dpr/constants";
import { extractDprFormPayload } from "@/lib/dpr/form-data";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type DprAnalyticsRow = {
  id: string;
  customerName: string;
  partnerName: string;
  partnerCode: string;
  amount: number;
  status: string;
  paymentStatus: string;
  scheme: string;
  plan: string;
  state: string;
  createdAt: string;
};

export type DprAnalyticsSummary = {
  todayCount: number;
  todayRevenue: number;
  totalCount: number;
  totalRevenue: number;
  paidCount: number;
  conversionRate: number;
  byScheme: Array<{ scheme: string; count: number; revenue: number }>;
  byState: Array<{ state: string; count: number; revenue: number }>;
  byPartner: Array<{ partner: string; count: number; revenue: number }>;
  rows: DprAnalyticsRow[];
};

function startOfTodayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function getDprAnalytics(limit = 500): Promise<DprAnalyticsSummary> {
  const empty: DprAnalyticsSummary = {
    todayCount: 0,
    todayRevenue: 0,
    totalCount: 0,
    totalRevenue: 0,
    paidCount: 0,
    conversionRate: 0,
    byScheme: [],
    byState: [],
    byPartner: [],
    rows: [],
  };

  const supabase = getSupabaseAdmin();
  if (!supabase) return empty;

  const { data, error } = await supabase
    .from("applications")
    .select(
      "id, customer_name, amount, status, payment_status, form_data, created_at, agency_partner_id, service_slug, service_name",
    )
    .eq("service_slug", DPR_SERVICE_SLUG)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error("[dpr-analytics]", error?.message);
    return empty;
  }

  const partnerIds = [
    ...new Set(
      data
        .map((row) => row.agency_partner_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const partnerMap = new Map<string, { name: string; code: string }>();
  if (partnerIds.length) {
    const { data: partners } = await supabase
      .from("agency_partners")
      .select("id, full_name, partner_code")
      .in("id", partnerIds);
    for (const p of partners ?? []) {
      partnerMap.set(String(p.id), {
        name: String(p.full_name ?? "Partner"),
        code: String(p.partner_code ?? ""),
      });
    }
  }

  const todayIso = startOfTodayIso();
  const schemeMap = new Map<string, { count: number; revenue: number }>();
  const stateMap = new Map<string, { count: number; revenue: number }>();
  const partnerAgg = new Map<string, { count: number; revenue: number }>();

  let todayCount = 0;
  let todayRevenue = 0;
  let totalRevenue = 0;
  let paidCount = 0;

  const rows: DprAnalyticsRow[] = data.map((row) => {
    const form = extractDprFormPayload(row.form_data);
    const amount = Number(row.amount ?? 0) || 0;
    const partner = row.agency_partner_id
      ? partnerMap.get(String(row.agency_partner_id))
      : null;
    const scheme = form.project.scheme ? String(form.project.scheme) : "Unspecified";
    const state =
      String(form.personal.state ?? form.business.state ?? "").trim() ||
      "Unspecified";
    const paymentStatus = String(row.payment_status ?? "pending");
    const isPaid = ["paid", "verified", "success", "captured"].includes(paymentStatus.toLowerCase());

    totalRevenue += amount;
    if (isPaid) paidCount += 1;
    if (String(row.created_at) >= todayIso) {
      todayCount += 1;
      todayRevenue += amount;
    }

    const schemeHit = schemeMap.get(scheme) ?? { count: 0, revenue: 0 };
    schemeHit.count += 1;
    schemeHit.revenue += amount;
    schemeMap.set(scheme, schemeHit);

    const stateHit = stateMap.get(state) ?? { count: 0, revenue: 0 };
    stateHit.count += 1;
    stateHit.revenue += amount;
    stateMap.set(state, stateHit);

    const partnerLabel = partner?.name ?? "Direct / Customer";
    const partnerHit = partnerAgg.get(partnerLabel) ?? { count: 0, revenue: 0 };
    partnerHit.count += 1;
    partnerHit.revenue += amount;
    partnerAgg.set(partnerLabel, partnerHit);

    return {
      id: String(row.id),
      customerName: String(row.customer_name ?? form.personal.fullName ?? form.personal.name ?? "—"),
      partnerName: partner?.name ?? "—",
      partnerCode: partner?.code ?? "",
      amount,
      status: String(row.status ?? ""),
      paymentStatus,
      scheme,
      plan: form.plan || "basic",
      state,
      createdAt: String(row.created_at ?? ""),
    };
  });

  const toSorted = (map: Map<string, { count: number; revenue: number }>, keyName: "scheme" | "state" | "partner") =>
    [...map.entries()]
      .map(([key, value]) => ({ [keyName]: key, ...value }) as never)
      .sort((a: { count: number }, b: { count: number }) => b.count - a.count);

  return {
    todayCount,
    todayRevenue,
    totalCount: rows.length,
    totalRevenue,
    paidCount,
    conversionRate: rows.length ? Math.round((paidCount / rows.length) * 1000) / 10 : 0,
    byScheme: toSorted(schemeMap, "scheme") as Array<{ scheme: string; count: number; revenue: number }>,
    byState: toSorted(stateMap, "state") as Array<{ state: string; count: number; revenue: number }>,
    byPartner: toSorted(partnerAgg, "partner") as Array<{ partner: string; count: number; revenue: number }>,
    rows,
  };
}

export function dprRowsToCsv(rows: DprAnalyticsRow[]) {
  const headers = [
    "Application ID",
    "Customer",
    "Partner",
    "Partner Code",
    "Scheme",
    "Plan",
    "State",
    "Amount",
    "Status",
    "Payment Status",
    "Created At",
  ];
  const escape = (value: string | number) => {
    const s = String(value ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      [
        row.id,
        row.customerName,
        row.partnerName,
        row.partnerCode,
        row.scheme,
        row.plan,
        row.state,
        row.amount,
        row.status,
        row.paymentStatus,
        row.createdAt,
      ]
        .map(escape)
        .join(","),
    ),
  ];
  return lines.join("\n");
}
