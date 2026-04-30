"use client";

import { type FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, LoaderCircle, ReceiptText, Send } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/portal-data";
import type { Customer, ServiceCatalogItem } from "@/lib/portal-types";

export function AgentApplicationForm({
  customers,
  services,
  defaultCustomerId,
}: {
  customers: Customer[];
  services: ServiceCatalogItem[];
  defaultCustomerId?: string;
}) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [customerId, setCustomerId] = useState(defaultCustomerId ?? "");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === customerId),
    [customerId, customers],
  );
  const selectedService = services.find((service) => service.id === serviceId);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("customerId", customerId);
    formData.set("serviceId", serviceId);

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
        router.push(`/agent/applications/${result.applicationId}`);
        router.refresh();
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Application could not be created.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-[1fr_340px]">
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

          {!selectedCustomer ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Input name="customerName" placeholder="Customer name" required={!customerId} />
              <Input name="mobile" placeholder="Mobile number" inputMode="numeric" required={!customerId} />
              <Input name="email" placeholder="Email optional" type="email" />
              <Input name="city" placeholder="City" />
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-bold text-slate-950">{selectedCustomer.full_name}</p>
              <p className="mt-1 font-mono text-sm text-slate-600">{selectedCustomer.mobile}</p>
            </div>
          )}

          <Select value={serviceId} onValueChange={setServiceId}>
            <SelectTrigger aria-label="Service">
              <SelectValue placeholder="Select service" />
            </SelectTrigger>
            <SelectContent>
              {services.map((service) => (
                <SelectItem key={service.id} value={service.id}>
                  {service.name} - {formatCurrency(service.amount)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Textarea name="message" placeholder="Application notes" className="min-h-24" />

          <div className="rounded-2xl border border-dashed bg-blue-50/60 p-4">
            <div className="flex items-center gap-2 font-bold text-slate-950">
              <FileUp className="h-4 w-4 text-[var(--primary)]" />
              Documents
            </div>
            <Input name="documents" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" className="mt-3" />
          </div>

          <div className="rounded-2xl border border-dashed bg-orange-50/70 p-4">
            <div className="flex items-center gap-2 font-bold text-slate-950">
              <ReceiptText className="h-4 w-4 text-[var(--secondary)]" />
              Payment Proof
            </div>
            <Input name="paymentScreenshot" type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp" className="mt-3" />
            <p className="mt-2 text-xs font-bold text-orange-700">Screenshot upload is required. No UTR field is used.</p>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="p-4 md:p-5">
          <p className="text-sm font-medium text-slate-500">Selected Service</p>
          <p className="mt-2 text-xl font-bold text-slate-950">{selectedService?.name ?? "Select service"}</p>
          <p className="mt-2 text-2xl font-bold text-[var(--primary)]">
            {selectedService ? formatCurrency(selectedService.amount) : "-"}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Estimated commission: {selectedService ? formatCurrency(selectedService.commission_amount) : "-"}
          </p>
        </Card>

        <Button type="submit" disabled={isPending || !serviceId} className="w-full">
          {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Submit Application
        </Button>
      </div>
    </form>
  );
}
