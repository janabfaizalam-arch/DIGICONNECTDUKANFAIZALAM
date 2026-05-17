"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Hand, IndianRupee, LoaderCircle, XCircle } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";

export function CommissionActions({ commissionId }: { commissionId: string }) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();

  function update(status: "approved" | "paid" | "hold" | "cancelled") {
    const form = document.getElementById(`commission-${commissionId}`) as HTMLFormElement | null;
    const formData = new FormData();
    formData.set("status", status);
    if (form) {
      const source = new FormData(form);
      formData.set("payoutTransactionId", String(source.get("payoutTransactionId") ?? ""));
      formData.set("payoutDate", String(source.get("payoutDate") ?? ""));
    }

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/commissions/${commissionId}`, {
          method: "PATCH",
          body: formData,
        });
        const result = (await response.json()) as { message?: string };

        if (!response.ok) {
          throw new Error(result.message ?? "Commission update failed.");
        }

        success(result.message ?? "Commission updated.");
        router.refresh();
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Commission update failed.");
      }
    });
  }

  return (
    <form id={`commission-${commissionId}`} className="flex flex-wrap items-center gap-2">
      <input
        name="payoutTransactionId"
        placeholder="Payout txn ID"
        className="h-9 w-32 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-[var(--primary)]"
      />
      <input
        name="payoutDate"
        type="date"
        className="h-9 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-[var(--primary)]"
      />
      <button
        type="button"
        disabled={isPending}
        onClick={() => update("approved")}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-full border bg-white px-3 text-xs font-bold text-slate-900 disabled:opacity-50"
      >
        {isPending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
        Approve
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => update("paid")}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-3 text-xs font-bold text-white disabled:opacity-50"
      >
        <IndianRupee className="h-3.5 w-3.5" />
        Mark Paid
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => update("hold")}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-full border bg-white px-3 text-xs font-bold text-amber-700 disabled:opacity-50"
      >
        <Hand className="h-3.5 w-3.5" />
        Hold
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => update("cancelled")}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-full border bg-white px-3 text-xs font-bold text-rose-700 disabled:opacity-50"
      >
        <XCircle className="h-3.5 w-3.5" />
        Cancel
      </button>
    </form>
  );
}
