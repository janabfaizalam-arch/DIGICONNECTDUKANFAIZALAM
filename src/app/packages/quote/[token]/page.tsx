import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

import { QuoteResponse } from "@/components/packages/quote-response";
import { MarketingFooter } from "@/components/marketing-footer";
import { COMMERCIAL_NOTES } from "@/lib/digital-plans/commercial";
import { formatPaise, quoteTotals, UNIT_LABEL } from "@/lib/digital-plans/money";
import { getEnquiryByToken, quoteIsOpen } from "@/lib/digital-plans/store";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your quotation | RNOS Digital",
  robots: { index: false, follow: false },
};

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" });

export default async function QuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const enquiry = await getEnquiryByToken(token);
  if (!enquiry || !enquiry.quotedAt || enquiry.quoteMonthlyPaise === null || enquiry.quoteSetupPaise === null) notFound();

  const commitment = enquiry.quoteCommitmentMonths ?? enquiry.commitmentMonths;
  const totals = quoteTotals({
    monthlyPaise: enquiry.quoteMonthlyPaise,
    setupPaise: enquiry.quoteSetupPaise,
    lines: enquiry.quoteLines,
    gstPercent: enquiry.quoteGstPercent,
    commitmentMonths: commitment,
  });
  const open = quoteIsOpen(enquiry);
  const expired = enquiry.status === "quoted" && !open;
  const whatsappUrl = buildWhatsAppUrl(`Hello RNOS Digital, about my quotation ${enquiry.reference}.`);

  const row = "flex items-baseline justify-between gap-6 py-3 text-[15px]";

  return (
    <>
      <main id="main-content" className="bg-[var(--dc-sky-soft)] px-4 py-12 sm:px-6 sm:py-16">
        <article className="mx-auto max-w-3xl overflow-hidden rounded-[28px] bg-white shadow-[0_40px_100px_-50px_rgba(1,29,95,0.5)] ring-1 ring-slate-900/5">
          <header className="bg-[var(--dc-blue-deep)] px-6 py-8 text-white sm:px-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--dc-amber)]">RNOS Digital · Quotation {enquiry.reference}</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{enquiry.planName} plan</h1>
            <p className="mt-2 text-sm text-white/70">
              Prepared for {enquiry.name}
              {enquiry.businessName ? `, ${enquiry.businessName}` : ""} · {dateFmt.format(new Date(enquiry.quotedAt))}
              {enquiry.quoteValidUntil ? ` · Valid until ${dateFmt.format(new Date(`${enquiry.quoteValidUntil}T00:00:00`))}` : ""}
            </p>
          </header>

          <div className="px-6 py-8 sm:px-10">
            {enquiry.status === "approved" || enquiry.status === "won" ? (
              <p role="status" className="mb-8 flex items-start gap-3 rounded-2xl bg-emerald-50 px-5 py-4 text-sm text-emerald-900 ring-1 ring-emerald-200">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                Approved by {enquiry.approvalName}
                {enquiry.approvedAt ? ` on ${dateFmt.format(new Date(enquiry.approvedAt))}` : ""}. Our team will contact you with the setup invoice and next steps.
              </p>
            ) : enquiry.status === "declined" ? (
              <p role="status" className="mb-8 flex items-start gap-3 rounded-2xl bg-slate-100 px-5 py-4 text-sm text-slate-700">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /> You declined this quotation. If you change your mind or need a different scope, message us.
              </p>
            ) : expired ? (
              <p role="status" className="mb-8 flex items-start gap-3 rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-900 ring-1 ring-amber-200">
                <Clock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /> This quotation has expired. Please contact us for an updated one.
              </p>
            ) : null}

            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--dc-muted)]">Price</h2>
            <div className="mt-2 divide-y divide-slate-100">
              <p className={row}>
                <span>{enquiry.planName} — one-time setup</span>
                <span className="font-semibold tabular-nums">{formatPaise(enquiry.quoteSetupPaise)}</span>
              </p>
              <p className={row}>
                <span>{enquiry.planName} — monthly fee</span>
                <span className="font-semibold tabular-nums">{formatPaise(enquiry.quoteMonthlyPaise)}/month</span>
              </p>
              {enquiry.quoteLines.map((line, index) => (
                <p key={`${line.label}-${index}`} className={row}>
                  <span>
                    {line.label} <span className="text-xs text-[var(--dc-muted)]">({UNIT_LABEL[line.unit]})</span>
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatPaise(line.amountPaise)}
                    {line.unit === "monthly" ? "/month" : ""}
                  </span>
                </p>
              ))}
            </div>

            <dl className="mt-6 grid gap-3 rounded-2xl bg-[var(--dc-sky-soft)] p-5 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[var(--dc-muted)]">One-time total</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-[var(--dc-ink)]">
                  {formatPaise(totals.oneTimePaise)} + {formatPaise(totals.oneTimeGstPaise)} GST
                </dd>
              </div>
              <div>
                <dt className="text-[var(--dc-muted)]">Monthly total</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-[var(--dc-ink)]">
                  {formatPaise(totals.monthlyPaise)} + {formatPaise(totals.monthlyGstPaise)} GST
                </dd>
              </div>
              <div>
                <dt className="text-[var(--dc-muted)]">First payment (setup + first month, incl. {enquiry.quoteGstPercent}% GST)</dt>
                <dd className="mt-0.5 font-[family-name:var(--font-heading)] text-xl font-semibold tabular-nums text-[var(--dc-ink)]">{formatPaise(totals.firstPaymentPaise)}</dd>
              </div>
              <div>
                <dt className="text-[var(--dc-muted)]">Minimum commitment</dt>
                <dd className="mt-0.5 font-semibold text-[var(--dc-ink)]">
                  {commitment ? `${commitment} months (${formatPaise(totals.commitmentValuePaise)} before GST)` : "None"}
                </dd>
              </div>
            </dl>

            {enquiry.quoteNotes ? (
              <section className="mt-8">
                <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--dc-muted)]">Scope and notes</h2>
                <p className="mt-2 whitespace-pre-line text-[15px] leading-7 text-[var(--dc-body)]">{enquiry.quoteNotes}</p>
              </section>
            ) : null}

            <section className="mt-8">
              <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--dc-muted)]">Terms</h2>
              <ul className="mt-3 grid gap-2 text-sm leading-6 text-[var(--dc-body)]">
                {COMMERCIAL_NOTES.map((note) => (
                  <li key={note.title}>
                    <strong className="font-semibold text-[var(--dc-ink)]">{note.title}.</strong> {note.text}
                  </li>
                ))}
              </ul>
            </section>

            {open ? (
              <section aria-labelledby="approve-heading" className="mt-10 rounded-2xl p-6 ring-1 ring-slate-900/10">
                <h2 id="approve-heading" className="font-[family-name:var(--font-heading)] text-xl font-semibold text-[var(--dc-ink)]">Approve this quotation</h2>
                <div className="mt-4">
                  <QuoteResponse token={token} />
                </div>
              </section>
            ) : null}

            <p className="mt-8 text-sm text-[var(--dc-muted)]">
              Questions?{" "}
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--dc-blue-bright)] underline">
                Message us on WhatsApp
              </a>{" "}
              quoting {enquiry.reference}.
            </p>
          </div>
        </article>
      </main>
      <MarketingFooter />
    </>
  );
}
