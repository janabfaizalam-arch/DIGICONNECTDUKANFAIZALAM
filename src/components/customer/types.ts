import type { User as SupabaseUser } from "@supabase/supabase-js";

import type { CustomerDashboardApplication, CustomerDashboardStats } from "@/lib/customer-dashboard-data";

/**
 * What the server hands the portal.
 *
 * These shapes were declared inline in a 2,500-line component, which is why
 * every section had to be in that same file to see them. They live here so a
 * section can be its own file and still be typed.
 */

export interface ApplicationDocument {
  id: string;
  application_id: string;
  document_type: string;
  document_name?: string | null;
  file_name: string;
  file_url: string;
  file_type?: string | null;
  storage_path?: string | null;
  status?: string | null;
  review_status?: string | null;
  uploaded_by_role?: string | null;
  is_final?: boolean | null;
  uploaded_at?: string | null;
  created_at: string;
}

export interface CustomerNotification {
  id: string;
  user_id: string;
  application_id?: string | null;
  title: string;
  message: string;
  read_at?: string | null;
  created_at: string;
  priority?: "critical" | "important" | "normal" | "completed";
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  created_at: string;
  expires_at?: string | null;
}

export interface ReferralItem {
  id: string;
  referred_user_id: string;
  referral_code: string;
  status: "pending" | "completed" | "rejected";
  reward_amount: number;
  created_at: string;
  completed_at: string | null;
}

export interface ReferralSummaryData {
  code: string;
  link: string;
  referrals: ReferralItem[];
  total: number;
  pending: number;
  completed: number;
  rewardEarned: number;
}

export interface WalletSnapshotData {
  wallet: {
    balance?: number;
    balance_points: number;
    total_reward_earned: number;
    total_reward_redeemed: number;
    total_cashback_earned?: number;
    total_cashback_used?: number;
    nearest_expiry_at?: string | null;
  } | null;
  transactions: WalletTransaction[];
  cashbackEarned: number;
  cashbackUsed: number;
  expiringSoonAmount?: number;
  referralSummary: ReferralSummaryData | null;
}

export interface CustomerProfileFields {
  dob?: string | null;
  gender?: string | null;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;
  photo_url?: string | null;
  full_name?: string | null;
  mobile?: string | null;
  email?: string | null;
  updated_at?: string | null;
}

export interface ProfileStatusData {
  profile: CustomerProfileFields | null;
  complete: boolean;
  completion: {
    completed: number;
    total: number;
    percent: number;
  };
}

/** Everything the six sections read from. */
export interface CustomerPortalData {
  applications: CustomerDashboardApplication[];
  stats: CustomerDashboardStats;
  profile: { name: string };
  walletSnapshot?: WalletSnapshotData | null;
  profileStatus?: ProfileStatusData | null;
  documents?: ApplicationDocument[];
  notifications?: CustomerNotification[];
  user: SupabaseUser;
}
