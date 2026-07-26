import { isItrServiceSlug } from "@/lib/itr/constants";
import { extractItrFormPayload } from "@/lib/itr/form-data";

function text(value: unknown) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function money(value: unknown) {
  const raw = text(value);
  if (!raw) return "";
  const n = Number(raw.replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(n)) return raw;
  return `₹${n.toLocaleString("en-IN")}`;
}

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3.5 py-3">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800 break-words">{value}</p>
    </div>
  );
}

function maskAadhaar(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 12) return value;
  return `XXXX-XXXX-${digits.slice(-4)}`;
}

type Props = {
  formData: unknown;
  serviceSlug?: string | null;
  status?: string | null;
  finalDocumentUrl?: string | null;
  className?: string;
};

export function ItrApplicationDetails({
  formData,
  serviceSlug,
  status,
  finalDocumentUrl,
  className = "",
}: Props) {
  if (serviceSlug && !isItrServiceSlug(serviceSlug)) return null;

  const payload = extractItrFormPayload(formData);
  if (!payload.hasItr && !isItrServiceSlug(serviceSlug)) return null;

  const pendingNote =
    status && !["completed", "delivered"].includes(status)
      ? "ITR filing in progress. Documents may be reviewed and clarifications requested before final submission."
      : null;

  const complianceNote =
    "Final ITR acknowledgement / form is shared only after expert review and e-filing completion.";

  const financialRows: Array<{ label: string; value: string }> = [
    { label: "Salary income", value: money(payload.financial.salaryIncome) },
    { label: "Business income", value: money(payload.financial.businessIncome) },
    { label: "Capital gains", value: money(payload.financial.capitalGains) },
    { label: "Rent / house property", value: money(payload.financial.rentIncome) },
    { label: "Other income", value: money(payload.financial.otherIncome) },
    { label: "80C deductions", value: money(payload.financial.deductions80C) },
    { label: "80D deductions", value: money(payload.financial.deductions80D) },
    { label: "HRA exempt", value: money(payload.financial.hraExempt) },
    { label: "Other deductions", value: money(payload.financial.otherDeductions) },
    { label: "Estimated tax", value: money(payload.financial.estimatedTax) },
    { label: "Tax payable", value: money(payload.financial.taxPayable) },
    { label: "Refund due", value: money(payload.financial.refundDue) },
    { label: "TDS credit", value: money(payload.financial.tdsCredit) },
    { label: "Advance tax paid", value: money(payload.financial.advanceTaxPaid) },
  ].filter((row) => row.value);

  return (
    <section className={`rounded-3xl border border-emerald-100 bg-white p-5 md:p-6 shadow-sm space-y-5 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">ITR Filing File</p>
          <h2 className="mt-1 text-lg font-bold text-slate-950">Income Tax Return details</h2>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Filing profile, income sources, and document checklist captured at application time.
          </p>
        </div>
        {payload.packagePlan ? (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold capitalize text-emerald-800 border border-emerald-100">
            Package: {payload.packagePlan}
          </span>
        ) : null}
      </div>

      {pendingNote ? (
        <p className="rounded-2xl border border-amber-100 bg-amber-50/80 px-3.5 py-3 text-xs font-semibold text-amber-900">
          {pendingNote}
        </p>
      ) : null}

      <p className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3.5 py-3 text-xs font-semibold text-slate-700">
        {complianceNote}
      </p>

      {finalDocumentUrl ? (
        <a
          href={finalDocumentUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center rounded-full bg-emerald-600 px-4 text-xs font-bold text-white shadow-sm"
        >
          Download completed ITR deliverable
        </a>
      ) : null}

      <div>
        <h3 className="text-sm font-bold text-slate-900">Filing summary</h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <Row label="Assessment year" value={payload.assessmentYear} />
          <Row label="Applicant type" value={payload.applicantType} />
          <Row label="Filing type" value={payload.filingType} />
          <Row label="Tax regime" value={payload.taxRegime} />
          <Row label="Package" value={payload.packagePlan} />
          <Row label="Recommended form" value={payload.recommendedForm} />
          <Row
            label="Income sources"
            value={payload.incomeSources.map((item) => item.replace(/_/g, " ")).join(", ")}
          />
          <Row label="PAN" value={payload.panNumber} />
          <Row label="Aadhaar" value={payload.aadhaarNumber ? maskAadhaar(payload.aadhaarNumber) : ""} />
        </div>
      </div>

      {financialRows.length ? (
        <div>
          <h3 className="text-sm font-bold text-slate-900">Financial flags</h3>
          <p className="mt-1 text-xs text-slate-500">Values shown only when declared in the application form.</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {financialRows.map((row) => (
              <Row key={row.label} label={row.label} value={row.value} />
            ))}
          </div>
        </div>
      ) : null}

      {payload.documentChecklist.length ? (
        <div>
          <h3 className="text-sm font-bold text-slate-900">Document checklist</h3>
          <div className="mt-2 overflow-x-auto rounded-2xl border border-slate-100">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-bold">Document</th>
                  <th className="px-3 py-2 font-bold">Required</th>
                  <th className="px-3 py-2 font-bold">Uploaded</th>
                  <th className="px-3 py-2 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {payload.documentChecklist.map((item) => (
                  <tr key={item.key} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-semibold text-slate-800">{item.label}</td>
                    <td className="px-3 py-2 text-slate-700">{item.required ? "Yes" : "No"}</td>
                    <td className="px-3 py-2 text-slate-700">{item.uploaded ? "Yes" : "Pending"}</td>
                    <td className="px-3 py-2 capitalize text-slate-700">{item.status || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
