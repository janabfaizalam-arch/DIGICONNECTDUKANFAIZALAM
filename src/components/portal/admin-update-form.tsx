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
import { buildApplicationWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

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
  agentOptions = [],
  assignedAgentId = "",
}: {
  applicationId: string;
  currentStatus: ApplicationStatus;
  currentPaymentStatus: PaymentStatus;
  customerMobile: string;
  serviceName: string;
  agentOptions?: PortalUser[];
  assignedAgentId?: string | null;
}) {
  const [status, setStatus] = useState<ApplicationStatus>(currentStatus);
  const [isPending, startTransition] = useTransition();
  const { success, error: toastError } = useToast();
  const router = useRouter();
  const whatsappUrl = buildWhatsAppUrl(
    buildApplicationWhatsAppMessage({
      action: "admin_followup",
      applicationId,
      serviceName,
      status: statusLabels[status],
      mobile: customerMobile,
    }),
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

      <Select name="assignedAgentId" defaultValue={assignedAgentId || "none"}>
        <SelectTrigger aria-label="Assigned agent">
          <SelectValue placeholder="Assign agent" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Unassigned</SelectItem>
          {agentOptions.map((agent) => (
            <SelectItem key={agent.id} value={agent.id}>
              {agent.full_name || agent.email || agent.agent_code || agent.id}
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

      {customerMobile ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-bold text-white"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp Customer
        </a>
      ) : null}
    </form>
  );
}
