"use client";

import { type FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  FileQuestion,
  MessageCircle,
  ReceiptText,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

import { isApplicationStatus, type ApplicationStatus } from "@/lib/application-status";
import {
  isWorkflowEditable,
  shouldShowCompleteAction,
  shouldShowPaymentReminder,
  workflowSelectOptions,
} from "@/lib/applications/status-machine";
import { resolveSmartNextAction } from "@/lib/applications/smart-next-action";
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
  hasFinalDocument = false,
  missingDocuments = false,
  whatsappFinalDeliveryStatus = null,
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
  hasFinalDocument?: boolean;
  missingDocuments?: boolean;
  whatsappFinalDeliveryStatus?: string | null;
}) {
  const initialStatus = currentStatus === "in_process" ? "in_progress" : currentStatus;
  const [status, setStatus] = useState<ApplicationStatus>(
    isApplicationStatus(initialStatus) ? initialStatus : "submitted",
  );
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [finalFile, setFinalFile] = useState<File | null>(null);
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

  const statusOptions = useMemo(() => workflowSelectOptions(currentStatus), [currentStatus]);
  const showPaymentReminder = shouldShowPaymentReminder(currentPaymentStatus, currentStatus);
  const showComplete = shouldShowCompleteAction(currentStatus);
  const editable = isWorkflowEditable(currentStatus);
  const delivery = String(whatsappFinalDeliveryStatus ?? "").toLowerCase();
  const smartAction = resolveSmartNextAction({
    status: currentStatus,
    paymentStatus: currentPaymentStatus,
    hasFinalDocument,
    missingDocuments,
    whatsappFinalDeliveryStatus,
  });

  const quickMessages = (
    [
      {
        label: "Ask for Documents",
        icon: FileQuestion,
        show: missingDocuments,
        eventType: "documents_required" as const,
      },
      {
        label: "Send Payment Reminder",
        icon: Clock3,
        show: showPaymentReminder,
        eventType: "payment_pending" as const,
      },
      {
        label: "Send Progress Update",
        icon: RefreshCw,
        show: editable,
        eventType: "progress_update" as const,
      },
      {
        label: "Send Objection",
        icon: MessageCircle,
        show: editable,
        eventType: "objection" as const,
      },
    ] as const
  ).filter((item) => item.show);

  function patchApplication(formData: FormData) {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/applications/${applicationId}`, {
          method: "PATCH",
          body: formData,
        });
        const result = (await response.json()) as { message?: string };
        if (!response.ok) throw new Error(result.message || "Update failed.");
        success(result.message || "Application updated.");
        router.refresh();
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Update failed.");
      }
    });
  }

  function sendWhatsAppEvent(eventType: string, label: string) {
    if (isPending) return;
    if (!customerMobile) {
      toastError("Customer mobile is required for WhatsApp.");
      return;
    }
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/applications/${applicationId}/whatsapp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventType }),
        });
        const result = (await response.json()) as {
          message?: string;
          whatsappOk?: boolean;
          upgradeRequired?: boolean;
          queued?: boolean;
        };
        if (!response.ok) throw new Error(result.message || `${label} failed.`);
        if (result.whatsappOk) success(result.message || `${label} sent.`);
        else if (result.upgradeRequired) toastError(result.message || "Database upgrade required.");
        else if (result.queued) toastError(result.message || "WhatsApp queued — configure AiSensy and retry.");
        else toastError(result.message || `${label} failed.`);
        router.refresh();
      } catch (error) {
        toastError(error instanceof Error ? error.message : `${label} failed.`);
      }
    });
  }

  function retryWhatsApp() {
    if (isPending) return;
    const formData = new FormData();
    formData.set("action", "retry_whatsapp");
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/applications/${applicationId}/final-document`, {
          method: "POST",
          body: formData,
        });
        const result = (await response.json()) as { message?: string; whatsappOk?: boolean };
        if (!response.ok) throw new Error(result.message || "Retry failed.");
        if (result.whatsappOk) success(result.message || "WhatsApp resent.");
        else toastError(result.message || "WhatsApp delivery failed.");
        router.refresh();
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Retry failed.");
      }
    });
  }

  function completeAndSend() {
    if (isPending) return;
    if (!finalFile && !hasFinalDocument) {
      toastError("Upload a final document first.");
      return;
    }
    if (!customerMobile) {
      toastError("Customer mobile is required for WhatsApp.");
      return;
    }

    const formData = new FormData();
    formData.set("completeAndSend", "true");
    formData.set("title", "Final completed document");
    if (finalFile) formData.set("file", finalFile);

    startTransition(async () => {
      try {
        if (!finalFile && hasFinalDocument) {
          // Already uploaded — mark completed via PATCH then retry WhatsApp send
          const patch = new FormData();
          patch.set("status", "completed");
          const patchRes = await fetch(`/api/admin/applications/${applicationId}`, {
            method: "PATCH",
            body: patch,
          });
          const patchResult = (await patchRes.json()) as { message?: string };
          if (!patchRes.ok) throw new Error(patchResult.message || "Could not complete.");
          const retry = new FormData();
          retry.set("action", "retry_whatsapp");
          const waRes = await fetch(`/api/admin/applications/${applicationId}/final-document`, {
            method: "POST",
            body: retry,
          });
          const waResult = (await waRes.json()) as { message?: string; whatsappOk?: boolean };
          if (waResult.whatsappOk) success("Completed and sent on WhatsApp.");
          else toastError(waResult.message || "Completed, but WhatsApp failed — use Retry.");
        } else {
          const response = await fetch(`/api/admin/applications/${applicationId}/final-document`, {
            method: "POST",
            body: formData,
          });
          const result = (await response.json()) as { message?: string; whatsappOk?: boolean };
          if (!response.ok) throw new Error(result.message || "Complete failed.");
          if (result.whatsappOk) success(result.message || "Completed and sent on WhatsApp.");
          else toastError(result.message || "Completed, but WhatsApp failed — use Retry.");
        }
        setShowCompleteDialog(false);
        setFinalFile(null);
        router.refresh();
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Complete failed.");
      }
    });
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) return;
    const formData = new FormData(event.currentTarget);
    formData.set("status", status);
    patchApplication(formData);
  };

  return (
    <div className="space-y-3">
      {smartAction.key !== "none" ? (
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-900">
          Next: {smartAction.label}
        </div>
      ) : null}

      {!editable ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
          Workflow locked ({String(currentStatus).replace(/_/g, " ")}).
          {delivery ? ` WhatsApp: ${delivery}.` : ""}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-3" aria-busy={isPending}>
        <fieldset disabled={isPending || !editable} className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status</label>
            <Select value={status} onValueChange={(value) => setStatus(value as ApplicationStatus)}>
              <SelectTrigger aria-label="Work status" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
            Payment: {String(currentPaymentStatus).replace(/_/g, " ")}
          </p>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Assigned to</label>
            <Select name="assignedAgentId" defaultValue={assignedAgentId || "none"}>
              <SelectTrigger aria-label="Assigned agent" className="h-9">
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
          </div>

          <Textarea name="internalNotes" placeholder="Internal note" className="min-h-16 text-sm" />
          <Textarea name="note" placeholder="Activity note" className="min-h-16 text-sm" />

          <FormSubmitButton loading={isPending} loadingText="Saving..." className="h-9 w-full text-sm">
            Save Changes
          </FormSubmitButton>
        </fieldset>
      </form>

      <div className="grid gap-1.5">
        {quickMessages.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              disabled={isPending || !customerMobile}
              onClick={() => sendWhatsAppEvent(item.eventType, item.label)}
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          );
        })}

        {showComplete ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => setShowCompleteDialog(true)}
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Complete & Send on WhatsApp
          </button>
        ) : null}

        {String(whatsappFinalDeliveryStatus ?? "").toLowerCase() === "failed" ||
        String(whatsappFinalDeliveryStatus ?? "").toLowerCase() === "queued" ? (
          <button
            type="button"
            disabled={isPending || !customerMobile}
            onClick={retryWhatsApp}
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry WhatsApp
          </button>
        ) : null}

        {String(whatsappFinalDeliveryStatus ?? "").toLowerCase() === "sent" ? (
          <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-800">
            Final document delivered on WhatsApp
          </p>
        ) : null}

        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp Customer
          </a>
        ) : (
          <span className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-500">
            <AlertTriangle className="h-3.5 w-3.5" />
            No customer mobile
          </span>
        )}

        {invoiceHref ? (
          <a
            href={invoiceHref}
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white"
          >
            <ReceiptText className="h-3.5 w-3.5" />
            View Invoice
          </a>
        ) : null}
      </div>

      {showCompleteDialog ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-4 sm:items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
            <h3 className="text-sm font-bold text-slate-950">Complete & Send</h3>
            <dl className="mt-3 space-y-1.5 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Customer</dt>
                <dd className="font-semibold text-slate-900">{customerName || "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Mobile</dt>
                <dd className="font-mono font-semibold text-slate-900">{customerMobile || "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Service</dt>
                <dd className="text-right font-semibold text-slate-900">{serviceName}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Status</dt>
                <dd className="font-semibold text-slate-900">
                  {statusLabels[status as keyof typeof statusLabels] ?? status}
                </dd>
              </div>
            </dl>
            <div className="mt-3">
              <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">Final document</label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(event) => setFinalFile(event.target.files?.[0] ?? null)}
                className="h-9 text-xs"
              />
              {hasFinalDocument && !finalFile ? (
                <p className="mt-1 text-[11px] text-slate-500">Existing final document will be sent if no new file is chosen.</p>
              ) : null}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowCompleteDialog(false)}
                className="h-9 flex-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending || (!finalFile && !hasFinalDocument) || !customerMobile}
                onClick={completeAndSend}
                className="h-9 flex-1 rounded-lg bg-emerald-600 text-xs font-semibold text-white disabled:opacity-50"
              >
                {isPending ? "Sending..." : "Complete & Send"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
