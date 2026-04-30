"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, IndianRupee, LoaderCircle } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";

export function CommissionActions({ commissionId }: { commissionId: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  function update(status: "approved" | "paid") {
    const formData = new FormData();
    formData.set("status", status);

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

        showToast(result.message ?? "Commission updated.");
        router.refresh();
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Commission update failed.", "error");
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
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
    </div>
  );
}
