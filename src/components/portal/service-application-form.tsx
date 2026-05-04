"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, FileUp, IndianRupee, LoaderCircle, Plus, QrCode, ShieldCheck, Trash2, UsersRound } from "lucide-react";

import { ServiceSelectionModal } from "@/components/service-selection-modal";
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
  const [selectedDocuments, setSelectedDocuments] = useState<Record<string, { documentType: string; file: File }>>({});
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
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

    for (const selectedService of selectedServices) {
      for (const documentType of selectedService.documents) {
        const documentKey = `${selectedService.slug}:${documentType}`;
        const selectedDocument = selectedDocuments[documentKey];

        if (!selectedDocument?.file) {
          toastError(`Please upload ${documentType} for ${selectedService.title}`);
          return;
        }

        const validationError = validateFile(selectedDocument.file, documentType);

        if (validationError) {
          toastError(validationError);
          return;
        }
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

      const invoiceIds: string[] = [];

      for (const selectedService of selectedServices) {
        const leadFormData = new FormData();
        leadFormData.set("name", String(formData.get("name") ?? "").trim());
        leadFormData.set("mobile", String(formData.get("mobile") ?? "").trim());
        leadFormData.set("service", selectedService.title);
        leadFormData.set("message", String(formData.get("message") ?? "").trim());

        setProgressText(`Saving ${selectedService.title} lead...`);

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

        setProgressText(`Uploading ${selectedService.title} documents...`);

        const uploadedDocuments = [];

        for (const documentType of selectedService.documents) {
          const documentKey = `${selectedService.slug}:${documentType}`;
          const selectedDocument = selectedDocuments[documentKey];

          if (!selectedDocument?.file) {
            throw new Error(`Please upload ${documentType}`);
          }

          const file = selectedDocument.file;
          const path = `${user.id}/${selectedService.slug}/documents/${Date.now()}-${cleanFileName(documentType)}-${cleanFileName(file.name)}`;
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

        setProgressText(`Uploading ${selectedService.title} payment proof...`);

        const screenshotPath = `${user.id}/${selectedService.slug}/payments/${Date.now()}-${cleanFileName(paymentScreenshot.name)}`;
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
        const details: Record<string, string> = {
          fatherOrHusbandName: String(formData.get("fatherOrHusbandName") ?? "").trim(),
          dateOfBirth: String(formData.get("dateOfBirth") ?? "").trim(),
          address: String(formData.get("address") ?? "").trim(),
          state: String(formData.get("state") ?? "").trim(),
          pincode: String(formData.get("pincode") ?? "").trim(),
        };

        for (const field of selectedService.fields) {
          details[field.name] = String(formData.get(`${selectedService.slug}_${field.name}`) ?? "").trim();
        }

        setProgressText(`Saving ${selectedService.title} application...`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);
        const response = await fetch("/api/applications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            serviceSlug: selectedService.slug,
            price: selectedService.amount,
            customer: {
              name: String(formData.get("name") ?? "").trim(),
              mobile: String(formData.get("mobile") ?? "").trim(),
              email: String(formData.get("email") ?? "").trim(),
              city: String(formData.get("city") ?? "").trim(),
              message: String(formData.get("message") ?? "").trim(),
            },
            details,
            documents: uploadedDocuments,
            paymentScreenshot: {
              file_name: paymentScreenshot.name,
              file_url: screenshotPublicUrl.publicUrl,
              file_type: paymentScreenshot.type,
              storage_path: screenshotPath,
            },
          }),
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId));

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

        invoiceIds.push(result.invoiceId);
      }

      success(
        selectedServices.length > 1
          ? "Applications submitted successfully. Track each service in your dashboard."
          : "Application submitted successfully.",
      );
      router.push(selectedServices.length > 1 ? "/customer/dashboard" : `/invoice/${invoiceIds[0]}`);
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

        <div className="mt-5 grid gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 md:grid-cols-4">
          {["Service Details", "Applicant Details", "Documents Upload", "Payment / Review", "Submit"].map((step, index) => (
            <div key={step} className={index === 4 ? "md:col-span-4 lg:col-span-1" : ""}>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-white">
                  {index + 1}
                </span>
                <p className="text-sm font-bold text-slate-800">{step}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold text-slate-950">Selected Services</p>
              <p className="mt-1 text-sm text-slate-600">Each service will be submitted as a separate application record.</p>
            </div>
            <Button type="button" variant="outline" onClick={() => setServiceModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Add another service
            </Button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {selectedServices.map((item) => (
              <div key={item.slug} className="rounded-2xl bg-slate-50 p-4">
                <p className="font-bold text-slate-950">{item.title}</p>
                <p className="mt-1 text-sm text-slate-600">{formatCurrency(item.amount)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
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
          <Input name="email" placeholder="Email" aria-label="Email" type="email" required className="h-12 text-sm" />
          <Input
            name="service"
            value={selectedServices.map((item) => item.title).join(", ")}
            aria-label="Service"
            readOnly
            className="h-12 bg-slate-50 text-sm font-medium"
          />
          <Input name="fatherOrHusbandName" placeholder="Father/Husband Name" aria-label="Father/Husband Name" required className="h-12 text-sm" />
          <Input name="dateOfBirth" aria-label="Date of Birth" type="date" required className="h-12 text-sm" />
          <Input name="address" placeholder="Address" aria-label="Address" required className="h-12 text-sm md:col-span-2" />
          <Input name="city" placeholder="City" aria-label="City" required className="h-12 text-sm" />
          <Input name="state" placeholder="State" aria-label="State" required className="h-12 text-sm" />
          <Input name="pincode" placeholder="Pincode" aria-label="Pincode" inputMode="numeric" pattern="[0-9]{6}" required className="h-12 text-sm" />
          {selectedServices.flatMap((selectedService) =>
            selectedService.fields.map((field) =>
              field.type === "textarea" ? (
                <Textarea
                  key={`${selectedService.slug}_${field.name}`}
                  name={`${selectedService.slug}_${field.name}`}
                  placeholder={`${selectedService.title}: ${field.label}`}
                  aria-label={`${selectedService.title}: ${field.label}`}
                  required={field.required ?? true}
                  className="min-h-24 text-sm md:col-span-2"
                />
              ) : (
                <Input
                  key={`${selectedService.slug}_${field.name}`}
                  name={`${selectedService.slug}_${field.name}`}
                  placeholder={`${selectedService.title}: ${field.label}`}
                  aria-label={`${selectedService.title}: ${field.label}`}
                  type={field.type ?? "text"}
                  required={field.required ?? true}
                  className="h-12 text-sm"
                />
              ),
            ),
          )}
          <Textarea name="message" placeholder="Notes / Message" aria-label="Notes / Message" required className="min-h-24 text-sm md:col-span-2" />
        </div>

        <div className="mt-5 rounded-2xl border border-dashed bg-blue-50/60 p-4 md:p-5">
          <div className="flex items-start gap-3">
            <FileUp className="mt-1 h-5 w-5 text-[var(--primary)]" />
            <div>
              <p className="font-bold text-slate-950">Required Documents Upload</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Upload clear documents for faster processing. PDF, JPG, and PNG files are supported.
              </p>
              <div className="mt-4 grid gap-3">
                {selectedServices.map((selectedService) => (
                  <div key={selectedService.slug} className="rounded-2xl border bg-white p-4">
                    <p className="font-bold text-slate-950">{selectedService.title}</p>
                    <div className="mt-3 grid gap-3">
                      {selectedService.documents.map((document, index) => {
                        const documentKey = `${selectedService.slug}:${document}`;
                        const selectedFile = selectedDocuments[documentKey]?.file;

                        return (
                          <label key={documentKey} className="rounded-2xl border bg-slate-50 p-4">
                            <span className="block text-sm font-bold text-slate-950">
                              {String(index + 1).padStart(2, "0")}. {document}
                            </span>
                            <Input
                              name={`document_${documentKey}`}
                              type="file"
                              required={!selectedFile}
                              accept=".pdf,.jpg,.jpeg,.png"
                              className="mt-3"
                              onChange={(event) => {
                                const file = event.target.files?.[0];

                                setSelectedDocuments((current) => {
                                  if (!file) {
                                    const next = { ...current };
                                    delete next[documentKey];
                                    return next;
                                  }

                                  const validationError = validateFile(file, document);

                                  if (validationError) {
                                    event.target.value = "";
                                    toastError(validationError);
                                    const next = { ...current };
                                    delete next[documentKey];
                                    return next;
                                  }

                                  return {
                                    ...current,
                                    [documentKey]: {
                                      documentType: document,
                                      file,
                                    },
                                  };
                                });
                              }}
                            />
                            <span className="mt-2 flex items-center justify-between gap-3 text-xs font-bold text-blue-700">
                              <span className="truncate">{selectedFile?.name ?? "No file selected"}</span>
                              {selectedFile ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedDocuments((current) => {
                                      const next = { ...current };
                                      delete next[documentKey];
                                      return next;
                                    })
                                  }
                                  className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-red-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Remove
                                </button>
                              ) : null}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            { title: "Secure document handling", icon: ShieldCheck },
            { title: "Expert verification", icon: UsersRound },
            { title: "Application tracking", icon: FileText },
          ].map(({ title, icon: Icon }) => (
            <div key={title} className="rounded-2xl border bg-white p-4">
              <Icon className="h-5 w-5 text-[var(--primary)]" />
              <p className="mt-3 text-sm font-bold text-slate-800">{title}</p>
            </div>
          ))}
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
    <ServiceSelectionModal open={serviceModalOpen} onOpenChange={setServiceModalOpen} initialSelectedSlugs={selectedServices.map((item) => item.slug)} />
    </>
  );
}
