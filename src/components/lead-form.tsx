"use client";

import { type FormEvent, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ButtonSpinner } from "@/components/ui/loading";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { services } from "@/lib/constants";
import { trackLeadSubmit } from "@/lib/google-analytics";
import { trackLead } from "@/lib/meta-pixel";
import { useToast } from "@/components/providers/toast-provider";

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
  const { success, error: toastError } = useToast();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) return;
    setFeedback(null);

    const formData = new FormData();
    formData.set("name", form.name);
    formData.set("mobile", form.mobile);
    formData.set("service", form.service);
    formData.set("message", form.message);

    /*
      The element is captured before the await. React nulls `currentTarget` as
      soon as the handler returns, so reading it after the fetch threw a
      TypeError — which happened on the success path, after the state reset and
      *before* the success toast, so a submission that worked looked to the
      customer like nothing happened.
    */
    const formElement = event.currentTarget;

    startTransition(async () => {
      let response: Response;
      try {
        response = await fetch("/api/lead", { method: "POST", body: formData });
      } catch {
        /*
          A dropped connection used to reject silently: no message, no toast,
          the form still full. On a phone on shop wifi this is the most likely
          failure of all, so it gets the clearest answer.
        */
        const offline = "Network nahi mila. Ek baar phir try kijiye, ya WhatsApp par bhej dijiye.";
        setFeedback(offline);
        toastError(offline);
        return;
      }

      const text = await response.text();
      let result: { message?: string; error?: string };

      try {
        result = JSON.parse(text) as { message?: string; error?: string };
      } catch {
        result = { error: text || "The server response was not valid." };
      }

      const message = result.message ?? result.error ?? "Lead submission failed.";
      setFeedback(message);

      if (response.ok) {
        trackLead();
        trackLeadSubmit();
        setForm(initialState);
        formElement.reset();
        success(message);
      } else {
        toastError(message);
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 pb-3 md:pb-0" aria-busy={isPending}>
      <fieldset disabled={isPending} className="space-y-4">
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
      <p className="text-sm font-medium leading-relaxed text-slate-600">
        Our team will contact you shortly after submission.
      </p>
      <Button type="submit" size="lg" className="w-full md:w-auto" disabled={isPending}>
        {isPending ? <ButtonSpinner /> : null}
        {isPending ? "Please wait..." : "Get Started"}
      </Button>
      </fieldset>
      {feedback ? <p className="text-sm font-medium text-slate-600">{feedback}</p> : null}
    </form>
  );
}
