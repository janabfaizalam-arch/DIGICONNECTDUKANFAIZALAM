"use client";

import { useEffect, useState } from "react";
import { CreditCard, FileUp, Trash2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type PvcCardApplicationValues = {
  name: string;
  mobile: string;
  email: string;
  cardType: string;
  deliveryAddress: string;
  pincode: string;
  city: string;
  district: string;
  state: string;
  consentOwnership: boolean;
  consentProcessing: boolean;
  message: string;
};

export type PincodeLookupResponse = {
  ok: boolean;
  city?: string;
  district?: string;
  state?: string;
  message?: string;
};

export function createPvcCardInitialValues(values: Partial<PvcCardApplicationValues> = {}): PvcCardApplicationValues {
  return {
    name: "",
    mobile: "",
    email: "",
    cardType: "",
    deliveryAddress: "",
    pincode: "",
    city: "",
    district: "",
    state: "",
    consentOwnership: false,
    consentProcessing: false,
    message: "",
    ...values,
  };
}

export function buildPvcCardDetails(values: PvcCardApplicationValues) {
  return {
    cardType: values.cardType.trim(),
    deliveryAddress: values.deliveryAddress.trim(),
    pincode: values.pincode.trim(),
    city: values.city.trim(),
    district: values.district.trim(),
    state: values.state.trim(),
    consentOwnership: values.consentOwnership ? "true" : "",
    consentProcessing: values.consentProcessing ? "true" : "",
    serviceType: "PVC Card Printing",
  };
}

export function getPvcCardValidationError(values: PvcCardApplicationValues, files: File[]) {
  if (!values.name.trim()) return "Full Name is required.";
  if (!/^[6-9]\d{9}$/.test(values.mobile)) return "Enter a valid Indian 10-digit mobile number.";
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) return "Enter a valid email address.";
  if (!values.cardType) return "Please select a PVC Card Type.";
  if (!/^\d{6}$/.test(values.pincode)) return "Enter a valid 6-digit PIN code.";
  if (!values.city.trim()) return "City is required. Please check your pincode.";
  if (!values.district.trim()) return "District is required.";
  if (!values.state.trim()) return "State is required.";
  if (!values.deliveryAddress.trim()) return "Delivery Address is required.";
  if (files.length < 2) return "Both Front and Back side images are required for PVC printing.";
  if (!values.consentOwnership) return "Please confirm that you own or are authorized to print this document.";
  if (!values.consentProcessing) return "Please consent to the processing and printing of your card.";
  return null;
}

export function isPvcCardComplete(values: PvcCardApplicationValues, files: File[]) {
  return !getPvcCardValidationError(values, files);
}

export function usePvcCardPincodeAutofill({
  enabled,
  values,
  setValues,
  setStatus,
}: {
  enabled: boolean;
  values: PvcCardApplicationValues;
  setValues: (updater: (current: PvcCardApplicationValues) => PvcCardApplicationValues) => void;
  setStatus: (status: string) => void;
}) {
  useEffect(() => {
    if (!enabled) return;

    if (!/^\d{6}$/.test(values.pincode)) {
      setStatus("");
      return;
    }

    const controller = new AbortController();
    setStatus("Looking up location details...");

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
        setStatus("Location auto-filled successfully!");
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("Pincode lookup failed. Please enter location manually.");
      });

    return () => controller.abort();
  }, [enabled, setStatus, setValues, values.pincode]);
}

function RequiredMark() {
  return <span className="text-red-500 font-bold ml-0.5">*</span>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-bold text-slate-800 tracking-wide">{children}</label>;
}

const cardTypes = [
  "Aadhaar PVC Card",
  "PAN PVC Card",
  "Voter ID PVC Card",
  "Ayushman Card PVC Card",
  "ABHA Card PVC Card",
  "Driving Licence PVC Card",
  "Other Government ID Cards",
];

export function PvcCardApplicationFields({
  values,
  onChange,
  pincodeStatus,
  selectedFiles,
  onFilesChange,
}: {
  values: PvcCardApplicationValues;
  onChange: <Key extends keyof PvcCardApplicationValues>(key: Key, value: PvcCardApplicationValues[Key]) => void;
  pincodeStatus?: string;
  selectedFiles: File[];
  onFilesChange: (files: File[]) => void;
}) {
  const [frontFile, setFrontFile] = useState<File | null>(selectedFiles[0] || null);
  const [backFile, setBackFile] = useState<File | null>(selectedFiles[1] || null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);

  // Sync state with parent files list
  useEffect(() => {
    const files = [frontFile, backFile].filter(Boolean) as File[];
    onFilesChange(files);
  }, [frontFile, backFile, onFilesChange]);

  // Set up previews for visual Wow factor
  useEffect(() => {
    if (!frontFile) {
      setFrontPreview(null);
      return;
    }
    if (frontFile.type.startsWith("image/")) {
      const url = URL.createObjectURL(frontFile);
      setFrontPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setFrontPreview("pdf");
    }
  }, [frontFile]);

  useEffect(() => {
    if (!backFile) {
      setBackPreview(null);
      return;
    }
    if (backFile.type.startsWith("image/")) {
      const url = URL.createObjectURL(backFile);
      setBackPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setBackPreview("pdf");
    }
  }, [backFile]);

  const maxFileSize = 5 * 1024 * 1024;
  const allowedFileTypes = ["application/pdf", "image/jpeg", "image/png"];

  const validateAndSetFile = (file: File, type: "front" | "back") => {
    if (!allowedFileTypes.includes(file.type)) {
      alert("Invalid format! Document must be PDF, JPG, or PNG.");
      return;
    }
    if (file.size > maxFileSize) {
      alert("File is too large! Maximum limit is 5MB.");
      return;
    }

    if (type === "front") {
      setFrontFile(file);
    } else {
      setBackFile(file);
    }
  };

  return (
    <div className="mt-4 grid gap-5">
      {/* Basic Customer Profile info */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-1.5">
          <FieldLabel>Full Name <RequiredMark /></FieldLabel>
          <Input
            name="name"
            required
            placeholder="Enter full name (as on card)"
            className="h-12 rounded-xl text-sm"
            value={values.name}
            onChange={(event) => onChange("name", event.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <FieldLabel>Mobile Number <RequiredMark /></FieldLabel>
          <Input
            name="mobile"
            required
            inputMode="numeric"
            pattern="[6-9][0-9]{9}"
            placeholder="10-digit mobile number"
            className="h-12 rounded-xl text-sm"
            value={values.mobile}
            onChange={(event) => onChange("mobile", event.target.value.replace(/\D/g, "").slice(0, 10))}
          />
        </div>
        <div className="grid gap-1.5">
          <FieldLabel>Email <span className="text-slate-400 text-xs font-medium">(Optional)</span></FieldLabel>
          <Input
            name="email"
            type="email"
            placeholder="Enter email address"
            className="h-12 rounded-xl text-sm"
            value={values.email}
            onChange={(event) => onChange("email", event.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <FieldLabel>Card Type Dropdown <RequiredMark /></FieldLabel>
          <select
            name="cardType"
            required
            value={values.cardType}
            onChange={(event) => onChange("cardType", event.target.value)}
            className="h-12 rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">Select Government / ID Card Type</option>
            {cardTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Premium Side-by-side Dual Image Uploader */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Front Card Uploader */}
        <div className="flex flex-col gap-2">
          <FieldLabel>Upload Front Side Image <RequiredMark /></FieldLabel>
          <div className="relative flex min-h-[160px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-4 transition duration-200 hover:border-blue-400 hover:bg-blue-50/10">
            {frontPreview ? (
              <div className="flex w-full flex-col items-center justify-center gap-2">
                {frontPreview === "pdf" ? (
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-red-100 text-red-700">
                    <span className="text-xs font-bold font-mono">PDF</span>
                  </div>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={frontPreview}
                    alt="Front Preview"
                    className="h-24 max-w-full rounded-lg object-contain shadow-sm border border-slate-100"
                  />
                )}
                <span className="max-w-full truncate text-[11px] font-bold text-slate-700">{frontFile?.name}</span>
                <button
                  type="button"
                  onClick={() => setFrontFile(null)}
                  className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1.5 text-[10px] font-bold text-red-600 hover:bg-red-100 transition"
                >
                  <Trash2 className="h-3 w-3" />
                  Remove Image
                </button>
              </div>
            ) : (
              <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <FileUp className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Click to upload Front Side</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Supports PDF, JPG, PNG (Max 5MB)</span>
                </div>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) validateAndSetFile(file, "front");
                  }}
                />
              </label>
            )}
          </div>
        </div>

        {/* Back Card Uploader */}
        <div className="flex flex-col gap-2">
          <FieldLabel>Upload Back Side Image <RequiredMark /></FieldLabel>
          <div className="relative flex min-h-[160px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-4 transition duration-200 hover:border-blue-400 hover:bg-blue-50/10">
            {backPreview ? (
              <div className="flex w-full flex-col items-center justify-center gap-2">
                {backPreview === "pdf" ? (
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-red-100 text-red-700">
                    <span className="text-xs font-bold font-mono">PDF</span>
                  </div>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={backPreview}
                    alt="Back Preview"
                    className="h-24 max-w-full rounded-lg object-contain shadow-sm border border-slate-100"
                  />
                )}
                <span className="max-w-full truncate text-[11px] font-bold text-slate-700">{backFile?.name}</span>
                <button
                  type="button"
                  onClick={() => setBackFile(null)}
                  className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1.5 text-[10px] font-bold text-red-600 hover:bg-red-100 transition"
                >
                  <Trash2 className="h-3 w-3" />
                  Remove Image
                </button>
              </div>
            ) : (
              <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <FileUp className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Click to upload Back Side</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Supports PDF, JPG, PNG (Max 5MB)</span>
                </div>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) validateAndSetFile(file, "back");
                  }}
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Pincode Autofill Resolution */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50/20 p-4 grid gap-3">
        <p className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
          <CreditCard className="h-4 w-4 text-blue-600" />
          Delivery Details
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <FieldLabel>Pincode <RequiredMark /></FieldLabel>
            <Input
              name="pincode"
              required
              inputMode="numeric"
              pattern="[0-9]{6}"
              placeholder="Enter 6-digit pincode"
              className="h-12 rounded-xl text-sm"
              value={values.pincode}
              onChange={(event) => {
                onChange("pincode", event.target.value.replace(/\D/g, "").slice(0, 6));
                onChange("city", "");
                onChange("district", "");
                onChange("state", "");
              }}
            />
            {pincodeStatus ? (
              <p className="text-xs font-semibold text-blue-700 animate-pulse">{pincodeStatus}</p>
            ) : null}
          </div>

          <div className="grid gap-1.5">
            <FieldLabel>City <RequiredMark /></FieldLabel>
            <Input
              name="city"
              required
              readOnly
              placeholder="City (Auto-filled)"
              className="h-12 bg-slate-50 text-sm rounded-xl cursor-not-allowed"
              value={values.city}
            />
          </div>

          <div className="grid gap-1.5">
            <FieldLabel>District <RequiredMark /></FieldLabel>
            <Input
              name="district"
              required
              readOnly
              placeholder="District (Auto-filled)"
              className="h-12 bg-slate-50 text-sm rounded-xl cursor-not-allowed"
              value={values.district}
            />
          </div>

          <div className="grid gap-1.5">
            <FieldLabel>State <RequiredMark /></FieldLabel>
            <Input
              name="state"
              required
              readOnly
              placeholder="State (Auto-filled)"
              className="h-12 bg-slate-50 text-sm rounded-xl cursor-not-allowed"
              value={values.state}
            />
          </div>
        </div>

        <div className="grid gap-1.5 mt-1.5">
          <FieldLabel>Delivery Address <RequiredMark /></FieldLabel>
          <Textarea
            name="deliveryAddress"
            required
            placeholder="House no., Building, Street Name, Locality, Landmark etc."
            className="min-h-[80px] rounded-xl text-sm"
            value={values.deliveryAddress}
            onChange={(event) => onChange("deliveryAddress", event.target.value)}
          />
        </div>
      </div>

      {/* Consent Checkboxes */}
      <div className="grid gap-2.5 mt-2">
        <label className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-3.5 text-xs md:text-sm leading-normal text-slate-700 shadow-sm transition hover:bg-slate-50/50">
          <input
            type="checkbox"
            name="consentOwnership"
            required
            checked={values.consentOwnership}
            onChange={(event) => onChange("consentOwnership", event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="font-semibold text-slate-700">
            I confirm that the uploaded document belongs to me or I am authorized to submit it. <RequiredMark />
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-3.5 text-xs md:text-sm leading-normal text-slate-700 shadow-sm transition hover:bg-slate-50/50">
          <input
            type="checkbox"
            name="consentProcessing"
            required
            checked={values.consentProcessing}
            onChange={(event) => onChange("consentProcessing", event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="font-semibold text-slate-700">
            I agree to the processing and printing of the uploaded card into premium PVC smart format. <RequiredMark />
          </span>
        </label>
      </div>
    </div>
  );
}
