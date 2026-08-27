"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  UploadCloud,
  FileCheck,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  Trash,
  Download,
  Sparkles,
  Check,
  AlertTriangle,
  Info
} from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface CustomerVaultProps {
  user: SupabaseUser;
  /**
   * Suppress the component's own title.
   *
   * The vault is embedded in the portal's Documents section, which already
   * heads it — and explains what makes it different from the per-application
   * files above. Rendering both put two titles on one panel.
   */
  hideHeader?: boolean;
}

interface OCRJob {
  id: string;
  status: "uploaded" | "processing" | "completed" | "failed";
  extracted_data: Record<string, unknown>;
  error_message?: string | null;
  updated_at: string;
}

interface VaultDocument {
  id: string;
  customer_id: string;
  document_type: "aadhaar_front" | "aadhaar_back" | "pan_card" | "photo" | "signature" | "marksheet" | "gst_certificate" | "other";
  file_name: string;
  file_url: string;
  storage_path: string;
  file_size?: number | null;
  hash: string;
  created_at: string;
  vault_ocr_jobs?: OCRJob | OCRJob[] | null;
}

const DOC_TYPES = [
  { value: "aadhaar_front", label: "Aadhaar Card Front" },
  { value: "aadhaar_back", label: "Aadhaar Card Back" },
  { value: "pan_card", label: "PAN Card" },
  { value: "photo", label: "Passport Photo" },
  { value: "signature", label: "Signature Scan" },
  { value: "marksheet", label: "Educational Marksheet" },
  { value: "gst_certificate", label: "GST Certificate" },
  { value: "other", label: "Other Verification Document" }
];

export function CustomerVault({ user, hideHeader }: CustomerVaultProps) {
  const { success: toastSuccess, error: toastError } = useToast();
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  
  // Upload States
  const [docType, setDocType] = useState<VaultDocument["document_type"]>("aadhaar_front");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadHash, setUploadHash] = useState("");
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{ isDuplicate: boolean; docName?: string; docType?: string } | null>(null);

  const [dragActive, setDragActive] = useState(false);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [pollingJobs, setPollingJobs] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/customer/vault");
      if (!res.ok) throw new Error("Failed to load documents.");
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Failed to load vault files.");
    } finally {
      setIsLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    void fetchDocuments();
  }, [fetchDocuments]);

  // Poll processing jobs
  useEffect(() => {
    const activeProcessingDocs = documents.filter((doc) => {
      const job = Array.isArray(doc.vault_ocr_jobs)
        ? doc.vault_ocr_jobs[0]
        : doc.vault_ocr_jobs;
      return job?.status === "processing";
    });

    if (activeProcessingDocs.length === 0) return;

    const interval = setInterval(async () => {
      let updatedAny = false;
      const updatedDocs = await Promise.all(
        documents.map(async (doc) => {
          const job = Array.isArray(doc.vault_ocr_jobs)
            ? doc.vault_ocr_jobs[0]
            : doc.vault_ocr_jobs;
          if (job?.status === "processing") {
            try {
              const res = await fetch(`/api/customer/vault/ocr?document_id=${doc.id}`);
              if (res.ok) {
                const data = await res.json();
                if (data.job && data.job.status !== "processing") {
                  updatedAny = true;
                  return {
                    ...doc,
                    vault_ocr_jobs: data.job
                  };
                }
              }
            } catch (e) {
              console.error("Failed to poll OCR state", e);
            }
          }
          return doc;
        })
      );

      if (updatedAny) {
        setDocuments(updatedDocs);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [documents]);

  const calculateSHA256 = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    setIsCheckingDuplicate(true);
    setDuplicateWarning(null);

    try {
      const hash = await calculateSHA256(file);
      setUploadHash(hash);

      const res = await fetch(`/api/customer/vault?hash=${hash}`);
      if (res.ok) {
        const data = await res.json();
        if (data.duplicate) {
          setDuplicateWarning({
            isDuplicate: true,
            docName: data.document.file_name,
            docType: data.document.document_type
          });
        }
      }
    } catch (e) {
      console.error("Hash calculation duplicate check failed", e);
    } finally {
      setIsCheckingDuplicate(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const uploadFileToStorageAndRegister = async (forceUpload = false) => {
    if (!selectedFile || !uploadHash) return;

    setIsUploading(true);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Supabase client not initialized.");

      // 1. Upload to Supabase bucket
      const fileExt = selectedFile.name.split(".").pop() || "pdf";
      const randomId = crypto.randomUUID();
      const storagePath = `vault-documents/${user.id}/${randomId}.${fileExt}`;

      const { error: uploadErr } = await supabase.storage
        .from("application-documents")
        .upload(storagePath, selectedFile, {
          cacheControl: "3600",
          upsert: true
        });

      if (uploadErr) throw uploadErr;

      const { data: publicUrlData } = supabase.storage
        .from("application-documents")
        .getPublicUrl(storagePath);

      if (!publicUrlData?.publicUrl) throw new Error("Failed to get file public URL.");

      // 2. Register via API
      const response = await fetch("/api/customer/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_type: docType,
          file_name: selectedFile.name,
          file_url: publicUrlData.publicUrl,
          storage_path: storagePath,
          file_size: selectedFile.size,
          hash: uploadHash,
          force: forceUpload
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Failed to register document.");

      toastSuccess("Document added to Secure Vault.");
      setSelectedFile(null);
      setUploadHash("");
      setDuplicateWarning(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Trigger OCR simulation right away
      if (result.document?.id) {
        triggerOCR(result.document.id);
      }

      await fetchDocuments();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Failed to upload file.");
    } finally {
      setIsUploading(false);
    }
  };

  const triggerOCR = async (docId: string) => {
    setPollingJobs((prev) => ({ ...prev, [docId]: true }));
    try {
      const response = await fetch("/api/customer/vault/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: docId })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Failed to trigger OCR processing.");
      }

      // Reload document status list
      const res = await fetch("/api/customer/vault");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
      toastSuccess("OCR analysis started.");
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "OCR trigger failed.");
    } finally {
      setPollingJobs((prev) => ({ ...prev, [docId]: false }));
    }
  };

  const deleteDocument = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this document from your vault?")) return;

    try {
      const response = await fetch(`/api/customer/vault?id=${docId}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Failed to delete document.");
      }

      toastSuccess("Document removed from vault.");
      setDocuments(documents.filter((doc) => doc.id !== docId));
      if (expandedDocId === docId) setExpandedDocId(null);
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Failed to delete document.");
    }
  };

  const formatSize = (bytes?: number | null) => {
    if (!bytes) return "0 KB";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const getDocTypeLabel = (type: VaultDocument["document_type"]) => {
    return DOC_TYPES.find((d) => d.value === type)?.label || type;
  };

  const renderExtractedData = (doc: VaultDocument) => {
    const job = Array.isArray(doc.vault_ocr_jobs)
      ? doc.vault_ocr_jobs[0]
      : doc.vault_ocr_jobs;
    if (!job || job.status !== "completed" || !job.extracted_data) return null;

    const data = job.extracted_data;

    return (
      <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-4 mt-3 text-xs text-slate-300 font-medium grid gap-2.5 sm:grid-cols-2">
        <div className="sm:col-span-2 border-b border-white/5 pb-1.5 flex items-center gap-1.5 text-indigo-400">
          <Sparkles className="h-4 w-4" />
          <span className="font-extrabold uppercase tracking-wider text-[10px]">AI OCR Extracted Details</span>
        </div>

        {Object.entries(data).map(([key, val]) => {
          if (typeof val === "object" && val !== null) return null;
          const formattedKey = key
            .replace(/_/g, " ")
            .replace(/\b\w/g, (char) => char.toUpperCase());
          return (
            <div key={key} className="space-y-0.5">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">
                {formattedKey}
              </span>
              <span className="text-white font-extrabold">{String(val)}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {hideHeader ? null : (
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Secure Vault & Identity Hub
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Store, verify, and auto-parse essential documents safely for instant service application fillings.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
        {/* Gallery / List */}
        <div className="space-y-4 order-2 lg:order-1">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Vault Documents ({documents.length})
            </h3>
            <button
              onClick={fetchDocuments}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 transition cursor-pointer"
              title="Refresh lists"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {isLoading ? (
            <div className="py-20 flex justify-center items-center">
              <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-16 bg-white/70 border border-slate-150 rounded-3xl space-y-3 shadow-sm backdrop-blur-xl">
              <FileCheck className="h-10 w-10 text-slate-350 mx-auto" />
              <div>
                <p className="text-xs font-black text-slate-800">Your Secure Vault is Empty</p>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-normal max-w-xs mx-auto">
                  Upload identity cards, PAN, and certificate PDFs to start instant verification scans.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {documents.map((doc) => {
                const job = Array.isArray(doc.vault_ocr_jobs)
                  ? doc.vault_ocr_jobs[0]
                  : doc.vault_ocr_jobs;
                const ocrStatus = job?.status || "uploaded";
                const isExpanded = expandedDocId === doc.id;
                const isOcrRunning = ocrStatus === "processing" || pollingJobs[doc.id];

                return (
                  <div
                    key={doc.id}
                    className="bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-3xl p-5 shadow-sm hover:border-slate-300 transition-all duration-200"
                  >
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-lg">
                            {getDocTypeLabel(doc.document_type)}
                          </span>
                          
                          {ocrStatus === "uploaded" && (
                            <span className="bg-slate-50 text-slate-500 text-[9px] font-extrabold px-2 py-0.5 rounded-lg flex items-center gap-1 border">
                              OCR Scan Pending
                            </span>
                          )}

                          {ocrStatus === "processing" && (
                            <span className="bg-blue-50 text-blue-600 text-[9px] font-extrabold px-2 py-0.5 rounded-lg flex items-center gap-1 border border-blue-100">
                              <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                              Parsing details...
                            </span>
                          )}

                          {ocrStatus === "completed" && (
                            <span className="bg-emerald-50 text-emerald-700 text-[9px] font-extrabold px-2 py-0.5 rounded-lg flex items-center gap-1 border border-emerald-100">
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                              AI Verified
                            </span>
                          )}

                          {ocrStatus === "failed" && (
                            <span className="bg-rose-50 text-rose-600 text-[9px] font-extrabold px-2 py-0.5 rounded-lg flex items-center gap-1 border border-rose-100">
                              OCR Scan Failed
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs font-black text-slate-800 mt-2.5 truncate">
                          {doc.file_name}
                        </h4>
                        
                        <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                          Uploaded on: {new Date(doc.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })} &bull; Size: {formatSize(doc.file_size)}
                        </p>
                      </div>

                      <div className="flex gap-1.5 items-center shrink-0 w-full sm:w-auto pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        {ocrStatus === "completed" && (
                          <button
                            onClick={() => setExpandedDocId(isExpanded ? null : doc.id)}
                            className="flex-1 sm:flex-initial h-8.5 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-600 transition flex items-center justify-center gap-1.5"
                          >
                            {isExpanded ? (
                              <>
                                <EyeOff className="h-3.5 w-3.5" />
                                Hide Data
                              </>
                            ) : (
                              <>
                                <Eye className="h-3.5 w-3.5 text-indigo-500" />
                                Extracted Info
                              </>
                            )}
                          </button>
                        )}

                        {ocrStatus === "uploaded" && (
                          <button
                            onClick={() => triggerOCR(doc.id)}
                            disabled={isOcrRunning}
                            className="flex-1 sm:flex-initial h-8.5 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                          >
                            {isOcrRunning ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Scanning...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3.5 w-3.5" />
                                Run OCR Scan
                              </>
                            )}
                          </button>
                        )}

                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="h-8.5 w-8.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-550 shrink-0 transition"
                          title="Download document"
                        >
                          <Download className="h-4 w-4" />
                        </a>

                        <button
                          onClick={() => deleteDocument(doc.id)}
                          className="h-8.5 w-8.5 rounded-xl border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100/60 flex items-center justify-center shrink-0 transition"
                          title="Delete from vault"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {isExpanded && renderExtractedData(doc)}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upload Panel */}
        <div className="bg-white/70 backdrop-blur-md border border-slate-200/70 rounded-3xl p-5 shadow-sm space-y-4 order-1 lg:order-2">
          <div className="flex items-center gap-2 text-slate-800">
            <UploadCloud className="h-5 w-5 text-indigo-600 animate-bounce-subtle" />
            <h3 className="font-extrabold text-sm">Upload to Secure Vault</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Document Type
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as VaultDocument["document_type"])}
                className="h-10 w-full rounded-xl bg-slate-50 border border-slate-200 px-3 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition"
              >
                {DOC_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Drag & drop box */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer flex flex-col items-center justify-center space-y-2.5 min-h-[140px] ${
                dragActive
                  ? "border-indigo-500 bg-indigo-50/50"
                  : selectedFile
                  ? "border-emerald-300 bg-emerald-50/20"
                  : "border-slate-200 hover:border-slate-300 bg-slate-50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
              />
              <UploadCloud
                className={`h-8 w-8 ${selectedFile ? "text-emerald-500" : "text-slate-400"}`}
              />
              <div className="space-y-0.5">
                {selectedFile ? (
                  <p className="text-xs font-bold text-emerald-600 truncate max-w-[200px] mx-auto">
                    {selectedFile.name}
                  </p>
                ) : (
                  <p className="text-xs font-bold text-slate-600 leading-normal">
                    Drag &amp; drop or <span className="text-indigo-650">browse files</span>
                  </p>
                )}
                <p className="text-[9px] text-slate-400">PDF, JPG, PNG or WebP up to 5MB</p>
              </div>
            </div>

            {isCheckingDuplicate && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 py-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                Analyzing document uniqueness...
              </div>
            )}

            {/* Duplicate warning widget */}
            {duplicateWarning?.isDuplicate && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-850 rounded-xl space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="font-medium leading-normal">
                    <p className="font-extrabold text-amber-900">Duplicate Document Warning</p>
                    <p className="mt-0.5">
                      This document content matches a file already in your vault:
                      <span className="block font-extrabold mt-1 font-mono text-[10px] break-all truncate">
                        &quot;{duplicateWarning.docName}&quot; ({getDocTypeLabel(duplicateWarning.docType as VaultDocument["document_type"])})
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setUploadHash("");
                      setDuplicateWarning(null);
                    }}
                    className="px-3 py-1 bg-white hover:bg-slate-100 text-[10px] font-extrabold text-slate-700 rounded-lg border border-slate-200 transition"
                  >
                    Cancel Upload
                  </button>
                  <button
                    onClick={() => uploadFileToStorageAndRegister(true)}
                    disabled={isUploading}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-[10px] font-extrabold text-white rounded-lg transition"
                  >
                    Upload Anyway
                  </button>
                </div>
              </div>
            )}

            {selectedFile && !duplicateWarning?.isDuplicate && (
              <Button
                onClick={() => uploadFileToStorageAndRegister(false)}
                disabled={isUploading || isCheckingDuplicate}
                className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <FileCheck className="h-3.5 w-3.5" />
                    Confirm Vault Upload
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="pt-2.5 border-t border-slate-100 text-[10px] text-slate-400 leading-normal flex items-start gap-1.5 font-medium">
            <Info className="h-3.5 w-3.5 text-slate-350 shrink-0 mt-0.5" />
            Vault files are encrypted, RLS hardened, and accessible only to you and verification specialists.
          </div>
        </div>
      </div>
    </div>
  );
}
