"use client";

import { type FormEvent, useRef, useState } from "react";
import { Save } from "lucide-react";

import { FormSubmitButton } from "@/components/ui/loading";
import { applicationStatuses, type ApplicationStatus } from "@/lib/portal-data";

type StaffApplicationUpdateFormProps = {
  applicationId: string;
  currentStatus: ApplicationStatus;
  staffNote?: string | null;
  customerMessage?: string | null;
};

type ApiResponse = {
  message?: string;
  error?: string;
};

export function StaffApplicationUpdateForm({
  applicationId,
  currentStatus,
  staffNote,
  customerMessage,
}: StaffApplicationUpdateFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    setSuccessMessage("");
    setErrorMessage("");
    setIsSaving(true);

    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch(`/api/staff/applications/${applicationId}`, {
        method: "PATCH",
        body: formData,
      });
      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        setErrorMessage(data.error || data.message || "Application update failed.");
        return;
      }

      setSuccessMessage(data.message || "Application updated successfully.");
      const finalDocumentInput = formRef.current?.querySelector<HTMLInputElement>('input[name="finalDocument"]');

      if (finalDocumentInput) {
        finalDocumentInput.value = "";
      }
    } catch (error) {
      console.error("[staff-update] Application update failed", error);
      setErrorMessage("Application update failed. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4" aria-busy={isSaving}>
      <fieldset disabled={isSaving} className="space-y-4">
      <label className="grid gap-2">
        <span className="text-sm font-bold text-slate-700">Current status</span>
        <select
          name="status"
          defaultValue={currentStatus}
          className="h-12 rounded-2xl border bg-white px-4 text-sm font-bold text-slate-900 outline-none focus:border-[var(--primary)]"
        >
          {applicationStatuses.map((status) => (
            <option key={status} value={status}>
              {status.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-start gap-3 rounded-2xl bg-orange-50 p-4 text-sm font-bold text-orange-800">
        <input type="checkbox" name="documentsRequired" value="true" className="mt-1" />
        Mark documents required
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-bold text-slate-700">Internal note</span>
        <textarea
          name="staffNote"
          defaultValue={staffNote ?? ""}
          rows={4}
          className="rounded-2xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--primary)]"
          placeholder="Add staff-only update notes"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-bold text-slate-700">Customer-facing message</span>
        <textarea
          name="customerMessage"
          defaultValue={customerMessage ?? ""}
          rows={4}
          className="rounded-2xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--primary)]"
          placeholder="This message can be shown to the customer dashboard"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-bold text-slate-700">Final document / receipt</span>
        <input name="finalDocument" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="text-sm text-slate-700" />
      </label>

      <FormSubmitButton loading={isSaving} loadingText="Updating..." icon={<Save className="h-4 w-4" />} className="h-12 w-full rounded-2xl">
        Save Update
      </FormSubmitButton>
      </fieldset>

      {successMessage ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{successMessage}</p> : null}
      {errorMessage ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{errorMessage}</p> : null}
    </form>
  );
}
