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

export function AgentApplicationForm({
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
  const receiptPrefix = `agent-${selectedService?.slug ?? "service"}`;
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
        const response = await fetch("/api/agent/applications", {
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
    <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-[1fr_340px]" aria-busy={isPending}>
      <fieldset disabled={isPending} className="contents">
      <Card className="p-4 md:p-6">
        <div className="grid gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--secondary)]">Agent POS</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950">New Application</h1>
          </div>

          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger aria-label="Customer">
              <SelectValue placeholder="Select existing customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.full_name} - {customer.mobile}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isPmVishwakarma ? (
            <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-4">
              <p className="text-sm font-bold text-slate-950">PM Vishwakarma application details</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                Fill the same dedicated PM Vishwakarma form used in the customer apply workflow. Email, address, and note are optional.
              </p>
            </div>
          ) : !selectedCustomer ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Input name="customerName" placeholder="Customer name" required={!customerId} />
              <Input name="mobile" placeholder="Mobile number" inputMode="numeric" required={!customerId} />
              <Input name="email" placeholder="Email" type="email" required={!customerId} />
              <Input name="pincode" placeholder="Pincode" inputMode="numeric" required={!customerId} />
              <Input name="city" placeholder="City" required={!customerId} />
              <Input name="state" placeholder="State" required={!customerId} />
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-bold text-slate-950">{selectedCustomer.full_name}</p>
              <p className="mt-1 font-mono text-sm text-slate-600">{selectedCustomer.mobile}</p>
              <p className="mt-1 text-sm text-slate-600">
                {selectedCustomer.email || "Email missing"} - {selectedCustomer.pincode || "PIN missing"} - {selectedCustomer.city || "City missing"} - {selectedCustomer.state || "State missing"}
              </p>
            </div>
          )}

          <Select value={serviceId} onValueChange={setServiceId}>
            <SelectTrigger aria-label="Service">
              <SelectValue placeholder="Select service" />
            </SelectTrigger>
            <SelectContent>
              {services.map((service) => (
                <SelectItem key={service.id} value={service.id}>
                  {service.title} - {formatCurrency(service.customer_fee)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedService ? (
            <div className="grid gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-slate-700 md:grid-cols-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-blue-700">Customer fee</p>
                <p className="mt-1 text-lg font-bold text-slate-950">{formatCurrency(selectedService.customer_fee)}</p>
              </div>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-emerald-700">Your payout</p>
                <p className="mt-1 text-lg font-bold text-emerald-700">{formatCurrency(selectedPayout)}</p>
              </div>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-orange-700">Processing time</p>
                <p className="mt-1 font-bold text-slate-950">{selectedService.processing_time || "As per service"}</p>
              </div>
              <div className="md:col-span-3">
                <p className="font-bold text-slate-950">Documents required</p>
                <p className="mt-1 whitespace-pre-line leading-6">{selectedService.required_documents || "Documents will be confirmed during processing."}</p>
              </div>
              {selectedService.instructions ? (
                <div className="md:col-span-3">
                  <p className="font-bold text-slate-950">Instructions</p>
                  <p className="mt-1 whitespace-pre-line leading-6">{selectedService.instructions}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {isPmVishwakarma ? (
            <PmVishwakarmaApplicationFields values={pmVishwakarmaValues} onChange={updatePmVishwakarmaValue} pincodeStatus={pincodeStatus} />
          ) : (
            <Textarea name="message" placeholder="Application notes" className="min-h-24" />
          )}

          <div className="rounded-2xl border border-dashed bg-blue-50/60 p-4">
            <div className="flex items-center gap-2 font-bold text-slate-950">
              <FileUp className="h-4 w-4 text-[var(--primary)]" />
              Documents
            </div>
            <Input name="documents" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" className="mt-3" />
          </div>

          <div className="rounded-2xl border border-dashed bg-orange-50/70 p-4">
            <div className="flex items-center gap-2 font-bold text-slate-950">
              <CreditCard className="h-4 w-4 text-[var(--secondary)]" />
              Razorpay Payment
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
                description={selectedService?.title ?? "Agent POS application"}
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
              <div className="mt-3 flex items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Payment verified: {razorpayPayment.razorpay_payment_id}
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="p-4 md:p-5">
          <p className="text-sm font-medium text-slate-500">Selected Service</p>
          <p className="mt-2 text-xl font-bold text-slate-950">{selectedService?.title ?? "Select service"}</p>
          <p className="mt-2 text-2xl font-bold text-[var(--primary)]">
            {selectedService ? formatCurrency(selectedService.customer_fee) : "-"}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Your payout: {selectedService ? formatCurrency(selectedPayout) : "-"}
          </p>
        </Card>

        <FormSubmitButton loading={isPending} disabled={!serviceId} loadingText="Submitting..." icon={<Send className="h-4 w-4" />} className="w-full">
          Create Application
        </FormSubmitButton>
      </div>
      </fieldset>
    </form>
  );
}
