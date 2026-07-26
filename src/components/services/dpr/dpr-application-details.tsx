import { DPR_SERVICE_SLUG } from "@/lib/dpr/constants";
import { extractDprFormPayload } from "@/lib/dpr/form-data";

function text(value: unknown) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function money(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return text(value) || "—";
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

export { extractDprFormPayload };

export function isDprServiceSlug(slug: string | null | undefined) {
  return slug === DPR_SERVICE_SLUG;
}

type Props = {
  formData: unknown;
  serviceSlug?: string | null;
  status?: string | null;
  finalDocumentUrl?: string | null;
  className?: string;
};

export function DprApplicationDetails({
  formData,
  serviceSlug,
  status,
  finalDocumentUrl,
  className = "",
}: Props) {
  if (serviceSlug && !isDprServiceSlug(serviceSlug)) return null;

  const { personal, business, project, machinery, plan, hasDpr } = extractDprFormPayload(formData);
  if (!hasDpr && !isDprServiceSlug(serviceSlug)) return null;

  const pendingDocsNote =
    status && !["completed", "delivered"].includes(status)
      ? "DPR drafting in progress. Pending documents or clarifications may be requested via WhatsApp."
      : null;

  return (
    <section className={`rounded-3xl border border-sky-100 bg-white p-5 md:p-6 shadow-sm space-y-5 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-sky-700">DPR Project File</p>
          <h2 className="mt-1 text-lg font-bold text-slate-950">Detailed Project Report details</h2>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Scheme, costing, and machinery captured at application time.
          </p>
        </div>
        {plan ? (
          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold capitalize text-sky-800 border border-sky-100">
            Plan: {plan}
          </span>
        ) : null}
      </div>

      {pendingDocsNote ? (
        <p className="rounded-2xl border border-amber-100 bg-amber-50/80 px-3.5 py-3 text-xs font-semibold text-amber-900">
          {pendingDocsNote}
        </p>
      ) : null}

      {finalDocumentUrl ? (
        <a
          href={finalDocumentUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center rounded-full bg-emerald-600 px-4 text-xs font-bold text-white shadow-sm"
        >
          Download completed DPR
        </a>
      ) : null}

      <div>
        <h3 className="text-sm font-bold text-slate-900">Personal</h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <Row label="Name" value={text(personal.fullName ?? personal.name)} />
          <Row label="Mobile" value={text(personal.mobile)} />
          <Row label="Email" value={text(personal.email)} />
          <Row label="Pincode" value={text(personal.pincode)} />
          <Row label="Address" value={text(personal.address)} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-900">Business</h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <Row label="Business name" value={text(business.businessName)} />
          <Row label="Constitution" value={text(business.businessType)} />
          <Row label="GSTIN" value={text(business.gstin)} />
          <Row label="Udyam" value={text(business.udyam)} />
          <Row label="Address" value={text(business.businessAddress)} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-900">Project</h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <Row label="Scheme" value={text(project.scheme)} />
          <Row label="Project cost" value={money(project.projectCost)} />
          <Row label="Own contribution" value={money(project.ownContribution)} />
          <Row label="Loan amount" value={money(project.loanAmount)} />
          <Row label="Expected subsidy" value={money(project.expectedSubsidy)} />
          <Row label="Annual sales" value={money(project.annualSales)} />
          <Row label="Annual profit" value={money(project.annualProfit)} />
          <Row label="Tenure (years)" value={text(project.tenureYears)} />
          <Row label="Margin %" value={text(project.marginPercent)} />
        </div>
      </div>

      {machinery.length ? (
        <div>
          <h3 className="text-sm font-bold text-slate-900">Machinery schedule</h3>
          <div className="mt-2 overflow-x-auto rounded-2xl border border-slate-100">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-bold">Item</th>
                  <th className="px-3 py-2 font-bold">Qty</th>
                  <th className="px-3 py-2 font-bold">Unit cost</th>
                  <th className="px-3 py-2 font-bold">Total</th>
                </tr>
              </thead>
              <tbody>
                {machinery.map((row, index) => (
                  <tr key={index} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-semibold text-slate-800">{text(row.name ?? row.item) || "—"}</td>
                    <td className="px-3 py-2 text-slate-700">{text(row.qty ?? row.quantity) || "—"}</td>
                    <td className="px-3 py-2 text-slate-700">{money(row.unitCost ?? row.unit_cost)}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {money(
                        row.total ??
                          Number(row.qty ?? row.quantity ?? 0) * Number(row.unitCost ?? row.unit_cost ?? 0),
                      )}
                    </td>
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
