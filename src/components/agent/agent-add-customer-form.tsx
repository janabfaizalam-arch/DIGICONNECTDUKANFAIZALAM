"use client";

import { type FormEvent, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/providers/toast-provider";
import { Input } from "@/components/ui/input";
import { FormSubmitButton } from "@/components/ui/loading";
import { Textarea } from "@/components/ui/textarea";
import { trackLeadSubmit } from "@/lib/google-analytics";

function normalizeMobile(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

export function AgentAddCustomerForm() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [mobile, setMobile] = useState("");
  const [formError, setFormError] = useState("");

  function setSafeError(message: string) {
    setFormError(message);
    toastError(message);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    setFormError("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const customerName = String(formData.get("customerName") ?? "").trim();
    const service = String(formData.get("service") ?? "").trim();

    if (!customerName || !mobile || !service) {
      setSafeError("Customer name, mobile number, and service are required.");
      return;
    }

    if (!/^\d{10}$/.test(mobile)) {
      setSafeError("Enter a valid 10 digit mobile number.");
      return;
    }

    formData.set("mobile", mobile);

    startTransition(async () => {
      try {
        const response = await fetch("/api/agent/leads", {
          method: "POST",
          body: formData,
        });
        const result = (await response.json().catch(() => ({}))) as { message?: string };

        if (!response.ok) {
          throw new Error(result.message || "Customer could not be added.");
        }

        form.reset();
        setMobile("");
        success(result.message || "Customer added successfully.");
        trackLeadSubmit();
        router.refresh();
      } catch (error) {
        setSafeError(error instanceof Error ? error.message : "Customer could not be added.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3" aria-busy={isPending}>
      <fieldset disabled={isPending} className="grid gap-3">
        <Input name="customerName" placeholder="Customer name" autoComplete="name" required />
        <Input
          name="mobile"
          placeholder="10 digit mobile number"
          inputMode="numeric"
          value={mobile}
          onChange={(event) => setMobile(normalizeMobile(event.target.value))}
          required
        />
        <Input name="service" placeholder="Service required" required />
        <Textarea name="notes" placeholder="Notes" className="min-h-24" />
        {formError ? (
          <p className="rounded-2xl bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700" role="alert">
            {formError}
          </p>
        ) : null}
        <FormSubmitButton loading={isPending} loadingText="Adding customer..." icon={<Plus className="h-4 w-4" />} className="h-12 w-full">
          Add Customer
        </FormSubmitButton>
      </fieldset>
    </form>
  );
}
