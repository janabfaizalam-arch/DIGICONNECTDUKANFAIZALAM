"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { Input } from "@/components/ui/input";
import { FormSubmitButton } from "@/components/ui/loading";

export function PayoutRequestForm({ availableBalance }: { availableBalance: number }) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    const requestedAmount = Number(amount);
    if (!requestedAmount || requestedAmount <= 0 || !Number.isFinite(requestedAmount)) {
      toastError("Please enter a valid amount.");
      return;
    }

    if (requestedAmount < 500) {
      toastError("Minimum payout request is ₹500.");
      return;
    }

    if (requestedAmount > availableBalance) {
      toastError("Requested amount exceeds your available wallet balance.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/ap/wallet", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ amount: requestedAmount }),
        });

        const result = (await response.json()) as { message?: string };

        if (!response.ok) {
          throw new Error(result.message ?? "Failed to request payout.");
        }

        success(result.message ?? "Payout request submitted successfully!");
        setAmount("");
        router.refresh();
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Failed to request payout.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-xs font-bold text-slate-400">Withdrawal Amount (₹)</label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-slate-400 text-sm">
            ₹
          </span>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter ₹500 or more"
            required
            className="border-white/5 bg-slate-950 text-white rounded-xl h-11 pl-8 pr-4"
          />
        </div>
      </div>

      <FormSubmitButton
        loading={isPending}
        disabled={isPending || Number(amount) < 500 || Number(amount) > availableBalance}
        loadingText="Requesting..."
        icon={<Send className="h-4 w-4" />}
        className="w-full h-11 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-indigo-600 shadow-md shadow-blue-500/10"
      >
        Submit Payout Request
      </FormSubmitButton>
    </form>
  );
}
