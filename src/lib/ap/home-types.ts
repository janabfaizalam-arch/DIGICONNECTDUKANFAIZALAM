// ============================================================================
// DC Partner home — types
// ============================================================================

import type { DigiPartnerType } from "@/lib/ap/partner-type";

export type BannerAudience =
  | "public_home"
  | "customer_dashboard"
  | "partner_dashboard";

export type PartnerAnnouncementBanner = {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string;
  image_path: string | null;
  mobile_image_url: string | null;
  mobile_image_path: string | null;
  button_text: string | null;
  button_url: string | null;
  partner_types: DigiPartnerType[] | null;
  audience: BannerAudience;
  start_at: string | null;
  end_at: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type PartnerQuickAction = {
  key: string;
  label: string;
  description?: string;
  href: string;
  iconName:
    | "UserPlus"
    | "FilePlus2"
    | "Files"
    | "UploadCloud"
    | "IndianRupee"
    | "BadgeIndianRupee"
    | "Users"
    | "Search"
    | "ClipboardCheck"
    | "ReceiptText"
    | "Headphones";
};

export type PartnerOverviewCard = {
  key: string;
  label: string;
  value: string;
  href?: string;
  tone?: "default" | "pending" | "success" | "urgent";
};

export type PartnerPendingWorkItem = {
  id: string;
  title: string;
  subtitle: string;
  statusLabel: string;
  ctaLabel: string;
  href: string;
};

export type PartnerRecentApplicationItem = {
  id: string;
  customerName: string;
  serviceName: string;
  status: string;
  updatedAt: string;
  paymentStatus: string | null;
  actions: Array<{ label: string; href: string }>;
};

export type PartnerCollectionCommission = {
  collectedToday: number;
  monthCollection: number;
  pendingCollection: number;
  commissionEarned: number;
  commissionPending: number;
  teamCollectedToday?: number;
  teamMonthCollection?: number;
  teamCommissionEarned?: number;
  teamCommissionPending?: number;
  hasCommissionScheme: boolean;
};

export type PartnerTeamSummary = {
  totalMembers: number;
  activeMembers: number;
  teamApplications: number;
  teamCollection: number;
  teamCommission: number;
};

export type PartnerOfficeWorkSummary = {
  applicationsToProcess: number;
  supportQueueCount: number;
  recentOfflineInvoices: number;
  assignedWorkCount: number;
};

export type PartnerHomeRecentCustomer = {
  id: string;
  name: string;
  mobile: string;
  href: string;
};

export type PartnerHomePayload = {
  partnerType: DigiPartnerType;
  canManageTeam: boolean;
  /** Name, code, tier and the page's one hero figure. */
  identity: PartnerHomeIdentity;
  banners: PartnerAnnouncementBanner[];
  /** At most three interrupts. Empty hides the strip entirely. */
  attention: PartnerAttentionItem[];
  /** Exactly four headline numbers, each stated nowhere else on the page. */
  kpis: PartnerKpi[];
  analytics: PartnerAnalytics;
  /** Pending work, grouped for the tabbed queue. */
  workQueue: PartnerWorkQueueGroup[];
  recentApplications: PartnerRecentApplicationItem[];
  collection: PartnerCollectionCommission;
  teamSummary: PartnerTeamSummary | null;
  officeWork: PartnerOfficeWorkSummary | null;
  recentCustomers: PartnerHomeRecentCustomer[];
};

// ── Home v2: identity, KPIs, attention and analytics ────────────────────────

/** Who the partner is — rendered once, in the header, and nowhere else. */
export type PartnerHomeIdentity = {
  name: string;
  partnerCode: string | null;
  partnerTypeLabel: string;
  tierName: string | null;
  /** The one hero figure the page leads with. */
  heroLabel: string;
  heroValue: string;
  heroCaption: string;
};

export type PartnerDeltaTone = "up" | "down" | "flat";

/** A headline number. Carries its own comparison and 12-point sparkline. */
export type PartnerKpi = {
  key: string;
  label: string;
  value: string;
  href: string;
  tone: "default" | "pending" | "success" | "urgent";
  /** Signed change against the named period, e.g. "+18%" vs "yesterday". */
  delta: { label: string; tone: PartnerDeltaTone; caption: string } | null;
  /** Raw series for the sparkline, oldest first. Empty hides the spark. */
  spark: number[];
};

export type PartnerAttentionSeverity = "critical" | "warning" | "info";

/** Something that needs the partner today. Empty list hides the whole strip. */
export type PartnerAttentionItem = {
  id: string;
  severity: PartnerAttentionSeverity;
  title: string;
  detail: string;
  ctaLabel: string;
  href: string;
};

export type PartnerTrendPoint = {
  /** ISO date at local midnight — the series key. */
  date: string;
  /** Short axis label, e.g. "24 Sep". */
  label: string;
  applications: number;
  collection: number;
};

export type PartnerServiceMixItem = {
  name: string;
  applications: number;
  amount: number;
};

export type PartnerStatusBucket =
  | "awaiting_payment"
  | "action_needed"
  | "in_progress"
  | "completed"
  | "closed";

export type PartnerStatusMixItem = {
  key: PartnerStatusBucket;
  label: string;
  count: number;
};

export type PartnerAnalytics = {
  /** How many days the trend covers. */
  rangeDays: number;
  trend: PartnerTrendPoint[];
  /** Top services, longest first, with the tail folded into "Other". */
  serviceMix: PartnerServiceMixItem[];
  statusMix: PartnerStatusMixItem[];
  /** Totals across `rangeDays`, for the chart subtitles. */
  rangeApplications: number;
  rangeCollection: number;
  /** True when there is nothing to plot — the section renders an empty state. */
  isEmpty: boolean;
};

export type PartnerWorkQueueGroup = {
  key: "documents" | "payments" | "processing";
  label: string;
  items: PartnerPendingWorkItem[];
};
