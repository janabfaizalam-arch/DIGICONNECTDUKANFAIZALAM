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
  "lead_submitted",
  "payment_pending",
  "payment_verified",
  "documents_under_review",
  "documents_required",
  "application_processing",
  "submitted_to_department",
  "under_government_review",
  "completed",
  "rejected",
  "cancelled",
];

export function AdminUpdateForm({
  applicationId,
  currentStatus,
  currentPaymentStatus,
  customerMobile,
  serviceName,
  agents = [],
  assignedAgentId = "",
  hideAgentFields = false,
  staff = [],
  assignedStaffId = "",
}: {
  applicationId: string;
  currentStatus: ApplicationStatus;
  currentPaymentStatus: PaymentStatus;
  cashbackEnabled?: boolean;
  cashbackAmount?: number | string | null;
  cashbackExpiryDays?: number | null;
  customerMobile: string;
  serviceName: string;
  agents?: PortalUser[];
  assignedAgentId?: string;
  hideAgentFields?: boolean;
  staff?: PortalUser[];
  assignedStaffId?: string;
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

      <div className="rounded-2xl bg-blue-50/70 px-4 py-3 text-sm font-bold text-blue-800">
        Payment status is updated automatically from Razorpay: {currentPaymentStatus.replace(/_/g, " ")}
      </div>

      {hideAgentFields ? null : (
        <Select name="assignedAgentId" defaultValue={assignedAgentId || "none"}>
          <SelectTrigger aria-label="Assigned agent">
            <SelectValue placeholder="Assign agent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No agent</SelectItem>
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.full_name || agent.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select name="assignedStaffId" defaultValue={assignedStaffId || "none"}>
        <SelectTrigger aria-label="Assigned staff">
          <SelectValue placeholder="Assign staff" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No staff</SelectItem>
          {staff.map((staffMember) => (
            <SelectItem key={staffMember.id} value={staffMember.id}>
              {staffMember.full_name || staffMember.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input name="assignedTo" placeholder="Assign to team member" />
      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
        <p className="text-sm font-bold text-slate-900">Get 20% Cashback in Wallet</p>
        <p className="mt-1 text-xs font-medium leading-5 text-slate-600">
          Cashback is credited after successful service completion and verified payment. It is automatic and credited only once per application.
        </p>
      </div>
      <Textarea name="internalNotes" placeholder="Internal notes" className="min-h-24" />
      <Textarea name="note" placeholder="Add note to history" className="min-h-24" />
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
