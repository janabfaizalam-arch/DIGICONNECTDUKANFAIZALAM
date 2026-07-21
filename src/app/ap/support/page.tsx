import Link from "next/link";
import { redirect } from "next/navigation";
import { Headphones, MessageCircle, Phone } from "lucide-react";

import { GlassPanel, PageHeader } from "@/components/ap/ui";
import { getAgencyPartnerByUserId } from "@/lib/ap-data";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { contactDetails } from "@/lib/constants";
import { buildSupportWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  { id: "login", label: "Login and Account", topic: "Digi Partner login or account access issue" },
  { id: "kyc", label: "KYC", topic: "Digi Partner KYC verification help" },
  { id: "application", label: "Application", topic: "Digi Partner application status or filing help" },
  { id: "payment", label: "Payment", topic: "Digi Partner customer payment issue" },
  { id: "wallet", label: "Wallet", topic: "Digi Partner wallet balance or ledger question" },
  { id: "commission", label: "Commission", topic: "Digi Partner commission or settlement question" },
  { id: "technical", label: "Technical Issue", topic: "Digi Partner technical issue on the portal" },
] as const;

const FAQS = [
  {
    q: "Why can’t I open the Digi Partner dashboard?",
    a: "Your account must be active with approved KYC. Contact support with your partner code if you see Unauthorized.",
  },
  {
    q: "When do commissions appear?",
    a: "Eligible completed filings credit commissions per configured rules. Check Commissions for status: pending, approved or paid.",
  },
  {
    q: "How do payouts work?",
    a: "Request ₹500 or more from Wallet or Payouts when balance is available. Only one pending request is allowed at a time.",
  },
  {
    q: "Is there an in-app ticket system?",
    a: "Partner tickets are handled via WhatsApp and phone today. Use a category below so the desk gets the right context.",
  },
] as const;

export default async function APSupportPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/ap/login");
  if (!(await isActiveAgent(user))) redirect("/unauthorized");

  const ap = await getAgencyPartnerByUserId(user.id);
  if (!ap) redirect("/unauthorized");

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#F6F8FC] pb-24 text-[#0F172A] md:pb-10">
      <div className="relative mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-10">
        <PageHeader
          eyebrow="Growth"
          title="Support"
          description="WhatsApp is the current Digi Partner support channel. Share your partner code for faster help."
        />

        <GlassPanel padding="md" className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Current channel</p>
          <p className="text-sm font-medium text-slate-600">
            In-app ticket storage is not enabled for partners yet. Use WhatsApp or call — contacts come from DigiConnect configuration.
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={`tel:+91${contactDetails.primaryPhone}`}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700"
            >
              <Phone className="h-4 w-4" />
              +91 {contactDetails.primaryPhone}
            </a>
            <a
              href={`mailto:${contactDetails.email}`}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700"
            >
              <Headphones className="h-4 w-4" />
              {contactDetails.email}
            </a>
          </div>
          <p className="text-[11px] font-semibold text-slate-400">
            Partner: {ap.full_name} · Code {ap.partner_code}
          </p>
        </GlassPanel>

        <section aria-labelledby="categories-heading" className="space-y-3">
          <h2 id="categories-heading" className="text-sm font-extrabold text-slate-900">
            WhatsApp by category
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((cat) => {
              const href = buildWhatsAppUrl(
                buildSupportWhatsAppMessage({
                  page: "ap_support",
                  topic: `${cat.topic} | Partner ${ap.partner_code}`,
                }),
              );
              return (
                <a
                  key={cat.id}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[52px] items-center gap-3 rounded-[20px] border border-white/70 bg-white/75 px-4 text-sm font-bold text-slate-800 shadow-sm backdrop-blur-xl transition hover:border-emerald-200 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <MessageCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                  {cat.label}
                </a>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="faq-heading" className="space-y-3">
          <h2 id="faq-heading" className="text-sm font-extrabold text-slate-900">
            FAQs
          </h2>
          <div className="grid gap-2 md:grid-cols-2">
            {FAQS.map((faq) => (
              <GlassPanel key={faq.q} padding="md" as="article">
                <h3 className="text-sm font-extrabold text-slate-900">{faq.q}</h3>
                <p className="mt-1.5 text-xs font-medium leading-relaxed text-slate-500">{faq.a}</p>
              </GlassPanel>
            ))}
          </div>
        </section>

        <p className="text-center text-[11px] font-medium text-slate-400">
          Prefer self-serve? Visit{" "}
          <Link href="/ap/training" className="font-bold text-indigo-700 hover:underline">
            Training
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
