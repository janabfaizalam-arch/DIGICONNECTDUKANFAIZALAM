"use client";

import { type FormEvent, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { services } from "@/lib/constants";

const initialState = {
  name: "",
  mobile: "",
  service: "",
  message: "",
};

export function LeadForm() {
  const [form, setForm] = useState(initialState);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = (await response.json()) as { message: string };
      setFeedback(result.message);

      if (response.ok) {
        setForm(initialState);
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          placeholder="Name"
          name="name"
          required
        />
        <Input
          value={form.mobile}
          onChange={(event) => setForm((current) => ({ ...current, mobile: event.target.value }))}
          placeholder="Mobile Number"
          name="mobile"
          inputMode="numeric"
          pattern="[0-9]{10}"
          required
        />
      </div>
      <Select value={form.service} onValueChange={(value) => setForm((current) => ({ ...current, service: value }))}>
        <SelectTrigger aria-label="Select Service">
          <SelectValue placeholder="Select Service" />
        </SelectTrigger>
        <SelectContent>
          {services.map((service) => (
            <SelectItem key={service.title} value={service.title}>
              {service.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Textarea
        value={form.message}
        onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
        placeholder="Message"
        name="message"
      />
      <Button type="submit" size="lg" className="w-full md:w-auto" disabled={isPending}>
        {isPending ? "Submitting..." : "Aaj hi apply karein"}
      </Button>
      {feedback ? <p className="text-sm font-medium text-slate-600">{feedback}</p> : null}
    </form>
  );
}
