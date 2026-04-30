"use client";

import { type FormEvent, useState, useTransition } from "react";
import { LoaderCircle, Send } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ServiceLeadFormProps = {
  serviceTitle: string;
};

const initialState = {
  name: "",
  mobile: "",
  message: "",
};

export function ServiceLeadForm({ serviceTitle }: ServiceLeadFormProps) {
  const [form, setForm] = useState(initialState);
  const [isPending, startTransition] = useTransition();
  const { success, error: toastError } = useToast();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      try {
        const response = await fetch("/api/leads", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...form,
            service: serviceTitle,
          }),
        });
        const result = (await response.json()) as { message: string };

        if (!response.ok) {
          throw new Error(result.message);
        }

        setForm(initialState);
        success(result.message);
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Request submission failed.");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input
        value={form.name}
        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
        name="name"
        placeholder="Name"
        required
      />
      <Input
        value={form.mobile}
        onChange={(event) => setForm((current) => ({ ...current, mobile: event.target.value }))}
        name="mobile"
        placeholder="Mobile"
        inputMode="numeric"
        pattern="[0-9]{10}"
        required
      />
      <Input name="service" value={serviceTitle} readOnly aria-label="Service" className="bg-slate-50 font-medium" />
      <Textarea
        value={form.message}
        onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
        name="message"
        placeholder="Message"
        className="min-h-28"
      />
      <Button type="submit" size="lg" disabled={isPending} className="w-full rounded-2xl">
        {isPending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        Submit Request
      </Button>
    </form>
  );
}
