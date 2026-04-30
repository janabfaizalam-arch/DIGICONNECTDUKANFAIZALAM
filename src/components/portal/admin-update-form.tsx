"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, MessageCircle } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  paymentStatuses,
  paymentStatusLabels,
  statusLabels,
  type ApplicationStatus,
  type PaymentStatus,
} from "@/lib/portal-data";

const adminStatuses: ApplicationStatus[] = ["new", "in_process", "completed", "rejected"];

export function AdminUpdateForm({
  applicationId,
  currentStatus,
  currentPaymentStatus,
  customerMobile,
  serviceName,
}: {
  applicationId: string;
  currentStatus: ApplicationStatus;
  currentPaymentStatus: PaymentStatus;
  customerMobile: string;
  serviceName: string;
}) {
  const [status, setStatus] = useState<ApplicationStatus>(currentStatus);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(currentPaymentStatus);
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();
  const router = useRouter();
  const digits = customerMobile.replace(/\D/g, "");
  const whatsappNumber = digits.length === 10 ? `91${digits}` : digits;
  const whatsappMessage = encodeURIComponent(
    `DigiConnect Dukan update: Your ${serviceName} application status is now ${statusLabels[status]}.`,
  );

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("status", status);
    formData.set("paymentStatus", paymentStatus);

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

        showToast(result.message);
        router.refresh();
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Update failed.", "error");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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

      <Select value={paymentStatus} onValueChange={(value) => setPaymentStatus(value as PaymentStatus)}>
        <SelectTrigger aria-label="Payment status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {paymentStatuses.map((item) => (
            <SelectItem key={item} value={item}>
              {paymentStatusLabels[item]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input name="assignedTo" placeholder="Assign to team member" />
      <Textarea name="internalNotes" placeholder="Internal notes" className="min-h-24" />
      <Textarea name="note" placeholder="Add note to history" className="min-h-24" />
      <Input name="finalDocument" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" />

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        Update Application
      </Button>

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
