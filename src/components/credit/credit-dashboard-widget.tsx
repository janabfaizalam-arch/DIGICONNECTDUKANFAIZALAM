// ============================================================
// Credit UI Component — Customer Dashboard Widget (Compact)
// DigiConnect Dukan — Powered by RNOS India Pvt. Ltd.
// ============================================================

"use client";

import React from "react";
import Link from "next/link";
import { Download, ChevronRight, Activity, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SCORE_COLORS, scoreToPercent } from "@/lib/credit/constants";
import type { CreditHistoryEntry, ScoreCategory } from "@/lib/credit/types";

interface CreditDashboardWidgetProps {
  latestCheck: CreditHistoryEntry | null;
}

export function CreditDashboardWidget({ latestCheck }: CreditDashboardWidgetProps) {
  const isCompleted = latestCheck?.status === "completed";
  const score = isCompleted && latestCheck?.creditScore ? latestCheck.creditScore : null;
  const category: ScoreCategory = score ? (latestCheck?.scoreCategory as ScoreCategory) || "good" : "good";
  const colors = SCORE_COLORS[category];

  return (
    <Card className="border-white/10 bg-black/40 backdrop-blur-md text-white shadow-xl relative overflow-hidden">
      {/* Background radial accent */}
      {score && (
        <div 
          className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full blur-2xl opacity-10 pointer-events-none transition-all duration-300"
          style={{ backgroundColor: colors.text === "text-emerald-500" ? "#10b981" : colors.text === "text-blue-500" ? "#3b82f6" : colors.text === "text-orange-500" ? "#f97316" : "#ef4444" }}
        />
      )}

      <div className="p-4 pb-2 border-b border-white/5 flex flex-row items-center justify-between space-y-0">
        <div>
          <h3 className="text-base font-bold tracking-tight text-white">Credit Rating Tracker</h3>
          <p className="text-white/50 text-[10px] mt-0.5">TransUnion CIBIL Bureau</p>
        </div>
        <Activity className="w-5 h-5 text-white/40" />
      </div>

      <div className="p-4 pt-4 space-y-4">
        {score ? (
          <div className="flex items-center gap-4">
            {/* Small circular score gauge */}
            <div className="relative flex items-center justify-center w-20 h-20 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  className="text-white/5"
                  strokeWidth="6"
                  stroke="currentColor"
                  fill="transparent"
                  r="32"
                  cx="40"
                  cy="40"
                />
                <circle
                  strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 32}`}
                  strokeDashoffset={`${2 * Math.PI * 32 * (1 - scoreToPercent(score) / 100)}`}
                  style={{ stroke: colors.text === "text-emerald-500" ? "#10b981" : colors.text === "text-blue-500" ? "#3b82f6" : colors.text === "text-orange-500" ? "#f97316" : "#ef4444" }}
                  strokeLinecap="round"
                  fill="transparent"
                  r="32"
                  cx="40"
                  cy="40"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-xl font-bold tracking-tighter tabular-nums">{score}</span>
              </div>
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-1.5">
                <Award className={`w-4 h-4 ${colors.text}`} />
                <span className={`text-xs font-bold uppercase tracking-wider ${colors.text}`}>
                  {category}
                </span>
              </div>
              <p className="text-white/70 text-xs leading-normal">
                Your score is considered **{category}**. You are in a good position to qualify for credit.
              </p>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center space-y-2">
            <p className="text-white/60 text-xs">You haven&apos;t checked your credit rating yet.</p>
            <p className="text-[10px] text-white/40 max-w-xs mx-auto leading-normal">
              Find out your credit score, account defaults, and liability indicators instantly.
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Link href="/services/credit-score" className="flex-1" passHref>
            <Button className="w-full bg-white hover:bg-white/90 text-black font-semibold text-xs h-9">
              Check New Score
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Button>
          </Link>

          {score && latestCheck?.hasPdf && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.open(`/api/credit/download?id=${latestCheck.id}`, "_blank")}
              className="border-white/10 hover:bg-white/5 text-white h-9 w-9 flex-shrink-0"
              title="Download PDF Report"
            >
              <Download className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
