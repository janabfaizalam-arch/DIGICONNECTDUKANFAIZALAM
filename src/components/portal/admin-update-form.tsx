"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, FileQuestion, MessageCircle, ReceiptText, RefreshCw } from "lucide-react";

import { APPLICATION_STATUS_OPTIONS, isApplicationStatus, type ApplicationStatus } from "@/lib/application-status";
import { useToast } from "@/components/providers/toast-provider";
import { Input } from "@/components/ui/input";
import { FormSubmitButton } from "@/components/ui/loading";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { statusLabels, type PaymentStatus } from "@/lib/portal-data";
import type { PortalUser } from "@/lib/portal-types";
import { buildAdminCustomerWhatsAppMessage, buildCustomerWhatsAppUrl } from "@/lib/whatsapp";

export function AdminUpdateForm({
  applicationId,
  currentStatus,
  currentPaymentStatus,
  customerMobile,
  customerName,
  serviceName,
  invoiceHref,
  agentOptions = [],
  assignedAgentId = "",
}: {
  applicationId: string;
  currentStatus: ApplicationStatus | string;
  currentPaymentStatus: PaymentStatus;
  customerMobile: string;
  customerName?: string;
  serviceName: string;
  invoiceHref?: string | null;
  agentOptions?: PortalUser[];
  assignedAgentId?: string | null;
}) {
  const initialStatus = currentStatus === "in_process" ? "in_progress" : currentStatus;
  const [status, setStatus] = useState<ApplicationStatus>(isApplicationStatus(initialStatus) ? initialStatus : "submitted");
  const [isPending, startTransition] = useTransition();
  const { success, error: toastError } = useToast();
  const router = useRouter();
  const messageParams = { applicationId, serviceName, customerName };
  const whatsappUrl = buildCustomerWhatsAppUrl(
    buildAdminCustomerWhatsAppMessage({
      ...messageParams,
      kind: "general",
    }),
    customerMobile,
  );
  const quickMessages = [
    {
      label: "Ask for Documents",
      icon: FileQuestion,
      href: buildCustomerWhatsAppUrl(buildAdminCustomerWhatsAppMessage({ ...messageParams, kind: "documents_required" }), customerMobile),
    },
    {
      label: "Send Payment Reminder",
      icon: Clock3,
      href: buildCustomerWhatsAppUrl(buildAdminCustomerWhatsAppMessage({ ...messageParams, kind: "payment_pending" }), customerMobile),
    },
    {
      label: "Send Progress Update",
      icon: RefreshCw,
      href: buildCustomerWhatsAppUrl(buildAdminCustomerWhatsAppMessage({ ...messageParams, kind: "in_progress" }), customerMobile),
    },
    {
      label: "Send Completion Message",
      icon: CheckCircle2,
      href: buildCustomerWhatsAppUrl(buildAdminCustomerWhatsAppMessage({ ...messageParams, kind: "completed" }), customerMobile),
    },
    {
      label: "Objection Reply Needed",
      icon: MessageCircle,
      href: buildCustomerWhatsAppUrl(buildAdminCustomerWhatsAppMessage({ ...messageParams, kind: "objection" }), customerMobile),
    },
  ];

  function updateStatusQuickly(nextStatus: ApplicationStatus) {
    if (isPending) return;
    setStatus(nextStatus);
    const formData = new FormData();
    formData.set("status", nextStatus);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/applications/${applicationId}`, {
          method: "PATCH",
          body: formData,
        });
        const result = (await response.json()) as { message?: string };

        if (!response.ok) {
          throw new Error(result.message || "Update failed.");
        }

        success(result.message || `Status updated to ${statusLabels[nextStatus]}.`);
        router.refresh();
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Update failed.");
      }
    });
  }

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
        const result = (await response.json()) as { message?: string };

        if (!response.ok) {
          throw new Error(result.message || "Update failed.");
        }

        success(result.message || `Status updated to ${statusLabels[status]}.`);
        router.refresh();
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Update failed.");
      }
    });
  };

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-4" aria-busy={isPending}>
        <fieldset disabled={isPending} className="space-y-4">
          <Select value={status} onValueChange={(value) => setStatus(value as ApplicationStatus)}>
            <SelectTrigger aria-label="Work status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {APPLICATION_STATUS_OPTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
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
            Update Status
          </FormSubmitButton>
        </fieldset>
      </form>

      <div className="grid gap-2">
        {quickMessages.map((item) => {
          const Icon = item.icon;

          return item.href ? (
            <a
              key={item.label}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border bg-white px-4 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </a>
          ) : null;
        })}
        <button
          type="button"
          disabled={isPending}
          onClick={() => updateStatusQuickly("completed")}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60"
        >
          <CheckCircle2 className="h-4 w-4" />
          Mark Completed
        </button>

        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-bold text-white"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp Customer
          </a>
        ) : (
          <span className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-slate-100 px-4 text-sm font-bold text-slate-400">
            <MessageCircle className="h-4 w-4" />
            No customer mobile
          </span>
        )}
        {invoiceHref ? (
          <a
            href={invoiceHref}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-blue-700 px-4 text-sm font-bold text-white"
          >
            <ReceiptText className="h-4 w-4" />
            View Invoice
          </a>
        ) : null}
      </div>
    </div>
  );
}
