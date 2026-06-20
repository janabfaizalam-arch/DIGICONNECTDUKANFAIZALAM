// ============================================================
// Credit UI Component — Customer Credit History List Table
// DigiConnect Dukan — Powered by RNOS India Pvt. Ltd.
// ============================================================

"use client";

import React from "react";
import Link from "next/link";
import { Download, Eye, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCreditDate } from "@/lib/credit/constants";
import type { CreditHistoryEntry } from "@/lib/credit/types";

interface CreditHistoryTableProps {
  entries: CreditHistoryEntry[];
}

export function CreditHistoryTable({ entries }: CreditHistoryTableProps) {
  if (!entries || entries.length === 0) {
    return (
      <div className="bg-black/30 border border-white/10 rounded-2xl p-8 text-center text-white/50 space-y-3">
        <AlertCircle className="w-10 h-10 mx-auto text-white/30" />
        <h4 className="font-semibold text-white/80">No credit reports found</h4>
        <p className="text-xs max-w-xs mx-auto leading-normal">
          You haven&apos;t run any credit checks yet. Choose &quot;Check Credit Score&quot; to start.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-white/10 bg-black/40 backdrop-blur-md rounded-2xl overflow-hidden shadow-lg">
      <Table>
        <TableHeader className="bg-white/5">
          <TableRow className="border-b border-white/10">
            <TableHead className="text-white font-semibold">Date Checked</TableHead>
            <TableHead className="text-white font-semibold">Bureau</TableHead>
            <TableHead className="text-white font-semibold">Score</TableHead>
            <TableHead className="text-white font-semibold">Rating</TableHead>
            <TableHead className="text-white font-semibold">Package</TableHead>
            <TableHead className="text-white font-semibold">Status</TableHead>
            <TableHead className="text-white font-semibold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => {
            const isCompleted = entry.status === "completed";
            const isFailed = entry.status === "failed";
            
            let statusColor = "bg-yellow-500/10 text-yellow-400";
            if (isCompleted) statusColor = "bg-emerald-500/10 text-emerald-400";
            if (isFailed) statusColor = "bg-red-500/10 text-red-400";

            return (
              <TableRow key={entry.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <TableCell className="font-medium text-white/90">
                  {formatCreditDate(entry.createdAt)}
                </TableCell>
                <TableCell className="text-white/70">{entry.bureauName || "—"}</TableCell>
                <TableCell className="font-bold text-white">
                  {isCompleted ? entry.creditScore : "—"}
                </TableCell>
                <TableCell className="capitalize text-white/80">
                  {isCompleted ? entry.scoreCategory : "—"}
                </TableCell>
                <TableCell className="capitalize text-white/70 text-xs">
                  {entry.packageType.replace("_", " ")}
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${statusColor}`}>
                    {entry.status.replace("_", " ")}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {isCompleted && (
                      <Link href={`/customer/credit-reports/${entry.id}`} passHref>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    )}
                    {isCompleted && entry.hasPdf && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(`/api/credit/download?id=${entry.id}`, "_blank")}
                        className="h-8 w-8 text-white/60 hover:text-emerald-400 hover:bg-emerald-500/10"
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
