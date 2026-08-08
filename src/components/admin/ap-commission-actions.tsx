"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BanknoteArrowUp, CheckCircle2, LoaderCircle, Undo2, XCircle } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";

type Action = { status: string; label: string; icon: typeof CheckCircle2; tone: "approve" | "pay" | "revoke" };

const APPROVE: Action = { status: "approved", label: "Approve", icon: CheckCircle2, tone: "approve" };
const PAY: Action = { status: "paid", label: "Mark paid", icon: BanknoteArrowUp, tone: "pay" };
const CANCEL: Action = { status: "cancelled", label: "Cancel", icon: XCircle, tone: "revoke" };
const REVERSE: Action = { status: "reversed", label: "Reverse", icon: Undo2, tone: "revoke" };

/** Which transitions make sense from the commission's current status. */
function actionsFor(status: string): Action[] {
  if (status === "pending" || status === "earned") return [APPROVE, CANCEL];
  if (status === "approved") return [PAY, REVERSE];
  if (status === "paid") return [REVERSE];
  return [];
}

const TONE_CLASS: Record<Action["tone"], string> = {
  approve: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  pay: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
  revoke: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
};

export function ApCommissionActions({
  commissionId,
  status,
  amount,
  partnerName,
}: {
  commissionId: string;
  status: string;
  amount: number;
  partnerName: string;
}) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [busyStatus, setBusyStatus] = useState<string | null>(null);

  const actions = actionsFor(status);
  if (!actions.length) {
    return <span className="text-xs font-semibold text-slate-400">No actions</span>;
  }

  function run(action: Action) {
    // Money movement — confirm the revoking transitions, which claw funds back
    // out of a partner's wallet.
    if (action.tone === "revoke") {
      const confirmed = window.confirm(
        `${action.label} ₹${amount.toLocaleString("en-IN")} for ${partnerName}? If this commission was already credited, the amount will be debited from their wallet.`,
      );
      if (!confirmed) return;
    }

    setBusyStatus(action.status);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/ap-commissions/${commissionId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: action.status }),
        });
        const result = (await response.json().catch(() => ({}))) as {
          message?: string;
          walletChanged?: boolean;
        };

        if (!response.ok) {
          throw new Error(result.message ?? "Commission update failed.");
        }

        success(
          result.walletChanged
            ? `${action.label} done — partner wallet updated.`
            : `${action.label} done — wallet already settled.`,
        );
        router.refresh();
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Commission update failed.");
      } finally {
        setBusyStatus(null);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((action) => {
        const Icon = action.icon;
        const busy = isPending && busyStatus === action.status;
        return (
          <button
            key={action.status}
            type="button"
            disabled={isPending}
            onClick={() => run(action)}
            className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-bold transition disabled:opacity-50 ${TONE_CLASS[action.tone]}`}
          >
            {busy ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
