"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, IndianRupee, LoaderCircle, QrCode } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/portal-data";

type ApplicationFormService = {
  title: string;
  slug: string;
  amount: number;
  description: string;
  documents: string[];
  fields: {
    name: string;
    label: string;
    type?: "text" | "email" | "tel" | "textarea";
    required?: boolean;
  }[];
};

export function ServiceApplicationForm({ service }: { service: ApplicationFormService }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [selectedDocuments, setSelectedDocuments] = useState<Record<string, { documentType: string; file: File }>>({});
  const [paymentProofName, setPaymentProofName] = useState("");
  const upiId = "7007595931@upi";
  const qrData = `upi://pay?pa=${upiId}&pn=DigiConnect%20Dukan&am=${service.amount}&cu=INR`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("serviceSlug", service.slug);

    for (const documentType of service.documents) {
      const input = event.currentTarget.elements.namedItem(`document_${documentType}`) as HTMLInputElement | null;
      const files = input?.files;

      if (!files || files.length === 0) {
        showToast(`Please upload ${documentType}`, "error");
        return;
      }
    }

    if (Object.keys(selectedDocuments).length !== service.documents.length) {
      showToast("Please upload all required documents", "error");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/applications", {
          method: "POST",
          body: formData,
        });
        const result = (await response.json()) as { message: string; applicationId?: string; invoiceId?: string };

        if (!response.ok || !result.applicationId || !result.invoiceId) {
          throw new Error(result.message);
        }

        showToast(result.message);
        router.push(`/invoice/${result.invoiceId}`);
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
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--secondary)]">Complete Application</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">{service.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Form fill karein, documents upload karein, UPI payment detail add karein aur application dashboard me track karein.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Input name="name" placeholder="Name" aria-label="Name" required className="h-14 text-base" />
          <Input
            name="mobile"
            placeholder="Mobile"
            aria-label="Mobile"
            inputMode="numeric"
            pattern="[0-9]{10}"
            required
            className="h-14 text-base"
          />
          <Input name="email" placeholder="Email" aria-label="Email" type="email" required className="h-14 text-base" />
          <Input
            name="service"
            value={service.title}
            aria-label="Service"
            readOnly
            className="h-14 bg-slate-50 text-base font-semibold"
          />
          <Input name="city" placeholder="City" aria-label="City" required className="h-14 text-base" />
          {service.fields.map((field) =>
            field.type === "textarea" ? (
              <Textarea
                key={field.name}
                name={field.name}
                placeholder={field.label}
                aria-label={field.label}
                required={field.required ?? true}
                className="min-h-28 text-base md:col-span-2"
              />
            ) : (
              <Input
                key={field.name}
                name={field.name}
                placeholder={field.label}
                aria-label={field.label}
                type={field.type ?? "text"}
                required={field.required ?? true}
                className="h-14 text-base"
              />
            ),
          )}
          <Textarea name="message" placeholder="Message" aria-label="Message" required className="min-h-28 text-base md:col-span-2" />
        </div>

        <div className="mt-6 rounded-2xl border border-dashed bg-blue-50/60 p-5">
          <div className="flex items-start gap-3">
            <FileUp className="mt-1 h-5 w-5 text-[var(--primary)]" />
            <div>
              <p className="font-black text-slate-950">Required Documents Upload</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Har required document ke liye alag file upload karein. PDF, JPG, PNG supported.
              </p>
              <div className="mt-4 grid gap-3">
                {service.documents.map((document) => (
                  <label key={document} className="rounded-2xl border bg-white p-4">
                    <span className="block text-sm font-black text-slate-950">{document}</span>
                    <Input
                      name={`document_${document}`}
                      type="file"
                      required
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="mt-3"
                      onChange={(event) => {
                        const file = event.target.files?.[0];

                        setSelectedDocuments((current) => {
                          if (!file) {
                            const next = { ...current };
                            delete next[document];
                            return next;
                          }

                          return {
                            ...current,
                            [document]: {
                              documentType: document,
                              file,
                            },
                          };
                        });
                      }}
                    />
                    <span className="mt-2 block text-xs font-bold text-blue-700">
                      {selectedDocuments[document]?.file.name ?? "No file selected"}
                    </span>
                  </label>
                ))}
              </div>
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
              <p className="text-sm font-semibold text-slate-500">Service Price</p>
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="UPI QR" className="mx-auto h-44 w-44 rounded-xl object-contain" />
            <p className="mt-4 text-sm font-semibold text-slate-500">UPI ID</p>
            <p className="mt-1 break-all font-mono text-sm font-black text-slate-950">{upiId}</p>
            <p className="mt-2 text-xs font-bold text-orange-700">Amount fixed: {formatCurrency(service.amount)}</p>
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-700">Payment karne ke baad UTR number daalein</p>
          <Input name="utrNumber" placeholder="UTR Number" required className="mt-3 h-14 text-base" />
          <Input
            name="paymentScreenshot"
            type="file"
            required
            accept=".pdf,.jpg,.jpeg,.png"
            className="mt-3"
            onChange={(event) => setPaymentProofName(event.target.files?.[0]?.name ?? "")}
          />
          {paymentProofName ? <p className="mt-2 text-xs font-bold text-orange-700">{paymentProofName}</p> : null}
        </Card>

        <Button type="submit" size="lg" disabled={isPending} className="sticky bottom-3 z-20 h-14 w-full rounded-2xl shadow-lg">
          {isPending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : null}
          Submit Application
        </Button>
      </div>
    </form>
  );
}
