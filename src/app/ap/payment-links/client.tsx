"use client";

import { Link2, Clock, CheckCircle2, Copy, XCircle } from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { Card } from "@/components/ui/card";

export interface PaymentLink {
  id: string;
  code: string;
  amount: number;
  status: string;
  created_at: string;
  expires_at: string;
  paid_at: string | null;
  applications?: {
    service_name: string;
    customer_details: Record<string, unknown>;
  } | null;
  profiles?: {
    full_name: string;
    mobile: string;
  } | null;
}

export function APPaymentLinksClient({ links }: { links: PaymentLink[] }) {
  const { success: toastSuccess } = useToast();
  
  const copyLink = (code: string) => {
    const url = `${window.location.origin}/pay/${code}`;
    navigator.clipboard.writeText(url);
    toastSuccess("Payment link copied to clipboard!");
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-3 py-1 border border-purple-500/20 text-xs font-bold text-purple-600">
              Payment Management
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
              Payment Links
            </h1>
            <p className="mt-2 text-slate-500 max-w-2xl text-sm font-medium">
              Manage generated secure payment links sent to your customers.
            </p>
          </div>
        </div>

        <Card className="border border-slate-200/50 bg-white/70 backdrop-blur-md rounded-3xl p-4 md:p-6 overflow-hidden shadow-sm">
          <div className="space-y-4">
            {links.length > 0 ? (
              links.map((link) => (
                <div key={link.id} className="group relative flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/50 p-5 transition-all duration-200 hover:border-blue-500/20 hover:bg-slate-50 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-850 text-base">
                        {link.profiles?.full_name || "Customer"}
                      </span>
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-200" />
                      <span className="text-xs text-slate-500 font-semibold">
                        {link.applications?.service_name || "Service"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-slate-450 font-semibold">
                      <span className="inline-flex items-center gap-1">
                        ₹{link.amount}
                      </span>
                      <span className="hidden sm:inline text-slate-200">|</span>
                      <span className="text-purple-600 text-[10px] font-bold bg-purple-50 px-2 py-0.5 border border-purple-100 rounded-md">
                        {link.code}
                      </span>
                      <span className="hidden sm:inline text-slate-200">|</span>
                      <span>
                        {new Date(link.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    {link.status === "pending" && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                        <Clock className="h-3.5 w-3.5" /> Pending
                      </span>
                    )}
                    {link.status === "paid" && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Paid
                      </span>
                    )}
                    {link.status === "expired" && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-200">
                        <XCircle className="h-3.5 w-3.5" /> Expired
                      </span>
                    )}
                    {link.status === "cancelled" && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                        <XCircle className="h-3.5 w-3.5" /> Cancelled
                      </span>
                    )}
                    
                    {link.status === "pending" && (
                      <button 
                        onClick={() => copyLink(link.code)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl text-xs font-bold transition-colors"
                      >
                        <Copy className="h-3.5 w-3.5" /> Copy Link
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Link2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-800">No Payment Links</h3>
                <p className="text-slate-400 mt-2 text-sm">You haven&apos;t generated any payment links yet.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
