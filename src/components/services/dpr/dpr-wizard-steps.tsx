"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  type LucideIcon,
  UserCheck,
  CreditCard,
  FileText,
  Upload,
  Trash2,
  RefreshCw,
  Camera,
  Plus,
  X,
  Check,
  AlertTriangle,
  Building2,
  Briefcase,
  Cog,
  IndianRupee,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocumentRequirement, PlanSchema } from "@/lib/services-config";

// ─── Shared form types ────────────────────────────────────────────────────────

export interface DprPersonalForm {
  name: string;
  mobile: string;
  altMobile: string;
  email: string;
  pincode: string;
  state: string;
  district: string;
  address: string;
}

export interface DprBusinessForm {
  businessName: string;
  businessType: string;
  businessAddress: string;
  gstin: string;
  udyam: string;
}

export interface DprProjectForm {
  scheme: string;
  projectCost: string;
  ownContribution: string;
  loanAmount: string;
  expectedSubsidy: string;
  annualSales: string;
  annualProfit: string;
  tenureYears: string;
  marginPercent: string;
}

export interface MachineryRow {
  id: string;
  itemName: string;
  qty: string;
  unitCost: string;
}

export type DprDocSlotId =
  | "pan"
  | "aadhaar"
  | "quotation"
  | "gst"
  | "udyam"
  | "photo"
  | "bank_statement"
  | "other";

export const SCHEME_OPTIONS = [
  "PMEGP",
  "Mudra",
  "CM Yuva",
  "PM Vishwakarma",
  "State MSME Scheme",
  "Other",
] as const;

export const BUSINESS_TYPE_OPTIONS = [
  "Sole Proprietorship",
  "Partnership",
  "LLP",
  "Private Limited",
  "Other",
] as const;

export function createMachineryRow(): MachineryRow {
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    itemName: "",
    qty: "",
    unitCost: "",
  };
}

export function machineryRowTotal(row: MachineryRow): number {
  const qty = Number(row.qty) || 0;
  const unit = Number(row.unitCost) || 0;
  return qty * unit;
}

export function computeMarginPercent(projectCost: string, ownContribution: string): string {
  const cost = Number(projectCost);
  const margin = Number(ownContribution);
  if (!cost || cost <= 0 || !margin) return "";
  return ((margin / cost) * 100).toFixed(1);
}

// ─── Field helpers ────────────────────────────────────────────────────────────

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block mb-1">
      {children}
    </label>
  );
}

export function TextInput({
  value,
  onChange,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return (
    <div>
      <input
        value={value}
        onChange={onChange}
        className={cn(
          "w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-sm font-medium focus:outline-none focus:border-blue-400 focus:bg-white transition-all",
          error ? "border-red-400 bg-red-50/30" : "border-slate-200",
        )}
        {...props}
      />
      {error && <p className="text-[10px] text-red-500 mt-1 font-semibold">{error}</p>}
    </div>
  );
}

export function SelectInput({
  value,
  onChange,
  options,
  error,
  placeholder = "Select…",
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  error?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-sm font-medium focus:outline-none focus:border-blue-400 focus:bg-white transition-all",
          error ? "border-red-400 bg-red-50/30" : "border-slate-200",
        )}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      {error && <p className="text-[10px] text-red-500 mt-1 font-semibold">{error}</p>}
    </div>
  );
}

// ─── Step 1: Personal ─────────────────────────────────────────────────────────

export function PersonalStep({
  values,
  errors,
  pincodeLoading,
  onChange,
  onPincodeChange,
}: {
  values: DprPersonalForm;
  errors: Record<string, string>;
  pincodeLoading: boolean;
  onChange: (patch: Partial<DprPersonalForm>) => void;
  onPincodeChange: (pincode: string) => void;
}) {
  return (
    <div className="p-4 sm:p-5 space-y-4">
      <div>
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-blue-600" />
          Personal Details
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">Applicant contact and address for your DPR application.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <FieldLabel>Full Name *</FieldLabel>
          <TextInput
            placeholder="e.g. Rahul Kumar"
            value={values.name}
            onChange={(e) => onChange({ name: e.target.value })}
            error={errors.name}
          />
        </div>

        <div>
          <FieldLabel>Mobile *</FieldLabel>
          <TextInput
            type="tel"
            inputMode="numeric"
            maxLength={10}
            placeholder="10-digit mobile"
            value={values.mobile}
            onChange={(e) => onChange({ mobile: e.target.value.replace(/\D/g, "") })}
            error={errors.mobile}
          />
        </div>

        <div>
          <FieldLabel>Alternate Mobile</FieldLabel>
          <TextInput
            type="tel"
            inputMode="numeric"
            maxLength={10}
            placeholder="Optional"
            value={values.altMobile}
            onChange={(e) => onChange({ altMobile: e.target.value.replace(/\D/g, "") })}
            error={errors.altMobile}
          />
        </div>

        <div className="sm:col-span-2">
          <FieldLabel>Email</FieldLabel>
          <TextInput
            type="email"
            placeholder="you@example.com"
            value={values.email}
            onChange={(e) => onChange({ email: e.target.value })}
            error={errors.email}
          />
        </div>

        <div>
          <FieldLabel>PIN Code *</FieldLabel>
          <div className="relative">
            <TextInput
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="6-digit pincode"
              value={values.pincode}
              onChange={(e) => onPincodeChange(e.target.value.replace(/\D/g, ""))}
              error={errors.pincode}
            />
            {pincodeLoading && (
              <RefreshCw className="absolute right-3 top-3 h-3.5 w-3.5 text-blue-500 animate-spin" />
            )}
          </div>
        </div>

        <div>
          <FieldLabel>State *</FieldLabel>
          <TextInput
            placeholder="Auto-filled from pincode"
            value={values.state}
            onChange={(e) => onChange({ state: e.target.value })}
            error={errors.state}
          />
        </div>

        <div className="sm:col-span-2">
          <FieldLabel>District / City *</FieldLabel>
          <TextInput
            placeholder="Auto-filled from pincode"
            value={values.district}
            onChange={(e) => onChange({ district: e.target.value })}
            error={errors.district}
          />
        </div>

        <div className="sm:col-span-2">
          <FieldLabel>Address *</FieldLabel>
          <textarea
            rows={2}
            placeholder="House / flat no., street, area…"
            value={values.address}
            onChange={(e) => onChange({ address: e.target.value })}
            className={cn(
              "w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-sm font-medium focus:outline-none focus:border-blue-400 focus:bg-white transition-all resize-none",
              errors.address ? "border-red-400 bg-red-50/30" : "border-slate-200",
            )}
          />
          {errors.address && <p className="text-[10px] text-red-500 mt-1 font-semibold">{errors.address}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Business ─────────────────────────────────────────────────────────

export function BusinessStep({
  values,
  errors,
  onChange,
}: {
  values: DprBusinessForm;
  errors: Record<string, string>;
  onChange: (patch: Partial<DprBusinessForm>) => void;
}) {
  return (
    <div className="p-4 sm:p-5 space-y-4">
      <div>
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-600" />
          Business Details
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">Unit / firm information for the project report.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <FieldLabel>Business / Unit Name *</FieldLabel>
          <TextInput
            placeholder="Proposed or existing unit name"
            value={values.businessName}
            onChange={(e) => onChange({ businessName: e.target.value })}
            error={errors.businessName}
          />
        </div>

        <div className="sm:col-span-2">
          <FieldLabel>Constitution *</FieldLabel>
          <SelectInput
            value={values.businessType}
            onChange={(v) => onChange({ businessType: v })}
            options={BUSINESS_TYPE_OPTIONS}
            error={errors.businessType}
          />
        </div>

        <div className="sm:col-span-2">
          <FieldLabel>Business Address *</FieldLabel>
          <textarea
            rows={2}
            placeholder="Factory / shop / office address"
            value={values.businessAddress}
            onChange={(e) => onChange({ businessAddress: e.target.value })}
            className={cn(
              "w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-sm font-medium focus:outline-none focus:border-blue-400 focus:bg-white transition-all resize-none",
              errors.businessAddress ? "border-red-400 bg-red-50/30" : "border-slate-200",
            )}
          />
          {errors.businessAddress && (
            <p className="text-[10px] text-red-500 mt-1 font-semibold">{errors.businessAddress}</p>
          )}
        </div>

        <div>
          <FieldLabel>GSTIN (Optional)</FieldLabel>
          <TextInput
            placeholder="15-character GSTIN"
            value={values.gstin}
            onChange={(e) => onChange({ gstin: e.target.value.toUpperCase() })}
          />
        </div>

        <div>
          <FieldLabel>Udyam / MSME (Optional)</FieldLabel>
          <TextInput
            placeholder="Udyam registration no."
            value={values.udyam}
            onChange={(e) => onChange({ udyam: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Project ────────────────────────────────────────────────────────────

export function ProjectStep({
  values,
  errors,
  onChange,
  onMarginManual,
}: {
  values: DprProjectForm;
  errors: Record<string, string>;
  onChange: (patch: Partial<DprProjectForm>) => void;
  onMarginManual: (v: string) => void;
}) {
  return (
    <div className="p-4 sm:p-5 space-y-4">
      <div>
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-blue-600" />
          Project Details
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">Cost, finance mix and projections for the DPR.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <FieldLabel>Target Scheme *</FieldLabel>
          <SelectInput
            value={values.scheme}
            onChange={(v) => onChange({ scheme: v })}
            options={SCHEME_OPTIONS}
            error={errors.scheme}
          />
        </div>

        {(
          [
            { key: "projectCost", label: "Total Project Cost (₹) *" },
            { key: "ownContribution", label: "Own Contribution / Margin (₹) *" },
            { key: "loanAmount", label: "Loan Amount Required (₹) *" },
            { key: "expectedSubsidy", label: "Expected Subsidy (₹)" },
            { key: "annualSales", label: "Expected Annual Sales (₹) *" },
            { key: "annualProfit", label: "Expected Annual Profit (₹) *" },
            { key: "tenureYears", label: "Loan Tenure (Years) *" },
          ] as const
        ).map(({ key, label }) => (
          <div key={key}>
            <FieldLabel>{label}</FieldLabel>
            <TextInput
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={values[key]}
              onChange={(e) => onChange({ [key]: e.target.value.replace(/[^\d.]/g, "") })}
              error={errors[key]}
            />
          </div>
        ))}

        <div>
          <FieldLabel>Margin % (computed)</FieldLabel>
          <TextInput
            type="text"
            inputMode="decimal"
            placeholder="Auto from cost & margin"
            value={values.marginPercent}
            onChange={(e) => onMarginManual(e.target.value.replace(/[^\d.]/g, ""))}
            error={errors.marginPercent}
          />
          <p className="text-[10px] text-slate-400 mt-1">Updates when project cost & own contribution change.</p>
        </div>
      </div>
    </div>
  );
}

// ─── Step 4: Machinery ──────────────────────────────────────────────────────────

export function MachineryStep({
  rows,
  onChange,
  onAdd,
  onRemove,
}: {
  rows: MachineryRow[];
  onChange: (id: string, patch: Partial<MachineryRow>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  const grandTotal = rows.reduce((sum, row) => sum + machineryRowTotal(row), 0);

  return (
    <div className="p-4 sm:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Cog className="h-5 w-5 text-blue-600" />
            Machinery Schedule
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Add equipment / machinery line items with quantities.</p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-xl transition active:scale-95"
        >
          <Plus className="h-3.5 w-3.5" /> Add Row
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="border border-dashed border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-400">
          No machinery rows yet. Tap &quot;Add Row&quot; to begin.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row, index) => (
            <div
              key={row.id}
              className="bg-white/80 backdrop-blur border border-slate-200 rounded-2xl p-3.5 space-y-2.5 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Item {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(row.id)}
                  className="text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition"
                  title="Remove row"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div>
                <FieldLabel>Item Name</FieldLabel>
                <TextInput
                  placeholder="e.g. Lathe machine"
                  value={row.itemName}
                  onChange={(e) => onChange(row.id, { itemName: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <FieldLabel>Qty</FieldLabel>
                  <TextInput
                    inputMode="numeric"
                    placeholder="1"
                    value={row.qty}
                    onChange={(e) => onChange(row.id, { qty: e.target.value.replace(/\D/g, "") })}
                  />
                </div>
                <div>
                  <FieldLabel>Unit Cost (₹)</FieldLabel>
                  <TextInput
                    inputMode="decimal"
                    placeholder="0"
                    value={row.unitCost}
                    onChange={(e) => onChange(row.id, { unitCost: e.target.value.replace(/[^\d.]/g, "") })}
                  />
                </div>
                <div>
                  <FieldLabel>Total (₹)</FieldLabel>
                  <div className="px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-800">
                    {machineryRowTotal(row).toLocaleString("en-IN")}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <span className="text-xs font-bold text-blue-800">Machinery Grand Total</span>
          <span className="text-sm font-black text-blue-700 flex items-center gap-1">
            <IndianRupee className="h-4 w-4" />
            {grandTotal.toLocaleString("en-IN")}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Document upload slot ───────────────────────────────────────────────────────

const DOC_ICONS: Record<string, LucideIcon> = {
  pan: CreditCard,
  aadhaar: UserCheck,
  quotation: FileText,
  gst: Building2,
  udyam: Briefcase,
  photo: Camera,
  bank_statement: CreditCard,
  other: FileText,
};

interface UploadSlotProps {
  doc: DocumentRequirement;
  file: File | null;
  progress: number;
  error?: string | null;
  onFileSelect: (file: File) => void;
  onRemove: () => void;
}

export function DprDocumentUploadSlot({
  doc,
  file,
  progress,
  error,
  onFileSelect,
  onRemove,
}: UploadSlotProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const Icon = DOC_ICONS[doc.id] ?? FileText;
  const isUploading = progress > 0 && progress < 100;

  useEffect(() => {
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [file]);

  return (
    <div
      className={cn(
        "relative border rounded-2xl p-4 flex flex-col justify-between min-h-[170px] transition-all",
        file
          ? "bg-emerald-50/20 border-emerald-300"
          : error
            ? "bg-red-50/20 border-red-300"
            : isUploading
              ? "bg-blue-50/10 border-blue-300"
              : "bg-white border-dashed border-slate-200 hover:border-slate-300",
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFileSelect(f);
        }}
      />

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div
            className={cn(
              "inline-flex p-2 rounded-xl mb-1.5",
              file ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400",
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-extrabold text-slate-900">
            {doc.name}
            {doc.required && <span className="text-red-500 ml-0.5">*</span>}
          </h3>
          {doc.helpHint && <p className="text-[10px] text-slate-400 mt-0.5">{doc.helpHint}</p>}
        </div>
        {file && (
          <button
            type="button"
            onClick={onRemove}
            className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-100 transition shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="my-2 flex-1">
        {file ? (
          <div className="flex items-center gap-2 bg-white/80 border border-slate-100 rounded-xl p-2">
            {previewUrl ? (
              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-100">
                <Image src={previewUrl} alt="Preview" width={40} height={40} className="w-full h-full object-cover" unoptimized />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-slate-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-slate-700 truncate">{file.name}</p>
              <p className="text-[9px] text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>
        ) : isUploading ? (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[9px] font-bold text-blue-600">
              <span>Uploading…</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : error ? (
          <p className="text-[10px] font-semibold text-red-500 bg-red-50/50 p-2 rounded-lg border border-red-100">{error}</p>
        ) : null}
      </div>

      <div>
        {file ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-white hover:bg-slate-50 text-slate-750 text-[10px] font-bold py-2 border border-slate-200 rounded-xl flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="h-3 w-3" /> Replace
          </button>
        ) : !isUploading ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5"
          >
            <Upload className="h-3.5 w-3.5" /> Upload
          </button>
        ) : null}
      </div>
    </div>
  );
}

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
        <h2 className="text-lg font-black text-slate-900">Upload Documents</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Upload available documents now. Required items are marked with *.
        </p>
      </div>

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

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-750 font-semibold flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 text-blue-500" />
        JPG / PDF up to 5 MB each. You can submit now and upload remaining docs later.
      </div>
    </div>
  );
}

// ─── Step 6: Review ─────────────────────────────────────────────────────────────

export function ReviewStep({
  personal,
  business,
  project,
  machinery,
  documents,
  docFiles,
  selectedPlan,
  servicePrice,
  isScriptReady,
}: {
  personal: DprPersonalForm;
  business: DprBusinessForm;
  project: DprProjectForm;
  machinery: MachineryRow[];
  documents: DocumentRequirement[];
  docFiles: Record<string, File | null>;
  selectedPlan: PlanSchema | null;
  servicePrice: number;
  isScriptReady: boolean;
}) {
  const machineryTotal = machinery.reduce((s, r) => s + machineryRowTotal(r), 0);

  return (
    <div className="p-4 sm:p-5 space-y-4">
      <div>
        <h2 className="text-lg font-black text-slate-900">Review &amp; Pay</h2>
        <p className="text-xs text-slate-500 mt-0.5">Confirm details before secure Razorpay checkout.</p>
      </div>

      <div className="space-y-3">
        <SummaryCard title="Personal">
          <SummaryRow label="Name" value={personal.name} />
          <SummaryRow label="Mobile" value={personal.mobile} />
          {personal.altMobile && <SummaryRow label="Alt Mobile" value={personal.altMobile} />}
          {personal.email && <SummaryRow label="Email" value={personal.email} />}
          <SummaryRow
            label="Address"
            value={`${personal.address}, ${personal.district}, ${personal.state} — ${personal.pincode}`}
          />
        </SummaryCard>

        <SummaryCard title="Business">
          <SummaryRow label="Unit" value={business.businessName} />
          <SummaryRow label="Type" value={business.businessType} />
          <SummaryRow label="Address" value={business.businessAddress} />
          {business.gstin && <SummaryRow label="GSTIN" value={business.gstin} />}
          {business.udyam && <SummaryRow label="Udyam" value={business.udyam} />}
        </SummaryCard>

        <SummaryCard title="Project">
          <SummaryRow label="Scheme" value={project.scheme} />
          <SummaryRow label="Project Cost" value={`₹${Number(project.projectCost || 0).toLocaleString("en-IN")}`} />
          <SummaryRow label="Own Margin" value={`₹${Number(project.ownContribution || 0).toLocaleString("en-IN")}`} />
          <SummaryRow label="Loan" value={`₹${Number(project.loanAmount || 0).toLocaleString("en-IN")}`} />
          {project.marginPercent && <SummaryRow label="Margin %" value={`${project.marginPercent}%`} />}
        </SummaryCard>

        {machinery.length > 0 && (
          <SummaryCard title="Machinery">
            {machinery.map((row, i) => (
              <SummaryRow
                key={row.id}
                label={`${i + 1}. ${row.itemName || "Item"}`}
                value={`${row.qty} × ₹${Number(row.unitCost || 0).toLocaleString("en-IN")} = ₹${machineryRowTotal(row).toLocaleString("en-IN")}`}
              />
            ))}
            <SummaryRow label="Total" value={`₹${machineryTotal.toLocaleString("en-IN")}`} bold />
          </SummaryCard>
        )}

        <SummaryCard title="Documents">
          {documents.map((doc) => {
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
          })}
        </SummaryCard>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-xs text-slate-600">
          <span>Detailed Project Report (DPR)</span>
          <span className="font-bold">₹{servicePrice}</span>
        </div>
        {selectedPlan && (
          <div className="flex justify-between text-xs text-slate-600">
            <span>Selected Plan — {selectedPlan.name}</span>
            <span className="font-semibold text-slate-500">(info only)</span>
          </div>
        )}
        <div className="border-t border-blue-200 pt-2 flex justify-between items-center">
          <span className="text-sm font-black text-slate-900">Payable Amount</span>
          <span className="text-xl font-black text-blue-700">₹{servicePrice}</span>
        </div>
        <p className="text-[10px] text-blue-500 font-semibold">
          Exact amount confirmed by server at checkout.
        </p>
      </div>

      <div className="flex items-center gap-3 bg-white border-2 border-blue-500 rounded-xl p-4">
        <div className="p-2.5 bg-blue-600 rounded-xl shrink-0">
          <CreditCard className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-extrabold text-slate-900">Razorpay Secure Checkout</p>
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Cards • UPI • NetBanking • Wallets</p>
        </div>
        <Check className="h-5 w-5 text-blue-600" />
      </div>

      {!isScriptReady && (
        <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          Loading payment gateway…
        </div>
      )}
    </div>
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
  return (
    <div className="text-xs">
      <span className="text-slate-400">{label}: </span>
      <span className={bold ? "font-black text-slate-900" : "font-bold text-slate-700"}>{value}</span>
    </div>
  );
}

export function SuccessStep({
  applicationIds,
  customerName,
  amountPaid,
}: {
  applicationIds: string[];
  customerName: string;
  amountPaid: number;
}) {
  return (
    <div className="p-6 sm:p-8 flex flex-col items-center text-center space-y-5">
      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
        <Check className="h-8 w-8 text-emerald-600" />
      </div>
      <div>
        <h2 className="text-xl font-black text-slate-900">DPR Application Submitted!</h2>
        <p className="text-sm text-slate-500 mt-1">
          Application created for {customerName}. Our team will start drafting your report.
        </p>
      </div>
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 w-full text-left space-y-1.5">
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wide">Application IDs</p>
        {applicationIds.map((id) => (
          <p key={id} className="text-xs font-mono font-bold text-slate-700">{id}</p>
        ))}
      </div>
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 w-full text-sm">
        <span className="font-bold text-emerald-700">Amount Paid: </span>
        <span className="text-emerald-600">₹{amountPaid}</span>
      </div>
    </div>
  );
}
