// ============================================================
// Credit Module — TypeScript Type Definitions
// DigiConnect Dukan — Powered by RNOS India Pvt. Ltd.
// ============================================================

/** Customer input for credit score check */
export interface CreditReportRequest {
  fullName: string;
  mobile: string;
  pan: string;
  dob: string; // YYYY-MM-DD
  consent: boolean;
  packageType: CreditPackageType;
}

/** Package types available */
export type CreditPackageType = "score_check" | "report_pdf" | "premium";

/** Credit score result after API fetch & mapping */
export interface CreditScoreResult {
  creditScore: number;
  bureauName: string;
  reportDate: string;
  creditRating: string;
  scoreCategory: ScoreCategory;
  reportReference: string;
  reportPdfUrl: string | null;
}

/** Score category classification */
export type ScoreCategory = "poor" | "fair" | "good" | "excellent";

/** Credit report database record */
export interface CreditReportRecord {
  id: string;
  customer_id: string;
  full_name: string;
  mobile: string;
  pan: string;
  dob: string;
  credit_score: number | null;
  bureau_name: string | null;
  report_reference: string | null;
  report_pdf_url: string | null;
  status: CreditReportStatus;
  provider: string;
  package_type: CreditPackageType;
  score_category: string | null;
  credit_rating: string | null;
  payment_id: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  amount: number;
  response_json: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

/** Valid credit report statuses */
export type CreditReportStatus =
  | "pending"
  | "payment_pending"
  | "payment_verified"
  | "processing"
  | "completed"
  | "failed"
  | "expired";

/** Credit package pricing definition */
export interface CreditPackage {
  type: CreditPackageType;
  name: string;
  description: string;
  price: number;
  features: string[];
  recommended?: boolean;
}

/** Credit audit log entry */
export interface CreditAuditLog {
  id: string;
  credit_report_id: string | null;
  user_id: string | null;
  action: string;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

/** Credit payment record */
export interface CreditPaymentRecord {
  id: string;
  credit_report_id: string;
  user_id: string;
  amount: number;
  status: "pending" | "verified" | "failed" | "refunded";
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Credit API raw log entry */
export interface CreditApiLogRecord {
  id: string;
  credit_report_id: string | null;
  user_id: string | null;
  endpoint: string;
  request_payload: Record<string, unknown> | null;
  response_payload: Record<string, unknown> | null;
  status_code: number | null;
  is_success: boolean;
  error_message: string | null;
  created_at: string;
}

/** Official Unifers CIBIL Request payload schema */
export interface UnifersCibilRequest {
  Mobile_Number: string;
  PAN_Number: string;
  Full_Name: string;
  Callback_Url: string;
  Concent_Text: string;
  Concent: "Y" | "N";
}

/** Official Unifers CIBIL Response schema */
export interface UnifersCibilResponse {
  data: {
    currentCredit: number;
    creditUsed: number;
    result: {
      reportUrl: string;
      webUrl?: string;
      data: any; // Raw bureau CIBIL JSON details
    };
    refId: string;
  };
}

/** Official Unifers CRIF Request payload schema */
export interface UnifersCrifRequest {
  Mobile_Number: string;
  Full_Name: string;
  Concent_Text: string;
  Concent: "Y" | "N";
}

/** Official Unifers CRIF Response schema */
export interface UnifersCrifResponse {
  data: {
    currentCredit: number;
    creditUsed: number;
    result: {
      HEADER: {
        "DATE-OF-REQUEST": string;
        "DATE-OF-ISSUE": string;
        "REPORT-ID": string;
        "BATCH-ID": string;
        "INQUIRY-ID": string;
      };
      [key: string]: any;
    };
  };
}

/** Official Unifers Credit Info Response schema */
export interface UnifersCreditInfoResponse {
  error: boolean;
  data: {
    totalUnusedCredit: number;
  };
}

/** Admin dashboard analytics */
export interface CreditAdminAnalytics {
  totalChecks: number;
  totalRevenue: number;
  todayChecks: number;
  failedRequests: number;
  avgScore: number;
  scoreDistribution: {
    poor: number;
    fair: number;
    good: number;
    excellent: number;
  };
  dailyChecks: { date: string; count: number; revenue: number }[];
  weeklyChecks: { week: string; count: number; revenue: number }[];
  monthlyChecks: { month: string; count: number; revenue: number }[];
}

/** Customer credit history entry (for table display) */
export interface CreditHistoryEntry {
  id: string;
  creditScore: number | null;
  scoreCategory: string | null;
  bureauName: string | null;
  status: CreditReportStatus;
  packageType: CreditPackageType;
  createdAt: string;
  hasPdf: boolean;
}

/** Razorpay order creation response for credit */
export interface CreditOrderResponse {
  order_id: string;
  amount: number;
  currency: string;
  credit_report_id: string;
  key_id: string;
}
