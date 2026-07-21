import { redirect } from "next/navigation";
import { Copy, Megaphone, MessageCircle } from "lucide-react";

import { EmptyState, GlassPanel, PageHeader } from "@/components/ap/ui";
import { MarketingTemplatesClient } from "@/components/ap/marketing-templates-client";
import { getAgencyPartnerByUserId } from "@/lib/ap-data";
import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { servicesData } from "@/lib/services-data";

export const dynamic = "force-dynamic";

/**
 * Marketing hub intentionally ships without fabricated posters/price lists.
 * Approved downloadable creatives are not present in the repository —
 * WhatsApp caption templates use service titles only (no invented prices/offers).
 */
export default async function APMarketingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/ap/login");
  if (!(await isActiveAgent(user))) redirect("/unauthorized");

  const ap = await getAgencyPartnerByUserId(user.id);
  if (!ap) redirect("/unauthorized");

  const serviceTitles = servicesData.slice(0, 12).map((s) => ({
    slug: s.slug,
    title: s.title,
  }));

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#F6F8FC] pb-24 text-[#0F172A] md:pb-10">
      <div className="relative mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-10">
        <PageHeader
          eyebrow="Growth"
          title="Marketing hub"
          description="Promote DigiConnect Dukan with approved messaging. Downloadable creatives appear here only when published by admin."
        />

        <section aria-labelledby="assets-heading" className="space-y-3">
          <h2 id="assets-heading" className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <Megaphone className="h-4 w-4 text-indigo-600" />
            Approved creatives
          </h2>
          <EmptyState
            title="No approved assets published yet"
            description="Posters, WhatsApp creatives, banners and price lists will appear here once the DigiConnect team publishes approved files. We never invent offers or prices."
            actionLabel="Open training"
            actionHref="/ap/training"
            icon={<Megaphone className="h-5 w-5" />}
          />
        </section>

        <section aria-labelledby="templates-heading" className="space-y-3">
          <h2 id="templates-heading" className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <MessageCircle className="h-4 w-4 text-emerald-600" />
            WhatsApp message templates
          </h2>
          <GlassPanel padding="md">
            <p className="mb-4 text-xs font-medium leading-relaxed text-slate-500">
              Captions use service names only. Copy or share — do not add unverified prices, cashback or government claims.
            </p>
            <MarketingTemplatesClient
              partnerName={ap.full_name}
              partnerCode={ap.partner_code}
              services={serviceTitles}
            />
          </GlassPanel>
        </section>

        <GlassPanel padding="sm" className="flex items-start gap-2 text-xs font-medium text-slate-500">
          <Copy className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
          DigiConnect Dukan · Connecting People. Empowering Digital India. · Powered by RNoS India Pvt. Ltd.
        </GlassPanel>
      </div>
    </main>
  );
}
