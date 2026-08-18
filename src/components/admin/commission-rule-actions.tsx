"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Power, Trash2 } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";

export function CommissionRuleActions({
  ruleId,
  ruleName,
  isActive,
}: {
  ruleId: string;
  ruleName: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"toggle" | "delete" | null>(null);

  function toggle() {
    // Deactivating a rule stops future sales matching it. Confirm, because a
    // partner-scoped rule going dark silently drops that partner to whatever
    // broader rule catches them next — or to nothing at all.
    if (isActive && !window.confirm(`Deactivate "${ruleName}"? New sales will stop matching it.`)) return;

    setBusy("toggle");
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/commission-rules/${ruleId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ isActive: !isActive }),
        });
        const result = (await response.json().catch(() => ({}))) as { message?: string };
        if (!response.ok) throw new Error(result.message ?? "Update failed.");

        success(isActive ? "Rule deactivated." : "Rule activated.");
        router.refresh();
      } catch (err) {
        toastError(err instanceof Error ? err.message : "Update failed.");
      } finally {
        setBusy(null);
      }
    });
  }

  function remove() {
    if (!window.confirm(`Delete "${ruleName}" permanently?`)) return;

    setBusy("delete");
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/commission-rules/${ruleId}`, { method: "DELETE" });
        const result = (await response.json().catch(() => ({}))) as { message?: string };
        if (!response.ok) throw new Error(result.message ?? "Delete failed.");

        success("Rule deleted.");
        router.refresh();
      } catch (err) {
        toastError(err instanceof Error ? err.message : "Delete failed.");
      } finally {
        setBusy(null);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={toggle}
        className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition disabled:opacity-50 ${
          isActive
            ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
        }`}
      >
        {isPending && busy === "toggle" ? (
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Power className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {isActive ? "Deactivate" : "Activate"}
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={remove}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
      >
        {isPending && busy === "delete" ? (
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        Delete
      </button>
    </div>
  );
}
