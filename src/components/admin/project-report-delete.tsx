"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/admin/primitives/controls";
import { AdminButton } from "@/components/admin/primitives/controls-ui";

export function ProjectReportDelete({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/admin/project-reports/${id}`, { method: "DELETE" }).catch(() => null);
    if (!response?.ok) {
      setBusy(false);
      setError("Delete nahi ho paya. Dobara koshish karein.");
      setOpen(false);
      return;
    }
    window.location.assign("/admin/project-reports");
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
        title="Ye DPR delete karein?"
        description={`${name} hamesha ke liye hat jayegi. Pehle download ki hui PDF par asar nahi padega.`}
        confirmLabel="Delete"
        destructive
        busy={busy}
        onConfirm={remove}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
