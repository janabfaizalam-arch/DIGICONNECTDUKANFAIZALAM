"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/providers/toast-provider";

const leadStatuses = ["new", "in_progress", "completed"] as const;

export function AgentLeadStatusForm({ leadId, status }: { leadId: string; status: string }) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();

  function updateStatus(nextStatus: string) {
    startTransition(async () => {
      try {
        const response = await fetch("/api/agent/leads", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: leadId, status: nextStatus }),
        });
        const result = (await response.json()) as { message?: string };

        if (!response.ok) {
          throw new Error(result.message || "Lead status could not be updated.");
        }

        success(result.message || "Lead status updated.");
        router.refresh();
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Lead status could not be updated.");
      }
    });
  }

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(event) => updateStatus(event.target.value)}
      className="h-10 rounded-full border bg-white px-3 text-xs font-bold capitalize text-slate-800 outline-none"
    >
      {leadStatuses.map((leadStatus) => (
        <option key={leadStatus} value={leadStatus}>
          {leadStatus.replace(/_/g, " ")}
        </option>
      ))}
    </select>
  );
}
