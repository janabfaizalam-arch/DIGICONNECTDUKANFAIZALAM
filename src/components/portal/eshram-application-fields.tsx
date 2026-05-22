"use client";

import { useEffect } from "react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PincodeLookupResponse } from "@/components/portal/pm-vishwakarma-application-fields";

export type EshramApplicationValues = {
  name: string;
  mobile: string;
  maritalStatus: string;
  pincode: string;
  city: string;
  district: string;
  state: string;
  email: string;
  workerCategory: string;
  primaryOccupation: string;
  monthlyIncomeRange: string;
  nomineeName: string;
  nomineeRelation: string;
  nomineeMobile: string;
  serviceType: string;
  message: string;
  consentAccepted: boolean;
};

export function createEshramInitialValues(values: Partial<EshramApplicationValues> = {}): EshramApplicationValues {
  return {
    name: "",
    mobile: "",
    maritalStatus: "",
    pincode: "",
    city: "",
    district: "",
    state: "",
    email: "",
    workerCategory: "",
    primaryOccupation: "",
    monthlyIncomeRange: "",
    nomineeName: "",
    nomineeRelation: "",
    nomineeMobile: "",
    serviceType: "New e-Shram Registration",
    message: "",
    consentAccepted: false,
    ...values,
  };
}

export function buildEshramDetails(values: EshramApplicationValues) {
  return {
    pincode: values.pincode.trim(),
    district: values.district.trim(),
    state: values.state.trim(),
    maritalStatus: values.maritalStatus.trim(),
    workerCategory: values.workerCategory.trim(),
    primaryOccupation: values.primaryOccupation.trim(),
    monthlyIncomeRange: values.monthlyIncomeRange.trim(),
    nomineeName: values.nomineeName.trim(),
    nomineeRelation: values.nomineeRelation.trim(),
    nomineeMobile: values.nomineeMobile.trim(),
    serviceType: values.serviceType.trim(),
    consentAccepted: values.consentAccepted ? "true" : "",
  };
}

export function getEshramValidationError(values: EshramApplicationValues) {
  if (!values.name.trim()) return "Full name is required.";
  if (!/^[6-9]\d{9}$/.test(values.mobile)) return "Enter a valid Indian 10 digit mobile number.";
  if (!values.maritalStatus) return "Marital status is required.";
  if (!/^\d{6}$/.test(values.pincode)) return "Enter a valid 6 digit PIN code.";
  if (!values.city.trim()) return "City is required.";
  if (!values.district.trim()) return "District is required.";
  if (!values.state.trim()) return "State is required.";
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) return "Enter a valid email address.";
  if (values.nomineeMobile && !/^[6-9]\d{9}$/.test(values.nomineeMobile)) return "Enter a valid nominee mobile number.";
  if (!values.serviceType) return "Select an e-Shram service type.";
  if (!values.consentAccepted) return "Please confirm the e-Shram assistance consent.";
  return null;
}

export function isEshramComplete(values: EshramApplicationValues) {
  return !getEshramValidationError(values);
}

export function useEshramPincodeAutofill({
  enabled,
  values,
  setValues,
  setStatus,
}: {
  enabled: boolean;
  values: EshramApplicationValues;
  setValues: (updater: (current: EshramApplicationValues) => EshramApplicationValues) => void;
  setStatus: (status: string) => void;
}) {
  useEffect(() => {
    if (!enabled) return;

    if (!/^\d{6}$/.test(values.pincode)) {
      setStatus("");
      return;
    }

    const controller = new AbortController();
    setStatus("Fetching city, district and state...");

    fetch(`/api/pincode?pincode=${encodeURIComponent(values.pincode)}`, { signal: controller.signal })
      .then(async (response) => {
        const result = (await response.json()) as PincodeLookupResponse;
        if (!response.ok || !result.ok || !result.city || !result.district || !result.state) {
          throw new Error(result.message || "PIN code lookup failed.");
        }
        setValues((current) => ({
          ...current,
          city: result.city || current.city,
          district: result.district || current.district,
          state: result.state || current.state,
        }));
        setStatus("Location auto-filled from PIN code.");
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("Auto-fetch failed. Please enter city, district and state.");
      });

    return () => controller.abort();
  }, [enabled, setStatus, setValues, values.pincode]);
}

function RequiredMark() {
  return <span className="text-red-600">*</span>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-bold text-slate-800">{children}</label>;
}

const maritalStatuses = ["Single", "Married", "Widowed", "Divorced"];
const serviceTypes = [
  "New e-Shram Registration",
  "e-Shram Card Download",
  "e-Shram Update/Correction",
  "e-Shram PVC Print",
  "e-Shram Status Check",
];
const incomeRanges = ["Below Rs 10,000", "Rs 10,000 - Rs 25,000", "Rs 25,001 - Rs 50,000", "Above Rs 50,000"];

export function EshramApplicationFields({
  values,
  onChange,
  pincodeStatus,
}: {
  values: EshramApplicationValues;
  onChange: <Key extends keyof EshramApplicationValues>(key: Key, value: EshramApplicationValues[Key]) => void;
  pincodeStatus?: string;
}) {
  return (
    <div className="mt-3 grid gap-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-1.5">
          <FieldLabel>Full Name <RequiredMark /></FieldLabel>
          <Input name="name" required placeholder="Enter full name" className="h-12 text-sm" value={values.name} onChange={(event) => onChange("name", event.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <FieldLabel>Mobile Number <RequiredMark /></FieldLabel>
          <Input name="mobile" required inputMode="numeric" pattern="[6-9][0-9]{9}" placeholder="10 digit mobile number" className="h-12 text-sm" value={values.mobile} onChange={(event) => onChange("mobile", event.target.value.replace(/\D/g, "").slice(0, 10))} />
        </div>
        <div className="grid gap-1.5">
          <FieldLabel>Marital Status <RequiredMark /></FieldLabel>
          <select name="maritalStatus" required value={values.maritalStatus} onChange={(event) => onChange("maritalStatus", event.target.value)} className="h-12 rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]">
            <option value="">Select marital status</option>
            {maritalStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>
        <div className="grid gap-1.5">
          <FieldLabel>PIN Code <RequiredMark /></FieldLabel>
          <Input
            name="pincode"
            required
            inputMode="numeric"
            pattern="[0-9]{6}"
            placeholder="6 digit PIN code"
            className="h-12 text-sm"
            value={values.pincode}
            onChange={(event) => {
              onChange("pincode", event.target.value.replace(/\D/g, "").slice(0, 6));
              onChange("city", "");
              onChange("district", "");
              onChange("state", "");
            }}
          />
          {pincodeStatus ? <p className="text-xs font-semibold text-blue-700">{pincodeStatus}</p> : null}
        </div>
        <div className="grid gap-1.5">
          <FieldLabel>City <RequiredMark /></FieldLabel>
          <Input name="city" required readOnly placeholder="Auto-filled from PIN code" className="h-12 bg-slate-50 text-sm" value={values.city} />
        </div>
        <div className="grid gap-1.5">
          <FieldLabel>District <RequiredMark /></FieldLabel>
          <Input name="district" required readOnly placeholder="Auto-filled from PIN code" className="h-12 bg-slate-50 text-sm" value={values.district} />
        </div>
        <div className="grid gap-1.5">
          <FieldLabel>State <RequiredMark /></FieldLabel>
          <Input name="state" required readOnly placeholder="Auto-filled from PIN code" className="h-12 bg-slate-50 text-sm" value={values.state} />
        </div>
        <div className="grid gap-1.5">
          <FieldLabel>Email</FieldLabel>
          <Input name="email" type="email" placeholder="Email optional" className="h-12 text-sm" value={values.email} onChange={(event) => onChange("email", event.target.value)} />
        </div>
      </div>

      <section className="grid gap-3 rounded-2xl border border-blue-100 bg-blue-50/45 p-4">
        <div>
          <p className="text-sm font-extrabold text-slate-950">Occupation Details</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">Optional worker information for assistance.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Input name="workerCategory" placeholder="Worker Category" className="h-12 text-sm" value={values.workerCategory} onChange={(event) => onChange("workerCategory", event.target.value)} />
          <Input name="primaryOccupation" placeholder="Primary Occupation" className="h-12 text-sm" value={values.primaryOccupation} onChange={(event) => onChange("primaryOccupation", event.target.value)} />
          <select name="monthlyIncomeRange" value={values.monthlyIncomeRange} onChange={(event) => onChange("monthlyIncomeRange", event.target.value)} className="h-12 rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]">
            <option value="">Monthly Income Range optional</option>
            {incomeRanges.map((range) => <option key={range} value={range}>{range}</option>)}
          </select>
        </div>
      </section>

      <section className="grid gap-3 rounded-2xl border border-slate-100 bg-white p-4">
        <div>
          <p className="text-sm font-extrabold text-slate-950">Nominee Details</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">Optional nominee information.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Input name="nomineeName" placeholder="Nominee Name" className="h-12 text-sm" value={values.nomineeName} onChange={(event) => onChange("nomineeName", event.target.value)} />
          <Input name="nomineeRelation" placeholder="Relation" className="h-12 text-sm" value={values.nomineeRelation} onChange={(event) => onChange("nomineeRelation", event.target.value)} />
          <Input name="nomineeMobile" inputMode="numeric" pattern="[6-9][0-9]{9}" placeholder="Nominee Mobile optional" className="h-12 text-sm" value={values.nomineeMobile} onChange={(event) => onChange("nomineeMobile", event.target.value.replace(/\D/g, "").slice(0, 10))} />
        </div>
      </section>

      <section className="grid gap-3 rounded-2xl border border-orange-100 bg-orange-50/45 p-4">
        <div className="grid gap-1.5">
          <FieldLabel>Service Type <RequiredMark /></FieldLabel>
          <select name="serviceType" required value={values.serviceType} onChange={(event) => onChange("serviceType", event.target.value)} className="h-12 rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]">
            {serviceTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        <Textarea name="message" placeholder="Notes / Message optional" className="min-h-20 text-sm" value={values.message} onChange={(event) => onChange("message", event.target.value)} />
      </section>

      <label className="flex items-start gap-3 rounded-2xl border border-orange-100 bg-white p-4 text-sm leading-6 text-slate-700">
        <input type="checkbox" name="consentAccepted" value="true" required checked={values.consentAccepted} onChange={(event) => onChange("consentAccepted", event.target.checked)} className="mt-1" />
        <span className="font-semibold">
          I confirm that the information provided is correct and I authorize DigiConnect Dukan to assist with my e-Shram related service. <RequiredMark />
        </span>
      </label>
    </div>
  );
}
