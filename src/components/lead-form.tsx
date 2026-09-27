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
import { FormPrivacyNotice } from "@/components/privacy/form-privacy-notice";

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
        <div className="space-y-1.5">
          <label htmlFor="lead-name" className="text-sm font-semibold text-slate-800">
            Name <span className="font-normal text-slate-600">(required)</span>
          </label>
          <Input
            id="lead-name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Your full name"
            name="name"
            autoComplete="name"
            required
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="lead-mobile" className="text-sm font-semibold text-slate-800">
            Mobile number <span className="font-normal text-slate-600">(required)</span>
          </label>
          <Input
            id="lead-mobile"
            value={form.mobile}
            onChange={(event) => setForm((current) => ({ ...current, mobile: event.target.value }))}
            placeholder="10-digit mobile number"
            name="mobile"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            pattern="[0-9]{10}"
            maxLength={10}
            title="Enter a 10-digit mobile number"
            required
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <span id="lead-service-label" className="text-sm font-semibold text-slate-800">
          Service <span className="font-normal text-slate-600">(required)</span>
        </span>
        <Select value={form.service} onValueChange={(value) => setForm((current) => ({ ...current, service: value }))}>
          <SelectTrigger aria-labelledby="lead-service-label">
            <SelectValue placeholder="Select a service" />
          </SelectTrigger>
          <SelectContent>
            {services.map((service) => (
              <SelectItem key={service.title} value={service.title}>
                {service.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="lead-message" className="text-sm font-semibold text-slate-800">
          Message <span className="font-normal text-slate-600">(optional)</span>
        </label>
        <Textarea
          id="lead-message"
          value={form.message}
          onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
          placeholder="Anything we should know? Please don't include Aadhaar or PAN numbers."
          name="message"
        />
      </div>
      <p className="text-sm font-medium leading-relaxed text-slate-600">
        Our team will contact you shortly after submission.
      </p>
      <FormPrivacyNotice purpose="to contact you about the service you asked for" />
      <Button type="submit" size="lg" className="w-full md:w-auto" disabled={isPending}>
        {isPending ? <ButtonSpinner /> : null}
        {isPending ? "Please wait..." : "Send enquiry"}
      </Button>
      </fieldset>
      <p role="status" aria-live="polite" className="text-sm font-medium text-slate-600">{feedback}</p>
    </form>
  );
}
