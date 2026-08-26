// ============================================================================
// Agency Partner Type Definitions
// DigiConnect Dukan — AP Ecosystem
// ============================================================================

import type { DigiPartnerType } from "@/lib/ap/partner-type";
import { AP_PARTNER_TYPE_LABELS as PARTNER_TYPE_LABELS } from "@/lib/ap/partner-type";

// ── Partner Tiers ──────────────────────────────────────────────────────────

export type APTier = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  default_commission_type: CommissionType;
  default_commission_value: number;
  default_commission_rate: number;
  min_monthly_applications: number;
  benefits: string[];
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

// ── Agency Partner ─────────────────────────────────────────────────────────

/** @deprecated Prefer DigiPartnerType from @/lib/ap/partner-type */
export type APPartnerType = DigiPartnerType;

export type { DigiPartnerType };

export type APStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "kyc_pending"
  | "verified"
  | "active"
  | "suspended"
  | "rejected"
  | "blacklisted";

export type APKycStatus =
  | "pending"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "resubmit_required";

export type AgencyPartner = {
  id: string;
  user_id: string;
  partner_code: string;

  // Personal / Business
  full_name: string;
  business_name: string | null;
  partner_type: APPartnerType;

  // Contact
  mobile: string;
  whatsapp: string | null;
  email: string;

  // Address
  address: string | null;
  state: string | null;
  district: string | null;
  pin: string | null;

  // KYC identifiers
  aadhaar_number: string | null;
  pan_number: string | null;
  gstin: string | null;

  // Banking
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  bank_name: string | null;
  upi_id: string | null;

  // Additional
  emergency_contact: string | null;
  nominee_name: string | null;
  nominee_relation: string | null;
  referral_source: string | null;
  profile_photo_url: string | null;
  profile_photo_path: string | null;

  // Tier & Commission
  tier_id: string | null;
  commission_plan: string | null;
  commission_type: CommissionType;
  commission_value: number;
  commission_rate: number;

  // Status
  status: APStatus;
  kyc_status: APKycStatus;
  kyc_verified_at: string | null;
  kyc_verified_by: string | null;

  // Admin
  admin_notes: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
  activated_at: string | null;
  suspended_at: string | null;
  blacklisted_at: string | null;

  // Team hierarchy
  created_by_user_id: string | null;

  // Optional profile fields (partner_types_v2)
  department?: string | null;
  reporting_to_partner_id?: string | null;
  territory?: string | null;
  joining_date?: string | null;

  // Joined data
  tier?: APTier | null;
};

// ── KYC Documents ──────────────────────────────────────────────────────────

export type APKycDocumentType =
  | "aadhaar_front"
  | "aadhaar_back"
  | "pan_card"
  | "shop_photo"
  | "business_proof"
  | "cancelled_cheque"
  | "passbook"
  | "profile_photo"
  | "agreement_document"
  | "other";

export type APKycDocumentStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "reupload_required";

export type APKycDocument = {
  id: string;
  agency_partner_id: string;
  document_type: APKycDocumentType;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  storage_path: string | null;
  status: APKycDocumentStatus;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  uploaded_at: string;
  created_at: string;
};

// ── Commission ─────────────────────────────────────────────────────────────

export type CommissionType = "fixed" | "percentage" | "tiered";

export type CommissionScopeType =
  | "global"
  | "service"
  | "partner"
  | "tier"
  | "campaign";

export type CommissionRule = {
  id: string;
  name: string;
  description: string | null;
  scope_type: CommissionScopeType;
  service_id: string | null;
  agency_partner_id: string | null;
  tier_id: string | null;
  campaign_code: string | null;
  commission_type: CommissionType;
  fixed_amount: number;
  percentage_rate: number;
  tiered_config: TieredCommissionBracket[];
  min_amount: number;
  max_amount: number | null;
  is_active: boolean;
  priority: number;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
};

export type TieredCommissionBracket = {
  min: number;
  max: number;
  rate: number;
  fixed?: number;
};

export type APCommissionStatus =
  | "pending"
  | "earned"
  | "approved"
  | "paid"
  | "cancelled"
  | "reversed"
  | "adjusted";

export type APCommission = {
  id: string;
  agency_partner_id: string;
  application_id: string;
  commission_rule_id: string | null;
  service_slug: string | null;
  service_name: string | null;
  sale_amount: number;
  commission_type: string;
  commission_value: number;
  commission_rate: number;
  calculated_amount: number;
  rule_snapshot: Record<string, unknown> | null;
  status: APCommissionStatus;
  approved_by: string | null;
  approved_at: string | null;
  paid_at: string | null;
  payout_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;

  // Joined
  agency_partner?: Pick<AgencyPartner, "full_name" | "email" | "mobile" | "partner_code"> | null;
  application?: {
    id: string;
    service_name: string;
    amount: number;
    created_at: string;
    customer_name?: string | null;
  } | null;
};

// ── Wallet Ledger ──────────────────────────────────────────────────────────

export type APWalletEntryType =
  | "commission_credit"
  | "manual_credit"
  | "manual_debit"
  | "payout_deduction"
  | "adjustment"
  | "reversal"
  | "bonus"
  | "penalty";

export type APWalletEntry = {
  id: string;
  agency_partner_id: string;
  entry_type: APWalletEntryType;
  amount: number;
  running_balance: number;
  reference_type: string | null;
  reference_id: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
};

// ── Payouts ────────────────────────────────────────────────────────────────

export type APPayoutStatus =
  | "requested"
  | "processing"
  | "paid"
  | "failed"
  | "cancelled";

export type APPayout = {
  id: string;
  agency_partner_id: string;
  amount: number;
  status: APPayoutStatus;
  payment_method: string | null;
  payment_reference: string | null;
  bank_account_snapshot: Record<string, unknown> | null;
  proof_url: string | null;
  proof_storage_path: string | null;
  processed_by: string | null;
  processed_at: string | null;
  paid_at: string | null;
  notes: string | null;
  requested_at: string;
  created_at: string;
  updated_at: string;

  // Joined
  items?: APPayoutItem[];
  agency_partner?: Pick<AgencyPartner, "full_name" | "email" | "mobile" | "partner_code"> | null;
};

export type APPayoutItem = {
  id: string;
  payout_id: string;
  commission_id: string;
  amount: number;
  created_at: string;
};

// ── Customer Mobile Links ──────────────────────────────────────────────────

export type CustomerMobileLink = {
  id: string;
  mobile: string;
  customer_user_id: string | null;
  agency_partner_id: string | null;
  application_id: string | null;
  linked_at: string | null;
  auto_linked: boolean;
  created_at: string;
};

// ── Audit Logs ─────────────────────────────────────────────────────────────

export type AuditAction =
  | "ap_created"
  | "ap_updated"
  | "ap_status_changed"
  | "ap_kyc_approved"
  | "ap_kyc_rejected"
  | "ap_kyc_document_uploaded"
  | "ap_suspended"
  | "ap_activated"
  | "ap_blacklisted"
  | "commission_created"
  | "commission_approved"
  | "commission_paid"
  | "commission_cancelled"
  | "commission_reversed"
  | "wallet_credited"
  | "wallet_debited"
  | "wallet_adjusted"
  | "payout_created"
  | "payout_processed"
  | "payout_paid"
  | "payout_failed"
  | "application_created_by_ap"
  | "application_reassigned"
  | "customer_linked"
  | "ap_exported";

export type AuditLog = {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: AuditAction | string;
  entity_type: string;
  entity_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

// ── Partner Announcements ──────────────────────────────────────────────────

export type AnnouncementType = "info" | "warning" | "success" | "urgent";
export type AnnouncementTargetType = "all" | "tier" | "specific";

export type PartnerAnnouncement = {
  id: string;
  title: string;
  body: string;
  announcement_type: AnnouncementType;
  target_type: AnnouncementTargetType;
  target_tier_id: string | null;
  target_partner_ids: string[];
  is_active: boolean;
  published_at: string | null;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

// ── Dashboard Stats ────────────────────────────────────────────────────────

export type APDashboardStats = {
  totalApplications: number;
  pendingApplications: number;
  completedApplications: number;
  rejectedApplications: number;
  commissionEarned: number;
  commissionPending: number;
  commissionApproved: number;
  totalPaidPayout: number;
  walletBalance: number;
  customerCount: number;
  monthlyApplications: number;
};

// ── Source channel for applications ────────────────────────────────────────

export type ApplicationSourceChannel =
  | "direct"
  | "agency_partner"
  | "online"
  | "offline"
  | "referral";

export type ApplicationOwnershipStatus =
  | "owned"
  | "ap_created"
  | "linked"
  | "transferred";

// ── AP Partner list item (admin view) ──────────────────────────────────────

export type APListItem = AgencyPartner & {
  totalApplications: number;
  pendingApplications: number;
  completedApplications: number;
  pendingCommission: number;
  totalPaidCommission: number;
  customerCount: number;
  tier?: APTier | null;
};

// ── Helper constants ───────────────────────────────────────────────────────

export const AP_STATUS_LABELS: Record<APStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  kyc_pending: "KYC Pending",
  verified: "Verified",
  active: "Active",
  suspended: "Suspended",
  rejected: "Rejected",
  blacklisted: "Blacklisted",
};

export const AP_KYC_STATUS_LABELS: Record<APKycStatus, string> = {
  pending: "Pending",
  submitted: "Submitted",
  under_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
  resubmit_required: "Resubmit Required",
};

export const AP_PARTNER_TYPE_LABELS: Record<APPartnerType, string> = PARTNER_TYPE_LABELS;

export const AP_KYC_DOCUMENT_TYPE_LABELS: Record<APKycDocumentType, string> = {
  aadhaar_front: "Aadhaar Front",
  aadhaar_back: "Aadhaar Back",
  pan_card: "PAN Card",
  shop_photo: "Shop Photo",
  business_proof: "Business Proof",
  cancelled_cheque: "Cancelled Cheque",
  passbook: "Passbook",
  profile_photo: "Profile Photo",
  agreement_document: "Agreement Document",
  other: "Other",
};

export const AP_COMMISSION_STATUS_LABELS: Record<APCommissionStatus, string> = {
  pending: "Pending",
  earned: "Earned",
  approved: "Approved",
  paid: "Paid",
  cancelled: "Cancelled",
  reversed: "Reversed",
  adjusted: "Adjusted",
};

export const AP_WALLET_ENTRY_TYPE_LABELS: Record<APWalletEntryType, string> = {
  commission_credit: "Commission Credit",
  manual_credit: "Manual Credit",
  manual_debit: "Manual Debit",
  payout_deduction: "Payout Deduction",
  adjustment: "Adjustment",
  reversal: "Reversal",
  bonus: "Bonus",
  penalty: "Penalty",
};

export const AP_PAYOUT_STATUS_LABELS: Record<APPayoutStatus, string> = {
  requested: "Requested",
  processing: "Processing",
  paid: "Paid",
  failed: "Failed",
  cancelled: "Cancelled",
};
