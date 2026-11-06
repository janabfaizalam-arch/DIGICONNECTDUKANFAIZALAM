"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/admin/primitives/controls";
import { AdminButton } from "@/components/admin/primitives/controls-ui";

export function BalanceSheetDelete({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/admin/balance-sheets/${id}`, { method: "DELETE" }).catch(() => null);
    if (!response?.ok) {
      setBusy(false);
      setError("Delete nahi ho paya. Dobara koshish karein.");
      setOpen(false);
      return;
    }
    // A full load, for the same reason as after saving: a soft navigation
    // was occasionally aborted and left a deleted sheet on screen.
    window.location.assign("/admin/balance-sheets");
  }

  return (
    <>
      <AdminButton variant="danger" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        Delete
      </AdminButton>
      {error ? (
        <p role="alert" className="text-[12px] font-semibold text-ds-danger">
          {error}
        </p>
      ) : null}
      <ConfirmDialog
        open={open}
        title="Delete this balance sheet?"
        description={`${name} will be removed permanently. Any PDF already downloaded is not affected.`}
        confirmLabel="Delete"
        destructive
        busy={busy}
        onConfirm={remove}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
