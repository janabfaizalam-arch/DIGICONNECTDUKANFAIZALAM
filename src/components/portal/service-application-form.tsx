"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, IndianRupee, LoaderCircle, QrCode } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/portal-data";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

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

const maxFileSize = 5 * 1024 * 1024;
const allowedFileTypes = ["application/pdf", "image/jpeg", "image/png"];
const requestTimeoutMs = 30_000;

function validateFile(file: File, label: string) {
  if (!allowedFileTypes.includes(file.type)) {
    return `${label} must be uploaded in PDF, JPG, or PNG format.`;
  }

  if (file.size > maxFileSize) {
    return `${label} must be smaller than 5MB.`;
  }

  return null;
}

function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

function withTimeout<T>(promise: Promise<T>, message: string) {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), requestTimeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

export function ServiceApplicationForm({ service }: { service: ApplicationFormService }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [selectedDocuments, setSelectedDocuments] = useState<Record<string, { documentType: string; file: File }>>({});
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const upiId = "7007595931@upi";
  const qrData = `upi://pay?pa=${upiId}&pn=DigiConnect%20Dukan&am=${service.amount}&cu=INR`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      showToast("Supabase configuration is missing.", "error");
      return;
    }

    for (const documentType of service.documents) {
      const selectedDocument = selectedDocuments[documentType];

      if (!selectedDocument?.file) {
        showToast(`Please upload ${documentType}`, "error");
        return;
      }

      const validationError = validateFile(selectedDocument.file, documentType);

      if (validationError) {
        showToast(validationError, "error");
        return;
      }
    }

    if (Object.keys(selectedDocuments).length !== service.documents.length) {
      showToast("Please upload all required documents", "error");
      return;
    }

    if (!paymentScreenshot) {
      showToast("Please upload the payment screenshot.", "error");
      return;
    }

    const paymentValidationError = validateFile(paymentScreenshot, "Payment screenshot");

    if (paymentValidationError) {
      showToast(paymentValidationError, "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const leadFormData = new FormData();
      leadFormData.set("name", String(formData.get("name") ?? "").trim());
      leadFormData.set("mobile", String(formData.get("mobile") ?? "").trim());
      leadFormData.set("service", service.title);
      leadFormData.set("message", String(formData.get("message") ?? "").trim());

      console.log("[ServiceApplicationForm] POST /api/lead started", {
        service: service.title,
        mobile: leadFormData.get("mobile"),
      });
      setProgressText("Saving lead...");

      const leadResponse = await fetch("/api/lead", {
        method: "POST",
        body: leadFormData,
      });
      const leadText = await leadResponse.text();
      let leadResult: { message?: string; error?: string; ok?: boolean };

      try {
        leadResult = JSON.parse(leadText) as { message?: string; error?: string; ok?: boolean };
      } catch {
        leadResult = { error: leadText || "The lead API did not return a valid response." };
      }

      console.log("[ServiceApplicationForm] POST /api/lead completed", {
        ok: leadResponse.ok,
        status: leadResponse.status,
        result: leadResult,
      });

      if (!leadResponse.ok || !leadResult.ok) {
        throw new Error(leadResult.error ?? leadResult.message ?? "Lead could not be saved.");
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Please login to apply.");
      }

      setProgressText("Uploading documents...");

      const uploadedDocuments = [];

      for (const documentType of service.documents) {
        const selectedDocument = selectedDocuments[documentType];

        if (!selectedDocument?.file) {
          throw new Error(`Please upload ${documentType}`);
        }

        const file = selectedDocument.file;
        const path = `${user.id}/${service.slug}/documents/${Date.now()}-${cleanFileName(documentType)}-${cleanFileName(file.name)}`;
        const { error: uploadError } = await withTimeout(
          supabase.storage.from("documents").upload(path, file, {
            contentType: file.type,
            upsert: false,
          }),
          "Document upload is taking longer than 30 seconds. Please check the file size and try again.",
        );

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        const { data } = supabase.storage.from("documents").getPublicUrl(path);
        uploadedDocuments.push({
          document_type: documentType,
          file_name: file.name,
          file_url: data.publicUrl,
          file_type: file.type,
          storage_path: path,
        });
      }

      const screenshotPath = `${user.id}/${service.slug}/payments/${Date.now()}-${cleanFileName(paymentScreenshot.name)}`;
      const { error: screenshotUploadError } = await withTimeout(
        supabase.storage.from("documents").upload(screenshotPath, paymentScreenshot, {
          contentType: paymentScreenshot.type,
          upsert: false,
        }),
        "Payment screenshot upload is taking longer than 30 seconds.",
      );

      if (screenshotUploadError) {
        throw new Error(screenshotUploadError.message);
      }

      const { data: screenshotPublicUrl } = supabase.storage.from("documents").getPublicUrl(screenshotPath);
      const details: Record<string, string> = {};

      for (const field of service.fields) {
        details[field.name] = String(formData.get(field.name) ?? "").trim();
      }

      setProgressText("Saving application...");

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), requestTimeoutMs);
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serviceSlug: service.slug,
          price: service.amount,
          customer: {
            name: String(formData.get("name") ?? "").trim(),
            mobile: String(formData.get("mobile") ?? "").trim(),
            email: String(formData.get("email") ?? "").trim(),
            city: String(formData.get("city") ?? "").trim(),
            message: String(formData.get("message") ?? "").trim(),
          },
          details,
          utrNumber: String(formData.get("utrNumber") ?? "").trim(),
          documents: uploadedDocuments,
          paymentScreenshot: {
            file_name: paymentScreenshot.name,
            file_url: screenshotPublicUrl.publicUrl,
            file_type: paymentScreenshot.type,
            storage_path: screenshotPath,
          },
        }),
        signal: controller.signal,
      }).finally(() => window.clearTimeout(timeoutId));

      setProgressText("Generating invoice...");

      const text = await response.text();
      let result: { message?: string; error?: string; applicationId?: string; invoiceId?: string };

      try {
        result = JSON.parse(text) as { message?: string; error?: string; applicationId?: string; invoiceId?: string };
      } catch {
        throw new Error(text || "The server did not return a valid response. Please try again.");
      }

      if (!response.ok || !result.applicationId || !result.invoiceId) {
        throw new Error(result.message ?? result.error ?? "Application submission failed.");
      }

      showToast(result.message ?? "Application submitted successfully.");
      router.push(`/invoice/${result.invoiceId}`);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === "AbortError"
          ? "The request is taking longer than 30 seconds. Please try again."
          : error instanceof Error
            ? error.message
            : "Application submission failed.";
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
      setProgressText("");
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-5 pb-4 lg:grid-cols-[1fr_340px]">
      <Card className="rounded-2xl p-5 md:p-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--secondary)]">Complete Application</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">{service.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Fill the form, upload documents, add UPI payment details, and track your application in the dashboard.
          </p>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <Input name="name" placeholder="Name" aria-label="Name" required className="h-12 text-sm" />
          <Input
            name="mobile"
            placeholder="Mobile"
            aria-label="Mobile"
            inputMode="numeric"
            pattern="[0-9]{10}"
            required
            className="h-12 text-sm"
          />
          <Input name="email" placeholder="Email" aria-label="Email" type="email" required className="h-12 text-sm" />
          <Input
            name="service"
            value={service.title}
            aria-label="Service"
            readOnly
            className="h-12 bg-slate-50 text-sm font-medium"
          />
          <Input name="city" placeholder="City" aria-label="City" required className="h-12 text-sm" />
          {service.fields.map((field) =>
            field.type === "textarea" ? (
              <Textarea
                key={field.name}
                name={field.name}
                placeholder={field.label}
                aria-label={field.label}
                required={field.required ?? true}
                className="min-h-24 text-sm md:col-span-2"
              />
            ) : (
              <Input
                key={field.name}
                name={field.name}
                placeholder={field.label}
                aria-label={field.label}
                type={field.type ?? "text"}
                required={field.required ?? true}
                className="h-12 text-sm"
              />
            ),
          )}
          <Textarea name="message" placeholder="Message" aria-label="Message" required className="min-h-24 text-sm md:col-span-2" />
        </div>

        <div className="mt-6 rounded-2xl border border-dashed bg-blue-50/60 p-4 md:p-5">
          <div className="flex items-start gap-3">
            <FileUp className="mt-1 h-5 w-5 text-[var(--primary)]" />
            <div>
              <p className="font-bold text-slate-950">Required Documents Upload</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Upload each document step by step. PDF, JPG, and PNG files are supported.
              </p>
              <div className="mt-4 grid gap-3">
                {service.documents.map((document, index) => (
                  <label key={document} className="rounded-2xl border bg-white p-4">
                    <span className="block text-sm font-bold text-slate-950">
                      {String(index + 1).padStart(2, "0")}. {document}
                    </span>
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

                          const validationError = validateFile(file, document);

                          if (validationError) {
                            event.target.value = "";
                            showToast(validationError, "error");
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
              <p className="text-sm font-medium text-slate-500">Fixed Amount</p>
              <p className="text-2xl font-bold text-slate-950">{formatCurrency(service.amount)}</p>
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <QrCode className="h-5 w-5 text-[var(--primary)]" />
            <p className="font-bold text-slate-950">UPI Payment</p>
          </div>
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="UPI QR" className="mx-auto h-44 w-44 rounded-xl object-contain" />
            <p className="mt-4 text-sm font-medium text-slate-500">UPI ID</p>
            <p className="mt-1 break-all font-mono text-sm font-bold text-slate-950">{upiId}</p>
            <p className="mt-2 text-xs font-bold text-orange-700">Amount fixed: {formatCurrency(service.amount)}</p>
          </div>
          <p className="mt-4 text-sm font-medium text-slate-700">Enter the UTR number after completing payment.</p>
          <Input name="utrNumber" placeholder="UTR Number" required className="mt-3 h-12 text-sm" />
          <Input
            name="paymentScreenshot"
            type="file"
            required
            accept=".pdf,.jpg,.jpeg,.png"
            className="mt-3"
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (!file) {
                setPaymentScreenshot(null);
                return;
              }

              const validationError = validateFile(file, "Payment screenshot");

              if (validationError) {
                event.target.value = "";
                setPaymentScreenshot(null);
                showToast(validationError, "error");
                return;
              }

              setPaymentScreenshot(file);
            }}
          />
          {paymentScreenshot ? <p className="mt-2 text-xs font-bold text-orange-700">{paymentScreenshot.name}</p> : null}
        </Card>

        <Button type="submit" size="lg" disabled={isSubmitting} className="mb-4 h-14 w-full rounded-2xl shadow-lg md:mb-0">
          {isSubmitting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : null}
          {progressText || "Submit Application"}
        </Button>
      </div>
    </form>
  );
}
