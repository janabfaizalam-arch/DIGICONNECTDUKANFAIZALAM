"use client";

import { Loader2 } from "lucide-react";

import { PortalCard } from "@/components/customer/ui";
import { Field, TextArea, TextInput } from "@/components/apply/ui";
import type { useApplyFlow } from "@/components/apply/use-apply-flow";

type Flow = ReturnType<typeof useApplyFlow>;

/**
 * Step 2 — who the filing is for.
 *
 * One column, in the order somebody would say it aloud: name, how to reach
 * them, where they are. The pincode fills in state and district, so those two
 * are below it rather than above — a field that answers itself should not be
 * asked for first.
 */
export function StepCustomer({ flow }: { flow: Flow }) {
  const { customer, setCustomer, validationErrors, pincodeLoading, handlePincodeChange } = flow;

  const set = (key: keyof typeof customer) => (value: string) =>
    setCustomer((previous) => ({ ...previous, [key]: value }));

  return (
    <div className="space-y-5">

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

          <div className="grid gap-4 sm:grid-cols-2">
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

            <Field label="Alternate number" hint="In case the first one is unreachable.">
              <TextInput
                value={customer.altMobile}
                onChange={(event) => set("altMobile")(event.target.value.replace(/\D/g, "").slice(0, 10))}
                inputMode="numeric"
                placeholder="Another number"
              />
            </Field>
          </div>

          <Field
            label="Pincode"
            required
            error={validationErrors.pincode}
            hint="Enter this and we will fill in your state and district."
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

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="State" required error={validationErrors.state}>
              <TextInput
                value={customer.state}
                onChange={(event) => set("state")(event.target.value)}
                invalid={!!validationErrors.state}
                placeholder="State"
              />
            </Field>

            <Field label="City or district" required error={validationErrors.district}>
              <TextInput
                value={customer.district}
                onChange={(event) => set("district")(event.target.value)}
                invalid={!!validationErrors.district}
                placeholder="City or district"
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

          <Field label="Anything we should know" hint="A deadline, a preferred time to call, anything unusual.">
            <TextArea
              value={customer.note}
              onChange={(event) => set("note")(event.target.value)}
              placeholder="Optional note for our team"
            />
          </Field>
        </div>
      </PortalCard>
    </div>
  );
}
