"use client";

import { useId, useState } from "react";

import { privacyContact } from "@/lib/compliance/config";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

const REQUEST_TYPES = [
  { value: "access", label: "Get a summary of my data" },
  { value: "correction", label: "Correct or update my data" },
  { value: "erasure", label: "Delete my data / close my account" },
  { value: "withdraw", label: "Withdraw my consent" },
  { value: "nominate", label: "Nominate someone to act for me" },
  { value: "grievance", label: "Raise a privacy complaint" },
] as const;

type RequestType = (typeof REQUEST_TYPES)[number]["value"];

/**
 * Privacy / data-rights request.
 *
 * Deliberately stores nothing: it composes the request and hands it to the
 * visitor's own email app or WhatsApp, both of which already reach the team
 * that answers. That keeps an identity-verification step (a reply to the
 * registered mobile / email) with a person, and avoids a new table of
 * unauthenticated personal data just to ask about personal data.
 */
export function PrivacyRequestForm() {
  const [type, setType] = useState<RequestType | "">("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [details, setDetails] = useState("");
  const [errors, setErrors] = useState<{ type?: string; name?: string; mobile?: string }>({});
  const [ready, setReady] = useState(false);
  const errorSummaryId = useId();

  const label = REQUEST_TYPES.find((option) => option.value === type)?.label ?? "";
  const message = [
    `Privacy request: ${label}`,
    `Name: ${name.trim()}`,
    `Registered mobile: ${mobile.trim()}`,
    details.trim() ? `Details: ${details.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  function validate() {
    const next: typeof errors = {};
    if (!type) next.type = "Choose what you would like us to do.";
    if (!name.trim()) next.name = "Enter your name.";
    const digits = mobile.replace(/\D/g, "");
    const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
    if (!/^[6-9]\d{9}$/.test(local)) {
      next.mobile = "Enter the 10-digit mobile number registered with us.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  const fieldClass =
    "mt-1 block w-full min-h-11 rounded-xl border border-slate-400 bg-white px-3 py-2 text-base text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/30";
  const errorKeys = Object.keys(errors) as (keyof typeof errors)[];

  return (
    <form
      noValidate
      aria-describedby={errorKeys.length ? errorSummaryId : undefined}
      onSubmit={(event) => {
        event.preventDefault();
        setReady(validate());
      }}
      className="space-y-4"
    >
      {errorKeys.length ? (
        <div id={errorSummaryId} role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          Please fix {errorKeys.length === 1 ? "1 field" : `${errorKeys.length} fields`} below.
        </div>
      ) : null}

      <div>
        <label htmlFor="privacy-request-type" className="text-sm font-bold text-slate-900">
          What would you like us to do? <span className="font-semibold text-slate-600">(required)</span>
        </label>
        <select
          id="privacy-request-type"
          required
          value={type}
          onChange={(event) => {
            setType(event.target.value as RequestType | "");
            setReady(false);
          }}
          aria-invalid={Boolean(errors.type)}
          aria-describedby={errors.type ? "privacy-request-type-error" : undefined}
          className={fieldClass}
        >
          <option value="">Choose a request</option>
          {REQUEST_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.type ? (
          <p id="privacy-request-type-error" className="mt-1 text-sm font-semibold text-red-800">
            {errors.type}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="privacy-request-name" className="text-sm font-bold text-slate-900">
          Your name <span className="font-semibold text-slate-600">(required)</span>
        </label>
        <input
          id="privacy-request-name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setReady(false);
          }}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "privacy-request-name-error" : undefined}
          className={fieldClass}
        />
        {errors.name ? (
          <p id="privacy-request-name-error" className="mt-1 text-sm font-semibold text-red-800">
            {errors.name}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="privacy-request-mobile" className="text-sm font-bold text-slate-900">
          Registered mobile number <span className="font-semibold text-slate-600">(required)</span>
        </label>
        <p id="privacy-request-mobile-hint" className="text-[13px] text-slate-600">
          We use it only to find your records and confirm the request is really from you.
        </p>
        <input
          id="privacy-request-mobile"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={14}
          required
          value={mobile}
          onChange={(event) => {
            setMobile(event.target.value);
            setReady(false);
          }}
          aria-invalid={Boolean(errors.mobile)}
          aria-describedby={`privacy-request-mobile-hint${errors.mobile ? " privacy-request-mobile-error" : ""}`}
          className={fieldClass}
        />
        {errors.mobile ? (
          <p id="privacy-request-mobile-error" className="mt-1 text-sm font-semibold text-red-800">
            {errors.mobile}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="privacy-request-details" className="text-sm font-bold text-slate-900">
          Details <span className="font-semibold text-slate-600">(optional)</span>
        </label>
        <p id="privacy-request-details-hint" className="text-[13px] text-slate-600">
          For example, which details are wrong. Please do not include Aadhaar, PAN or other ID numbers here.
        </p>
        <textarea
          id="privacy-request-details"
          rows={3}
          maxLength={800}
          value={details}
          onChange={(event) => {
            setDetails(event.target.value);
            setReady(false);
          }}
          aria-describedby="privacy-request-details-hint"
          className={fieldClass}
        />
      </div>

      <button
        type="submit"
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-800 px-5 text-sm font-bold text-white transition hover:bg-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
      >
        Prepare my privacy request
      </button>

      {ready ? (
        <div role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-950">
          <p className="font-bold">Your request is ready. Send it by email or WhatsApp:</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={`mailto:${privacyContact.email}?subject=${encodeURIComponent(`Privacy request: ${label}`)}&body=${encodeURIComponent(message)}`}
              className="inline-flex min-h-11 items-center rounded-xl border border-emerald-800 bg-white px-4 font-bold text-emerald-900 hover:bg-emerald-100"
            >
              Send by email
            </a>
            <a
              href={buildWhatsAppUrl(message, `91${privacyContact.phone}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded-xl border border-emerald-800 bg-white px-4 font-bold text-emerald-900 hover:bg-emerald-100"
            >
              Send on WhatsApp<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
          <p className="mt-2 text-[13px]">
            Nothing is saved on this page. We aim to acknowledge requests within {privacyContact.acknowledgeWithin}.
          </p>
        </div>
      ) : null}
    </form>
  );
}
