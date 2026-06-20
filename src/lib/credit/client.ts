// ============================================================
// Credit Module — Client Orchestration Layer
// DigiConnect Dukan — Powered by RNOS India Pvt. Ltd.
// ============================================================

import { getSupabaseAdmin } from "@/lib/supabase";
import * as provider from "./provider";
import * as mapper from "./mapper";
import {
  unifersCibilResponseSchema,
  unifersCrifResponseSchema,
  sanitizePanForLog,
} from "./validators";
import type {
  CreditReportRecord,
  CreditScoreResult,
  CreditPackageType,
  CreditAdminAnalytics,
  CreditHistoryEntry,
} from "./types";

/**
 * Downloads a PDF from a URL and returns a Buffer
 */
async function downloadPdf(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download PDF from ${url}: Status ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Uploads a PDF Buffer to Supabase Storage in the private 'credit-reports' bucket
 * Path format: [user_id]/[report_id].pdf
 */
async function uploadPdfToStorage(
  userId: string,
  reportId: string,
  pdfBuffer: Buffer
): Promise<string> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase admin client not initialized.");
  }

  const filePath = `${userId}/${reportId}.pdf`;

  const { data, error } = await supabase.storage
    .from("credit-reports")
    .upload(filePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }

  return filePath;
}

/**
 * Generates a signed URL for a credit report PDF (expires in 24 hours)
 */
export async function getSignedReportUrl(filePath: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase admin client not initialized.");
  }

  const { data, error } = await supabase.storage
    .from("credit-reports")
    .createSignedUrl(filePath, 60 * 60 * 24); // 24 hours

  if (error) {
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Main orchestration function for performing the credit score fetch and update
 */
export async function processCreditScoreCheck(
  creditReportId: string,
  userId: string
): Promise<CreditScoreResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase admin client not initialized.");
  }

  // 1. Fetch current record
  const { data: record, error: fetchErr } = await supabase
    .from("credit_reports")
    .select("*")
    .eq("id", creditReportId)
    .single();

  if (fetchErr || !record) {
    throw new Error(`Credit report record not found: ${fetchErr?.message || "unknown"}`);
  }

  // 2. Update status to processing
  await supabase
    .from("credit_reports")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", creditReportId);

  try {
    let scoreResult: CreditScoreResult;
    let rawResponse: any;

    // 3. Call Unifers API based on package/bureau preference (defaulting to CIBIL)
    // CIBIL requires: Mobile_Number, PAN_Number, Full_Name, Callback_Url, Concent_Text, Concent
    const cibilPayload = {
      Mobile_Number: record.mobile,
      PAN_Number: record.pan,
      Full_Name: record.full_name,
      Callback_Url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://digiconnectdukanfaizalam.vercel.app"}/api/credit/webhook`,
      Concent_Text: "We confirm and undertake that valid end-user consent has been obtained for fetching CI",
      Concent: "Y" as const,
    };

    const response = await provider.getCibilReport(cibilPayload, {
      creditReportId,
      userId,
    });

    rawResponse = response;

    // 4. Runtime validation of Unifers Response
    const validatedResponse = unifersCibilResponseSchema.parse(response);

    // 5. Map the validated response
    scoreResult = mapper.mapUnifersCibilToScore(validatedResponse);

    // 6. If the response contains a PDF URL, download and store it in Supabase Storage
    let storagePath: string | null = null;
    if (scoreResult.reportPdfUrl && scoreResult.reportPdfUrl.startsWith("http")) {
      try {
        const pdfBuffer = await downloadPdf(scoreResult.reportPdfUrl);
        storagePath = await uploadPdfToStorage(userId, creditReportId, pdfBuffer);
      } catch (uploadErr) {
        console.error("Failed to download or store credit report PDF:", uploadErr);
        // Continue completing the record even if PDF upload fails, so score is visible
      }
    } else if (validatedResponse.data.result.data?.pdfBase64) {
      // Handle potential Base64 PDF response format as required
      try {
        const pdfBuffer = Buffer.from(validatedResponse.data.result.data.pdfBase64, "base64");
        storagePath = await uploadPdfToStorage(userId, creditReportId, pdfBuffer);
      } catch (base64Err) {
        console.error("Failed to decode and upload Base64 PDF:", base64Err);
      }
    }

    // 7. Update credit_reports table with results
    const updateData = {
      status: "completed",
      credit_score: scoreResult.creditScore,
      bureau_name: scoreResult.bureauName,
      report_reference: scoreResult.reportReference,
      report_pdf_url: storagePath, // Storing storage path reference
      score_category: scoreResult.scoreCategory,
      credit_rating: scoreResult.creditRating,
      response_json: rawResponse,
      error_message: null,
      updated_at: new Date().toISOString(),
    };

    const { error: updateErr } = await supabase
      .from("credit_reports")
      .update(updateData)
      .eq("id", creditReportId);

    if (updateErr) {
      throw new Error(`Failed to update credit report record: ${updateErr.message}`);
    }

    // Return score result with signed URL if path exists
    return {
      ...scoreResult,
      reportPdfUrl: storagePath ? await getSignedReportUrl(storagePath) : null,
    };
  } catch (err: any) {
    const errorMsg = err.message || "An unexpected error occurred during credit scoring.";
    console.error("processCreditScoreCheck failed:", err);

    // Update status to failed
    await supabase
      .from("credit_reports")
      .update({
        status: "failed",
        error_message: errorMsg,
        updated_at: new Date().toISOString(),
      })
      .eq("id", creditReportId);

    throw err;
  }
}

/**
 * Fetch credit report history for a customer (signed URLs generated on demand)
 */
export async function getCustomerCreditHistory(userId: string): Promise<CreditHistoryEntry[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("credit_reports")
    .select("id, credit_score, score_category, bureau_name, status, package_type, report_pdf_url, created_at")
    .eq("customer_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((item) => ({
    id: item.id,
    creditScore: item.credit_score,
    scoreCategory: item.score_category,
    bureauName: item.bureau_name,
    status: item.status as any,
    packageType: item.package_type as any,
    createdAt: item.created_at,
    hasPdf: !!item.report_pdf_url,
  }));
}

/**
 * Fetch credit reports with pagination, filtering, and PAN masking for admin table
 */
export async function getAdminCreditReports(filters: {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  limit: number;
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { data: [], total: 0 };

  let query = supabase
    .from("credit_reports")
    .select("*, count:id", { count: "exact" });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte("created_at", filters.dateTo);
  }

  // Full-name, mobile, or PAN search
  if (filters.search) {
    query = query.or(
      `full_name.ilike.%${filters.search}%,mobile.ilike.%${filters.search}%,pan.ilike.%${filters.search}%`
    );
  }

  const offset = (filters.page - 1) * filters.limit;
  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + filters.limit - 1);

  if (error || !data) {
    return { data: [], total: 0 };
  }

  // Mask PAN in logs and admin tables!
  const sanitizedData = data.map((record) => ({
    ...record,
    pan: sanitizePanForLog(record.pan),
  }));

  return {
    data: sanitizedData,
    total: count || 0,
  };
}

/**
 * Gather aggregated metrics for the admin analytics dashboard
 */
export async function getAdminCreditAnalytics(): Promise<CreditAdminAnalytics> {
  const supabase = getSupabaseAdmin();
  const defaultAnalytics: CreditAdminAnalytics = {
    totalChecks: 0,
    totalRevenue: 0,
    todayChecks: 0,
    failedRequests: 0,
    avgScore: 0,
    scoreDistribution: { poor: 0, fair: 0, good: 0, excellent: 0 },
    dailyChecks: [],
    weeklyChecks: [],
    monthlyChecks: [],
  };

  if (!supabase) return defaultAnalytics;

  const todayStr = new Date().toISOString().split("T")[0];

  const { data: records, error } = await supabase
    .from("credit_reports")
    .select("credit_score, score_category, status, amount, created_at");

  if (error || !records) return defaultAnalytics;

  const totalChecks = records.length;
  let totalRevenue = 0;
  let todayChecks = 0;
  let failedRequests = 0;
  let scoreSum = 0;
  let scoreCount = 0;

  const scoreDistribution = { poor: 0, fair: 0, good: 0, excellent: 0 };
  const dailyMap = new Map<string, { count: number; revenue: number }>();

  for (const r of records) {
    const isCompleted = r.status === "completed";
    const amount = Number(r.amount) || 0;

    if (r.status !== "failed" && r.status !== "payment_pending") {
      totalRevenue += amount;
    }

    if (r.status === "failed") {
      failedRequests++;
    }

    const createdAtStr = new Date(r.created_at).toISOString().split("T")[0];
    if (createdAtStr === todayStr) {
      todayChecks++;
    }

    if (isCompleted && r.credit_score) {
      scoreSum += r.credit_score;
      scoreCount++;

      const cat = r.score_category as "poor" | "fair" | "good" | "excellent";
      if (scoreDistribution[cat] !== undefined) {
        scoreDistribution[cat]++;
      }
    }

    // Daily breakdown helper
    const dailyEntry = dailyMap.get(createdAtStr) || { count: 0, revenue: 0 };
    dailyEntry.count++;
    if (r.status !== "failed" && r.status !== "payment_pending") {
      dailyEntry.revenue += amount;
    }
    dailyMap.set(createdAtStr, dailyEntry);
  }

  const dailyChecks = Array.from(dailyMap.entries())
    .map(([date, val]) => ({ date, count: val.count, revenue: val.revenue }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-15); // Last 15 days

  return {
    totalChecks,
    totalRevenue,
    todayChecks,
    failedRequests,
    avgScore: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : 0,
    scoreDistribution,
    dailyChecks,
    weeklyChecks: [], // Can be calculated from daily
    monthlyChecks: [],
  };
}
