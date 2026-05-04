"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, IndianRupee, LoaderCircle, QrCode, Trash2 } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/portal-data";
import { createClient } from "@/lib/supabase/browser";

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

export function ServiceApplicationForm({ service, services }: { service: ApplicationFormService; services?: ApplicationFormService[] }) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [selectedDocuments, setSelectedDocuments] = useState<File[]>([]);
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const selectedServices = useMemo(() => {
    const nextServices = services?.length ? services : [service];
    const seen = new Set<string>();

    return nextServices.filter((item) => {
      if (seen.has(item.slug)) {
        return false;
      }

      seen.add(item.slug);
      return true;
    });
  }, [service, services]);
  const totalAmount = selectedServices.reduce((total, item) => total + item.amount, 0);
  const upiId = "7007595931@upi";
  const qrData = `upi://pay?pa=${upiId}&pn=DigiConnect%20Dukan&am=${totalAmount}&cu=INR`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const supabase = createClient();

    if (!supabase) {
      toastError("Supabase configuration is missing.");
      return;
    }

    if (!selectedDocuments.length) {
      toastError("Please upload Aadhaar / Documents.");
      return;
    }

    for (const file of selectedDocuments) {
      const validationError = validateFile(file, file.name);

      if (validationError) {
        toastError(validationError);
        return;
      }
    }

    if (!paymentScreenshot) {
      toastError("Please upload payment screenshot.");
      return;
    }

    const paymentValidationError = validateFile(paymentScreenshot, "Payment screenshot");

    if (paymentValidationError) {
      toastError(paymentValidationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Please login to apply.");
      }

      setProgressText("Uploading Aadhaar / Documents...");

      const uploadedDocuments = [];

      for (const [index, file] of selectedDocuments.entries()) {
        const documentType = index === 0 ? "Aadhaar / Document Proof" : "Additional Document";
        const path = `${user.id}/shared/documents/${Date.now()}-${index}-${cleanFileName(file.name)}`;
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

      setProgressText("Uploading payment proof...");

      const screenshotPath = `${user.id}/shared/payments/${Date.now()}-${cleanFileName(paymentScreenshot.name)}`;
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
      const paymentScreenshotMetadata = {
        file_name: paymentScreenshot.name,
        file_url: screenshotPublicUrl.publicUrl,
        file_type: paymentScreenshot.type,
        storage_path: screenshotPath,
      };
      setProgressText("Saving application...");

      const leadFormData = new FormData();
      leadFormData.set("name", String(formData.get("name") ?? "").trim());
      leadFormData.set("mobile", String(formData.get("mobile") ?? "").trim());
      leadFormData.set("service", selectedServices.map((item) => item.title).join(", "));
      leadFormData.set("message", String(formData.get("message") ?? "").trim());

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

      if (!leadResponse.ok || !leadResult.ok) {
        throw new Error(leadResult.error ?? leadResult.message ?? "Lead could not be saved.");
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serviceSlug: selectedServices[0]?.slug,
          serviceSlugs: selectedServices.map((item) => item.slug),
          customer: {
            name: String(formData.get("name") ?? "").trim(),
            mobile: String(formData.get("mobile") ?? "").trim(),
            email: String(formData.get("email") ?? "").trim(),
            city: "",
            message: String(formData.get("message") ?? "").trim(),
          },
          details: {
            address: String(formData.get("address") ?? "").trim(),
          },
          documents: uploadedDocuments,
          paymentScreenshot: paymentScreenshotMetadata,
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      const text = await response.text();
      let result: { message?: string; error?: string; applicationId?: string; applicationIds?: string[]; invoiceId?: string };

      try {
        result = JSON.parse(text) as { message?: string; error?: string; applicationId?: string; applicationIds?: string[]; invoiceId?: string };
      } catch {
        throw new Error(text || "The server did not return a valid response. Please try again.");
      }

      if (!response.ok || !result.invoiceId) {
        throw new Error(result.message ?? result.error ?? "Application submission failed.");
      }

      success(result.message ?? "Application submitted successfully.");
      router.push(`/invoice/${result.invoiceId}`);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === "AbortError"
          ? "The request is taking longer than 30 seconds. Please try again."
          : error instanceof Error
            ? error.message
            : "Application submission failed.";
      toastError(message);
    } finally {
      setIsSubmitting(false);
      setProgressText("");
    }
  };

  return (
    <>
    <form onSubmit={onSubmit} className="grid gap-4 pb-4 lg:grid-cols-[1fr_340px]">
      <Card className="rounded-2xl border-blue-100 bg-white/95 p-4 shadow-sm md:p-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--secondary)]">Complete Application</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">
            {selectedServices.length > 1 ? "Multiple Service Application" : service.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Fill the form, upload documents, add UPI payment details, and track your application in the dashboard.
          </p>
        </div>

        <div className="mt-5 rounded-2xl border bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold text-slate-950">Selected Services</p>
              <p className="mt-1 text-sm text-slate-600">Each service will be submitted as a separate application record.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {selectedServices.map((item) => (
              <div key={item.slug} className="min-w-0 rounded-2xl bg-slate-50 p-3">
                <p className="truncate font-bold text-slate-950">{item.title}</p>
                <p className="mt-1 text-sm text-slate-600">{formatCurrency(item.amount)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <p className="font-bold text-slate-950">Applicant Details</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Input name="name" placeholder="Full Name" aria-label="Full Name" required className="h-12 text-sm" />
          <Input
            name="mobile"
            placeholder="Mobile Number"
            aria-label="Mobile Number"
            inputMode="numeric"
            pattern="[0-9]{10}"
            required
            className="h-12 text-sm"
          />
          <Input name="email" placeholder="Email (optional)" aria-label="Email (optional)" type="email" className="h-12 text-sm" />
          <Input name="address" placeholder="Address (optional)" aria-label="Address (optional)" className="h-12 text-sm" />
          <Textarea name="message" placeholder="Notes / Message (optional)" aria-label="Notes / Message (optional)" className="min-h-24 text-sm md:col-span-2" />
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-dashed bg-blue-50/60 p-4 md:p-5">
          <div className="flex items-start gap-3">
            <FileUp className="mt-1 h-5 w-5 text-[var(--primary)]" />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-950">Upload Aadhaar / Documents</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Aadhaar is required. Add more documents only if needed.
              </p>
              <Input
                name="documents"
                type="file"
                multiple
                required={!selectedDocuments.length}
                accept=".pdf,.jpg,.jpeg,.png"
                className="mt-4"
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);

                  if (!files.length) {
                    return;
                  }

                  const validFiles: File[] = [];

                  for (const file of files) {
                    const validationError = validateFile(file, file.name);

                    if (validationError) {
                      toastError(validationError);
                      continue;
                    }

                    validFiles.push(file);
                  }

                  setSelectedDocuments((current) => [...current, ...validFiles]);
                  event.target.value = "";
                }}
              />
              {selectedDocuments.length ? (
                <div className="mt-3 grid gap-2">
                  {selectedDocuments.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="flex min-w-0 items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm">
                      <span className="min-w-0 truncate font-semibold text-slate-700">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedDocuments((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-bold text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="rounded-2xl p-4 md:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-700">
              <IndianRupee className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Fixed Amount</p>
              <p className="text-2xl font-bold text-slate-950">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl p-4 md:p-5">
          <div className="flex items-center gap-3">
            <QrCode className="h-5 w-5 text-[var(--primary)]" />
            <p className="font-bold text-slate-950">UPI Payment</p>
          </div>
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="UPI QR" className="mx-auto h-40 w-40 rounded-xl object-contain md:h-44 md:w-44" />
            <p className="mt-4 text-sm font-medium text-slate-500">UPI ID</p>
            <p className="mt-1 break-all font-mono text-sm font-bold text-slate-950">{upiId}</p>
            <p className="mt-2 text-xs font-bold text-orange-700">Amount fixed: {formatCurrency(totalAmount)}</p>
          </div>
          <label className="mt-4 block">
            <span className="text-sm font-medium text-slate-700">Upload Payment Screenshot</span>
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
                  toastError(validationError);
                  return;
                }

                setPaymentScreenshot(file);
              }}
            />
          </label>
          {paymentScreenshot ? <p className="mt-2 text-xs font-bold text-orange-700">{paymentScreenshot.name}</p> : null}
        </Card>

        <Button type="submit" size="lg" disabled={isSubmitting} className="sticky bottom-3 mb-4 h-14 w-full rounded-2xl shadow-lg md:static md:mb-0">
          {isSubmitting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : null}
          {progressText || "Submit Application"}
        </Button>
      </div>
    </form>
    </>
  );
}
