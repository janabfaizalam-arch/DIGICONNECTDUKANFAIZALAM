// ============================================================
// Credit UI Component — Credit Score Visual Card (Premium)
// DigiConnect Dukan — Powered by RNOS India Pvt. Ltd.
// ============================================================

"use client";

import React, { useEffect, useState } from "react";
import { Download, ShieldCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SCORE_COLORS, formatCreditDate } from "@/lib/credit/constants";
import type { CreditScoreResult } from "@/lib/credit/types";

interface CreditScoreCardProps {
  result: CreditScoreResult;
  onDownload?: () => void;
}

export function CreditScoreCard({ result, onDownload }: CreditScoreCardProps) {
  const { creditScore, bureauName, reportDate, scoreCategory, creditRating } = result;
  const colors = SCORE_COLORS[scoreCategory];
  const [animatedScore, setAnimatedScore] = useState(300);

  // Score counter animation
  useEffect(() => {
    let start = 300;
    const end = creditScore;
    if (start === end) return;

    const duration = 1200; // ms
    const increment = Math.ceil((end - start) / (duration / 16));
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        clearInterval(timer);
        setAnimatedScore(end);
      } else {
        setAnimatedScore(start);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [creditScore]);

  // SVG Gauge calculations
  const radius = 80;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  
  // Credit score ranges from 300 to 900 (range of 600)
  const scoreRange = 900 - 300;
  const scoreOffset = Math.max(0, Math.min(scoreRange, creditScore - 300));
  const strokeDashoffset = circumference - (scoreOffset / scoreRange) * circumference;

  return (
    <Card className="w-full border-white/10 bg-black/40 backdrop-blur-md text-white shadow-2xl relative overflow-hidden">
      {/* Glow effect matching score category */}
      <div 
        className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-10 pointer-events-none transition-all duration-500"
        style={{ backgroundColor: colors.text === "text-emerald-500" ? "#10b981" : colors.text === "text-blue-500" ? "#3b82f6" : colors.text === "text-orange-500" ? "#f97316" : "#ef4444" }}
      />

      <div className="p-6 border-b border-white/5 pb-4 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-white">Your Credit Health</h3>
          <p className="text-white/60 text-xs mt-1">Powered by {bureauName} Bureau</p>
        </div>
        <span 
          className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${colors.badge}`}
        >
          {scoreCategory}
        </span>
      </div>

      <div className="p-6 pt-8 pb-6 flex flex-col items-center">
        {/* SVG Circular Progress Gauge */}
        <div className="relative flex items-center justify-center w-48 h-48">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background track circle */}
            <circle
              className="text-white/5"
              strokeWidth={stroke}
              stroke="currentColor"
              fill="transparent"
              r={normalizedRadius}
              cx={radius + stroke}
              cy={radius + stroke}
            />
            {/* Active progress circle */}
            <circle
              className="transition-all duration-1000 ease-out"
              strokeWidth={stroke}
              strokeDasharray={circumference + " " + circumference}
              style={{ strokeDashoffset, stroke: colors.text === "text-emerald-500" ? "#10b981" : colors.text === "text-blue-500" ? "#3b82f6" : colors.text === "text-orange-500" ? "#f97316" : "#ef4444" }}
              strokeLinecap="round"
              fill="transparent"
              r={normalizedRadius}
              cx={radius + stroke}
              cy={radius + stroke}
            />
          </svg>

          {/* Centered Score text */}
          <div className="absolute flex flex-col items-center text-center">
            <span className="text-5xl font-extrabold tracking-tighter tabular-nums drop-shadow-md">
              {animatedScore}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-white/50 font-medium mt-1">
              Score Range 300-900
            </span>
          </div>
        </div>

        {/* Bureau details & description */}
        <div className="text-center mt-6 max-w-sm">
          <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
            {scoreCategory === "excellent" || scoreCategory === "good" ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-orange-400" />
            )}
            {creditRating}
          </h3>
          <p className="text-white/60 text-xs mt-2 px-4 leading-relaxed">
            Report generated on {formatCreditDate(reportDate)}. This score reflects your borrowing history, loan repayments, and credit card utilization.
          </p>
        </div>

        {/* Action Button */}
        {onDownload && (
          <Button
            onClick={onDownload}
            className="w-full mt-6 bg-white hover:bg-white/90 text-black font-semibold flex items-center justify-center gap-2 py-5 shadow-lg transition-transform hover:scale-[1.01]"
          >
            <Download className="w-4 h-4" />
            Download Detailed Report PDF
          </Button>
        )}
      </div>
    </Card>
  );
}
