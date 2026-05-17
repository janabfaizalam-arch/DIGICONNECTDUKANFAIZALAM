"use client";

import { type FormEvent, useTransition } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/providers/toast-provider";
import { Input } from "@/components/ui/input";

export function AdminDocumentReviewActions({ documentId }: { documentId: string }) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/documents/${documentId}`, {
          method: "PATCH",
          body: formData,
        });
        const result = (await response.json().catch(() => ({}))) as { message?: string };
        if (!response.ok) throw new Error(result.message || "Document could not be updated.");
        success(result.message || "Document updated.");
        router.refresh();
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Document could not be updated.");
      }
    });
  }

  return (
    <form onSubmit={submit} className="mt-3 grid gap-2">
      <Input name="reason" placeholder="Reason if rejected" disabled={isPending} />
      <div className="flex gap-2">
        <button name="status" value="accepted" disabled={isPending} className="h-9 rounded-full bg-emerald-600 px-3 text-xs font-bold text-white">
          Accept
        </button>
        <button name="status" value="rejected" disabled={isPending} className="h-9 rounded-full bg-orange-600 px-3 text-xs font-bold text-white">
          Reject
        </button>
      </div>
    </form>
  );
}
