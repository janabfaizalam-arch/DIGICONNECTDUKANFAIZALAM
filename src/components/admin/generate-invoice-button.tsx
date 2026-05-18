"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ReceiptText } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";

export function GenerateInvoiceButton({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          try {
            const response = await fetch(`/api/admin/applications/${applicationId}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "generate_invoice" }),
            });
            const result = (await response.json().catch(() => ({}))) as { message?: string };
            if (!response.ok) throw new Error(result.message || "Invoice could not be generated.");
            success(result.message || "Invoice generated.");
            router.refresh();
          } catch (error) {
            toastError(error instanceof Error ? error.message : "Invoice could not be generated.");
          }
        });
      }}
      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-blue-700 px-4 text-sm font-bold text-white disabled:opacity-60"
    >
      <ReceiptText className="h-4 w-4" />
      {isPending ? "Generating..." : "Generate Invoice"}
    </button>
  );
}
