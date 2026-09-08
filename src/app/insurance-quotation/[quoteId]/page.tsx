import Image from "next/image";
import { notFound } from "next/navigation";
import { AlertTriangle, CalendarDays, Car, FileText, Receipt, ShieldCheck } from "lucide-react";

import { InsuranceQuotationActions } from "@/components/insurance-quotation-actions";
import { contactDetails } from "@/lib/constants";
import {
  daysUntilExpiry,
  effectiveStatus,
  formatInsuranceCurrency,
  formatInsuranceDate,
  getPublicInsuranceQuotation,
  type InsuranceQuotation,
  type InsuranceQuotationStatus,
} from "@/lib/insurance-quotations";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vehicle Insurance Quotation | DigiConnect Dukan",
  robots: { index: false, follow: false },
};

/**
 * A customer's quotation, on one screen.
 *
 * Rewritten around what a person actually does with this page: check the
 * total, check how long it is good for, and decide. So the money and the
 * validity lead, and everything else is supporting detail underneath.
 *
 * Two rules the old page broke. It showed every field whether or not it had a
 * value — ten "Not specified" cards on a two-wheeler quote, which buries the
 * four lines that matter. And it never noticed expiry: a quotation whose
 * validity lapsed in March still greeted its customer as "Sent", beside a
 * premium the shop could no longer honour. Expiry is now derived from the
 * date and stated at the top.
 *
 * The word "Official" is gone from the header. This shop is not an insurer
 * and does not issue policies; the quotation is its own estimate, and the
 * footer says what the estimate is subject to.
 */

const STATUS: Record<InsuranceQuotationStatus, { label: string; chip: string }> = {
  draft: { label: "Draft", chip: "bg-slate-100 text-slate-700 ring-slate-200" },
  sent: { label: "Active", chip: "bg-blue-50 text-blue-700 ring-blue-100" },
  accepted: { label: "Accepted", chip: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
  rejected: { label: "Closed", chip: "bg-slate-100 text-slate-600 ring-slate-200" },
  expired: { label: "Expired", chip: "bg-orange-50 text-orange-800 ring-orange-200" },
};

/** A field with nothing in it is not rendered — see the note above. */
function Detail({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === "" || value === "Not specified") return null;
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">{label}</dt>
      <dd className="mt-1 text-[14px] font-bold text-slate-900">{value}</dd>
    </div>
  );
}

function Block({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof ShieldCheck;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 print:break-inside-avoid">
      <h2 className="flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.12em] text-slate-600">
        <Icon className="h-4 w-4 text-blue-700" aria-hidden="true" />
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function PublicInsuranceQuotationPage({
  params,
}: {
  params: Promise<{ quoteId: string }>;
}) {
  const { quoteId } = await params;
  const quotation = await getPublicInsuranceQuotation(quoteId);

  if (!quotation) notFound();

  const premium = Number(quotation.premium_amount ?? 0);
  const gst = Number(quotation.gst_amount ?? 0);
  const total = Number(quotation.total_amount ?? 0);
  const status = effectiveStatus(quotation);
  const daysLeft = daysUntilExpiry(quotation.valid_till);
  const live = status !== "expired" && status !== "rejected";

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-5 text-slate-900 md:px-6 md:py-10 print:bg-white print:p-0">
      <div className="mx-auto max-w-3xl space-y-4 print:max-w-none print:space-y-3">
        {/* ── Identity ─────────────────────────────────────────────────── */}
        <header className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <Image
              src="/logo-navbar.png"
              alt="DigiConnect Dukan"
              width={220}
              height={94}
              priority
              className="h-auto w-[150px] object-contain md:w-[180px]"
            />
            <span
              className={cn(
                "inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-wide ring-1",
                STATUS[status].chip,
              )}
            >
              {STATUS[status].label}
            </span>
          </div>
          <h1 className="mt-4 text-[1.4rem] font-extrabold tracking-tight text-slate-950 md:text-[1.75rem]">
            Vehicle Insurance Quotation
          </h1>
          <p className="mt-1 font-mono text-[12px] font-bold text-blue-800">{quotation.quote_number}</p>
        </header>

        {/*
          Expiry, said once and said first. A customer reading a lapsed
          premium and calling to pay it is the failure this prevents.
        */}
        {status === "expired" ? (
          <p className="flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-[13.5px] font-bold text-orange-900">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <span>
              Yeh quotation {formatInsuranceDate(quotation.valid_till)} ko expire ho chuki hai. Premium ab
              badal sakta hai — naya quotation ke liye humein call ya WhatsApp kijiye.
            </span>
          </p>
        ) : daysLeft !== null && daysLeft <= 3 ? (
          <p className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[13.5px] font-bold text-amber-900">
            <CalendarDays className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <span>
              {daysLeft === 0 ? "Aaj aakhri din hai" : `Sirf ${daysLeft} din baaki hain`} — yeh quotation{" "}
              {formatInsuranceDate(quotation.valid_till)} tak valid hai.
            </span>
          </p>
        ) : null}

        {/* ── The number, and the date it stops being true ─────────────── */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white print:break-inside-avoid">
          <div className="grid gap-px bg-slate-200 sm:grid-cols-[1.4fr_1fr]">
            <div className="bg-white p-5 md:p-6">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">Total payable</p>
              <p className="mt-1.5 text-[2.2rem] font-extrabold leading-none tracking-tight text-blue-800 tabular-nums md:text-[2.6rem]">
                {formatInsuranceCurrency(total)}
              </p>
              <dl className="mt-4 space-y-1.5 text-[13px]">
                <div className="flex justify-between gap-4">
                  <dt className="font-semibold text-slate-600">Base premium</dt>
                  <dd className="font-bold tabular-nums text-slate-900">{formatInsuranceCurrency(premium)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-semibold text-slate-600">GST / taxes</dt>
                  <dd className="font-bold tabular-nums text-slate-900">{formatInsuranceCurrency(gst)}</dd>
                </div>
              </dl>
            </div>
            <div className="bg-slate-50 p-5 md:p-6">
              <dl className="space-y-3.5">
                <Detail label="Valid till" value={formatInsuranceDate(quotation.valid_till)} />
                <Detail label="Quoted on" value={formatInsuranceDate(quotation.created_at)} />
                <Detail label="Cover" value={quotation.insurance_type} />
                <Detail label="Policy duration" value={quotation.policy_duration} />
                <Detail label="Insurer" value={quotation.insurer_company} />
              </dl>
            </div>
          </div>
        </section>

        {/* ── Act ──────────────────────────────────────────────────────── */}
        <div className="print:hidden">
          <InsuranceQuotationActions quotation={quotation as InsuranceQuotation} status={status} canAccept={live} />
        </div>

        {/* ── Supporting detail ────────────────────────────────────────── */}
        <Block title="Vehicle" icon={Car}>
          <dl className="grid gap-4 sm:grid-cols-3">
            <Detail label="Registration number" value={quotation.vehicle_number} />
            <Detail label="Type" value={quotation.vehicle_type} />
            <Detail label="Make" value={quotation.make} />
            <Detail label="Model" value={quotation.model} />
            <Detail label="Variant" value={quotation.variant} />
            <Detail label="Fuel" value={quotation.fuel_type} />
            <Detail label="Registration year" value={quotation.registration_year} />
            <Detail
              label="Previous policy expiry"
              value={quotation.previous_policy_expiry ? formatInsuranceDate(quotation.previous_policy_expiry) : null}
            />
            <Detail label="NCB" value={quotation.ncb} />
            <Detail label="IDV" value={quotation.idv_amount ? formatInsuranceCurrency(quotation.idv_amount) : null} />
          </dl>
        </Block>

        <Block title="Customer" icon={ShieldCheck}>
          <dl className="grid gap-4 sm:grid-cols-3">
            <Detail label="Name" value={quotation.customer_name} />
            <Detail label="Mobile" value={quotation.mobile} />
            <Detail label="Email" value={quotation.email} />
            <Detail label="Address" value={quotation.address} />
          </dl>
        </Block>

        {quotation.addons ? (
          <Block title="Add-ons included" icon={ShieldCheck}>
            <p className="whitespace-pre-line text-[13.5px] leading-6 text-slate-700">{quotation.addons}</p>
          </Block>
        ) : null}

        <Block title="Documents required" icon={FileText}>
          <p className="whitespace-pre-line text-[13.5px] leading-6 text-slate-700">
            {quotation.documents_required ||
              "RC copy, previous policy copy, owner KYC, and any document the insurer asks for."}
          </p>
        </Block>

        <Block title="Terms" icon={Receipt}>
          <p className="whitespace-pre-line text-[13.5px] leading-6 text-slate-700">
            {quotation.notes ||
              "Premium is subject to the insurer's approval, inspection where applicable, and document verification. This quotation holds only until the date above."}
          </p>
        </Block>

        {/* ── Who to call ──────────────────────────────────────────────── */}
        <footer className="rounded-2xl bg-slate-950 p-5 text-white md:p-6 print:break-inside-avoid">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[15px] font-bold">DigiConnect Dukan</p>
              <p className="mt-0.5 text-[12.5px] text-white/65">Powered by RNoS India Pvt Ltd</p>
            </div>
            <div className="grid gap-1.5 text-[13px] font-semibold">
              <a
                href={`tel:+91${contactDetails.primaryPhone}`}
                className="inline-flex min-h-11 items-center gap-2 text-white/90 hover:text-white"
              >
                +91 {contactDetails.primaryPhone}
              </a>
              <a
                href={`mailto:${contactDetails.email}`}
                className="inline-flex min-h-11 items-center gap-2 text-white/90 hover:text-white"
              >
                {contactDetails.email}
              </a>
            </div>
          </div>
        </footer>

        <p className="px-2 pb-2 text-center text-[11.5px] leading-5 text-slate-500">
          This is a computer-generated estimate prepared by DigiConnect Dukan, a private digital service
          centre. It is not a policy and not an insurer&apos;s offer. Final issuance depends on payment,
          document verification and the insurer&apos;s underwriting.
        </p>
      </div>
    </main>
  );
}
