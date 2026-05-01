"use client";

import { type FormEvent, useState, useTransition } from "react";
import { LoaderCircle, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type AgentLeadFormProps = {
  services: string[];
};

export function AgentLeadForm({ services }: AgentLeadFormProps) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [service, setService] = useState(services[0] ?? "PAN Card Services");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("service", service);

    startTransition(async () => {
      try {
        const response = await fetch("/api/agent/leads", {
          method: "POST",
          body: formData,
        });
        const result = (await response.json()) as { message?: string };

        if (!response.ok) {
          throw new Error(result.message || "Lead could not be saved.");
        }

        success(result.message || "Lead saved successfully.");
        event.currentTarget.reset();
        router.refresh();
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Lead could not be saved.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
      <Input name="customerName" placeholder="Customer name" required />
      <Input name="mobile" placeholder="Mobile number" inputMode="tel" required />
      <select
        value={service}
        onChange={(event) => setService(event.target.value)}
        className="h-12 rounded-2xl border bg-white px-4 text-sm font-bold text-slate-900 outline-none"
      >
        {services.map((serviceName) => (
          <option key={serviceName} value={serviceName}>
            {serviceName}
          </option>
        ))}
      </select>
      <Input name="city" placeholder="City" />
      <Textarea name="notes" placeholder="Lead notes" className="min-h-24 md:col-span-2" />
      <Button type="submit" disabled={isPending} className="h-12 md:col-span-2">
        {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Add Lead
      </Button>
    </form>
  );
}
