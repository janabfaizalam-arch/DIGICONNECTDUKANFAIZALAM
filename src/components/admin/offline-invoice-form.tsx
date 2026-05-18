"use client";

import { FormEvent, type ReactNode, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Printer, ReceiptText, Save } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { calculateOfflineInvoiceTotal, type OfflineInvoice } from "@/lib/offline-invoices";
import { safeCurrency } from "@/lib/admin-format";

type FormState = {
  customer_name: string;
  mobile: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gst_number: string;
  service_name: string;
  service_category: string;
  description: string;
  quantity: string;
  unit_price: string;
  discount: string;
  tax_percent: string;
  extra_charges: string;
  payment_status: string;
  payment_method: string;
  amount_paid: string;
};

const defaultState: FormState = {
  customer_name: "",
  mobile: "",
  email: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  gst_number: "",
  service_name: "",
  service_category: "",
  description: "",
  quantity: "1",
  unit_price: "",
  discount: "0",
  tax_percent: "0",
  extra_charges: "0",
  payment_status: "Pending",
  payment_method: "Cash",
  amount_paid: "0",
};

function stateFromInvoice(invoice?: OfflineInvoice | null): FormState {
  if (!invoice) return defaultState;
  return {
    customer_name: invoice.customer_name ?? "",
    mobile: invoice.mobile ?? "",
    email: invoice.email ?? "",
    address: invoice.address ?? "",
    city: invoice.city ?? "",
    state: invoice.state ?? "",
    pincode: invoice.pincode ?? "",
    gst_number: invoice.gst_number ?? "",
    service_name: invoice.service_name ?? "",
    service_category: invoice.service_category ?? "",
    description: invoice.description ?? "",
    quantity: String(invoice.quantity ?? 1),
    unit_price: String(invoice.unit_price ?? ""),
    discount: String(invoice.discount ?? 0),
    tax_percent: String(invoice.tax_percent ?? 0),
    extra_charges: String(invoice.extra_charges ?? 0),
    payment_status: invoice.payment_status ?? "Pending",
    payment_method: invoice.payment_method ?? "Cash",
    amount_paid: String(invoice.amount_paid ?? 0),
  };
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-bold text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function OfflineInvoiceForm({ invoice, staffName }: { invoice?: OfflineInvoice | null; staffName: string }) {
  const [form, setForm] = useState<FormState>(() => stateFromInvoice(invoice));
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const total = useMemo(
    () =>
      calculateOfflineInvoiceTotal({
        quantity: form.quantity,
        unit_price: form.unit_price,
        discount: form.discount,
        tax_percent: form.tax_percent,
        extra_charges: form.extra_charges,
      }),
    [form.discount, form.extra_charges, form.quantity, form.tax_percent, form.unit_price],
  );
  const amountPaid = Number(form.amount_paid || 0);
  const balanceDue = Math.max(Math.round((total - (Number.isFinite(amountPaid) ? amountPaid : 0)) * 100) / 100, 0);

  function update(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submit(nextAction: "draft" | "generate" | "print") {
    startTransition(async () => {
      try {
        const response = await fetch(invoice ? `/api/admin/offline-invoices/${invoice.id}` : "/api/admin/offline-invoices", {
          method: invoice ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const result = (await response.json()) as { message?: string; invoiceId?: string };
        if (!response.ok) throw new Error(result.message ?? "Offline invoice could not be saved.");

        const invoiceId = invoice?.id ?? result.invoiceId;
        success(nextAction === "draft" ? "Draft saved." : result.message ?? "Offline invoice saved.");
        router.refresh();

        if (nextAction === "draft") {
          router.push("/admin/offline-invoices");
          return;
        }

        if (invoiceId) {
          router.push(`/admin/offline-invoices/${invoiceId}${nextAction === "print" ? "?print=1" : ""}`);
        }
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Offline invoice could not be saved.");
      }
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit("generate");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Customer Details</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Full Name *"><Input value={form.customer_name} onChange={(event) => update("customer_name", event.target.value)} required /></Field>
          <Field label="Mobile Number *"><Input value={form.mobile} onChange={(event) => update("mobile", event.target.value)} required /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} /></Field>
          <Field label="GST Number"><Input value={form.gst_number} onChange={(event) => update("gst_number", event.target.value)} /></Field>
          <Field label="Address"><Input value={form.address} onChange={(event) => update("address", event.target.value)} /></Field>
          <Field label="City"><Input value={form.city} onChange={(event) => update("city", event.target.value)} /></Field>
          <Field label="State"><Input value={form.state} onChange={(event) => update("state", event.target.value)} /></Field>
          <Field label="PIN Code"><Input value={form.pincode} onChange={(event) => update("pincode", event.target.value)} /></Field>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Service Details</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Service Name *"><Input value={form.service_name} onChange={(event) => update("service_name", event.target.value)} required /></Field>
          <Field label="Service Category"><Input value={form.service_category} onChange={(event) => update("service_category", event.target.value)} /></Field>
          <Field label="Quantity"><Input type="number" min="0" step="1" value={form.quantity} onChange={(event) => update("quantity", event.target.value)} /></Field>
          <Field label="Unit Price *"><Input type="number" min="0" step="0.01" value={form.unit_price} onChange={(event) => update("unit_price", event.target.value)} required /></Field>
          <Field label="Discount"><Input type="number" min="0" step="0.01" value={form.discount} onChange={(event) => update("discount", event.target.value)} /></Field>
          <Field label="Tax %"><Input type="number" min="0" step="0.01" value={form.tax_percent} onChange={(event) => update("tax_percent", event.target.value)} /></Field>
          <Field label="Extra Charges"><Input type="number" min="0" step="0.01" value={form.extra_charges} onChange={(event) => update("extra_charges", event.target.value)} /></Field>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Total</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{safeCurrency(total)}</p>
          </div>
          <Field label="Description"><Textarea value={form.description} onChange={(event) => update("description", event.target.value)} className="md:col-span-2" /></Field>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Payment Details</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Payment Status">
            <Select value={form.payment_status} onValueChange={(value) => update("payment_status", value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Partial">Partial</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Payment Method">
            <Select value={form.payment_method} onValueChange={(value) => update("payment_method", value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="Razorpay">Razorpay</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="Card">Card</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Amount Paid"><Input type="number" min="0" step="0.01" value={form.amount_paid} onChange={(event) => update("amount_paid", event.target.value)} /></Field>
          <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-700">Balance Due</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{safeCurrency(balanceDue)}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Office Details</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Staff Name"><Input value={staffName} disabled /></Field>
          <Field label="Invoice Created By"><Input value={staffName} disabled /></Field>
        </div>
      </section>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => submit("draft")} disabled={isPending}>
          {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Draft
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ReceiptText className="h-4 w-4" />}
          Generate Invoice
        </Button>
        <Button type="button" variant="secondary" onClick={() => submit("print")} disabled={isPending}>
          <Printer className="h-4 w-4" />
          Print Invoice
        </Button>
      </div>
    </form>
  );
}
