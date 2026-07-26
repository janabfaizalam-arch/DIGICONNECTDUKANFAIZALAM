import { ITR_SERVICE_SLUG } from "@/lib/itr/constants";
import { extractItrFormPayload } from "@/lib/itr/form-data";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type ItrAnalyticsRow = {
  id: string;
  customerName: string;
  partnerName: string;
  partnerCode: string;
  amount: number;
  status: string;
  paymentStatus: string;
  assessmentYear: string;
  applicantType: string;
  filingType: string;
  taxRegime: string;
  packagePlan: string;
  recommendedForm: string;
  incomeSources: string;
  panNumber: string;
  createdAt: string;
};

export type ItrAnalyticsSummary = {
  todayCount: number;
  todayRevenue: number;
  totalCount: number;
  totalRevenue: number;
  paidCount: number;
  conversionRate: number;
  byPackage: Array<{ packagePlan: string; count: number; revenue: number }>;
  byFilingType: Array<{ filingType: string; count: number; revenue: number }>;
  byPartner: Array<{ partner: string; count: number; revenue: number }>;
  rows: ItrAnalyticsRow[];
};

function startOfTodayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function isPaidStatus(paymentStatus: string) {
  return ["paid", "verified", "success", "captured"].includes(paymentStatus.toLowerCase());
}

export async function getItrAnalytics(limit = 500): Promise<ItrAnalyticsSummary> {
  const empty: ItrAnalyticsSummary = {
    todayCount: 0,
    todayRevenue: 0,
    totalCount: 0,
    totalRevenue: 0,
    paidCount: 0,
    conversionRate: 0,
    byPackage: [],
    byFilingType: [],
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
    .eq("service_slug", ITR_SERVICE_SLUG)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error("[itr-analytics]", error?.message);
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
  const packageMap = new Map<string, { count: number; revenue: number }>();
  const filingTypeMap = new Map<string, { count: number; revenue: number }>();
  const partnerAgg = new Map<string, { count: number; revenue: number }>();

  let todayCount = 0;
  let todayRevenue = 0;
  let totalRevenue = 0;
  let paidCount = 0;

  const rows: ItrAnalyticsRow[] = data.map((row) => {
    const form = extractItrFormPayload(row.form_data);
    const amount = Number(row.amount ?? 0) || 0;
    const partner = row.agency_partner_id
      ? partnerMap.get(String(row.agency_partner_id))
      : null;
    const packagePlan = form.packagePlan || "Unspecified";
    const filingType = form.filingType || "Original";
    const paymentStatus = String(row.payment_status ?? "pending");
    const isPaid = isPaidStatus(paymentStatus);

    totalRevenue += amount;
    if (isPaid) paidCount += 1;
    if (String(row.created_at) >= todayIso) {
      todayCount += 1;
      todayRevenue += amount;
    }

    const packageHit = packageMap.get(packagePlan) ?? { count: 0, revenue: 0 };
    packageHit.count += 1;
    packageHit.revenue += amount;
    packageMap.set(packagePlan, packageHit);

    const filingHit = filingTypeMap.get(filingType) ?? { count: 0, revenue: 0 };
    filingHit.count += 1;
    filingHit.revenue += amount;
    filingTypeMap.set(filingType, filingHit);

    const partnerLabel = partner?.name ?? "Direct / Customer";
    const partnerHit = partnerAgg.get(partnerLabel) ?? { count: 0, revenue: 0 };
    partnerHit.count += 1;
    partnerHit.revenue += amount;
    partnerAgg.set(partnerLabel, partnerHit);

    return {
      id: String(row.id),
      customerName: String(row.customer_name ?? form.panNumber ?? "—"),
      partnerName: partner?.name ?? "—",
      partnerCode: partner?.code ?? "",
      amount,
      status: String(row.status ?? ""),
      paymentStatus,
      assessmentYear: form.assessmentYear || "Unspecified",
      applicantType: form.applicantType || "Unspecified",
      filingType,
      taxRegime: form.taxRegime || "Unspecified",
      packagePlan,
      recommendedForm: form.recommendedForm || "—",
      incomeSources: form.incomeSources.join("; ") || "—",
      panNumber: form.panNumber || "—",
      createdAt: String(row.created_at ?? ""),
    };
  });

  const toSorted = (
    map: Map<string, { count: number; revenue: number }>,
    keyName: "packagePlan" | "filingType" | "partner",
  ) =>
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
    byPackage: toSorted(packageMap, "packagePlan") as Array<{ packagePlan: string; count: number; revenue: number }>,
    byFilingType: toSorted(filingTypeMap, "filingType") as Array<{ filingType: string; count: number; revenue: number }>,
    byPartner: toSorted(partnerAgg, "partner") as Array<{ partner: string; count: number; revenue: number }>,
    rows,
  };
}

export function itrRowsToCsv(rows: ItrAnalyticsRow[]) {
  const headers = [
    "Application ID",
    "Customer",
    "Partner",
    "Partner Code",
    "Assessment Year",
    "Applicant Type",
    "Filing Type",
    "Tax Regime",
    "Package",
    "Recommended Form",
    "Income Sources",
    "PAN",
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
        row.assessmentYear,
        row.applicantType,
        row.filingType,
        row.taxRegime,
        row.packagePlan,
        row.recommendedForm,
        row.incomeSources,
        row.panNumber,
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
