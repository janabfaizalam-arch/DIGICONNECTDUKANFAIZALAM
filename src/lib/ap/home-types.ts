// ============================================================================
// Digi Partner home — types
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
  banners: PartnerAnnouncementBanner[];
  overview: PartnerOverviewCard[];
  pendingWork: PartnerPendingWorkItem[];
  recentApplications: PartnerRecentApplicationItem[];
  collection: PartnerCollectionCommission;
  teamSummary: PartnerTeamSummary | null;
  officeWork: PartnerOfficeWorkSummary | null;
  recentCustomers: PartnerHomeRecentCustomer[];
};
