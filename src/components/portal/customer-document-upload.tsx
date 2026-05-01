"use client";

import { type FormEvent, useRef, useState } from "react";
import { LoaderCircle, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";

const maxFileSize = 5 * 1024 * 1024;

type CustomerDocumentUploadProps = {
  applicationId: string;
};

type ApiResponse = {
  message?: string;
  error?: string;
};

export function CustomerDocumentUpload({ applicationId }: CustomerDocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    const formData = new FormData(event.currentTarget);
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      setError("Please choose a document to upload.");
      return;
    }

    if (file.size > maxFileSize) {
      setError("Document must be smaller than 5MB.");
      return;
    }

    setIsUploading(true);

    try {
      const response = await fetch(`/api/customer/applications/${applicationId}/documents`, {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        setError(data.error || data.message || "Document upload failed.");
        return;
      }

      setMessage(data.message || "Document uploaded successfully.");
      formRef.current?.reset();
    } catch (uploadError) {
      console.error("[customer-document-upload] Upload failed", uploadError);
      setError("Document upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleUpload} className="mt-3 grid gap-3 rounded-2xl bg-orange-50 p-3">
      <p className="text-sm font-bold text-orange-800">Upload requested documents</p>
      <input
        type="text"
        name="documentType"
        placeholder="Document name"
        className="h-10 rounded-xl border bg-white px-3 text-sm text-slate-900 outline-none"
        disabled={isUploading}
      />
      <input
        type="file"
        name="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        required
        className="text-sm text-slate-700"
        disabled={isUploading}
      />
      <Button type="submit" size="default" disabled={isUploading} className="h-10 rounded-xl">
        {isUploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {isUploading ? "Uploading..." : "Upload Document"}
      </Button>
      {message ? <p className="text-sm font-medium text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
    </form>
  );
}
