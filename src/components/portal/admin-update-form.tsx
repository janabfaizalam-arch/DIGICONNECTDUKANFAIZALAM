"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { Input } from "@/components/ui/input";
import { FormSubmitButton } from "@/components/ui/loading";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  statusLabels,
  type ApplicationStatus,
  type PaymentStatus,
} from "@/lib/portal-data";
import type { PortalUser } from "@/lib/portal-types";

const adminStatuses: ApplicationStatus[] = [
  "draft",
  "payment_pending",
  "payment_success",
  "submitted",
  "documents_required",
  "documents_verified",
  "assigned_to_agent",
  "in_process",
  "in_progress",
  "document_pending",
  "objection",
  "completed",
  "delivered",
  "rejected",
  "cancelled",
  "refunded",
];

export function AdminUpdateForm({
  applicationId,
  currentStatus,
  currentPaymentStatus,
  customerMobile,
  serviceName,
  staffOptions = [],
  assignedStaffId = "",
}: {
  applicationId: string;
  currentStatus: ApplicationStatus;
  currentPaymentStatus: PaymentStatus;
  customerMobile: string;
  serviceName: string;
  staffOptions?: PortalUser[];
  assignedStaffId?: string | null;
}) {
  const [status, setStatus] = useState<ApplicationStatus>(currentStatus);
  const [isPending, startTransition] = useTransition();
  const { success, error: toastError } = useToast();
  const router = useRouter();
  const digits = customerMobile.replace(/\D/g, "");
  const whatsappNumber = digits.length === 10 ? `91${digits}` : digits;
  const whatsappMessage = encodeURIComponent(
    `DigiConnect Dukan update: Your ${serviceName} application status is now ${statusLabels[status]}.`,
  );

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) return;
    const formData = new FormData(event.currentTarget);
    formData.set("status", status);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/applications/${applicationId}`, {
          method: "PATCH",
          body: formData,
        });
        const result = (await response.json()) as { message: string };

        if (!response.ok) {
          throw new Error(result.message);
        }

        success(result.message);
        router.refresh();
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Update failed.");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-busy={isPending}>
      <fieldset disabled={isPending} className="space-y-4">
      <Select value={status} onValueChange={(value) => setStatus(value as ApplicationStatus)}>
        <SelectTrigger aria-label="Work status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {adminStatuses.map((item) => (
            <SelectItem key={item} value={item}>
              {statusLabels[item]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
        Payment is managed by Razorpay: {currentPaymentStatus.replace(/_/g, " ")}
      </p>

      <Select name="assignedStaffId" defaultValue={assignedStaffId || "none"}>
        <SelectTrigger aria-label="Assigned staff">
          <SelectValue placeholder="Assign staff" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Unassigned</SelectItem>
          {staffOptions.map((staff) => (
            <SelectItem key={staff.id} value={staff.id}>
              {staff.full_name || staff.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Textarea name="internalNotes" placeholder="Internal notes" className="min-h-24" />
      <Textarea name="note" placeholder="Add note to history" className="min-h-24" />
      <Input name="finalDocumentTitle" placeholder="Final document title" />
      <Input name="finalDocument" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" />

      <FormSubmitButton loading={isPending} loadingText="Updating..." className="w-full">
        Update Application
      </FormSubmitButton>
      </fieldset>

      {whatsappNumber ? (
        <a
          href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-bold text-white"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp Customer
        </a>
      ) : null}
    </form>
  );
}
