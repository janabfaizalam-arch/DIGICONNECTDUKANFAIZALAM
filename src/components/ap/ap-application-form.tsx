"use client";

import { type FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CreditCard, FileUp, Send } from "lucide-react";

import { RazorpayCheckoutButton, type VerifiedRazorpayPayment } from "@/components/payments/razorpay-checkout-button";
import {
  createPmVishwakarmaInitialValues,
  getPmVishwakarmaValidationError,
  isPmVishwakarmaComplete,
  PmVishwakarmaApplicationFields,
  type PmVishwakarmaApplicationValues,
  usePmVishwakarmaPincodeAutofill,
} from "@/components/portal/pm-vishwakarma-application-fields";
import { useToast } from "@/components/providers/toast-provider";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormSubmitButton } from "@/components/ui/loading";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trackApplicationSubmit } from "@/lib/google-analytics";
import { payoutForAgentService, type AgentService } from "@/lib/agent-services";
import { formatCurrency } from "@/lib/portal-data";
import type { Customer } from "@/lib/portal-types";

export function APApplicationForm({
  customers,
  services,
  defaultCustomerId,
}: {
  customers: Customer[];
  services: AgentService[];
  defaultCustomerId?: string;
}) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [customerId, setCustomerId] = useState(defaultCustomerId ?? "");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [razorpayPayment, setRazorpayPayment] = useState<(VerifiedRazorpayPayment & { amount_paise: number }) | null>(null);
  const [pmVishwakarmaValues, setPmVishwakarmaValues] = useState(() => createPmVishwakarmaInitialValues());
  const [pincodeStatus, setPincodeStatus] = useState("");
  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === customerId),
    [customerId, customers],
  );
  const selectedService = services.find((service) => service.id === serviceId);
  const isPmVishwakarma = selectedService?.slug === "pm-vishwakarma-yojana";
  const payableAmountPaise = Math.round(Number(selectedService?.customer_fee ?? 0) * 100);
  const receiptPrefix = `ap-${selectedService?.slug ?? "service"}`;
  const [paymentReceipt, setPaymentReceipt] = useState(receiptPrefix);
  const selectedPayout = selectedService ? payoutForAgentService(selectedService) : 0;

  useEffect(() => {
    setRazorpayPayment(null);
  }, [payableAmountPaise]);

  useEffect(() => {
    setPaymentReceipt(`${receiptPrefix}-${Date.now()}`);
  }, [receiptPrefix]);

  useEffect(() => {
    if (!isPmVishwakarma || !selectedCustomer) return;

    setPmVishwakarmaValues((current) => ({
      ...current,
      name: selectedCustomer.full_name ?? current.name,
      mobile: (selectedCustomer.mobile ?? current.mobile).replace(/\D/g, "").slice(0, 10),
      email: selectedCustomer.email ?? current.email,
      pincode: (selectedCustomer.pincode ?? current.pincode ?? "").replace(/\D/g, "").slice(0, 6),
      city: selectedCustomer.city ?? current.city,
      state: selectedCustomer.state ?? current.state,
    }));
  }, [isPmVishwakarma, selectedCustomer]);

  usePmVishwakarmaPincodeAutofill({
    enabled: Boolean(isPmVishwakarma),
    values: pmVishwakarmaValues,
    setValues: setPmVishwakarmaValues,
    setStatus: setPincodeStatus,
  });

  function updatePmVishwakarmaValue<Key extends keyof PmVishwakarmaApplicationValues>(key: Key, value: PmVishwakarmaApplicationValues[Key]) {
    setPmVishwakarmaValues((current) => ({ ...current, [key]: value }));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    if (payableAmountPaise > 0 && !razorpayPayment) {
      toastError("Please complete Razorpay checkout before submitting.");
      return;
    }

    if (isPmVishwakarma) {
      const pmValidationError = getPmVishwakarmaValidationError(pmVishwakarmaValues);
      if (pmValidationError) {
        toastError(pmValidationError);
        return;
      }
    }

    if (razorpayPayment && razorpayPayment.amount_paise !== payableAmountPaise) {
      toastError("Payment amount changed. Please complete Razorpay checkout again.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.set("customerId", customerId);
    formData.set("agentServiceId", serviceId);
    formData.set("serviceId", selectedService?.service_id ?? "");
    formData.set("razorpay_payment_id", razorpayPayment?.razorpay_payment_id ?? "");
    formData.set("razorpay_order_id", razorpayPayment?.razorpay_order_id ?? "");
    formData.set("razorpay_signature", razorpayPayment?.razorpay_signature ?? "");
    formData.set("razorpay_amount_paise", String(razorpayPayment?.amount_paise ?? 0));

    startTransition(async () => {
      try {
        const response = await fetch("/api/ap/applications", {
          method: "POST",
          body: formData,
        });
        const result = (await response.json()) as { message?: string; applicationId?: string };

        if (!response.ok || !result.applicationId) {
          throw new Error(result.message ?? "Application could not be created.");
        }

        success(result.message ?? "Application created.");
        trackApplicationSubmit();
        router.push(`/ap/applications/${result.applicationId}`);
        router.refresh();
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Application could not be created.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_340px]" aria-busy={isPending}>
      <fieldset disabled={isPending} className="contents">
        <Card className="border border-white/5 bg-slate-900/30 p-5 md:p-7 rounded-3xl backdrop-blur-xl">
          <div className="grid gap-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-400">Agency Partner POS</p>
              <h1 className="mt-2 text-2xl font-black text-white">Create New Application</h1>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400">Select Customer</label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="border-white/5 bg-slate-950 text-white rounded-xl h-11">
                  <SelectValue placeholder="Select existing customer" />
                </SelectTrigger>
                <SelectContent className="border-white/5 bg-slate-900 text-white">
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id} className="hover:bg-white/5">
                      {customer.full_name} - {customer.mobile}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isPmVishwakarma ? (
              <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4 text-orange-300">
                <p className="text-sm font-bold">PM Vishwakarma Application Details</p>
                <p className="mt-1 text-xs leading- relaxed text-slate-400">
                  Fill the same dedicated PM Vishwakarma form used in the customer apply workflow. Email, address, and notes are optional.
                </p>
              </div>
            ) : !selectedCustomer ? (
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-400">New Customer Details</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input name="customerName" placeholder="Customer Name" required={!customerId} className="border-white/5 bg-slate-950 text-white rounded-xl h-11" />
                  <Input name="mobile" placeholder="Mobile Number" inputMode="numeric" required={!customerId} className="border-white/5 bg-slate-950 text-white rounded-xl h-11" />
                  <Input name="email" placeholder="Email" type="email" required={!customerId} className="border-white/5 bg-slate-950 text-white rounded-xl h-11" />
                  <Input name="pincode" placeholder="Pincode" inputMode="numeric" required={!customerId} className="border-white/5 bg-slate-950 text-white rounded-xl h-11" />
                  <Input name="city" placeholder="City" required={!customerId} className="border-white/5 bg-slate-950 text-white rounded-xl h-11" />
                  <Input name="state" placeholder="State" required={!customerId} className="border-white/5 bg-slate-950 text-white rounded-xl h-11" />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/5 bg-slate-950 p-5">
                <p className="text-xs font-bold text-slate-500">Selected Customer</p>
                <p className="mt-2 font-extrabold text-white text-base">{selectedCustomer.full_name}</p>
                <p className="mt-1 font-mono text-sm text-indigo-400">{selectedCustomer.mobile}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {selectedCustomer.email || "Email missing"} • {selectedCustomer.pincode || "PIN missing"} • {selectedCustomer.city || "City missing"} • {selectedCustomer.state || "State missing"}
                </p>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400">Select Service to Apply</label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger className="border-white/5 bg-slate-950 text-white rounded-xl h-11">
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent className="border-white/5 bg-slate-900 text-white">
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id} className="hover:bg-white/5">
                      {service.title} - {formatCurrency(service.customer_fee)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedService ? (
              <div className="grid gap-4 rounded-2xl border border-white/5 bg-slate-950 p-5 text-sm text-slate-300 md:grid-cols-3">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Customer Fee</p>
                  <p className="mt-1 text-lg font-black text-white">{formatCurrency(selectedService.customer_fee)}</p>
                </div>
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">AP Commission Payout</p>
                  <p className="mt-1 text-lg font-black text-emerald-400">{formatCurrency(selectedPayout)}</p>
                </div>
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-400">Processing Time</p>
                  <p className="mt-1 font-extrabold text-white">{selectedService.processing_time || "As per service"}</p>
                </div>
                <div className="md:col-span-3 border-t border-white/5 pt-3">
                  <p className="font-extrabold text-slate-200">Required Documents</p>
                  <p className="mt-1 text-xs text-slate-400 whitespace-pre-line leading-5">{selectedService.required_documents || "Documents will be confirmed during processing."}</p>
                </div>
                {selectedService.instructions ? (
                  <div className="md:col-span-3 border-t border-white/5 pt-3">
                    <p className="font-extrabold text-slate-200">AP Instructions</p>
                    <p className="mt-1 text-xs text-slate-400 whitespace-pre-line leading-5">{selectedService.instructions}</p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {isPmVishwakarma ? (
              <PmVishwakarmaApplicationFields values={pmVishwakarmaValues} onChange={updatePmVishwakarmaValue} pincodeStatus={pincodeStatus} />
            ) : (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">Application Notes / Comments</label>
                <Textarea name="message" placeholder="Enter special requests, references or processing notes..." className="min-h-24 border-white/5 bg-slate-950 text-white rounded-xl" />
              </div>
            )}

            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950 p-4">
              <div className="flex items-center gap-2 font-bold text-slate-200">
                <FileUp className="h-4 w-4 text-blue-400" />
                Upload Documents
              </div>
              <Input name="documents" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" className="mt-3 border-white/5 bg-slate-900 text-white rounded-lg file:bg-slate-800 file:text-white file:border-0 file:rounded-md file:px-3 file:py-1 file:mr-3 cursor-pointer text-xs" />
            </div>

            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950 p-4">
              <div className="flex items-center gap-2 font-bold text-slate-200">
                <CreditCard className="h-4 w-4 text-indigo-400" />
                Payment Integration (Razorpay)
              </div>
              <div className="mt-3">
                <RazorpayCheckoutButton
                  amountPaise={payableAmountPaise}
                  receipt={paymentReceipt}
                  serviceSlug={selectedService?.slug}
                  customer={{
                    name: isPmVishwakarma ? pmVishwakarmaValues.name : selectedCustomer?.full_name,
                    email: isPmVishwakarma ? pmVishwakarmaValues.email || undefined : selectedCustomer?.email ?? undefined,
                    mobile: isPmVishwakarma ? pmVishwakarmaValues.mobile : selectedCustomer?.mobile,
                  }}
                  description={selectedService?.title ?? "Agency Partner POS application"}
                  disabled={isPending || !selectedService || Boolean(isPmVishwakarma && !isPmVishwakarmaComplete(pmVishwakarmaValues))}
                  onVerified={(payment) =>
                    setRazorpayPayment({
                      ...payment,
                      amount_paise: payableAmountPaise,
                    })
                  }
                />
              </div>
              {razorpayPayment ? (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs font-bold text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Transaction verified: {razorpayPayment.razorpay_payment_id}
                </div>
              ) : null}
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="border border-white/5 bg-slate-900/30 p-5 rounded-3xl backdrop-blur-xl space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Selected Service</p>
            <p className="text-lg font-black text-white">{selectedService?.title ?? "Select service"}</p>
            <p className="text-3xl font-black text-blue-400">
              {selectedService ? formatCurrency(selectedService.customer_fee) : "—"}
            </p>
            <p className="text-xs font-semibold text-slate-400">
              Commission Payout: {selectedService ? formatCurrency(selectedPayout) : "—"}
            </p>
          </Card>

          <FormSubmitButton loading={isPending} disabled={!serviceId} loadingText="Submitting..." icon={<Send className="h-4 w-4" />} className="w-full h-12 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-2xl hover:from-blue-600 hover:to-indigo-600 shadow-lg shadow-blue-500/20">
            Submit Application
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
