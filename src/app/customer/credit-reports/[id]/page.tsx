// ============================================================
// Customer Portal Page — View Single Credit Report Details
// DigiConnect Dukan — Powered by RNOS India Pvt. Ltd.
// ============================================================

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { CreditReportViewer } from "@/components/credit/credit-report-viewer";

export const dynamic = "force-dynamic";

interface CustomerReportDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerReportDetailPage({ params }: CustomerReportDetailPageProps) {
  const { id } = await params;

  // 1. Authenticate user
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?redirect=/customer/credit-reports/${id}`);
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

  // 3. Authorization check — must own this report
  if (report.customer_id !== user.id) {
    redirect("/unauthorized");
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 md:px-8 text-white relative">
      <div className="absolute top-0 right-1/4 w-[500px] h-[250px] bg-gradient-to-b from-blue-600/5 to-transparent blur-[120px] pointer-events-none" />

      <div className="max-w-xl mx-auto space-y-6 relative">
        <div className="flex items-center gap-2">
          <Link href="/customer/credit-reports" passHref>
            <Button variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10 px-3 flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" />
              Back to Reports
            </Button>
          </Link>
        </div>

        <div className="border-b border-white/5 pb-4">
          <h1 className="text-2xl font-bold tracking-tight">Credit Score Report Summary</h1>
          <p className="text-xs text-slate-400">Detailed credit intelligence sheet</p>
        </div>

        <CreditReportViewer report={report} />
      </div>
    </div>
  );
}
