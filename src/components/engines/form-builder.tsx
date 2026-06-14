"use client";

import React, { useRef, useState } from "react";
import {
  UploadCloud,
  FileText,
  AlertCircle,
  Calendar,
  Mail,
  Phone,
  ShieldCheck,
  MapPin,
  Trash2,
  Lock
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ServiceField } from "@/lib/services-engine";

interface FormBuilderProps {
  fields: ServiceField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  errors: Record<string, string>;
  onFileUpload?: (key: string, file: File) => Promise<{ url: string; name: string }>;
}

export function FormBuilder({
  fields,
  values,
  onChange,
  errors,
  onFileUpload
}: FormBuilderProps) {
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploadingState, setUploadingState] = useState<Record<string, boolean>>({});

  const handleFileChange = async (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onFileUpload) return;

    setUploadingState((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await onFileUpload(key, file);
      // Store file url in values mapping
      onChange(key, JSON.stringify(res));
    } catch (err) {
      console.error("[form-builder] Upload failed", err);
      alert(`Failed to upload file. Please try again.`);
    } finally {
      setUploadingState((prev) => ({ ...prev, [key]: false }));
    }
  };

  const getFileMetadata = (val: string) => {
    try {
      return JSON.parse(val) as { url: string; name: string };
    } catch {
      return null;
    }
  };

  const getInputIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4 text-slate-500" />;
      case "mobile":
        return <Phone className="h-4 w-4 text-slate-500" />;
      case "date":
        return <Calendar className="h-4 w-4 text-slate-500" />;
      case "aadhaar":
      case "pan":
      case "gstin":
        return <ShieldCheck className="h-4 w-4 text-blue-400" />;
      case "address":
        return <MapPin className="h-4 w-4 text-slate-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-5">
      {fields.map((field) => {
        const val = values[field.field_key] || "";
        const err = errors[field.field_key];
        const isFile = field.field_type === "file_upload";

        return (
          <div key={field.field_key} className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-350 flex items-center gap-1.5">
                {field.label}
                {field.validation_chains.some((r) => r.rule === "required") && (
                  <span className="text-red-500 font-bold">*</span>
                )}
              </label>
              {getInputIcon(field.field_type)}
            </div>

            {/* Address fields -> Textarea */}
            {field.field_type === "address" && (
              <Textarea
                value={val}
                onChange={(e) => onChange(field.field_key, e.target.value)}
                placeholder={`Enter complete address`}
                className={`w-full bg-slate-950 border text-slate-100 rounded-xl px-4 py-2.5 text-xs font-medium focus:border-indigo-500 focus:outline-none transition-all resize-none min-h-20 ${
                  err ? "border-red-500/50 focus:border-red-500" : "border-white/5"
                }`}
              />
            )}

            {/* Dropdown Options */}
            {field.field_type === "dropdown" && (
              <div className="relative">
                <select
                  value={val}
                  onChange={(e) => onChange(field.field_key, e.target.value)}
                  className={`w-full bg-slate-950 border text-slate-200 rounded-xl px-3 h-11 text-xs font-medium focus:border-indigo-500 focus:outline-none transition-all appearance-none ${
                    err ? "border-red-500/50 focus:border-red-500" : "border-white/5"
                  }`}
                >
                  <option value="" className="bg-slate-900 text-slate-500">Select option...</option>
                  {/* Dynamic choices parsed from validation config metadata or custom options */}
                  {Array.isArray((field as unknown as { dropdown_options?: { label: string; value: string }[] }).dropdown_options) &&
                    (field as unknown as { dropdown_options: { label: string; value: string }[] }).dropdown_options.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-200">
                        {opt.label}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* File Upload Field */}
            {isFile && (
              <div className="space-y-2">
                <input
                  type="file"
                  ref={(el) => {
                    fileInputRefs.current[field.field_key] = el;
                  }}
                  onChange={(e) => handleFileChange(field.field_key, e)}
                  className="hidden"
                />

                {!val ? (
                  <button
                    type="button"
                    onClick={() => fileInputRefs.current[field.field_key]?.click()}
                    disabled={uploadingState[field.field_key]}
                    className={`w-full h-24 border border-dashed rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all bg-slate-950/30 ${
                      err 
                        ? "border-red-500/30 hover:border-red-500/50 bg-red-500/5" 
                        : "border-white/10 hover:border-indigo-500/30 hover:bg-slate-950/60"
                    }`}
                  >
                    {uploadingState[field.field_key] ? (
                      <>
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                        <span className="text-[10px] font-bold text-indigo-400">Uploading Document...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="h-6 w-6 text-slate-500 group-hover:text-indigo-400" />
                        <span className="text-[10px] font-bold text-slate-400">Drag & drop or click to upload file</span>
                        <span className="text-[9px] text-slate-500 font-semibold">PDF, JPEG or PNG (Max 5MB)</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-white/5 rounded-xl">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="h-5 w-5 text-indigo-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-350 truncate">
                          {getFileMetadata(val)?.name || "Uploaded Document"}
                        </p>
                        <span className="text-[9px] font-mono text-slate-500 flex items-center gap-1">
                          <Lock className="h-2.5 w-2.5" /> Encrypted Vault Reference
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onChange(field.field_key, "")}
                      className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Standard input types (text, numbers, mobile, email, formats) */}
            {!isFile && field.field_type !== "address" && field.field_type !== "dropdown" && (
              <Input
                type={field.field_type === "number" ? "number" : "text"}
                value={val}
                onChange={(e) => onChange(field.field_key, e.target.value)}
                placeholder={`Enter ${field.label}`}
                maxLength={
                  field.field_type === "mobile" 
                    ? 10 
                    : field.field_type === "aadhaar" 
                    ? 12 
                    : field.field_type === "pan" 
                    ? 10 
                    : field.field_type === "gstin" 
                    ? 15 
                    : undefined
                }
                className={`w-full h-11 bg-slate-950 border text-slate-100 rounded-xl px-4 text-xs font-medium focus:border-indigo-500 focus:outline-none transition-all ${
                  err ? "border-red-500/50 focus:border-red-500" : "border-white/5"
                }`}
              />
            )}

            {/* Rule error feedback */}
            {err && (
              <p className="text-[10px] text-red-400 font-bold flex items-center gap-1.5 px-1 animate-in fade-in">
                <AlertCircle className="h-3.5 w-3.5" /> {err}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
