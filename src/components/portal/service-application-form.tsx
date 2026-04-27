"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, IndianRupee, LoaderCircle, QrCode } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, type PortalService, upiDetails } from "@/lib/portal-data";

export function ServiceApplicationForm({ service }: { service: PortalService }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [documentCount, setDocumentCount] = useState(0);
  const [paymentProofName, setPaymentProofName] = useState("");

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("serviceSlug", service.slug);

    startTransition(async () => {
      try {
        const response = await fetch("/api/applications", {
          method: "POST",
          body: formData,
        });
        const result = (await response.json()) as { message: string; applicationId?: string };

        if (!response.ok || !result.applicationId) {
          throw new Error(result.message);
        }

        showToast(result.message);
        router.push(`/dashboard/applications/${result.applicationId}`);
        router.refresh();
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Application submit nahi ho payi.", "error");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card className="rounded-2xl p-5 md:p-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--secondary)]">Service Form</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">{service.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{service.description}</p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {service.fields.map((field) => {
            const commonProps = {
              name: field.name,
              required: field.required,
              placeholder: field.label,
              "aria-label": field.label,
            };

            if (field.type === "textarea") {
              return (
                <Textarea key={field.name} {...commonProps} className="min-h-28 md:col-span-2" />
              );
            }

            return <Input key={field.name} {...commonProps} type={field.type ?? "text"} />;
          })}
        </div>

        <div className="mt-6 rounded-2xl border border-dashed bg-blue-50/60 p-5">
          <div className="flex items-start gap-3">
            <FileUp className="mt-1 h-5 w-5 text-[var(--primary)]" />
            <div>
              <p className="font-black text-slate-950">Documents Upload</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Multiple documents upload karein. PDF, JPG, PNG supported.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {service.documents.map((document) => (
                  <span key={document} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">
                    {document}
                  </span>
                ))}
              </div>
              <Input
                name="documents"
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="mt-4"
                onChange={(event) => setDocumentCount(event.target.files?.length ?? 0)}
              />
              {documentCount > 0 ? <p className="mt-2 text-xs font-bold text-blue-700">{documentCount} file selected</p> : null}
            </div>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-700">
              <IndianRupee className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">Service Amount</p>
              <p className="text-2xl font-black text-slate-950">{formatCurrency(service.amount)}</p>
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <QrCode className="h-5 w-5 text-[var(--primary)]" />
            <p className="font-black text-slate-950">UPI Payment</p>
          </div>
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-center">
            {upiDetails.qrImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={upiDetails.qrImageUrl} alt="UPI QR" className="mx-auto h-44 w-44 rounded-xl object-contain" />
            ) : (
              <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-xl border border-dashed bg-white text-sm font-bold text-slate-500">
                UPI QR
              </div>
            )}
            <p className="mt-4 text-sm font-semibold text-slate-500">UPI ID</p>
            <p className="mt-1 break-all font-mono text-sm font-black text-slate-950">{upiDetails.upiId}</p>
          </div>
          <Input name="utrNumber" placeholder="UTR / Transaction ID" className="mt-4" />
          <Input
            name="paymentScreenshot"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            className="mt-3"
            onChange={(event) => setPaymentProofName(event.target.files?.[0]?.name ?? "")}
          />
          {paymentProofName ? <p className="mt-2 text-xs font-bold text-orange-700">{paymentProofName}</p> : null}
        </Card>

        <Button type="submit" size="lg" disabled={isPending} className="h-14 w-full rounded-2xl">
          {isPending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : null}
          Submit Application
        </Button>
      </div>
    </form>
  );
}
