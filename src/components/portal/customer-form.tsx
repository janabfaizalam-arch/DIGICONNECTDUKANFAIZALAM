"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormSubmitButton } from "@/components/ui/loading";
import { Textarea } from "@/components/ui/textarea";

export function CustomerForm() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [redirectToApplication, setRedirectToApplication] = useState(true);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const response = await fetch("/api/agent/customers", {
          method: "POST",
          body: formData,
        });
        const result = (await response.json()) as { message?: string; customerId?: string };

        if (!response.ok || !result.customerId) {
          throw new Error(result.message ?? "Customer could not be created.");
        }

        success(result.message ?? "Customer created.");
        router.push(redirectToApplication ? `/agent/applications/new?customerId=${result.customerId}` : "/agent/dashboard");
        router.refresh();
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Customer could not be created.");
      }
    });
  }

  return (
    <Card className="p-4 md:p-6">
      <form onSubmit={onSubmit} className="grid gap-4" aria-busy={isPending}>
        <fieldset disabled={isPending} className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Input name="fullName" placeholder="Customer name" required />
          <Input name="mobile" placeholder="Mobile number" inputMode="numeric" required />
          <Input name="email" placeholder="Email optional" type="email" />
          <Input name="city" placeholder="City" />
          <Textarea name="address" placeholder="Address" className="min-h-24 md:col-span-2" />
          <Textarea name="notes" placeholder="Internal notes" className="min-h-24 md:col-span-2" />
        </div>

        <label className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={redirectToApplication}
            onChange={(event) => setRedirectToApplication(event.target.checked)}
            className="mt-1 h-4 w-4 accent-[var(--primary)]"
          />
          Create an application for this customer next
        </label>

        <FormSubmitButton loading={isPending} loadingText="Saving customer..." icon={<Save className="h-4 w-4" />} className="w-full md:w-fit">
          Save Customer
        </FormSubmitButton>
        </fieldset>
      </form>
    </Card>
  );
}
