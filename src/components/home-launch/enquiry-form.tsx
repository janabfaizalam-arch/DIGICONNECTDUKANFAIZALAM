"use client";

import { useId, useState, type FormEvent } from "react";
import { Send } from "lucide-react";

import { FormPrivacyNotice } from "@/components/privacy/form-privacy-notice";
import { trackLeadSubmit } from "@/lib/google-analytics";
import { trackLead } from "@/lib/meta-pixel";

/**
 * Ask for a quote on services checkout cannot sell.
 *
 * Posts to the existing public lead endpoint — the same one the site's
 * enquiry form uses — so it lands in the CRM like any other enquiry. It asks
 * for a name and a mobile number and nothing else, and the message it sends
 * is the setup the visitor built, which they can read and edit first.
 */
export function EnquiryForm({ service, summary, tone = "light" }: { service: string; summary: string; tone?: "light" | "dark" }) {
  const id = useId();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [message, setMessage] = useState(summary);
  const [state, setState] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setState(null);
    const body = new FormData();
    body.set("name", name.trim());
    body.set("mobile", mobile.trim());
    body.set("service", service);
    body.set("message", message.trim());
    try {
      const response = await fetch("/api/lead", { method: "POST", body });
      const result = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
      if (response.ok) {
        trackLead();
        trackLeadSubmit();
        setState({ tone: "ok", text: result.message ?? "Thank you — our team will call you shortly." });
        setName("");
        setMobile("");
      } else {
        setState({ tone: "error", text: result.error ?? result.message ?? "That didn't go through. Please try again, or WhatsApp us." });
      }
    } catch {
      setState({ tone: "error", text: "No connection. Please try again, or WhatsApp us." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }} aria-busy={busy}>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <div className="rl-field">
          <label htmlFor={`${id}-name`}>Name</label>
          <input id={`${id}-name`} name="name" autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="rl-field">
          <label htmlFor={`${id}-mobile`}>Mobile number</label>
          <input
            id={`${id}-mobile`}
            name="mobile"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            pattern="[0-9]{10}"
            maxLength={10}
            title="Enter a 10-digit mobile number"
            required
            value={mobile}
            onChange={(event) => setMobile(event.target.value.replace(/\D/g, ""))}
          />
        </div>
      </div>
      <div className="rl-field">
        <label htmlFor={`${id}-message`}>What you&apos;d like a quote for</label>
        <textarea id={`${id}-message`} name="message" value={message} onChange={(event) => setMessage(event.target.value)} />
      </div>
      <FormPrivacyNotice purpose="to call you back about the setup you asked for" tone={tone} />
      <div>
        <button type="submit" className="rl-btn rl-btn--blue" disabled={busy}>
          <Send aria-hidden="true" />
          {busy ? "Sending…" : "Request a quote"}
        </button>
      </div>
      <p role="status" aria-live="polite" className="rl-status" data-tone={state?.tone}>
        {state?.text}
      </p>
    </form>
  );
}
