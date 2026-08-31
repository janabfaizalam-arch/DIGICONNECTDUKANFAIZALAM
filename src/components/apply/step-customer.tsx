"use client";

import { Loader2 } from "lucide-react";

import { PortalCard } from "@/components/customer/ui";
import { Field, TextArea, TextInput } from "@/components/apply/ui";
import type { ApplyField } from "@/lib/apply/fields";
import type { useApplyFlow } from "@/components/apply/use-apply-flow";

type Flow = ReturnType<typeof useApplyFlow>;

/**
 * Step 2 — who the filing is for.
 *
 * One column, in the order somebody would say it aloud: name, how to reach
 * them, where they are. The pincode fills in city, district and state, so
 * those three sit below it — a field that answers itself should not be asked
 * for first.
 *
 * Six questions, and then whatever this particular service adds. The extra
 * questions are configured per service in the admin panel and rendered here by
 * the same components, so a service needing a GSTIN or an assessment year does
 * not need a form of its own.
 */
export function StepCustomer({ flow }: { flow: Flow }) {
  const {
    customer,
    setCustomer,
    validationErrors,
    pincodeLoading,
    handlePincodeChange,
    extraFields,
    extraValues,
    setExtraValue,
  } = flow;

  const set = (key: keyof typeof customer) => (value: string) =>
    setCustomer((previous) => ({ ...previous, [key]: value }));

  return (
    <div className="space-y-4 sm:space-y-5">
      <PortalCard>
        <div className="space-y-4">
          <Field label="Full name" required error={validationErrors.name} hint="Exactly as it appears on your Aadhaar.">
            <TextInput
              value={customer.name}
              onChange={(event) => set("name")(event.target.value)}
              invalid={!!validationErrors.name}
              autoComplete="name"
              placeholder="Your full name"
            />
          </Field>

          <Field label="Mobile number" required error={validationErrors.mobile} hint="We send filing updates here.">
            <TextInput
              value={customer.mobile}
              onChange={(event) => set("mobile")(event.target.value.replace(/\D/g, "").slice(0, 10))}
              invalid={!!validationErrors.mobile}
              inputMode="numeric"
              autoComplete="tel"
              placeholder="10-digit number"
            />
          </Field>

          <Field
            label="Pincode"
            required
            error={validationErrors.pincode}
            hint="Enter this and we will fill in your city, district and state."
          >
            <div className="relative">
              <TextInput
                value={customer.pincode}
                onChange={(event) => handlePincodeChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
                invalid={!!validationErrors.pincode}
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="6-digit pincode"
                className="pr-11"
              />
              {pincodeLoading ? (
                <Loader2
                  className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--dc-blue-mid)]"
                  aria-label="Looking up your pincode"
                />
              ) : null}
            </div>
          </Field>

          {/* Filled from the pincode, and still editable — the lookup is right
              most of the time, not all of the time. */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="City" required error={validationErrors.city}>
              <TextInput
                value={customer.city}
                onChange={(event) => set("city")(event.target.value)}
                invalid={!!validationErrors.city}
                placeholder="City"
              />
            </Field>

            <Field label="District" required error={validationErrors.district}>
              <TextInput
                value={customer.district}
                onChange={(event) => set("district")(event.target.value)}
                invalid={!!validationErrors.district}
                placeholder="District"
              />
            </Field>

            <Field label="State" required error={validationErrors.state}>
              <TextInput
                value={customer.state}
                onChange={(event) => set("state")(event.target.value)}
                invalid={!!validationErrors.state}
                placeholder="State"
              />
            </Field>
          </div>

          <Field label="Address" required error={validationErrors.address} hint="House or building, street, area.">
            <TextArea
              value={customer.address}
              onChange={(event) => set("address")(event.target.value)}
              invalid={!!validationErrors.address}
              autoComplete="street-address"
              placeholder="Where you live"
            />
          </Field>
        </div>
      </PortalCard>

      {extraFields.length ? (
        <PortalCard>
          <div className="space-y-4">
            <div>
              <h3 className="text-[14px] font-extrabold text-[var(--dc-ink)] sm:text-[15px]">
                For this service
              </h3>
              <p className="mt-1 text-[12.5px] font-medium leading-snug text-[var(--dc-body)]">
                A few more things the department asks for on this particular filing.
              </p>
            </div>

            {extraFields.map((field) => (
              <ExtraField
                key={field.id}
                field={field}
                value={extraValues[field.id] ?? ""}
                error={validationErrors[field.id]}
                onChange={(value) => setExtraValue(field.id, value)}
              />
            ))}
          </div>
        </PortalCard>
      ) : null}
    </div>
  );
}

/**
 * One admin-configured question.
 *
 * Rendered with the same `Field`, `TextInput` and `TextArea` the base form
 * uses, so a configured field is indistinguishable from a coded one — which is
 * the whole point of configuring it rather than coding it.
 */
function ExtraField({
  field,
  value,
  error,
  onChange,
}: {
  field: ApplyField;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const shared = {
    invalid: !!error,
    placeholder: field.placeholder,
  };

  if (field.control === "textarea") {
    return (
      <Field label={field.label} required={field.required} error={error} hint={field.help}>
        <TextArea {...shared} value={value} onChange={(event) => onChange(event.target.value)} />
      </Field>
    );
  }

  if (field.control === "select" && field.options?.length) {
    return (
      <Field label={field.label} required={field.required} error={error} hint={field.help}>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? "true" : undefined}
          className={`lg-field h-12 w-full rounded-xl px-3.5 text-[14px] font-semibold text-[var(--dc-ink)] outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--dc-blue-bright)]/40 ${
            error ? "ring-2 ring-[var(--dc-flame)]/50" : ""
          }`}
        >
          <option value="">Select…</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </Field>
    );
  }

  if (field.control === "checkbox") {
    return (
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={value === "Yes"}
          onChange={(event) => onChange(event.target.checked ? "Yes" : "")}
          aria-invalid={error ? "true" : undefined}
          className="mt-0.5 h-5 w-5 shrink-0 rounded-md accent-[var(--dc-flame)]"
        />
        <span className="min-w-0">
          <span className="block text-[13.5px] font-bold text-[var(--dc-ink)]">
            {field.label}
            {field.required ? <span className="text-[var(--dc-flame)]"> *</span> : null}
          </span>
          {field.help ? (
            <span className="block text-[12px] font-medium text-[var(--dc-body)]">{field.help}</span>
          ) : null}
          {error ? (
            <span className="block text-[12px] font-bold text-[var(--dc-flame)]">{error}</span>
          ) : null}
        </span>
      </label>
    );
  }

  const digitsOnly = field.inputMode === "numeric" || field.inputMode === "tel";

  return (
    <Field label={field.label} required={field.required} error={error} hint={field.help}>
      <TextInput
        {...shared}
        type={field.control === "date" ? "date" : field.inputMode === "email" ? "email" : "text"}
        inputMode={field.inputMode}
        maxLength={field.maxLength}
        value={value}
        onChange={(event) => {
          const next = digitsOnly ? event.target.value.replace(/[^\d.]/g, "") : event.target.value;
          onChange(field.maxLength ? next.slice(0, field.maxLength) : next);
        }}
      />
    </Field>
  );
}
