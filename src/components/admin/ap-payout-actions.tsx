"use client";

import { BanknoteArrowUp, LoaderCircle, PlayCircle, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useToast } from "@/components/providers/toast-provider";
import {
  allowedTransitions,
  describeTransition,
  isPayoutStatus,
  requiresPaymentReference,
  type PayoutStatus,
} from "@/lib/ap-payout-transitions";

const LABEL: Record<PayoutStatus, string> = {
  requested: "Reopen",
  processing: "Start processing",
  paid: "Mark paid",
  rejected: "Reject",
};

const ICON: Record<PayoutStatus, typeof PlayCircle> = {
  requested: PlayCircle,
  processing: PlayCircle,
  paid: BanknoteArrowUp,
  rejected: XCircle,
};

const TONE: Record<PayoutStatus, string> = {
  requested: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  processing: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
  paid: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  rejected: "border-rose-200 bg-white text-rose-700 hover:bg-rose-50",
};

export function ApPayoutActions({
  payoutId,
  status,
  amount,
}: {
  payoutId: string;
  status: string;
  amount: number;
}) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  if (!isPayoutStatus(status)) {
    return <span className="text-xs font-semibold text-rose-600">Unknown status</span>;
  }

  const options = allowedTransitions(status);
  if (!options.length) {
    return <span className="text-xs font-semibold text-slate-400">Final</span>;
  }

  function run(to: PayoutStatus) {
    // Marking paid without a reference cannot be reconciled against the bank.
    let paymentReference: string | null = null;
    if (requiresPaymentReference(to)) {
      paymentReference = window.prompt(
        "Bank / UPI reference for this transfer (UTR, txn id):",
        "",
      );
      if (paymentReference === null) return;
      if (!paymentReference.trim()) {
        toastError("A payment reference is required to mark a payout paid.");
        return;
      }
    }

    const warning = describeTransition(to, amount);
    if (warning && !window.confirm(warning)) return;

    setBusy(to);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/ap-payouts/${payoutId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: to, paymentReference }),
        });
        const result = (await response.json().catch(() => ({}))) as { message?: string };

        if (!response.ok) {
          throw new Error(result.message ?? "Payout update failed.");
        }

        success(result.message ?? "Payout updated.");
        router.refresh();
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Payout update failed.");
      } finally {
        setBusy(null);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((to) => {
        const Icon = ICON[to];
        return (
          <button
            key={to}
            type="button"
            disabled={isPending}
            onClick={() => run(to)}
            className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-bold transition disabled:opacity-50 ${TONE[to]}`}
          >
            {isPending && busy === to ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {LABEL[to]}
          </button>
        );
      })}
    </div>
  );
}
