// ============================================================
// Admin Portal Page — Single Credit Report Details & Audit Logs
// DigiConnect Dukan — Powered by RNOS India Pvt. Ltd.
// ============================================================

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Database, ShieldAlert, FileText } from "lucide-react";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreditReportViewer } from "@/components/credit/credit-report-viewer";
import { sanitizePanForLog } from "@/lib/credit/validators";

export const dynamic = "force-dynamic";

interface AdminReportDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminReportDetailPage({ params }: AdminReportDetailPageProps) {
  const { id } = await params;

  // 1. Authenticate admin user
  const user = await getCurrentUser();
  const isAdmin = isAdminUser(user);

  if (!user || !isAdmin) {
    redirect(`/login?redirect=/admin/credit-reports/${id}`);
  }

  // 2. Fetch specific credit report record
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        Database configuration missing.
      </div>
    );
  }

  const { data: report, error } = await supabase
    .from("credit_reports")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !report) {
    notFound();
  }

  // Mask PAN for admin details page viewing
  const sanitizedReport = {
    ...report,
    pan: sanitizePanForLog(report.pan),
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 md:px-8 text-white relative">
      <div className="absolute top-0 right-1/4 w-[500px] h-[250px] bg-gradient-to-b from-blue-600/5 to-transparent blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-6 relative">
        <div className="flex items-center gap-2">
          <Link href="/admin/credit-reports" passHref>
            <Button variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10 px-3 flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="border-b border-white/5 pb-4">
          <h1 className="text-2xl font-bold tracking-tight">Admin Credit Report Audit</h1>
          <p className="text-xs text-slate-400">Review bureau raw payloads and customer detail parameters</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Detailed viewer (Column 1 & 2) */}
          <div className="lg:col-span-2 space-y-6">
            <CreditReportViewer report={sanitizedReport} />
          </div>

          {/* Raw JSON Audit section (Column 3) */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-white/10 bg-black/40 backdrop-blur-md">
              <div className="p-6 border-b border-white/5">
                <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-white">
                  <Database className="w-4 h-4 text-cyan-400" />
                  API Payload Audit
                </h3>
              </div>
              <div className="p-6 pt-4 space-y-4">
                <div>
                  <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider block mb-1">
                    Raw Response JSON
                  </span>
                  <pre className="text-[9px] font-mono bg-black/60 p-3 rounded-lg overflow-x-auto text-emerald-400 border border-white/5 max-h-60">
                    {JSON.stringify(report.response_json || { info: "No raw payload stored" }, null, 2)}
                  </pre>
                </div>

                {report.error_message && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider block flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Failure Reason
                    </span>
                    <p className="text-[10px] leading-normal">{report.error_message}</p>
                  </div>
                )}

                <div className="text-[10px] text-slate-500 leading-normal flex items-start gap-1">
                  <FileText className="w-4 h-4 shrink-0 text-slate-600 mt-0.5" />
                  <span>
                    Admin actions on customer PII data are logged in credit audit histories to guarantee ISO/IEC compliance.
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
