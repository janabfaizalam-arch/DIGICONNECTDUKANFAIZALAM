"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Power } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";

export function AgentStatusButton({ agentId, isActive }: { agentId: string; isActive: boolean }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  function updateStatus() {
    const formData = new FormData();
    formData.set("isActive", String(!isActive));

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/agents/${agentId}`, {
          method: "PATCH",
          body: formData,
        });
        const result = (await response.json()) as { message?: string };

        if (!response.ok) {
          throw new Error(result.message ?? "Agent status update failed.");
        }

        showToast(result.message ?? "Agent updated.");
        router.refresh();
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Agent status update failed.", "error");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={updateStatus}
      disabled={isPending}
      className="inline-flex h-9 items-center justify-center gap-2 rounded-full border bg-white px-3 text-xs font-bold text-slate-900 disabled:opacity-50"
    >
      {isPending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
      {isActive ? "Deactivate" : "Activate"}
    </button>
  );
}
