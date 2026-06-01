"use client";

import { useEffect } from "react";
import { FileUp, Trash2, CheckCircle2, Ticket, Wallet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/* ─── Types ─── */
export type CmYuvaApplicationValues = {
  /* Step 1 – Applicant Details */
  name: string;
  mobile: string;
  email: string;
  spouseName: string;
  maritalStatus: string;

  /* Step 2 – Eligibility Details */
  ageConfirmed: string;
  educationConfirmed: string;
  upResidentConfirmed: string;
  businessStatus: string;
  category: string;

  /* Step 3 – Business Details */
  businessName: string;
  businessType: string;
  businessAddress: string;
  pincode: string;
  city: string;
  district: string;
  state: string;
  message: string;

  /* Consent */
  termsAccepted: boolean;
};

export type PincodeLookupResponse = {
  ok: boolean;
  city?: string;
  district?: string;
  state?: string;
  message?: string;
};

/* ─── Factory & Helpers ─── */
export function createCmYuvaInitialValues(
  values: Partial<CmYuvaApplicationValues> = {}
): CmYuvaApplicationValues {
  return {
    name: "",
    mobile: "",
    email: "",
    spouseName: "",
    maritalStatus: "",
    ageConfirmed: "",
    educationConfirmed: "",
    upResidentConfirmed: "",
    businessStatus: "",
    category: "",
    businessName: "",
    businessType: "",
    businessAddress: "",
    pincode: "",
    city: "",
    district: "",
    state: "",
    message: "",
    termsAccepted: false,
    ...values,
  };
}

export function buildCmYuvaDetails(values: CmYuvaApplicationValues) {
  return {
    spouseName: values.spouseName.trim(),
    maritalStatus: values.maritalStatus.trim(),
    ageConfirmed: values.ageConfirmed,
    educationConfirmed: values.educationConfirmed,
    upResidentConfirmed: values.upResidentConfirmed,
    businessStatus: values.businessStatus.trim(),
    category: values.category.trim(),
    businessName: values.businessName.trim(),
    businessType: values.businessType.trim(),
    businessAddress: values.businessAddress.trim(),
    pincode: values.pincode.trim(),
    district: values.district.trim(),
    state: values.state.trim(),
    termsAccepted: values.termsAccepted ? "true" : "",
    serviceType: "CM YUVA Entrepreneur Loan Assistance",
  };
}

export function getCmYuvaValidationError(
  values: CmYuvaApplicationValues,
  step?: number,
  filesState?: {
    pan: File | null;
    aadhaar: File | null;
    bankPassbook: File | null;
    marksheet: File | null;
  }
): string | null {
  // Step 1: Applicant Details
  if (!step || step === 1) {
    if (!values.name.trim()) return "Full Name is required.";
    if (!/^[6-9]\d{9}$/.test(values.mobile))
      return "Enter a valid 10-digit Indian mobile number.";
    if (
      values.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())
    )
      return "Enter a valid email address.";
    if (!values.maritalStatus) return "Marital status is required.";
    if (
      values.maritalStatus === "Married" &&
      !values.spouseName.trim()
    )
      return "Spouse name is required when married.";
    if (step === 1) return null;
  }

  // Step 2: Eligibility Details
  if (!step || step === 2) {
    if (!values.ageConfirmed)
      return "Please confirm your age eligibility (21-40 years).";
    if (values.ageConfirmed === "No")
      return "You must be between 21-40 years to apply for CM YUVA scheme.";
    if (!values.educationConfirmed)
      return "Please confirm your education qualification.";
    if (values.educationConfirmed === "No")
      return "Minimum Class 8 education is required for CM YUVA scheme.";
    if (!values.upResidentConfirmed)
      return "Please confirm your UP residency status.";
    if (values.upResidentConfirmed === "No")
      return "UP residency is required for CM YUVA scheme.";
    if (!values.businessStatus)
      return "Please select your business status.";
    if (!values.category) return "Please select your category.";
    if (step === 2) return null;
  }

  // Step 3: Business Details
  if (!step || step === 3) {
    if (!values.businessName.trim()) return "Business name is required.";
    if (!values.businessType) return "Business type is required.";
    if (!/^\d{6}$/.test(values.pincode))
      return "Enter a valid 6-digit PIN code.";
    if (!values.city.trim()) return "City is required.";
    if (!values.district.trim()) return "District is required.";
    if (!values.state.trim()) return "State is required.";
    if (step === 3) return null;
  }

  // Step 4: Document Upload Validation
  if (!step || step === 4) {
    if (filesState) {
      if (!filesState.pan) return "PAN Card upload is required.";
      if (!filesState.aadhaar) return "Aadhaar Card upload is required.";
      if (!filesState.bankPassbook) return "Bank Passbook upload is required.";
      if (!filesState.marksheet) return "Class 8 Marksheet or Above upload is required.";
    }
    if (step === 4) return null;
  }

  // Step 5: Pricing (no strict field validations needed, summary view)
  if (step === 5) return null;

  // Step 6: Consent Validation
  if (!step || step === 6) {
    if (!values.termsAccepted)
      return "Please accept the terms and conditions in Step 6.";
  }

  return null;
}

export function isCmYuvaComplete(
  values: CmYuvaApplicationValues,
  filesState?: {
    pan: File | null;
    aadhaar: File | null;
    bankPassbook: File | null;
    marksheet: File | null;
  }
) {
  return !getCmYuvaValidationError(values, undefined, filesState);
}

/* ─── Pincode Autofill Hook ─── */
export function useCmYuvaPincodeAutofill({
  enabled,
  values,
  setValues,
  setStatus,
}: {
  enabled: boolean;
  values: CmYuvaApplicationValues;
  setValues: (
    updater: (current: CmYuvaApplicationValues) => CmYuvaApplicationValues
  ) => void;
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

    fetch(
      `/api/pincode?pincode=${encodeURIComponent(values.pincode)}`,
      { signal: controller.signal }
    )
      .then(async (response) => {
        const result = (await response.json()) as PincodeLookupResponse;
        if (
          !response.ok ||
          !result.ok ||
          !result.city ||
          !result.district ||
          !result.state
        ) {
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
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        )
          return;
        setStatus(
          "Auto-fetch failed. Please enter city, district and state manually."
        );
      });

    return () => controller.abort();
  }, [enabled, setStatus, setValues, values.pincode]);
}

/* ─── UI Components ─── */
function RequiredMark() {
  return <span className="text-red-600 font-bold ml-0.5">*</span>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-sm font-bold text-slate-800">
      {children}
    </label>
  );
}

function StepIndicator({
  currentStep,
  totalSteps,
  onStepClick,
}: {
  currentStep: number;
  totalSteps: number;
  onStepClick: (step: number) => void;
}) {
  const stepLabels = [
    "Applicant",
    "Eligibility",
    "Business",
    "Documents",
    "Pricing",
    "Consent/Pay",
  ];

  return (
    <div className="mb-6">
      <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:justify-between sm:gap-1">
        {Array.from({ length: totalSteps }, (_, i) => {
          const step = i + 1;
          const isActive = step === currentStep;
          const isCompleted = step < currentStep;

          return (
            <button
              key={step}
              type="button"
              onClick={() => onStepClick(step)}
              className={`flex flex-col items-center gap-1.5 rounded-xl px-1 py-2 text-center transition-all duration-300 ${
                isActive
                  ? "bg-blue-50 ring-2 ring-blue-500/30"
                  : isCompleted
                    ? "bg-emerald-50/60 hover:bg-emerald-50"
                    : "bg-slate-50 hover:bg-slate-100"
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                    : isCompleted
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 text-slate-500"
                }`}
              >
                {isCompleted ? "✓" : step}
              </span>
              <span
                className={`text-[10px] font-bold leading-tight ${
                  isActive
                    ? "text-blue-700"
                    : isCompleted
                      ? "text-emerald-700"
                      : "text-slate-400"
                }`}
              >
                {stepLabels[i]}
              </span>
            </button>
          );
        })}
      </div>
      {/* Progress bar */}
      <div className="mt-4 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>
    </div>
  );
}

const maritalStatuses = ["Unmarried", "Married", "Divorced", "Widowed"];
const categories = ["General", "OBC", "SC", "ST", "Minority"];
const businessTypes = [
  "Manufacturing",
  "Service",
  "Trading",
  "Food Processing",
  "Engineering Workshop",
  "Digital / IT Services",
  "Healthcare",
  "Education / Skill",
  "Agro Processing",
  "Others",
];

/* ─── Main Component ─── */
export function CmYuvaApplicationFields({
  values,
  onChange,
  pincodeStatus,
  currentStep,
  onStepChange,
  filesState,
  onFileChange,
  walletBalance = 0,
  razorpayButton,
  paymentVerified,
}: {
  values: CmYuvaApplicationValues;
  onChange: <Key extends keyof CmYuvaApplicationValues>(
    key: Key,
    value: CmYuvaApplicationValues[Key]
  ) => void;
  pincodeStatus?: string;
  currentStep: number;
  onStepChange: (step: number) => void;
  filesState: {
    pan: File | null;
    aadhaar: File | null;
    bankPassbook: File | null;
    marksheet: File | null;
  };
  onFileChange: (key: "pan" | "aadhaar" | "bankPassbook" | "marksheet", file: File | null) => void;
  walletBalance?: number;
  razorpayButton?: React.ReactNode;
  paymentVerified?: boolean;
}) {
  const totalSteps = 6;

  // Pricing calculations
  const originalPrice = 39999;
  const offerPrice = 13499;
  const savings = 26500;
  const couponDiscount = 5000;
  const finalPayableBeforeWallet = 8499;
  const walletUsed = walletBalance > 0 ? Math.min(walletBalance, 4249.5) : 0;
  const freshPayableAmount = finalPayableBeforeWallet - walletUsed;

  function handleNext() {
    const error = getCmYuvaValidationError(values, currentStep, filesState);
    if (error) {
      return error;
    }
    if (currentStep < totalSteps) {
      onStepChange(currentStep + 1);
    }
    return null;
  }

  function handleBack() {
    if (currentStep > 1) {
      onStepChange(currentStep - 1);
    }
  }

  function handleStepClick(step: number) {
    if (step < currentStep) {
      onStepChange(step);
      return;
    }
    for (let s = currentStep; s < step; s++) {
      const error = getCmYuvaValidationError(values, s, filesState);
      if (error) return;
    }
    onStepChange(step);
  }

  const maxFileSize = 5 * 1024 * 1024;
  const allowedFileTypes = ["application/pdf", "image/jpeg", "image/png"];

  const handleDocumentPickerChange = (
    key: "pan" | "aadhaar" | "bankPassbook" | "marksheet",
    file: File | null
  ) => {
    if (!file) {
      onFileChange(key, null);
      return;
    }
    if (!allowedFileTypes.includes(file.type)) {
      alert("Invalid format! Document must be PDF, JPG, or PNG.");
      return;
    }
    if (file.size > maxFileSize) {
      alert("File is too large! Maximum limit is 5MB.");
      return;
    }
    onFileChange(key, file);
  };

  return (
    <div className="mt-3 grid gap-4">
      <StepIndicator
        currentStep={currentStep}
        totalSteps={totalSteps}
        onStepClick={handleStepClick}
      />

      {/* Step 1: Applicant Details */}
      {currentStep === 1 && (
        <div className="grid gap-4 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/30 p-4">
            <p className="text-sm font-extrabold text-slate-950">
              Step 1: Applicant Details
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Provide your personal details as per government records.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-1.5">
              <FieldLabel>
                Full Name <RequiredMark />
              </FieldLabel>
              <Input
                name="name"
                required
                placeholder="Enter full name as per Aadhaar"
                className="h-12 text-sm rounded-xl"
                value={values.name}
                onChange={(event) =>
                  onChange("name", event.target.value)
                }
              />
            </div>
            <div className="grid gap-1.5">
              <FieldLabel>
                Mobile Number <RequiredMark />
              </FieldLabel>
              <Input
                name="mobile"
                required
                inputMode="numeric"
                pattern="[6-9][0-9]{9}"
                placeholder="10 digit mobile number"
                className="h-12 text-sm rounded-xl"
                value={values.mobile}
                onChange={(event) =>
                  onChange(
                    "mobile",
                    event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 10)
                  )
                }
              />
            </div>
            <div className="grid gap-1.5">
              <FieldLabel>Email ID <span className="text-slate-400 font-medium text-xs">(Optional)</span></FieldLabel>
              <Input
                name="email"
                type="email"
                placeholder="Email (optional)"
                className="h-12 text-sm rounded-xl"
                value={values.email}
                onChange={(event) =>
                  onChange("email", event.target.value)
                }
              />
            </div>
            <div className="grid gap-1.5">
              <FieldLabel>
                Marital Status <RequiredMark />
              </FieldLabel>
              <select
                name="maritalStatus"
                required
                value={values.maritalStatus}
                onChange={(event) =>
                  onChange("maritalStatus", event.target.value)
                }
                className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select marital status</option>
                {maritalStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            {values.maritalStatus === "Married" && (
              <div className="grid gap-1.5 md:col-span-2">
                <FieldLabel>
                  Spouse Name <RequiredMark />
                </FieldLabel>
                <Input
                  name="spouseName"
                  required
                  placeholder="Enter spouse name"
                  className="h-12 text-sm rounded-xl"
                  value={values.spouseName}
                  onChange={(event) =>
                    onChange("spouseName", event.target.value)
                  }
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Eligibility Details */}
      {currentStep === 2 && (
        <div className="grid gap-4 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/30 p-4">
            <p className="text-sm font-extrabold text-slate-950">
              Step 2: Eligibility Check
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Confirm your eligibility for CM YUVA scheme.
            </p>
          </div>

          <div className="grid gap-3 rounded-2xl border border-slate-100 bg-white p-4">
            {(
              [
                {
                  name: "ageConfirmed" as const,
                  label:
                    "Are you between 21-40 years of age?",
                  value: values.ageConfirmed,
                },
                {
                  name: "educationConfirmed" as const,
                  label:
                    "Have you completed Class 8 or above education?",
                  value: values.educationConfirmed,
                },
                {
                  name: "upResidentConfirmed" as const,
                  label:
                    "Are you a permanent resident of Uttar Pradesh?",
                  value: values.upResidentConfirmed,
                },
              ] as const
            ).map((question) => (
              <fieldset
                key={question.name}
                className="rounded-xl border border-slate-50 bg-slate-50/50 p-3"
              >
                <legend className="text-sm font-bold leading-6 text-slate-900">
                  {question.label} <RequiredMark />
                </legend>
                <div className="mt-2 flex gap-4">
                  {["Yes", "No"].map((option) => (
                    <label
                      key={option}
                      className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name={question.name}
                        value={option}
                        required
                        checked={question.value === option}
                        onChange={() =>
                          onChange(question.name, option)
                        }
                      />
                      {option}
                    </label>
                  ))}
                </div>
                {question.value === "No" && (
                  <p className="mt-2 text-xs font-bold text-red-600">
                    This eligibility criteria is required for CM YUVA
                    scheme.
                  </p>
                )}
              </fieldset>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-1.5">
              <FieldLabel>
                Business Status <RequiredMark />
              </FieldLabel>
              <select
                name="businessStatus"
                required
                value={values.businessStatus}
                onChange={(event) =>
                  onChange("businessStatus", event.target.value)
                }
                className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select business status</option>
                <option value="New Business">New Business</option>
                <option value="Existing Business">
                  Existing Business
                </option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <FieldLabel>
                Category <RequiredMark />
              </FieldLabel>
              <select
                name="category"
                required
                value={values.category}
                onChange={(event) =>
                  onChange("category", event.target.value)
                }
                className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Business Details */}
      {currentStep === 3 && (
        <div className="grid gap-4 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-orange-100 bg-orange-50/30 p-4">
            <p className="text-sm font-extrabold text-slate-950">
              Step 3: Business Details
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Provide your business information for the loan application.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-1.5">
              <FieldLabel>
                Business Name <RequiredMark />
              </FieldLabel>
              <Input
                name="businessName"
                required
                placeholder="Enter proposed / existing business name"
                className="h-12 text-sm rounded-xl"
                value={values.businessName}
                onChange={(event) =>
                  onChange("businessName", event.target.value)
                }
              />
            </div>
            <div className="grid gap-1.5">
              <FieldLabel>
                Business Type <RequiredMark />
              </FieldLabel>
              <select
                name="businessType"
                required
                value={values.businessType}
                onChange={(event) =>
                  onChange("businessType", event.target.value)
                }
                className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select business type</option>
                {businessTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <FieldLabel>
                PIN Code <RequiredMark />
              </FieldLabel>
              <Input
                name="pincode"
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                placeholder="6 digit PIN code"
                className="h-12 text-sm rounded-xl"
                value={values.pincode}
                onChange={(event) => {
                  onChange(
                    "pincode",
                    event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 6)
                  );
                  onChange("city", "");
                  onChange("district", "");
                  onChange("state", "");
                }}
              />
              {pincodeStatus ? (
                <p className="text-xs font-semibold text-blue-700">
                  {pincodeStatus}
                </p>
              ) : null}
            </div>
            <div className="grid gap-1.5">
              <FieldLabel>
                City <RequiredMark />
              </FieldLabel>
              <Input
                name="city"
                required
                readOnly
                placeholder="Auto-filled from PIN code"
                className="h-12 text-sm bg-slate-50 cursor-not-allowed rounded-xl"
                value={values.city}
              />
            </div>
            <div className="grid gap-1.5">
              <FieldLabel>
                District <RequiredMark />
              </FieldLabel>
              <Input
                name="district"
                required
                readOnly
                placeholder="Auto-filled from PIN code"
                className="h-12 text-sm bg-slate-50 cursor-not-allowed rounded-xl"
                value={values.district}
              />
            </div>
            <div className="grid gap-1.5">
              <FieldLabel>
                State <RequiredMark />
              </FieldLabel>
              <Input
                name="state"
                required
                readOnly
                placeholder="Auto-filled from PIN code"
                className="h-12 text-sm bg-slate-50 cursor-not-allowed rounded-xl"
                value={values.state}
              />
            </div>
            <div className="grid gap-1.5 md:col-span-2">
              <FieldLabel>Business Address <span className="text-slate-400 font-medium text-xs">(Optional)</span></FieldLabel>
              <Input
                name="businessAddress"
                placeholder="Business address (optional)"
                className="h-12 text-sm rounded-xl"
                value={values.businessAddress}
                onChange={(event) =>
                  onChange("businessAddress", event.target.value)
                }
              />
            </div>
            <div className="grid gap-1.5 md:col-span-2">
              <FieldLabel>Additional Notes <span className="text-slate-400 font-medium text-xs">(Optional)</span></FieldLabel>
              <Textarea
                name="message"
                placeholder="Any additional information or notes (optional)"
                className="min-h-20 text-sm rounded-xl"
                value={values.message}
                onChange={(event) =>
                  onChange("message", event.target.value)
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Document Upload */}
      {currentStep === 4 && (
        <div className="grid gap-4 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-violet-100 bg-violet-50/30 p-4">
            <p className="text-sm font-extrabold text-slate-950">
              Step 4: Upload Required Documents
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Please upload clear copies of all four mandatory documents to proceed.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                { key: "pan", label: "PAN Card" },
                { key: "aadhaar", label: "Aadhaar Card" },
                { key: "bankPassbook", label: "Bank Passbook" },
                { key: "marksheet", label: "Class 8 Marksheet or Above" },
              ] as const
            ).map((doc) => {
              const currentFile = filesState[doc.key];
              return (
                <div key={doc.key} className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <FieldLabel>
                    {doc.label} <RequiredMark />
                  </FieldLabel>
                  <div className="relative flex min-h-[140px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-4 transition hover:border-blue-400 hover:bg-blue-50/10">
                    {currentFile ? (
                      <div className="flex w-full flex-col items-center justify-center gap-2">
                        <CheckCircle2 className="h-8 w-8 text-emerald-600 animate-scale" />
                        <span className="max-w-full truncate text-xs font-extrabold text-slate-800">
                          {currentFile.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDocumentPickerChange(doc.key, null)}
                          className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-extrabold text-red-600 hover:bg-red-100 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      </div>
                    ) : (
                      <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 text-center">
                        <FileUp className="h-6 w-6 text-blue-600" />
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">Click to upload</span>
                          <span className="text-[9px] text-slate-400 block mt-0.5">Supports PDF, JPG, PNG (Max 5MB)</span>
                        </div>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleDocumentPickerChange(doc.key, file);
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 5: Pricing & Payment Summary */}
      {currentStep === 5 && (
        <div className="grid gap-4 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-amber-100 bg-amber-50/30 p-4">
            <p className="text-sm font-extrabold text-slate-950">
              Step 5: Pricing & Payment Summary
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Review pricing breakdown, applied coupon, and mandatory rewards redemption.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            {/* Header Badge */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 flex items-center justify-between text-white">
              <span className="text-xs font-extrabold tracking-wider uppercase">Official Fee Ledger</span>
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-extrabold backdrop-blur-sm">
                1 Pricing Model
              </span>
            </div>

            {/* Content list */}
            <div className="p-4 space-y-4">
              {/* Original & Offer price row */}
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Consultancy Fee</p>
                  <p className="mt-0.5 text-xs text-slate-400 line-through font-bold">
                    &#x20B9;{originalPrice.toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-500 uppercase">Special Offer Price</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700 uppercase tracking-wide">
                      SAVE &#x20B9;{savings.toLocaleString("en-IN")}
                    </span>
                    <span className="text-lg font-extrabold text-slate-900">
                      &#x20B9;{offerPrice.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Coupon Row */}
              <div className="flex items-center justify-between gap-4 rounded-xl bg-emerald-50/50 border border-emerald-100/50 p-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <Ticket className="h-4.5 w-4.5 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-emerald-800">Coupon Code Applied</p>
                    <p className="text-[10px] font-bold text-emerald-600">Code: {couponDiscount > 0 ? "DGCNT5K" : "-"}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-emerald-700 block">
                    Coupon Applied Successfully
                  </span>
                  <span className="text-xs font-extrabold text-emerald-600 block mt-0.5">
                    -&#x20B9;{couponDiscount.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Wallet Integration */}
              <div className="flex items-center justify-between gap-4 rounded-xl bg-blue-50/30 border border-blue-100/30 p-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                    <Wallet className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-blue-800">Mandatory Wallet Redemption</p>
                    <p className="text-[10px] font-bold text-slate-400">Balance: &#x20B9;{walletBalance.toLocaleString("en-IN")} | Max 50% Usage</p>
                  </div>
                </div>
                <div className="text-right">
                  {walletUsed > 0 ? (
                    <>
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-extrabold text-blue-700 uppercase">
                        Redeemed
                      </span>
                      <span className="text-xs font-extrabold text-blue-700 block mt-0.5">
                        -&#x20B9;{walletUsed.toLocaleString("en-IN")}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs font-bold text-slate-400">No balance used</span>
                  )}
                </div>
              </div>

              {/* Subtotal */}
              <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-3 text-sm">
                <span className="font-extrabold text-slate-500">Price after Coupon</span>
                <span className="font-extrabold text-slate-900">
                  &#x20B9;{finalPayableBeforeWallet.toLocaleString("en-IN")}
                </span>
              </div>

              {/* Final net fresh amount */}
              <div className="flex items-center justify-between gap-4 border-t-2 border-dashed border-slate-200 pt-3 text-base">
                <span className="font-extrabold text-slate-900">Net Fresh Payable Amount</span>
                <span className="font-extrabold text-blue-700 text-lg">
                  &#x20B9;{freshPayableAmount.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 6: Consent & Payment */}
      {currentStep === 6 && (
        <div className="grid gap-4 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4">
            <p className="text-sm font-extrabold text-slate-950">
              Step 6: Consent & Secure Payment
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Please review terms, complete checkout, and submit your application.
            </p>
          </div>

          {/* Consent Checkbox */}
          <label className="flex items-start gap-3 rounded-2xl border border-orange-100 bg-orange-50/60 p-4 text-xs md:text-sm leading-relaxed text-slate-700 shadow-sm cursor-pointer">
            <input
              type="checkbox"
              name="termsAccepted"
              value="true"
              required
              checked={values.termsAccepted}
              onChange={(event) =>
                onChange("termsAccepted", event.target.checked)
              }
              className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>
              <span className="font-extrabold text-slate-950 block">
                I accept the terms and conditions <RequiredMark />
              </span>
              <span className="mt-1.5 block text-xs leading-relaxed text-slate-500 font-semibold">
                I confirm that all details provided are correct and matches my documents. I authorize DigiConnect Dukan to prepare the Project Report, MSME Registration, and guide my application for the official CM YUVA Entrepreneur loan scheme.
              </span>
            </span>
          </label>

          {/* Secure Payment Section */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
            <p className="text-sm font-extrabold text-slate-950">Secure Razorpay Gateway</p>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              Pay ₹{freshPayableAmount.toLocaleString("en-IN")} fresh payable amount securely via UPI, Card, Net Banking or Wallet.
            </p>

            <div className="mt-4">
              {razorpayButton}
            </div>

            {paymentVerified && (
              <div className="mt-3.5 flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-xs font-extrabold text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                Payment verified successfully! You are ready to submit the application.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step Navigation Buttons */}
      <div className="flex items-center justify-between gap-3 pt-2">
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            ← Back
          </button>
        ) : (
          <div />
        )}
        {currentStep < totalSteps ? (
          <button
            type="button"
            onClick={() => {
              const error = handleNext();
              if (error) {
                window.dispatchEvent(
                  new CustomEvent("cm-yuva-validation-error", {
                    detail: error,
                  })
                );
              }
            }}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700"
          >
            Continue →
          </button>
        ) : null}
      </div>
    </div>
  );
}
