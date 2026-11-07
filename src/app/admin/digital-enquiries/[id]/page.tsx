import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-shell";
import { PageContainer } from "@/components/admin/primitives/layout";
import { EnquiryActions } from "@/components/admin/digital-plans/enquiry-actions";
import { safeDate } from "@/lib/admin-format";
import { STATUS_TONE_CLASS } from "@/lib/admin/status-tone";
import { requireAdminPage } from "@/lib/digital-plans/admin-page";
import { enquiryTone } from "@/lib/digital-plans/enquiry-tone";
import { getQuotePublicUrl } from "@/lib/digital-plans/links";
import { formatPrice } from "@/lib/digital-plans/money";
import { getEnquiry, listAddonsForAdmin } from "@/lib/digital-plans/store";
import { ENQUIRY_STATUS_LABEL } from "@/lib/digital-plans/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DigitalEnquiryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const [enquiry, addons] = await Promise.all([getEnquiry(id), listAddonsForAdmin().catch(() => [])]);
  if (!enquiry) notFound();

  const suggestedLines = enquiry.addonSlugs
    .map((slug) => addons.find((addon) => addon.slug === slug))
    .filter((addon) => addon !== undefined)
    .map((addon) => ({ label: addon.name, amountPaise: addon.pricePaise, unit: addon.unit }));

  const facts: [string, React.ReactNode][] = [
    ["Mobile", <a key="m" href={`tel:+91${enquiry.mobile}`} className="text-blue-700 underline">{enquiry.mobile}</a>],
    ["Email", enquiry.email ?? "—"],
    ["Business", enquiry.businessName ?? "—"],
    ["Plan", enquiry.planName],
    ["Price at enquiry", `${formatPrice(enquiry.monthlyPricePaise, enquiry.priceIsStarting)}/month + ${formatPrice(enquiry.setupFeePaise, enquiry.priceIsStarting)} setup`],
    ["Commitment", `${enquiry.commitmentMonths} months`],
    ["Add-ons of interest", enquiry.addonSlugs.length ? enquiry.addonSlugs.join(", ") : "—"],
    ["Received", safeDate(enquiry.createdAt)],
    ["CRM lead", enquiry.leadId ? <Link key="l" href={`/admin/leads?q=${enquiry.mobile}`} className="text-blue-700 underline">Open in Leads</Link> : "Not linked"],
    ["Approval", enquiry.approvedAt ? `Approved by ${enquiry.approvalName} on ${safeDate(enquiry.approvedAt)}` : enquiry.declinedAt ? `Declined on ${safeDate(enquiry.declinedAt)}` : "Awaiting"],
  ];

  return (
    <PageContainer className="space-y-6">
      <AdminPageHeader
        eyebrow="Package Enquiries"
        title={`${enquiry.reference} · ${enquiry.name}`}
        description={`${enquiry.planName} plan`}
        backHref="/admin/digital-enquiries"
        backLabel="Enquiries"
        action={<span className={cn("inline-flex rounded-full px-3 py-1 text-sm font-bold", STATUS_TONE_CLASS[enquiryTone(enquiry.status)])}>{ENQUIRY_STATUS_LABEL[enquiry.status]}</span>}
      />
      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">Customer</h2>
          <dl className="mt-3 grid gap-3 text-sm">
            {facts.map(([term, value]) => (
              <div key={term}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{term}</dt>
                <dd className="mt-0.5 text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
          {enquiry.requirements ? (
            <>
              <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">Requirements</h3>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-800">{enquiry.requirements}</p>
            </>
          ) : null}
          <p className="mt-5 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
            Approving a quotation records the customer&apos;s consent only. No subscription is started and no payment is taken automatically; collect the setup fee through your usual invoice and payment process.
          </p>
        </section>
        <EnquiryActions enquiry={enquiry} suggestedLines={suggestedLines} quoteUrl={enquiry.quoteToken ? getQuotePublicUrl(enquiry.quoteToken) : null} />
      </div>
    </PageContainer>
  );
}
