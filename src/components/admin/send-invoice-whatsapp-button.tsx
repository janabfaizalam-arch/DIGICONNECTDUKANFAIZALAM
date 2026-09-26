"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";

export function SendInvoiceWhatsAppButton({ invoiceId }: { invoiceId: string }) {
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
            const response = await fetch(`/api/admin/invoices/${invoiceId}/whatsapp`, { method: "POST" });
            const result = (await response.json().catch(() => ({}))) as {
              message?: string;
              whatsappOk?: boolean;
              queued?: boolean;
            };
            if (!response.ok) throw new Error(result.message || "Invoice could not be sent.");
            if (result.whatsappOk) success(result.message || "Invoice sent on WhatsApp.");
            else if (result.queued) success(result.message || "Invoice queued for WhatsApp.");
            else toastError(result.message || "Invoice could not be sent.");
            router.refresh();
          } catch (error) {
            toastError(error instanceof Error ? error.message : "Invoice could not be sent.");
          }
        });
      }}
      className="inline-flex h-9 items-center gap-2 rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white disabled:opacity-60"
    >
      <MessageCircle className="h-3.5 w-3.5" />
      {isPending ? "Sending..." : "Send on WhatsApp"}
    </button>
  );
}
