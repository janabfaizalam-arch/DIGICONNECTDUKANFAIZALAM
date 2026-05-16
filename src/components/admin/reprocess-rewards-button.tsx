"use client";

import { useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";

export function ReprocessRewardsButton({ applicationId }: { applicationId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { success, error: toastError } = useToast();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          try {
            const response = await fetch(`/api/admin/applications/${applicationId}/reprocess-rewards`, {
              method: "POST",
            });
            const result = (await response.json()) as { message?: string };

            if (!response.ok) {
              throw new Error(result.message ?? "Reward reprocess failed.");
            }

            success(result.message ?? "Rewards reprocessed safely.");
            router.refresh();
          } catch (error) {
            toastError(error instanceof Error ? error.message : "Reward reprocess failed.");
          }
        });
      }}
      className="w-full"
    >
      <RotateCcw className="h-4 w-4" />
      Reprocess Rewards
    </Button>
  );
}
