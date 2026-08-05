"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ButtonSpinner } from "@/components/ui/loading";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/providers/toast-provider";

const leadStatuses = [
  ["new", "New"],
  ["contacted", "Contacted"],
  ["converted", "Converted"],
  ["closed", "Closed"],
] as const;

function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `k-${Date.now()}`;
}

export function AdminLeadActions({ leadId, status }: { leadId: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  const [matchedCustomerId, setMatchedCustomerId] = useState<string | null>(null);
  const router = useRouter();
  const { success, error: toastError } = useToast();

  function update(payload: { status?: string; convert?: boolean; existingCustomerId?: string }) {
    if (isPending) return;
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/leads/${leadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            idempotencyKey: payload.convert ? newKey() : undefined,
          }),
        });
        const result = (await response.json()) as {
          message?: string;
          matchedCustomerId?: string;
        };

        if (response.status === 409 && result.matchedCustomerId) {
          setMatchedCustomerId(result.matchedCustomerId);
          toastError("Existing customer found — confirm link.");
          return;
        }

        if (!response.ok) throw new Error(result.message ?? "Lead update failed.");

        setMatchedCustomerId(null);
        success(result.message ?? "Lead updated.");
        router.refresh();
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Lead update failed.");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={status} onValueChange={(value) => update({ status: value })} disabled={isPending}>
        <SelectTrigger aria-label="Lead status" className="h-9 w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {leadStatuses.map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <button
        type="button"
        disabled={isPending || status === "converted"}
        onClick={() => update({ convert: true, existingCustomerId: matchedCustomerId || undefined })}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-orange-500 px-3 text-xs font-bold text-white disabled:opacity-50"
      >
        {isPending ? <ButtonSpinner className="h-3.5 w-3.5" /> : null}
        {isPending ? "Updating..." : matchedCustomerId ? "Link & convert" : "Convert"}
      </button>
    </div>
  );
}
