// ============================================================
// Credit UI Component — Detailed Credit Report Viewer
// DigiConnect Dukan — Powered by RNOS India Pvt. Ltd.
// ============================================================

"use client";

import React from "react";
import { User, CreditCard, HelpCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatCreditDate } from "@/lib/credit/constants";
import type { CreditReportRecord, ScoreCategory } from "@/lib/credit/types";
import { CreditScoreCard } from "./credit-score-card";

interface CreditReportViewerProps {
  report: CreditReportRecord;
}

export function CreditReportViewer({ report }: CreditReportViewerProps) {
  const handleDownload = () => {
    window.open(`/api/credit/download?id=${report.id}`, "_blank");
  };

  // Safe mapping to result interface for child component
  const scoreResult = {
    creditScore: report.credit_score || 750,
    bureauName: report.bureau_name || "CIBIL",
    reportDate: report.created_at,
    creditRating: report.credit_rating || "Good Health",
    scoreCategory: (report.score_category as ScoreCategory) || "good",
    reportReference: report.report_reference || "N/A",
    reportPdfUrl: report.report_pdf_url,
  };

  return (
    <div className="w-full space-y-6 text-white">
      {/* 1. Score gauge card */}
      <CreditScoreCard result={scoreResult} onDownload={report.report_pdf_url ? handleDownload : undefined} />

      {/* 2. Personal Information card */}
      <Card className="border-white/10 bg-black/40 backdrop-blur-md">
        <div className="p-6 border-b border-white/5">
          <h3 className="text-lg font-bold flex items-center gap-2 text-white">
            <User className="w-5 h-5 text-white/70" />
            Verified Customer Details
          </h3>
          <p className="text-white/60 text-xs mt-1">
            Information pulled from official credit bureau query registry
          </p>
        </div>
        <div className="p-6 pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-xs text-white/40 block">Full Name</span>
            <span className="text-sm font-semibold">{report.full_name}</span>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-white/40 block">Mobile Number</span>
            <span className="text-sm font-semibold">{report.mobile}</span>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-white/40 block">PAN Number (Masked)</span>
            <span className="text-sm font-semibold tracking-wider uppercase">{report.pan}</span>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-white/40 block">Date of Birth</span>
            <span className="text-sm font-semibold">{formatCreditDate(report.dob)}</span>
          </div>
        </div>
      </Card>

      {/* 3. Transaction Details card */}
      <Card className="border-white/10 bg-black/40 backdrop-blur-md">
        <div className="p-6 border-b border-white/5">
          <h3 className="text-lg font-bold flex items-center gap-2 text-white">
            <CreditCard className="w-5 h-5 text-white/70" />
            Transaction Information
          </h3>
        </div>
        <div className="p-6 pt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <span className="text-xs text-white/40 block">Package Type</span>
            <span className="text-sm font-semibold capitalize">{report.package_type.replace("_", " ")}</span>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-white/40 block">Amount Paid</span>
            <span className="text-sm font-semibold">₹{report.amount}</span>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-white/40 block">Payment ID</span>
            <span className="text-sm font-semibold text-white/70 truncate">{report.razorpay_payment_id || "N/A"}</span>
          </div>
        </div>
      </Card>

      {/* 4. Action Banner if PDF is missing */}
      {!report.report_pdf_url && (
        <Card className="border-white/10 bg-yellow-500/10 text-yellow-400">
          <div className="p-6 py-4 flex items-center gap-3">
            <HelpCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-xs font-medium">
              This request was generated as a **Score Check Only** package. To download a detailed PDF containing all loan account timelines and details, please select the **Credit Report PDF** option on your next check.
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}
