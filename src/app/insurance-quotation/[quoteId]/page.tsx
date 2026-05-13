import Image from "next/image";
import { notFound } from "next/navigation";
import { CalendarDays, FileText, Phone, ShieldCheck, Sparkles } from "lucide-react";

import { InsuranceQuotationActions } from "@/components/insurance-quotation-actions";
import { Card } from "@/components/ui/card";
import {
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
  robots: {
    index: false,
    follow: false,
  },
};

const statusClasses: Record<InsuranceQuotationStatus, string> = {
  draft: "bg-slate-100 text-slate-700 ring-slate-200",
  sent: "bg-blue-50 text-blue-700 ring-blue-100",
  accepted: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  rejected: "bg-red-50 text-red-700 ring-red-100",
  expired: "bg-orange-50 text-orange-700 ring-orange-100",
};

const statusLabels: Record<InsuranceQuotationStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  rejected: "Rejected",
  expired: "Expired",
};

function Detail({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
      <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-bold text-slate-950">{value || "Not specified"}</p>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof ShieldCheck; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          <Icon className="h-5 w-5" />
        </span>
        <h2 className="text-xl font-bold text-slate-950">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function ParagraphBlock({ text, fallback }: { text?: string | null; fallback: string }) {
  return (
    <div className="whitespace-pre-line rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm leading-7 text-slate-700">
      {text || fallback}
    </div>
  );
}

export default async function PublicInsuranceQuotationPage({ params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params;
  const quotation = await getPublicInsuranceQuotation(quoteId);

  if (!quotation) notFound();

  const premium = Number(quotation.premium_amount ?? 0);
  const gst = Number(quotation.gst_amount ?? 0);
  const total = Number(quotation.total_amount ?? 0);

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#eef6ff_0%,#ffffff_44%,#fff3e8_100%)] px-3 py-5 text-slate-950 md:px-8 md:py-10 print:bg-white print:p-0">
      <div className="mx-auto max-w-5xl">
        <Card className="overflow-hidden border-blue-100 bg-white shadow-xl shadow-blue-900/5 print:rounded-none print:border-0 print:shadow-none">
          <div className="bg-slate-950 px-5 py-4 text-white md:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-200">Official Vehicle Insurance Quotation</p>
              <p className="text-sm font-semibold text-white/80">Powered by RNoS India Pvt Ltd</p>
            </div>
          </div>

          <div className="p-5 md:p-8 print:p-6">
            <header className="flex flex-col gap-6 border-b border-slate-200 pb-6 md:flex-row md:items-start md:justify-between">
              <div>
                <Image
                  src="/logo-navbar.png"
                  alt="DigiConnect Dukan"
                  width={220}
                  height={94}
                  priority
                  className="h-auto w-[180px] object-contain md:w-[220px]"
                />
                <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600">
                  DigiConnect Dukan provides trusted insurance assistance with clear premium breakup, document guidance, and customer support.
                </p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 md:min-w-80">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-950 md:text-3xl">Vehicle Insurance Quotation</h1>
                    <p className="mt-2 font-mono text-xs font-bold text-blue-800">{quotation.quote_number}</p>
                  </div>
                  <span className={cn("inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-extrabold capitalize ring-1", statusClasses[quotation.status])}>
                    {statusLabels[quotation.status]}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 text-sm">
                  <p className="flex items-center gap-2 text-slate-700">
                    <CalendarDays className="h-4 w-4 text-blue-700" />
                    Date: {formatInsuranceDate(quotation.created_at)}
                  </p>
                  <p className="flex items-center gap-2 text-slate-700">
                    <FileText className="h-4 w-4 text-orange-600" />
                    Valid Till: {formatInsuranceDate(quotation.valid_till)}
                  </p>
                </div>
              </div>
            </header>

            <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-orange-100 bg-orange-50/50 p-4 md:flex-row md:items-center md:justify-between print:hidden">
              <div>
                <p className="text-sm font-bold text-slate-950">Need help accepting this quotation?</p>
                <p className="mt-1 text-sm text-slate-600">Call +91 7007595931 or office support 9305086491.</p>
              </div>
              <InsuranceQuotationActions quotation={quotation as InsuranceQuotation} />
            </div>

            <div className="mt-8 grid gap-8">
              <Section title="Customer Details" icon={ShieldCheck}>
                <div className="grid gap-3 md:grid-cols-4">
                  <Detail label="Customer Name" value={quotation.customer_name} />
                  <Detail label="Mobile Number" value={quotation.mobile} />
                  <Detail label="Email" value={quotation.email} />
                  <Detail label="Address" value={quotation.address} />
                </div>
              </Section>

              <Section title="Vehicle Details" icon={Sparkles}>
                <div className="grid gap-3 md:grid-cols-4">
                  <Detail label="Vehicle Type" value={quotation.vehicle_type} />
                  <Detail label="Vehicle Number" value={quotation.vehicle_number} />
                  <Detail label="Make / Company" value={quotation.make} />
                  <Detail label="Model" value={quotation.model} />
                  <Detail label="Variant" value={quotation.variant} />
                  <Detail label="Fuel Type" value={quotation.fuel_type} />
                  <Detail label="Registration Year" value={quotation.registration_year} />
                  <Detail label="Previous Policy Expiry" value={formatInsuranceDate(quotation.previous_policy_expiry)} />
                  <Detail label="NCB" value={quotation.ncb} />
                  <Detail label="IDV Amount" value={quotation.idv_amount ? formatInsuranceCurrency(quotation.idv_amount) : null} />
                </div>
              </Section>

              <Section title="Insurance Plan" icon={FileText}>
                <div className="grid gap-3 md:grid-cols-4">
                  <Detail label="Insurance Type" value={quotation.insurance_type} />
                  <Detail label="Policy Duration" value={quotation.policy_duration} />
                  <Detail label="Insurer Company" value={quotation.insurer_company} />
                  <Detail label="Add-ons Included" value={quotation.addons} />
                </div>
              </Section>

              <Section title="Premium Breakup" icon={ShieldCheck}>
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-950 text-white">
                      <tr>
                        <th className="px-4 py-3 text-left font-bold">Particulars</th>
                        <th className="px-4 py-3 text-right font-bold">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="px-4 py-4 font-semibold text-slate-700">Base Premium</td>
                        <td className="px-4 py-4 text-right font-bold text-slate-950">{formatInsuranceCurrency(premium)}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-4 py-4 font-semibold text-slate-700">GST / Taxes</td>
                        <td className="px-4 py-4 text-right font-bold text-slate-950">{formatInsuranceCurrency(gst)}</td>
                      </tr>
                      <tr className="bg-blue-50">
                        <td className="px-4 py-4 text-base font-extrabold text-slate-950">Total Payable</td>
                        <td className="px-4 py-4 text-right text-xl font-extrabold text-blue-800">{formatInsuranceCurrency(total)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Section>

              <div className="grid gap-6 md:grid-cols-2">
                <Section title="Documents Required" icon={FileText}>
                  <ParagraphBlock text={quotation.documents_required} fallback="RC copy, previous policy copy, owner KYC, and any insurer-requested documents." />
                </Section>
                <Section title="Notes / Terms" icon={ShieldCheck}>
                  <ParagraphBlock text={quotation.notes} fallback="Premium is subject to final insurer approval, inspection if applicable, and document verification. This quotation is valid only until the mentioned date." />
                </Section>
              </div>
            </div>

            <footer className="mt-8 border-t border-slate-200 pt-5">
              <div className="grid gap-4 rounded-2xl bg-slate-950 p-5 text-white md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="text-lg font-bold">DigiConnect Dukan</p>
                  <p className="mt-1 text-sm text-white/70">Powered by RNoS India Pvt Ltd</p>
                </div>
                <div className="grid gap-1 text-sm font-semibold text-white/85">
                  <p className="inline-flex items-center gap-2"><Phone className="h-4 w-4 text-orange-300" /> +91 7007595931</p>
                  <p>Office Support: 9305086491</p>
                </div>
              </div>
              <p className="mt-4 text-center text-xs leading-5 text-slate-500">
                This is a computer-generated quotation for customer review. Final policy issuance is subject to payment, document verification, and insurer underwriting rules.
              </p>
            </footer>
          </div>
        </Card>
      </div>
    </main>
  );
}
