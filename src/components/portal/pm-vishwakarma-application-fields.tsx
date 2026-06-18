"use client";

import { useEffect } from "react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type PmVishwakarmaApplicationValues = {
  name: string;
  mobile: string;
  email: string;
  pincode: string;
  city: string;
  district: string;
  state: string;
  maritalStatus: string;
  casteCategory: string;
  tradeWorkType: string;
  traditionalOccupationCommunity: string;
  migrantWorker: string;
  upResidentFamilyBenefit: string;
  address: string;
  message: string;
  termsAccepted: boolean;
};

export type PincodeLookupResponse = {
  ok?: boolean;
  city?: string;
  district?: string;
  state?: string;
  message?: string;
};

export const pmVishwakarmaTrades = [
  "Tailor (Darzi)",
  "Barber (Nai)",
  "Carpenter (Badhai)",
  "Blacksmith (Lohar)",
  "Goldsmith (Sunar)",
  "Cobbler (Mochi)",
  "Potter (Kumhar)",
  "Mason (Rajmistri)",
  "Washerman (Dhobi)",
  "Garland Maker",
  "Basket/Broom Maker",
  "Toy Maker",
  "Locksmith",
  "Fishing Net Maker",
  "Sculptor",
  "Boat Maker",
  "Hammer & Tool Kit Maker",
  "Other",
];

export function createPmVishwakarmaInitialValues(values: Partial<PmVishwakarmaApplicationValues> = {}): PmVishwakarmaApplicationValues {
  return {
    name: "",
    mobile: "",
    email: "",
    pincode: "",
    city: "",
    district: "",
    state: "",
    maritalStatus: "",
    casteCategory: "",
    tradeWorkType: "",
    traditionalOccupationCommunity: "",
    migrantWorker: "",
    upResidentFamilyBenefit: "",
    address: "",
    message: "",
    termsAccepted: false,
    ...values,
  };
}

export function buildPmVishwakarmaDetails(values: PmVishwakarmaApplicationValues) {
  return {
    pincode: values.pincode.trim(),
    district: values.district.trim(),
    state: values.state.trim(),
    maritalStatus: values.maritalStatus.trim(),
    casteCategory: values.casteCategory.trim(),
    tradeWorkType: values.tradeWorkType.trim(),
    traditionalOccupationCommunity: values.traditionalOccupationCommunity.trim(),
    migrantWorker: values.migrantWorker.trim(),
    upResidentFamilyBenefit: values.upResidentFamilyBenefit.trim(),
    termsAccepted: values.termsAccepted ? "true" : "",
    address: values.address.trim(),
  };
}

export function getPmVishwakarmaValidationError(values: PmVishwakarmaApplicationValues) {
  if (!values.name.trim()) return "Name is required.";
  if (!/^\d{10}$/.test(values.mobile)) return "Enter a valid 10 digit Indian mobile number.";
  if (!/^\d{6}$/.test(values.pincode)) return "Enter a valid 6 digit PIN code.";
  if (!values.city.trim()) return "City is required.";
  if (!values.district.trim()) return "District is required.";
  if (!values.state.trim()) return "State is required.";
  if (!values.maritalStatus) return "Marital status is required.";
  if (!values.casteCategory.trim()) return "Caste / Category is required.";
  if (!values.tradeWorkType) return "Trade / Work Type is required.";
  if (!values.traditionalOccupationCommunity) return "Please answer the traditional occupation community question.";
  if (!values.migrantWorker) return "Please answer the migrant worker question.";
  if (!values.upResidentFamilyBenefit) return "Please confirm the Uttar Pradesh resident and family benefit declaration.";
  if (!values.termsAccepted) return "Please accept the terms and conditions.";
  return null;
}

export function isPmVishwakarmaComplete(values: PmVishwakarmaApplicationValues) {
  return !getPmVishwakarmaValidationError(values);
}

export function usePmVishwakarmaPincodeAutofill({
  enabled,
  values,
  setValues,
  setStatus,
}: {
  enabled: boolean;
  values: PmVishwakarmaApplicationValues;
  setValues: (updater: (current: PmVishwakarmaApplicationValues) => PmVishwakarmaApplicationValues) => void;
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
        if (!response.ok || !result.ok) throw new Error(result.message || "PIN code lookup failed.");
        setValues((current) => ({
          ...current,
          city: result.city || current.city,
          district: result.district || current.district,
          state: result.state || current.state,
        }));
        setStatus("Location auto-filled. You can edit it if needed.");
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("Auto-fetch failed. Please enter city, district and state manually.");
      });

    return () => controller.abort();
  }, [enabled, setStatus, setValues, values.pincode]);
}

function RequiredMark() {
  return <span className="text-red-600">*</span>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{children}</label>;
}

export function PmVishwakarmaApplicationFields({
  values,
  onChange,
  pincodeStatus,
}: {
  values: PmVishwakarmaApplicationValues;
  onChange: <Key extends keyof PmVishwakarmaApplicationValues>(key: Key, value: PmVishwakarmaApplicationValues[Key]) => void;
  pincodeStatus?: string;
}) {
  const questions = [
    {
      name: "traditionalOccupationCommunity",
      value: values.traditionalOccupationCommunity,
      label: "Traditional community occupation caste?",
    },
    {
      name: "migrantWorker",
      value: values.migrantWorker,
      label: "Migrant artisan/worker?",
    },
    {
      name: "upResidentFamilyBenefit",
      value: values.upResidentFamilyBenefit,
      label: "UP resident + no family benefit taken?",
    },
  ] as const;

  return (
    <div className="mt-2.5 grid gap-3">
      <div className="grid gap-2.5 sm:grid-cols-2">
        <div className="grid gap-0.5">
          <FieldLabel>Full Name <RequiredMark /></FieldLabel>
          <Input name="name" placeholder="Enter full name" required className="h-9 text-xs border-slate-200 bg-white" value={values.name} onChange={(event) => onChange("name", event.target.value)} />
        </div>
        <div className="grid gap-0.5">
          <FieldLabel>Mobile Number <RequiredMark /></FieldLabel>
          <Input
            name="mobile"
            placeholder="10 digit mobile number"
            inputMode="numeric"
            pattern="[0-9]{10}"
            required
            className="h-9 text-xs border-slate-200 bg-white"
            value={values.mobile}
            onChange={(event) => onChange("mobile", event.target.value.replace(/\D/g, "").slice(0, 10))}
          />
        </div>
        <div className="grid gap-0.5">
          <FieldLabel>Pin Code <RequiredMark /></FieldLabel>
          <Input
            name="pincode"
            placeholder="6 digit PIN code"
            inputMode="numeric"
            pattern="[0-9]{6}"
            required
            className="h-9 text-xs border-slate-200 bg-white"
            value={values.pincode}
            onChange={(event) => onChange("pincode", event.target.value.replace(/\D/g, "").slice(0, 6))}
          />
          {pincodeStatus ? <p className="text-[9px] font-semibold text-blue-600 mt-0.5">{pincodeStatus}</p> : null}
        </div>
        <div className="grid gap-0.5">
          <FieldLabel>City <RequiredMark /></FieldLabel>
          <Input name="city" placeholder="City" required className="h-9 text-xs border-slate-200 bg-white" value={values.city} onChange={(event) => onChange("city", event.target.value)} />
        </div>
        <div className="grid gap-0.5">
          <FieldLabel>District <RequiredMark /></FieldLabel>
          <Input name="district" placeholder="District" required className="h-9 text-xs border-slate-200 bg-white" value={values.district} onChange={(event) => onChange("district", event.target.value)} />
        </div>
        <div className="grid gap-0.5">
          <FieldLabel>State <RequiredMark /></FieldLabel>
          <Input name="state" placeholder="State" required className="h-9 text-xs border-slate-200 bg-white" value={values.state} onChange={(event) => onChange("state", event.target.value)} />
        </div>
        <div className="grid gap-0.5">
          <FieldLabel>Marital Status <RequiredMark /></FieldLabel>
          <select name="maritalStatus" required value={values.maritalStatus} onChange={(event) => onChange("maritalStatus", event.target.value)} className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-500">
            <option value="">Select status</option>
            <option value="Married">Married</option>
            <option value="Unmarried">Unmarried</option>
          </select>
        </div>
        <div className="grid gap-0.5">
          <FieldLabel>Caste / Category <RequiredMark /></FieldLabel>
          <Input name="casteCategory" placeholder="Caste / Category" required className="h-9 text-xs border-slate-200 bg-white" value={values.casteCategory} onChange={(event) => onChange("casteCategory", event.target.value)} />
        </div>
        <div className="grid gap-0.5 sm:col-span-2">
          <FieldLabel>Trade / Work Type <RequiredMark /></FieldLabel>
          <select name="tradeWorkType" required value={values.tradeWorkType} onChange={(event) => onChange("tradeWorkType", event.target.value)} className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-500 w-full">
            <option value="">Select trade / work type</option>
            {pmVishwakarmaTrades.map((trade) => <option key={trade} value={trade}>{trade}</option>)}
          </select>
        </div>
        <div className="grid gap-0.5">
          <FieldLabel>Email</FieldLabel>
          <Input name="email" placeholder="Email (optional)" type="email" className="h-9 text-xs border-slate-200 bg-white" value={values.email} onChange={(event) => onChange("email", event.target.value)} />
        </div>
        <div className="grid gap-0.5">
          <FieldLabel>Address</FieldLabel>
          <Input name="address" placeholder="Address (optional)" className="h-9 text-xs border-slate-200 bg-white" value={values.address} onChange={(event) => onChange("address", event.target.value)} />
        </div>
        <div className="grid gap-0.5 sm:col-span-2">
          <FieldLabel>Note / Message</FieldLabel>
          <Textarea name="message" placeholder="Note / Message (optional)" className="min-h-16 text-xs border-slate-200 bg-white" value={values.message} onChange={(event) => onChange("message", event.target.value)} />
        </div>
      </div>

      <div className="grid gap-2 bg-slate-50/50 rounded-2xl p-2.5">
        {questions.map((question) => (
          <fieldset key={question.name} className="p-0 border-0 bg-transparent space-y-1">
            <legend className="text-[10px] font-bold leading-tight text-slate-800">{question.label} <RequiredMark /></legend>
            <div className="flex gap-4">
              {["Yes", "No"].map((option) => (
                <label key={option} className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 cursor-pointer">
                  <input type="radio" name={question.name} value={option} required checked={question.value === option} onChange={() => onChange(question.name, option)} className="scale-90" />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <label className="flex items-start gap-2.5 rounded-2xl bg-orange-50/40 p-3 text-[10px] leading-relaxed text-slate-600 cursor-pointer border-none shadow-none">
        <input type="checkbox" name="termsAccepted" value="true" required checked={values.termsAccepted} onChange={(event) => onChange("termsAccepted", event.target.checked)} className="mt-0.5 scale-90" />
        <span>
          <span className="font-extrabold text-slate-900">Accept terms and conditions <RequiredMark /></span>
          <span className="mt-1 block text-slate-500 text-[9px]">
            I confirm all info is correct. Approvals depend on government eligibility rules. DigiConnect is an assistance/service provider, not an official authority. Fees are non-refundable after processing starts.
          </span>
        </span>
      </label>
    </div>
  );
}
