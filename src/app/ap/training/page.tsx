import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, CheckCircle2, Circle } from "lucide-react";

import { GlassPanel, PageHeader } from "@/components/ap/ui";
import { buildOnboardingChecklist } from "@/lib/ap/finance";
import {
  getAgencyPartnerByUserId,
  getAPCommissions,
  getAPDashboardStats,
} from "@/lib/ap-data";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const GUIDES = [
  { id: "getting-started", title: "Getting Started", minutes: 4, difficulty: "Beginner", body: "Sign in at /ap/login, complete profile and KYC, then open your dashboard command center." },
  { id: "customers", title: "Customer Creation", minutes: 3, difficulty: "Beginner", body: "Create or select a customer before filing. Keep mobile numbers accurate for OTP and updates." },
  { id: "workflow", title: "Service Application Workflow", minutes: 6, difficulty: "Intermediate", body: "Use Apply New Service, fill required fields, submit, then track status tabs on Applications." },
  { id: "documents", title: "Document Upload Process", minutes: 5, difficulty: "Intermediate", body: "When status asks for documents, open the application and upload clear scans. Never share KYC of other customers." },
  { id: "wallet", title: "Wallet and Commission", minutes: 5, difficulty: "Intermediate", body: "Eligible filings credit commissions. Wallet balance is ledger-based. Request payouts of ₹500+ from Wallet or Payouts." },
  { id: "status", title: "Application Status Guide", minutes: 4, difficulty: "Beginner", body: "Draft → Submitted → Documents/Payment → In Process → Completed/Rejected. Follow the next-action cue on each row." },
  { id: "kyc", title: "KYC and Account Safety", minutes: 4, difficulty: "Beginner", body: "Keep KYC approved and active. Do not share passwords. Use Change Password if credentials were onboarded for you." },
  { id: "support", title: "Support and Escalation", minutes: 3, difficulty: "Beginner", body: "Use Support for FAQs and WhatsApp desk categories. Escalate login, KYC, payment or wallet issues with your partner code." },
] as const;

export default async function APTrainingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/ap/login");
  if (!(await isActiveAgent(user))) redirect("/unauthorized");

  const ap = await getAgencyPartnerByUserId(user.id);
  if (!ap) redirect("/unauthorized");

  const supabase = getSupabaseAdmin();
  let customerCount = 0;
  if (supabase) {
    const { count } = await supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .or(`created_by.eq.${user.id},assigned_agent_id.eq.${user.id}`);
    customerCount = count ?? 0;
  }

  const [stats, commissions] = await Promise.all([
    getAPDashboardStats(ap.id),
    getAPCommissions(ap.id, 1),
  ]);

  const checklist = buildOnboardingChecklist({
    hasName: Boolean(ap.full_name?.trim()),
    hasMobile: Boolean(ap.mobile?.trim()),
    hasEmail: Boolean(ap.email?.trim()),
    hasAddress: Boolean(ap.address?.trim() || ap.district?.trim() || ap.state?.trim()),
    kycApproved: ap.kyc_status === "approved",
    hasShopDetails: Boolean(ap.business_name?.trim()),
    hasCustomer: customerCount > 0,
    hasApplication: stats.totalApplications > 0,
    hasCommission: commissions.length > 0 || stats.commissionEarned > 0,
  });

  const completed = checklist.filter((i) => i.complete).length;

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#F6F8FC] pb-24 text-[#0F172A] md:pb-10">
      <div className="relative mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-10">
        <PageHeader
          eyebrow="Growth"
          title="Training"
          description="Onboarding checklist based on your live Digi Partner account, plus practical workflow guides."
        />

        <GlassPanel padding="md" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Onboarding checklist</h2>
              <p className="text-xs font-medium text-slate-500">
                {completed} of {checklist.length} complete — status comes from your real profile and activity.
              </p>
            </div>
            <p className="text-xs font-bold text-indigo-700" aria-live="polite">
              {Math.round((completed / checklist.length) * 100)}%
            </p>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {checklist.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex min-h-[44px] items-center gap-3 rounded-2xl border px-3 py-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                    item.complete
                      ? "border-emerald-200 bg-emerald-50/70 text-emerald-800"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                  )}
                >
                  {item.complete ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <Circle className="h-4 w-4 shrink-0 text-slate-300" />}
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </GlassPanel>

        <section aria-labelledby="guides-heading" className="space-y-3">
          <h2 id="guides-heading" className="text-sm font-extrabold text-slate-900">
            Guides
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {GUIDES.map((guide) => {
              const done =
                (guide.id === "kyc" && ap.kyc_status === "approved") ||
                (guide.id === "customers" && customerCount > 0) ||
                (guide.id === "workflow" && stats.totalApplications > 0) ||
                (guide.id === "wallet" && (stats.commissionEarned > 0 || stats.walletBalance !== 0));

              return (
                <GlassPanel key={guide.id} padding="md" as="article" className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-extrabold text-slate-900">{guide.title}</h3>
                    <BookOpen className="h-4 w-4 shrink-0 text-indigo-600" />
                  </div>
                  <p className="text-xs font-medium leading-relaxed text-slate-500">{guide.body}</p>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    <span>~{guide.minutes} min</span>
                    <span>·</span>
                    <span>{guide.difficulty}</span>
                    <span>·</span>
                    <span className={done ? "text-emerald-600" : "text-slate-400"}>
                      {done ? "Progress linked" : "Open guide"}
                    </span>
                  </div>
                </GlassPanel>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
