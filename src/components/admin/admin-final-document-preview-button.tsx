"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";

export function AdminFinalDocumentPreviewButton({
  applicationId,
  documentId,
  label = "Admin preview",
}: {
  applicationId: string;
  documentId?: string | null;
  label?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const { error: toastError } = useToast();
  const [busy, setBusy] = useState(false);

  function openPreview() {
    if (isPending || busy) return;
    setBusy(true);
    startTransition(async () => {
      try {
        const qs = documentId ? `?documentId=${encodeURIComponent(documentId)}` : "";
        const response = await fetch(`/api/admin/applications/${applicationId}/final-document/url${qs}`);
        const result = (await response.json()) as { url?: string; message?: string };
        if (!response.ok || !result.url) {
          throw new Error(result.message || "Could not open document.");
        }
        window.open(result.url, "_blank", "noopener,noreferrer");
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Preview failed.");
      } finally {
        setBusy(false);
      }
    });
  }

  return (
    <button
      type="button"
      disabled={isPending || busy}
      onClick={openPreview}
      className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 text-[11px] font-semibold text-white disabled:opacity-60"
    >
      <Download className="h-3.5 w-3.5" />
      {busy || isPending ? "Opening..." : label}
    </button>
  );
}
