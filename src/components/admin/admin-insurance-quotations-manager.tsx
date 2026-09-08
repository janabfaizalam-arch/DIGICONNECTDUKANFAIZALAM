"use client";

import { type FormEvent, useMemo, useRef, useState } from "react";
import { Copy, ExternalLink, FilePenLine, LoaderCircle, MessageCircle, Plus, Search, ShieldCheck, Trash2, X } from "lucide-react";

import { AdminEmptyState } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  computeGst,
  computeTotal,
  createInsuranceQuotationWhatsappText,
  defaultValidTill,
  effectiveStatus,
  formatInsuranceCurrency,
  formatInsuranceDate,
  fuelTypes,
  getInsuranceQuotationPublicUrl,
  insuranceQuotationStatuses,
  insuranceTypes,
  type InsuranceQuotation,
  type InsuranceQuotationStatus,
  vehicleTypes,
} from "@/lib/insurance-quotations";
import { cn } from "@/lib/utils";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

type ApiResponse = {
  quotation?: InsuranceQuotation;
  message?: string;
  error?: string;
};

const statusLabels: Record<InsuranceQuotationStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  rejected: "Rejected",
  expired: "Expired",
};

const statusClasses: Record<InsuranceQuotationStatus, string> = {
  draft: "bg-slate-100 text-slate-700 ring-slate-200",
  sent: "bg-blue-50 text-blue-700 ring-blue-100",
  accepted: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  rejected: "bg-red-50 text-red-700 ring-red-100",
  expired: "bg-orange-50 text-orange-700 ring-orange-100",
};

function getMessage(data: ApiResponse, fallback: string) {
  return data.error || data.message || fallback;
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold text-slate-700">
        {label}
        {required ? <span className="text-orange-600"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function NativeSelect({
  name,
  defaultValue,
  values,
  required,
}: {
  name: string;
  defaultValue?: string | null;
  values: readonly string[];
  required?: boolean;
}) {
  return (
    <Select name={name} defaultValue={defaultValue || undefined} required={required}>
      <SelectTrigger className="rounded-2xl border-blue-100">
        <SelectValue placeholder="Select" />
      </SelectTrigger>
      <SelectContent>
        {values.map((value) => (
          <SelectItem key={value} value={value}>
            {value}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function StatusBadge({ status }: { status: InsuranceQuotationStatus }) {
  return (
    <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-extrabold ring-1", statusClasses[status])}>
      {statusLabels[status]}
    </span>
  );
}


/**
 * Premium in, GST and total out.
 *
 * These were three independent hand-typed numbers and nothing checked that
 * they added up — a slipped digit in the total is a figure the shop then has
 * to honour or retract in front of the customer. Type the premium and the
 * other two follow at eighteen per cent; either can still be overridden for a
 * quote that genuinely differs, and the server refuses the save if the three
 * end up disagreeing by more than a rupee.
 */
function PremiumFields({
  quotation,
  disabled,
}: {
  quotation?: InsuranceQuotation | null;
  disabled?: boolean;
}) {
  const [premium, setPremium] = useState(String(quotation?.premium_amount ?? ""));
  const [gst, setGst] = useState(String(quotation?.gst_amount ?? ""));
  const [total, setTotal] = useState(String(quotation?.total_amount ?? ""));
  const [touched, setTouched] = useState({ gst: Boolean(quotation), total: Boolean(quotation) });

  function onPremium(value: string) {
    setPremium(value);
    const base = Number(value);
    if (!Number.isFinite(base)) return;
    const nextGst = touched.gst ? Number(gst) : computeGst(base);
    if (!touched.gst) setGst(nextGst ? String(nextGst) : "");
    if (!touched.total) setTotal(String(computeTotal(base, nextGst)));
  }

  function onGst(value: string) {
    setGst(value);
    setTouched((t) => ({ ...t, gst: true }));
    if (!touched.total) setTotal(String(computeTotal(Number(premium), Number(value))));
  }

  const expected = computeTotal(Number(premium), Number(gst));
  const mismatch =
    premium !== "" && total !== "" && Math.abs(expected - Number(total)) > 1;

  return (
    <>
      <Field label="Premium Amount" required>
        <Input
          name="premium_amount"
          type="number"
          step="0.01"
          min="0"
          value={premium}
          onChange={(event) => onPremium(event.target.value)}
          required
          disabled={disabled}
        />
      </Field>
      <Field label="GST Amount (18% auto)">
        <Input
          name="gst_amount"
          type="number"
          step="0.01"
          min="0"
          value={gst}
          onChange={(event) => onGst(event.target.value)}
          disabled={disabled}
        />
      </Field>
      <Field label="Total Payable Amount" required>
        <Input
          name="total_amount"
          type="number"
          step="0.01"
          min="0"
          value={total}
          onChange={(event) => {
            setTotal(event.target.value);
            setTouched((t) => ({ ...t, total: true }));
          }}
          required
          disabled={disabled}
          aria-invalid={mismatch || undefined}
        />
        {mismatch ? (
          <span className="text-xs font-bold text-red-600" role="alert">
            {formatInsuranceCurrency(Number(premium))} + {formatInsuranceCurrency(Number(gst))} ={" "}
            {formatInsuranceCurrency(expected)} — total abhi {formatInsuranceCurrency(Number(total))} hai.
          </span>
        ) : null}
      </Field>
    </>
  );
}

function QuotationForm({
  quotation,
  disabled,
  onSubmit,
}: {
  quotation?: InsuranceQuotation | null;
  disabled?: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Customer Name" required>
          <Input name="customer_name" defaultValue={quotation?.customer_name ?? ""} required disabled={disabled} />
        </Field>
        <Field label="Mobile Number" required>
          <Input name="mobile" defaultValue={quotation?.mobile ?? ""} required disabled={disabled} />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" defaultValue={quotation?.email ?? ""} disabled={disabled} />
        </Field>
        <Field label="Address">
          <Input name="address" defaultValue={quotation?.address ?? ""} disabled={disabled} />
        </Field>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50/35 p-4">
        <p className="mb-4 text-sm font-extrabold uppercase tracking-[0.14em] text-blue-700">Vehicle Details</p>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Vehicle Type" required>
            <NativeSelect name="vehicle_type" defaultValue={quotation?.vehicle_type} values={vehicleTypes} required />
          </Field>
          <Field label="Vehicle Number" required>
            <Input name="vehicle_number" defaultValue={quotation?.vehicle_number ?? ""} required disabled={disabled} />
          </Field>
          <Field label="Make / Company">
            <Input name="make" defaultValue={quotation?.make ?? ""} disabled={disabled} />
          </Field>
          <Field label="Model">
            <Input name="model" defaultValue={quotation?.model ?? ""} disabled={disabled} />
          </Field>
          <Field label="Variant">
            <Input name="variant" defaultValue={quotation?.variant ?? ""} disabled={disabled} />
          </Field>
          <Field label="Fuel Type">
            <NativeSelect name="fuel_type" defaultValue={quotation?.fuel_type} values={fuelTypes} />
          </Field>
          <Field label="Registration Year">
            <Input name="registration_year" defaultValue={quotation?.registration_year ?? ""} placeholder="2022" disabled={disabled} />
          </Field>
          <Field label="Previous Policy Expiry">
            <Input name="previous_policy_expiry" type="date" defaultValue={quotation?.previous_policy_expiry ?? ""} disabled={disabled} />
          </Field>
          <Field label="NCB">
            <Input name="ncb" defaultValue={quotation?.ncb ?? ""} placeholder="20%" disabled={disabled} />
          </Field>
          <Field label="IDV Amount">
            <Input name="idv_amount" type="number" step="0.01" defaultValue={quotation?.idv_amount ?? ""} disabled={disabled} />
          </Field>
        </div>
      </div>

      <div className="rounded-2xl border border-orange-100 bg-orange-50/35 p-4">
        <p className="mb-4 text-sm font-extrabold uppercase tracking-[0.14em] text-orange-700">Insurance Details</p>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Insurance Type" required>
            <NativeSelect name="insurance_type" defaultValue={quotation?.insurance_type} values={insuranceTypes} required />
          </Field>
          <Field label="Policy Duration">
            <Input name="policy_duration" defaultValue={quotation?.policy_duration ?? ""} placeholder="1 Year" disabled={disabled} />
          </Field>
          <Field label="Insurer Company">
            <Input name="insurer_company" defaultValue={quotation?.insurer_company ?? ""} disabled={disabled} />
          </Field>
          <PremiumFields quotation={quotation} disabled={disabled} />
          <Field label="Valid Till Date" required>
            <Input
              name="valid_till"
              type="date"
              defaultValue={quotation?.valid_till ?? defaultValidTill()}
              required
              disabled={disabled}
            />
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue={quotation?.status ?? "draft"}>
              <SelectTrigger className="rounded-2xl border-blue-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {insuranceQuotationStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {statusLabels[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Field label="Add-ons Included">
            <Textarea name="addons" defaultValue={quotation?.addons ?? ""} disabled={disabled} />
          </Field>
          <Field label="Documents Required">
            <Textarea name="documents_required" defaultValue={quotation?.documents_required ?? ""} disabled={disabled} />
          </Field>
          <Field label="Important Notes">
            <Textarea name="notes" defaultValue={quotation?.notes ?? ""} disabled={disabled} />
          </Field>
        </div>
      </div>

      <Button type="submit" className="h-12 w-full md:w-auto" disabled={disabled}>
        {disabled ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        {quotation ? "Save Quotation" : "Create Quotation"}
      </Button>
    </form>
  );
}

export function AdminInsuranceQuotationsManager({ initialQuotations }: { initialQuotations: InsuranceQuotation[] }) {
  const [quotations, setQuotations] = useState(initialQuotations);
  const [editingQuote, setEditingQuote] = useState<InsuranceQuotation | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | InsuranceQuotationStatus>("all");
  const formRef = useRef<HTMLDivElement>(null);

  /*
    Counted by the status a customer would actually see. Nothing ever moved a
    quotation to "expired", so the old tallies reported lapsed quotes as
    live — the "Sent" number was the one figure on this screen a shop would
    act on, and it was wrong.
  */
  const totals = useMemo(() => {
    return quotations.reduce(
      (current, quote) => {
        current.total += Number(quote.total_amount ?? 0);
        current[effectiveStatus(quote)] += 1;
        return current;
      },
      { total: 0, draft: 0, sent: 0, accepted: 0, rejected: 0, expired: 0 },
    );
  }, [quotations]);

  /** Search across the things somebody at the counter actually remembers. */
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return quotations.filter((quote) => {
      if (statusFilter !== "all" && effectiveStatus(quote) !== statusFilter) return false;
      if (!needle) return true;
      return [
        quote.quote_number,
        quote.customer_name,
        quote.mobile,
        quote.vehicle_number,
        quote.make ?? "",
        quote.model ?? "",
        quote.insurer_company ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [quotations, query, statusFilter]);

  function openCreate() {
    setEditingQuote(null);
    setShowCreate(true);
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function openEdit(quotation: InsuranceQuotation) {
    setShowCreate(false);
    setEditingQuote(quotation);
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  async function copyQuotation(quotation: InsuranceQuotation) {
    const link = getInsuranceQuotationPublicUrl(quotation.public_token);
    const text = createInsuranceQuotationWhatsappText(quotation);

    await navigator.clipboard.writeText(`${text}\n\n${link}`);
    setMessage("Quotation link and WhatsApp message copied.");
    setError("");
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/insurance-quotations", { method: "POST", body: new FormData(event.currentTarget) });
      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.quotation) {
        setError(getMessage(data, "Insurance quotation could not be created."));
        return;
      }

      setQuotations((current) => [data.quotation!, ...current]);
      setMessage(data.message || "Insurance quotation created successfully.");
      setShowCreate(false);
    } catch (createError) {
      console.error("[admin/insurance-quotations] Create failed", createError);
      setError("Insurance quotation could not be created. Please try again.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>, quotation: InsuranceQuotation) {
    event.preventDefault();
    setBusyId(quotation.id);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/admin/insurance-quotations/${quotation.id}`, { method: "PATCH", body: new FormData(event.currentTarget) });
      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.quotation) {
        setError(getMessage(data, "Insurance quotation could not be updated."));
        return;
      }

      setQuotations((current) => current.map((item) => (item.id === quotation.id ? data.quotation! : item)));
      setEditingQuote(null);
      setMessage(data.message || "Insurance quotation updated successfully.");
    } catch (updateError) {
      console.error("[admin/insurance-quotations] Update failed", updateError);
      setError("Insurance quotation could not be updated. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteQuotation(quotation: InsuranceQuotation) {
    if (!window.confirm(`Delete quotation ${quotation.quote_number}?`)) return;

    setBusyId(quotation.id);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/admin/insurance-quotations/${quotation.id}`, { method: "DELETE" });
      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        setError(getMessage(data, "Insurance quotation could not be deleted."));
        return;
      }

      setQuotations((current) => current.filter((item) => item.id !== quotation.id));
      setMessage(data.message || "Insurance quotation deleted successfully.");
    } catch (deleteError) {
      console.error("[admin/insurance-quotations] Delete failed", deleteError);
      setError("Insurance quotation could not be deleted. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-blue-100 p-4">
          <p className="text-sm font-semibold text-slate-500">Total Quotations</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{quotations.length}</p>
        </Card>
        <Card className="border-blue-100 p-4">
          <p className="text-sm font-semibold text-slate-500">Accepted</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{totals.accepted}</p>
        </Card>
        <Card className="border-blue-100 p-4">
          <p className="text-sm font-semibold text-slate-500">Active / Draft</p>
          <p className="mt-2 text-2xl font-bold text-blue-700">{totals.sent} / {totals.draft}</p>
          {totals.expired ? (
            <p className="mt-1 text-xs font-bold text-orange-700">{totals.expired} expired</p>
          ) : null}
        </Card>
        <Card className="border-blue-100 p-4">
          <p className="text-sm font-semibold text-slate-500">Quoted Value</p>
          <p className="mt-2 text-2xl font-bold text-orange-700">{formatInsuranceCurrency(totals.total)}</p>
        </Card>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-lg font-bold text-slate-950">Vehicle Insurance Quotations</p>
          <p className="mt-1 text-sm text-slate-600">Create official shareable quotes for DigiConnect Dukan customers.</p>
        </div>
        <Button type="button" onClick={openCreate} className="h-11">
          <Plus className="h-4 w-4" />
          New Quotation
        </Button>
      </div>

      {message ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{message}</p> : null}
      {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}

      {(showCreate || editingQuote) ? (
        <div ref={formRef}>
        <Card className="border-blue-100 p-4 shadow-sm md:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-orange-600">{editingQuote ? "Edit quotation" : "Create quotation"}</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950">{editingQuote?.quote_number ?? "New Insurance Quotation"}</h2>
            </div>
            <Button type="button" variant="outline" size="icon" onClick={() => { setShowCreate(false); setEditingQuote(null); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <QuotationForm
            quotation={editingQuote}
            disabled={isCreating || Boolean(editingQuote && busyId === editingQuote.id)}
            onSubmit={(event) => (editingQuote ? void handleUpdate(event, editingQuote) : void handleCreate(event))}
          />
        </Card>
        </div>
      ) : null}

      {quotations.length ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-blue-100 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search quotations</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Quote number, customer, mobile, vehicle number…"
              className="h-11 pl-9"
            />
          </label>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {(["all", ...insuranceQuotationStatuses] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                aria-pressed={statusFilter === value}
                className={cn(
                  "h-11 shrink-0 rounded-full px-3.5 text-xs font-bold transition",
                  statusFilter === value
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:text-slate-900",
                )}
              >
                {value === "all" ? "All" : statusLabels[value]}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <Card className="overflow-hidden border-blue-100 shadow-sm">
        {visible.length ? (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Quotation</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((quotation) => {
                const link = getInsuranceQuotationPublicUrl(quotation.public_token);
                const whatsappUrl = buildWhatsAppUrl(createInsuranceQuotationWhatsappText(quotation));

                return (
                  <TableRow key={quotation.id}>
                    <TableCell>
                      <p className="font-mono text-xs font-bold text-slate-950">{quotation.quote_number}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatInsuranceDate(quotation.created_at)}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-bold text-slate-950">{quotation.customer_name}</p>
                      <p className="text-xs font-semibold text-slate-500">{quotation.mobile}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-bold text-slate-950">{quotation.vehicle_number}</p>
                      <p className="text-xs text-slate-500">{quotation.vehicle_type} {quotation.make ? `- ${quotation.make}` : ""}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-bold text-slate-950">{quotation.insurance_type}</p>
                      <p className="text-xs text-slate-500">Valid till {formatInsuranceDate(quotation.valid_till)}</p>
                    </TableCell>
                    <TableCell className="font-bold text-slate-950">{formatInsuranceCurrency(quotation.total_amount)}</TableCell>
                    <TableCell><StatusBadge status={effectiveStatus(quotation)} /></TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button type="button" variant="outline" size="icon" title="Edit" onClick={() => openEdit(quotation)} disabled={busyId === quotation.id}>
                          <FilePenLine className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="outline" size="icon" title="Copy link" onClick={() => void copyQuotation(quotation)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 w-11 items-center justify-center rounded-full border bg-white text-emerald-700 hover:bg-emerald-50" title="WhatsApp Now">
                          <MessageCircle className="h-4 w-4" />
                        </a>
                        <a href={link} target="_blank" rel="noreferrer" className="inline-flex h-11 w-11 items-center justify-center rounded-full border bg-white text-blue-700 hover:bg-blue-50" title="Open public quote">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <Button type="button" variant="outline" size="icon" className="text-red-600" title="Delete" onClick={() => void deleteQuotation(quotation)} disabled={busyId === quotation.id}>
                          {busyId === quotation.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="p-6">
            {quotations.length ? (
              <AdminEmptyState
                title="No quotation matches this search"
                description="Try a different quote number, customer name, mobile or vehicle number — or clear the status filter."
              />
            ) : (
              <AdminEmptyState
                title="No insurance quotations yet"
                description="Create the first vehicle insurance quotation and share the public customer link."
              />
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
