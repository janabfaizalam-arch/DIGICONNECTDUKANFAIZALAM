import { redirect } from "next/navigation";
import { MessageCircle, Phone, LifeBuoy, CheckCircle2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { buildAgentWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { getAgencyPartnerByUserId } from "@/lib/ap-data";

export const dynamic = "force-dynamic";

export default async function APSupportPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/ap/login");
  }

  if (!(await isActiveAgent(user))) {
    redirect("/unauthorized");
  }

  const ap = await getAgencyPartnerByUserId(user.id);
  if (!ap) {
    redirect("/unauthorized");
  }

  const supportTopics = [
    "KYC Documents & Aadhaar/PAN Validation",
    "Application Status & Document Pending Help",
    "Razorpay Double Payments & Refunds",
    "Wallet Ledger Settlement & Commissions Discrepancy",
    "Partner Tier Promotion Eligibility",
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 border border-blue-500/20 text-xs font-bold text-blue-400">
            Agency Partner Help
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white md:text-5xl">
            Partner Support
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Resolve settlement, document processing or compliance issues directly with our team.
          </p>
        </div>

        <Card className="border border-white/5 bg-slate-900/20 p-5 md:p-8 rounded-3xl backdrop-blur-md space-y-6">
          <div className="flex gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <LifeBuoy className="h-6 w-6" />
            </span>
            <div>
              <h3 className="font-extrabold text-white text-base">DigiConnect Support Desk</h3>
              <p className="mt-1 text-slate-400 text-sm leading-relaxed">
                Contact our partner helpdesk for customer assistance, payment reconciliation, document verifications, or commission adjustments.
              </p>
            </div>
          </div>

          <div className="space-y-2 border-t border-white/5 pt-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Support Topics Covered</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {supportTopics.map((topic) => (
                <div key={topic} className="flex items-center gap-2 text-xs font-semibold text-slate-300 bg-slate-950 px-3 py-2 rounded-xl border border-white/5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>{topic}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row pt-3">
            <a
              href="tel:7007595931"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-900 border border-white/10 hover:bg-slate-850 px-6 font-bold text-white transition-all duration-150 text-sm flex-1"
            >
              <Phone className="h-4 w-4" />
              Call Partner Helpdesk
            </a>
            
            <a
              href={buildWhatsAppUrl(
                buildAgentWhatsAppMessage({
                  agentName: ap.full_name,
                  topic: "Agency Partner general support for KYC, wallet adjustments or service processing help.",
                })
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 px-6 font-bold text-white transition-all duration-150 text-sm flex-1 shadow-lg shadow-emerald-950/20"
            >
              <MessageCircle className="h-4 w-4" />
              Chat on WhatsApp
            </a>
          </div>
        </Card>
      </div>
    </main>
  );
}
