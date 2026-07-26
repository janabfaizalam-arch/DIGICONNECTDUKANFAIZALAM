"use client";

import React from "react";
import Link from "next/link";
import {
  UserCheck,
  Briefcase,
  IndianRupee,
  Upload,
  Check,
  X,
  CreditCard,
  RefreshCw,
  AlertTriangle,
  ClipboardList,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ITR_INCOME_SOURCES, DEFAULT_ITR_PRICING } from "@/lib/itr/defaults";
import type { ItrPricingRecommendation } from "@/lib/itr/pricing";
import type { ItrDocumentItem } from "@/lib/itr/types";
import type { DocumentRequirement } from "@/lib/services-config";
import {
  FieldLabel,
  TextInput,
  SelectInput,
  DprDocumentUploadSlot,
} from "@/components/services/dpr/dpr-wizard-steps";

// ─── Form types ───────────────────────────────────────────────────────────────

export interface ItrProfileForm {
  assessmentYear: string;
  applicantType: string;
  incomeProfile: string;
  residentialStatus: string;
  filingType: string;
  previousReturnFiled: string;
  previousAck: string;
  taxRegime: string;
  filingReason: string;
}

export interface ItrPersonalForm {
  name: string;
  fatherName: string;
  dob: string;
  gender: string;
  pan: string;
  aadhaar: string;
  mobile: string;
  email: string;
  address: string;
  pincode: string;
  city: string;
  district: string;
  state: string;
  bankAccount: string;
  ifsc: string;
  accountType: string;
  bankName: string;
}

export interface ItrIncomeForm {
  incomeSources: string[];
  employerCount: string;
  form16Available: string;
  businessDetails: string;
  housePropertyDetails: string;
  capitalGainsDetails: string;
  fnoDetails: string;
  cryptoDetails: string;
}

export interface ItrTaxForm {
  tds: string;
  advanceTax: string;
  selfAssessmentTax: string;
  hasForm26as: boolean;
  hasAis: boolean;
  hasTis: boolean;
  deduction80c: string;
  deduction80d: string;
  deductionNps: string;
  homeLoanInterest: string;
  educationLoan: string;
  donations: string;
  expectedRefund: string;
  expectedPayable: string;
  regimeComparisonNeeded: boolean;
}

export const APPLICANT_TYPES = ["Individual", "HUF", "Proprietor", "Other"] as const;
export const INCOME_PROFILES = [
  "Salaried",
  "Pensioner",
  "Business",
  "Professional",
  "Freelancer",
  "Investor",
  "Property owner",
  "Mixed income",
] as const;
export const RESIDENTIAL_STATUSES = ["Resident", "Non-Resident", "RNOR"] as const;
export const FILING_TYPES = [
  { value: "original", label: "Original return" },
  { value: "belated", label: "Belated return" },
  { value: "revised", label: "Revised return" },
] as const;
export const TAX_REGIMES = [
  { value: "new", label: "New tax regime" },
  { value: "old", label: "Old tax regime" },
  { value: "expert", label: "Let expert recommend" },
] as const;
export const GENDERS = ["Male", "Female", "Other"] as const;
export const ACCOUNT_TYPES = ["Savings", "Current"] as const;

export function defaultProfile(assessmentYear: string): ItrProfileForm {
  return {
    assessmentYear,
    applicantType: "",
    incomeProfile: "",
    residentialStatus: "Resident",
    filingType: "original",
    previousReturnFiled: "",
    previousAck: "",
    taxRegime: "expert",
    filingReason: "",
  };
}

export function defaultPersonal(initial?: {
  mobile?: string;
  pincode?: string;
  city?: string;
  state?: string;
}): ItrPersonalForm {
  return {
    name: "",
    fatherName: "",
    dob: "",
    gender: "",
    pan: "",
    aadhaar: "",
    mobile: initial?.mobile ?? "",
    email: "",
    address: "",
    pincode: initial?.pincode ?? "",
    city: initial?.city ?? "",
    district: initial?.city ?? "",
    state: initial?.state ?? "",
    bankAccount: "",
    ifsc: "",
    accountType: "",
    bankName: "",
  };
}

export function defaultIncome(): ItrIncomeForm {
  return {
    incomeSources: [],
    employerCount: "1",
    form16Available: "",
    businessDetails: "",
    housePropertyDetails: "",
    capitalGainsDetails: "",
    fnoDetails: "",
    cryptoDetails: "",
  };
}

export function defaultTax(): ItrTaxForm {
  return {
    tds: "",
    advanceTax: "",
    selfAssessmentTax: "",
    hasForm26as: false,
    hasAis: false,
    hasTis: false,
    deduction80c: "",
    deduction80d: "",
    deductionNps: "",
    homeLoanInterest: "",
    educationLoan: "",
    donations: "",
    expectedRefund: "",
    expectedPayable: "",
    regimeComparisonNeeded: false,
  };
}

export function mapItrDocumentsToRequirements(
  docs: Pick<ItrDocumentItem, "documentKey" | "documentLabel" | "requiredDefault" | "helpText" | "isActive" | "sortOrder">[],
): DocumentRequirement[] {
  return docs
    .filter((d) => d.isActive !== false)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((d) => ({
      id: d.documentKey,
      name: d.documentLabel,
      required: d.requiredDefault,
      helpHint: d.helpText ?? undefined,
    }));
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
      />
      <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">{label}</span>
    </label>
  );
}

function SummaryCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-50/80 backdrop-blur border border-slate-200 rounded-xl p-3.5">
      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  if (!value) return null;
  return (
    <div className="text-xs">
      <span className="text-slate-400">{label}: </span>
      <span className={bold ? "font-black text-slate-900" : "font-bold text-slate-700"}>{value}</span>
    </div>
  );
}

// ─── Step 1: Filing Profile ───────────────────────────────────────────────────

export function ProfileStep({
  values,
  errors,
  assessmentYearOptions,
  onChange,
}: {
  values: ItrProfileForm;
  errors: Record<string, string>;
  assessmentYearOptions: string[];
  onChange: (patch: Partial<ItrProfileForm>) => void;
}) {
  return (
    <div className="p-4 sm:p-5 space-y-4">
      <div>
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-blue-600" />
          Filing Profile
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">Assessment year, applicant type, and filing reason.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <FieldLabel>Assessment Year *</FieldLabel>
          <SelectInput
            value={values.assessmentYear}
            onChange={(v) => onChange({ assessmentYear: v })}
            options={assessmentYearOptions.length ? assessmentYearOptions : [values.assessmentYear]}
            error={errors.assessmentYear}
          />
        </div>
        <div>
          <FieldLabel>Applicant Type *</FieldLabel>
          <SelectInput
            value={values.applicantType}
            onChange={(v) => onChange({ applicantType: v })}
            options={APPLICANT_TYPES}
            error={errors.applicantType}
          />
        </div>
        <div>
          <FieldLabel>Income Profile *</FieldLabel>
          <SelectInput
            value={values.incomeProfile}
            onChange={(v) => onChange({ incomeProfile: v })}
            options={INCOME_PROFILES}
            error={errors.incomeProfile}
          />
        </div>
        <div>
          <FieldLabel>Residential Status *</FieldLabel>
          <SelectInput
            value={values.residentialStatus}
            onChange={(v) => onChange({ residentialStatus: v })}
            options={RESIDENTIAL_STATUSES}
            error={errors.residentialStatus}
          />
        </div>
        <div>
          <FieldLabel>Filing Type *</FieldLabel>
          <select
            value={values.filingType}
            onChange={(e) => onChange({ filingType: e.target.value })}
            className={cn(
              "w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-sm font-medium focus:outline-none focus:border-blue-400",
              errors.filingType ? "border-red-400" : "border-slate-200",
            )}
          >
            {FILING_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {errors.filingType && <p className="text-[10px] text-red-500 mt-1 font-semibold">{errors.filingType}</p>}
        </div>
        <div>
          <FieldLabel>Tax Regime *</FieldLabel>
          <select
            value={values.taxRegime}
            onChange={(e) => onChange({ taxRegime: e.target.value })}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-400"
          >
            {TAX_REGIMES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel>Previous Return Filed? *</FieldLabel>
          <SelectInput
            value={values.previousReturnFiled}
            onChange={(v) => onChange({ previousReturnFiled: v })}
            options={["Yes", "No"]}
            error={errors.previousReturnFiled}
          />
        </div>
        {values.previousReturnFiled === "Yes" && (
          <div>
            <FieldLabel>Previous Acknowledgement No.</FieldLabel>
            <TextInput
              value={values.previousAck}
              onChange={(e) => onChange({ previousAck: e.target.value.toUpperCase() })}
              placeholder="Optional"
            />
          </div>
        )}
      </div>

      <div>
        <FieldLabel>Filing Reason / Notes</FieldLabel>
        <textarea
          value={values.filingReason}
          onChange={(e) => onChange({ filingReason: e.target.value })}
          rows={3}
          placeholder="e.g. Mandatory filing, refund claim, visa documentation…"
          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-400 resize-none"
        />
      </div>
    </div>
  );
}

// ─── Step 2: Personal ─────────────────────────────────────────────────────────

export function PersonalStep({
  values,
  errors,
  pincodeLoading,
  onChange,
  onPincodeChange,
}: {
  values: ItrPersonalForm;
  errors: Record<string, string>;
  pincodeLoading: boolean;
  onChange: (patch: Partial<ItrPersonalForm>) => void;
  onPincodeChange: (pincode: string) => void;
}) {
  return (
    <div className="p-4 sm:p-5 space-y-4">
      <div>
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-blue-600" />
          Personal &amp; Bank Details
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">Identity, contact, address, and refund bank account.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <FieldLabel>Full Name (as per PAN) *</FieldLabel>
          <TextInput value={values.name} onChange={(e) => onChange({ name: e.target.value })} error={errors.name} />
        </div>
        <div>
          <FieldLabel>Father&apos;s Name *</FieldLabel>
          <TextInput value={values.fatherName} onChange={(e) => onChange({ fatherName: e.target.value })} error={errors.fatherName} />
        </div>
        <div>
          <FieldLabel>Date of Birth *</FieldLabel>
          <TextInput type="date" value={values.dob} onChange={(e) => onChange({ dob: e.target.value })} error={errors.dob} />
        </div>
        <div>
          <FieldLabel>Gender *</FieldLabel>
          <SelectInput value={values.gender} onChange={(v) => onChange({ gender: v })} options={GENDERS} error={errors.gender} />
        </div>
        <div>
          <FieldLabel>PAN *</FieldLabel>
          <TextInput
            value={values.pan}
            onChange={(e) => onChange({ pan: e.target.value.toUpperCase().slice(0, 10) })}
            placeholder="ABCDE1234F"
            error={errors.pan}
          />
        </div>
        <div>
          <FieldLabel>Aadhaar *</FieldLabel>
          <TextInput
            value={values.aadhaar}
            onChange={(e) => onChange({ aadhaar: e.target.value.replace(/\D/g, "").slice(0, 12) })}
            placeholder="12-digit Aadhaar"
            error={errors.aadhaar}
          />
        </div>
        <div>
          <FieldLabel>Mobile *</FieldLabel>
          <TextInput
            value={values.mobile}
            onChange={(e) => onChange({ mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })}
            placeholder="10-digit mobile"
            error={errors.mobile}
          />
        </div>
        <div>
          <FieldLabel>Email *</FieldLabel>
          <TextInput type="email" value={values.email} onChange={(e) => onChange({ email: e.target.value })} error={errors.email} />
        </div>
        <div className="sm:col-span-2">
          <FieldLabel>Address *</FieldLabel>
          <TextInput value={values.address} onChange={(e) => onChange({ address: e.target.value })} error={errors.address} />
        </div>
        <div>
          <FieldLabel>Pincode *</FieldLabel>
          <div className="relative">
            <TextInput
              value={values.pincode}
              onChange={(e) => onPincodeChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit pincode"
              error={errors.pincode}
            />
            {pincodeLoading && (
              <RefreshCw className="absolute right-3 top-3 h-4 w-4 text-blue-500 animate-spin" />
            )}
          </div>
        </div>
        <div>
          <FieldLabel>City *</FieldLabel>
          <TextInput value={values.city} onChange={(e) => onChange({ city: e.target.value })} error={errors.city} />
        </div>
        <div>
          <FieldLabel>District *</FieldLabel>
          <TextInput value={values.district} onChange={(e) => onChange({ district: e.target.value })} error={errors.district} />
        </div>
        <div>
          <FieldLabel>State *</FieldLabel>
          <TextInput value={values.state} onChange={(e) => onChange({ state: e.target.value })} error={errors.state} />
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">Refund Bank Account</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <FieldLabel>Account Number *</FieldLabel>
            <TextInput
              value={values.bankAccount}
              onChange={(e) => onChange({ bankAccount: e.target.value.replace(/\D/g, "") })}
              error={errors.bankAccount}
            />
          </div>
          <div>
            <FieldLabel>IFSC *</FieldLabel>
            <TextInput
              value={values.ifsc}
              onChange={(e) => onChange({ ifsc: e.target.value.toUpperCase().slice(0, 11) })}
              placeholder="SBIN0001234"
              error={errors.ifsc}
            />
          </div>
          <div>
            <FieldLabel>Account Type *</FieldLabel>
            <SelectInput value={values.accountType} onChange={(v) => onChange({ accountType: v })} options={ACCOUNT_TYPES} error={errors.accountType} />
          </div>
          <div>
            <FieldLabel>Bank Name *</FieldLabel>
            <TextInput value={values.bankName} onChange={(e) => onChange({ bankName: e.target.value })} error={errors.bankName} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Income Sources ───────────────────────────────────────────────────

export function IncomeSourcesStep({
  values,
  errors,
  onChange,
  onToggleSource,
}: {
  values: ItrIncomeForm;
  errors: Record<string, string>;
  onChange: (patch: Partial<ItrIncomeForm>) => void;
  onToggleSource: (id: string) => void;
}) {
  const hasSalary = values.incomeSources.includes("salary");
  const hasBusiness = values.incomeSources.some((s) => ["business", "profession", "freelancing"].includes(s));
  const hasHouse = values.incomeSources.some((s) => ["house_property", "rental"].includes(s));
  const hasCg = values.incomeSources.some((s) => ["shares", "mutual_funds", "property_cg"].includes(s));
  const hasFno = values.incomeSources.some((s) => ["fno", "intraday"].includes(s));
  const hasCrypto = values.incomeSources.includes("crypto");

  return (
    <div className="p-4 sm:p-5 space-y-4">
      <div>
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-blue-600" />
          Income Sources
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">Select all applicable income sources for this year.</p>
      </div>

      {errors.incomeSources && (
        <p className="text-[10px] text-red-500 font-semibold">{errors.incomeSources}</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {ITR_INCOME_SOURCES.map((source) => {
          const selected = values.incomeSources.includes(source.id);
          return (
            <button
              key={source.id}
              type="button"
              onClick={() => onToggleSource(source.id)}
              className={cn(
                "text-left px-3 py-2.5 rounded-xl border text-xs font-bold transition-all",
                selected
                  ? "border-blue-500 bg-blue-50 text-blue-800 ring-1 ring-blue-400/30"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
              )}
            >
              {source.label}
            </button>
          );
        })}
      </div>

      {hasSalary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3">
          <div>
            <FieldLabel>Number of Employers</FieldLabel>
            <TextInput
              value={values.employerCount}
              onChange={(e) => onChange({ employerCount: e.target.value.replace(/\D/g, "") })}
              placeholder="1"
            />
          </div>
          <div>
            <FieldLabel>Form 16 Available?</FieldLabel>
            <SelectInput
              value={values.form16Available}
              onChange={(v) => onChange({ form16Available: v })}
              options={["Yes", "No", "Partial"]}
            />
          </div>
        </div>
      )}

      {hasBusiness && (
        <div>
          <FieldLabel>Business / Profession Details</FieldLabel>
          <textarea
            value={values.businessDetails}
            onChange={(e) => onChange({ businessDetails: e.target.value })}
            rows={2}
            placeholder="Nature of business, turnover estimate, books maintained…"
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium resize-none"
          />
        </div>
      )}

      {hasHouse && (
        <div>
          <FieldLabel>House Property Details</FieldLabel>
          <textarea
            value={values.housePropertyDetails}
            onChange={(e) => onChange({ housePropertyDetails: e.target.value })}
            rows={2}
            placeholder="Self-occupied / let-out, rental income, home loan interest…"
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium resize-none"
          />
        </div>
      )}

      {hasCg && (
        <div>
          <FieldLabel>Capital Gains Details</FieldLabel>
          <textarea
            value={values.capitalGainsDetails}
            onChange={(e) => onChange({ capitalGainsDetails: e.target.value })}
            rows={2}
            placeholder="Shares, mutual funds, property sale — brief notes"
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium resize-none"
          />
        </div>
      )}

      {hasFno && (
        <div>
          <FieldLabel>F&amp;O / Intraday Details</FieldLabel>
          <textarea
            value={values.fnoDetails}
            onChange={(e) => onChange({ fnoDetails: e.target.value })}
            rows={2}
            placeholder="Broker, turnover estimate, P&amp;L availability…"
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium resize-none"
          />
        </div>
      )}

      {hasCrypto && (
        <div>
          <FieldLabel>Crypto / VDA Details</FieldLabel>
          <textarea
            value={values.cryptoDetails}
            onChange={(e) => onChange({ cryptoDetails: e.target.value })}
            rows={2}
            placeholder="Exchange, VDA transactions, gains/losses notes…"
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium resize-none"
          />
        </div>
      )}
    </div>
  );
}

// ─── Step 4: Tax & Deductions ─────────────────────────────────────────────────

export function TaxDeductionsStep({
  values,
  onChange,
}: {
  values: ItrTaxForm;
  onChange: (patch: Partial<ItrTaxForm>) => void;
}) {
  return (
    <div className="p-4 sm:p-5 space-y-4">
      <div>
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <IndianRupee className="h-5 w-5 text-blue-600" />
          Tax &amp; Deductions
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">TDS, advance tax, and common deductions (approximate amounts OK).</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <FieldLabel>TDS Deducted (₹)</FieldLabel>
          <TextInput value={values.tds} onChange={(e) => onChange({ tds: e.target.value.replace(/[^\d.]/g, "") })} placeholder="0" />
        </div>
        <div>
          <FieldLabel>Advance Tax Paid (₹)</FieldLabel>
          <TextInput value={values.advanceTax} onChange={(e) => onChange({ advanceTax: e.target.value.replace(/[^\d.]/g, "") })} placeholder="0" />
        </div>
        <div>
          <FieldLabel>Self-Assessment Tax (₹)</FieldLabel>
          <TextInput value={values.selfAssessmentTax} onChange={(e) => onChange({ selfAssessmentTax: e.target.value.replace(/[^\d.]/g, "") })} placeholder="0" />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 bg-slate-50 border border-slate-100 rounded-xl p-3">
        <CheckboxField label="Form 26AS available" checked={values.hasForm26as} onChange={(v) => onChange({ hasForm26as: v })} />
        <CheckboxField label="AIS available" checked={values.hasAis} onChange={(v) => onChange({ hasAis: v })} />
        <CheckboxField label="TIS available" checked={values.hasTis} onChange={(v) => onChange({ hasTis: v })} />
        <CheckboxField label="Need regime comparison" checked={values.regimeComparisonNeeded} onChange={(v) => onChange({ regimeComparisonNeeded: v })} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <FieldLabel>Section 80C (₹)</FieldLabel>
          <TextInput value={values.deduction80c} onChange={(e) => onChange({ deduction80c: e.target.value.replace(/[^\d.]/g, "") })} placeholder="PPF, ELSS, LIC…" />
        </div>
        <div>
          <FieldLabel>Section 80D (₹)</FieldLabel>
          <TextInput value={values.deduction80d} onChange={(e) => onChange({ deduction80d: e.target.value.replace(/[^\d.]/g, "") })} placeholder="Health insurance" />
        </div>
        <div>
          <FieldLabel>NPS 80CCD (₹)</FieldLabel>
          <TextInput value={values.deductionNps} onChange={(e) => onChange({ deductionNps: e.target.value.replace(/[^\d.]/g, "") })} />
        </div>
        <div>
          <FieldLabel>Home Loan Interest (₹)</FieldLabel>
          <TextInput value={values.homeLoanInterest} onChange={(e) => onChange({ homeLoanInterest: e.target.value.replace(/[^\d.]/g, "") })} />
        </div>
        <div>
          <FieldLabel>Education Loan Interest (₹)</FieldLabel>
          <TextInput value={values.educationLoan} onChange={(e) => onChange({ educationLoan: e.target.value.replace(/[^\d.]/g, "") })} />
        </div>
        <div>
          <FieldLabel>Donations 80G (₹)</FieldLabel>
          <TextInput value={values.donations} onChange={(e) => onChange({ donations: e.target.value.replace(/[^\d.]/g, "") })} />
        </div>
        <div>
          <FieldLabel>Expected Refund (₹) — optional</FieldLabel>
          <TextInput value={values.expectedRefund} onChange={(e) => onChange({ expectedRefund: e.target.value.replace(/[^\d.]/g, "") })} />
        </div>
        <div>
          <FieldLabel>Expected Tax Payable (₹) — optional</FieldLabel>
          <TextInput value={values.expectedPayable} onChange={(e) => onChange({ expectedPayable: e.target.value.replace(/[^\d.]/g, "") })} />
        </div>
      </div>
    </div>
  );
}

// ─── Step 5: Uploads ──────────────────────────────────────────────────────────

export function UploadsStep({
  documents,
  docFiles,
  uploadProgress,
  uploadErrors,
  onFileSelect,
  onRemove,
}: {
  documents: DocumentRequirement[];
  docFiles: Record<string, File | null>;
  uploadProgress: Record<string, number>;
  uploadErrors: Record<string, string | null>;
  onFileSelect: (id: string, file: File) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="p-4 sm:p-5 space-y-4">
      <div>
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <Upload className="h-5 w-5 text-blue-600" />
          Upload Documents
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Checklist adapts to your income profile. Upload what you have now — you can add more later.
        </p>
      </div>

      {documents.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500">
          No documents required for your current profile. You may proceed to review.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {documents.map((doc) => (
            <DprDocumentUploadSlot
              key={doc.id}
              doc={doc}
              file={docFiles[doc.id] ?? null}
              progress={uploadProgress[doc.id] ?? 0}
              error={uploadErrors[doc.id]}
              onFileSelect={(f) => onFileSelect(doc.id, f)}
              onRemove={() => onRemove(doc.id)}
            />
          ))}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-750 font-semibold flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 text-blue-500" />
        JPG / PDF up to 5 MB each. Missing items can be uploaded after submission.
      </div>
    </div>
  );
}

// ─── Step 6: Review ───────────────────────────────────────────────────────────

export function ReviewStep({
  profile,
  personal,
  income,
  documents,
  docFiles,
  recommendation,
  selectedPlanKey,
  catalogPrice,
  customerDeclaration,
  termsAccepted,
  declarationAccepted,
  onTermsChange,
  onDeclarationChange,
  onPlanChange,
  isCustomQuote,
  isScriptReady,
}: {
  profile: ItrProfileForm;
  personal: ItrPersonalForm;
  income: ItrIncomeForm;
  documents: DocumentRequirement[];
  docFiles: Record<string, File | null>;
  recommendation: ItrPricingRecommendation;
  selectedPlanKey: string;
  catalogPrice: number;
  customerDeclaration: string;
  termsAccepted: boolean;
  declarationAccepted: boolean;
  onTermsChange: (v: boolean) => void;
  onDeclarationChange: (v: boolean) => void;
  onPlanChange: (key: string) => void;
  isCustomQuote: boolean;
  isScriptReady: boolean;
}) {
  const incomeLabels = income.incomeSources
    .map((id) => ITR_INCOME_SOURCES.find((s) => s.id === id)?.label ?? id)
    .join(", ");

  return (
    <div className="p-4 sm:p-5 space-y-4">
      <div>
        <h2 className="text-lg font-black text-slate-900">Review &amp; {isCustomQuote ? "Submit" : "Pay"}</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          {isCustomQuote
            ? "Your case needs a custom quote. Submit now and our expert will contact you."
            : "Confirm details before secure Razorpay checkout."}
        </p>
      </div>

      <div className="space-y-3">
        <SummaryCard title="Filing Profile">
          <SummaryRow label="Assessment Year" value={profile.assessmentYear} />
          <SummaryRow label="Applicant" value={profile.applicantType} />
          <SummaryRow label="Income Profile" value={profile.incomeProfile} />
          <SummaryRow label="Filing Type" value={profile.filingType} />
          <SummaryRow label="Tax Regime" value={profile.taxRegime} />
        </SummaryCard>

        <SummaryCard title="Personal">
          <SummaryRow label="Name" value={personal.name} />
          <SummaryRow label="PAN" value={personal.pan} />
          <SummaryRow label="Mobile" value={personal.mobile} />
          <SummaryRow label="Email" value={personal.email} />
          <SummaryRow label="Address" value={`${personal.address}, ${personal.city}, ${personal.state} — ${personal.pincode}`} />
          <SummaryRow label="Bank" value={`${personal.bankName} • ${personal.accountType} • ${personal.ifsc}`} />
        </SummaryCard>

        <SummaryCard title="Income">
          <SummaryRow label="Sources" value={incomeLabels || "—"} />
          {income.employerCount && <SummaryRow label="Employers" value={income.employerCount} />}
        </SummaryCard>

        <SummaryCard title="Documents">
          {documents.length === 0 ? (
            <p className="text-xs text-slate-400">No documents listed</p>
          ) : (
            documents.map((doc) => {
              const file = docFiles[doc.id];
              return (
                <div key={doc.id} className="flex items-center gap-2 text-xs">
                  {file ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <X className="h-3.5 w-3.5 text-slate-300" />}
                  <span className={file ? "font-semibold text-slate-700" : "text-slate-400"}>
                    {doc.name}
                    {file && ` — ${file.name}`}
                  </span>
                </div>
              );
            })
          )}
        </SummaryCard>
      </div>

      <div>
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Recommended Package</p>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-2">
          <p className="text-xs font-bold text-amber-900">
            {DEFAULT_ITR_PRICING.find((p) => p.planKey === recommendation.recommendedPlanKey)?.name ?? recommendation.recommendedPlanKey}
          </p>
          <ul className="mt-1 space-y-0.5">
            {recommendation.reasons.map((r) => (
              <li key={r} className="text-[10px] text-amber-800">• {r}</li>
            ))}
          </ul>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {DEFAULT_ITR_PRICING.filter((p) => p.isActive).map((plan) => (
            <button
              key={plan.planKey}
              type="button"
              onClick={() => onPlanChange(plan.planKey)}
              className={cn(
                "text-left border rounded-xl p-2.5 transition-all",
                selectedPlanKey === plan.planKey
                  ? "border-blue-500 bg-blue-50 ring-1 ring-blue-400/30"
                  : "border-slate-200 bg-white hover:border-slate-300",
              )}
            >
              <p className="text-[10px] font-black text-slate-900">{plan.name}</p>
              <p className="text-xs font-bold text-blue-600 mt-0.5">
                {plan.price > 0 ? `₹${plan.price}` : "Custom quote"}
              </p>
            </button>
          ))}
        </div>
      </div>

      {!isCustomQuote && catalogPrice > 0 && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-xs text-slate-600">
            <span>Income Tax Return Filing</span>
            <span className="font-bold">₹{catalogPrice}</span>
          </div>
          <div className="border-t border-blue-200 pt-2 flex justify-between items-center">
            <span className="text-sm font-black text-slate-900">Starting Package Fee</span>
            <span className="text-xl font-black text-blue-700">₹{catalogPrice}</span>
          </div>
          <p className="text-[10px] text-blue-500 font-semibold">Exact amount confirmed by server at checkout.</p>
        </div>
      )}

      {isCustomQuote && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-2">
          <p className="text-sm font-black text-violet-900">Custom quote required</p>
          <p className="text-xs text-violet-700">
            Your filing profile needs specialist review. Submit your application without payment — our team will share a quote.
          </p>
          <Link
            href="https://wa.me/917007595931"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-700 hover:text-violet-900"
          >
            <Phone className="h-3.5 w-3.5" /> Talk to expert on WhatsApp
          </Link>
        </div>
      )}

      {!isCustomQuote && (
        <div className="flex items-center gap-3 bg-white border-2 border-blue-500 rounded-xl p-4">
          <div className="p-2.5 bg-blue-600 rounded-xl shrink-0">
            <CreditCard className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-extrabold text-slate-900">Razorpay Secure Checkout</p>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Cards • UPI • NetBanking • Wallets</p>
          </div>
          {!isScriptReady && <RefreshCw className="h-4 w-4 text-slate-400 animate-spin" />}
          {isScriptReady && <Check className="h-5 w-5 text-blue-600" />}
        </div>
      )}

      <div className="space-y-2 border-t border-slate-100 pt-3">
        <CheckboxField
          label="I agree to DigiConnect Dukan terms of service and privacy policy."
          checked={termsAccepted}
          onChange={onTermsChange}
        />
        <CheckboxField
          label={customerDeclaration}
          checked={declarationAccepted}
          onChange={onDeclarationChange}
        />
      </div>
    </div>
  );
}

export function SuccessStep({
  applicationIds,
  customerName,
  amountPaid,
  isQuoteRequest,
}: {
  applicationIds: string[];
  customerName: string;
  amountPaid: number;
  isQuoteRequest?: boolean;
}) {
  return (
    <div className="p-6 sm:p-8 flex flex-col items-center text-center space-y-5">
      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
        <Check className="h-8 w-8 text-emerald-600" />
      </div>
      <div>
        <h2 className="text-xl font-black text-slate-900">
          {isQuoteRequest ? "ITR Application Received!" : "ITR Application Submitted!"}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {isQuoteRequest
            ? `Thanks ${customerName}. Our expert will review your case and share a custom quote.`
            : `Application created for ${customerName}. Track document review and filing in your dashboard.`}
        </p>
      </div>
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 w-full text-left space-y-1.5">
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wide">Application IDs</p>
        {applicationIds.map((id) => (
          <p key={id} className="text-xs font-mono font-bold text-slate-700">{id}</p>
        ))}
      </div>
      {!isQuoteRequest && amountPaid > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 w-full text-sm">
          <span className="font-bold text-emerald-700">Amount Paid: </span>
          <span className="text-emerald-600">₹{amountPaid}</span>
        </div>
      )}
    </div>
  );
}
