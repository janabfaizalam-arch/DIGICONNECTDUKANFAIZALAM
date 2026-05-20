"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgePercent, CheckCircle2, CreditCard, FileUp, IndianRupee, Trash2, WalletCards } from "lucide-react";

import { RazorpayCheckoutButton, type VerifiedRazorpayPayment } from "@/components/payments/razorpay-checkout-button";
import { useToast } from "@/components/providers/toast-provider";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormSubmitButton, LoadingOverlay } from "@/components/ui/loading";
import { Textarea } from "@/components/ui/textarea";
import { useWallet } from "@/hooks/use-wallet";
import { trackApplicationSubmit } from "@/lib/google-analytics";
import { trackSubmitApplication } from "@/lib/meta-pixel";
import { formatCurrency } from "@/lib/portal-data";
import { calculateCashbackForFreshPayment } from "@/lib/reward-rules";
import { createClient } from "@/lib/supabase/browser";
import { getRealPayableAmount } from "@/lib/wallet";

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
const comboServiceSlugs = new Set(["itr-filing", "msme-certificate"]);

type VerifiedApplicationPayment = VerifiedRazorpayPayment & {
  amount_paise: number;
};

type ApplicantFormValues = {
  name?: string;
  mobile?: string;
  email?: string;
  city?: string;
  address?: string;
  message?: string;
};

type PincodeLookupResponse = {
  ok?: boolean;
  city?: string;
  district?: string;
  state?: string;
  message?: string;
};

type NormalizedApplicationDraft = {
  customer: {
    name: string;
    mobile: string;
    email: string;
    city: string;
    message: string;
  };
  details: {
    address: string;
  };
};

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

function buildNormalizedApplicationDraft(form: ApplicantFormValues): NormalizedApplicationDraft {
  const normalizedName = form.name?.trim() ?? "";
  const normalizedMobile = form.mobile?.trim() ?? "";
  const normalizedEmail = form.email?.trim() ?? "";
  const normalizedCity = form.city?.trim() ?? "";

  return {
    customer: {
      name: normalizedName,
      mobile: normalizedMobile,
      email: normalizedEmail,
      city: normalizedCity,
      message: form.message?.trim() ?? "",
    },
    details: {
      address: form.address?.trim() ?? "",
    },
  };
}

function getApplicantValidationError(draft: NormalizedApplicationDraft, options: { emailOptional?: boolean } = {}) {
  if (!draft.customer.name) return "Name is required.";
  if (!draft.customer.mobile) return "Mobile is required.";
  if (!options.emailOptional && !draft.customer.email) return "Email is required.";
  if (!draft.customer.city) return "City is required.";
  return null;
}

function devInfo(message: string, details?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development") {
    console.info(message, details ?? {});
  }
}

function RequiredMark() {
  return <span className="text-red-600">*</span>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-bold text-slate-800">{children}</label>;
}

const pmVishwakarmaTrades = [
  "Tailor (Darzi)",
  "Barber (Nai)",
  "Carpenter (Badhai)",
  "Blacksmith (Lohar)",
  "Goldsmith (Sunar)",
  "Cobbler (Mochi)",
  "Potter (Kumhar)",
  "Mason (Rajmistri)",
  "Washerman (Dhobi)",
  "Garland Maker",
  "Basket/Broom Maker",
  "Toy Maker",
  "Locksmith",
  "Fishing Net Maker",
  "Sculptor",
  "Boat Maker",
  "Hammer & Tool Kit Maker",
  "Other Eligible Traditional Work",
];

export function ServiceApplicationForm({ service, services }: { service: ApplicationFormService; services?: ApplicationFormService[] }) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [selectedDocuments, setSelectedDocuments] = useState<File[]>([]);
  const [razorpayPayment, setRazorpayPayment] = useState<VerifiedApplicationPayment | null>(null);
  const [walletUseAmount, setWalletUseAmount] = useState(0);
  const [applicantName, setApplicantName] = useState("");
  const [applicantMobile, setApplicantMobile] = useState("");
  const [applicantEmail, setApplicantEmail] = useState("");
  const [applicantCity, setApplicantCity] = useState("");
  const [applicantAddress, setApplicantAddress] = useState("");
  const [applicantMessage, setApplicantMessage] = useState("");
  const [pincode, setPincode] = useState("");
  const [district, setDistrict] = useState("");
  const [stateName, setStateName] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [casteCategory, setCasteCategory] = useState("");
  const [tradeWorkType, setTradeWorkType] = useState("");
  const [traditionalOccupationCommunity, setTraditionalOccupationCommunity] = useState("");
  const [migrantWorker, setMigrantWorker] = useState("");
  const [upResidentFamilyBenefit, setUpResidentFamilyBenefit] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [pincodeStatus, setPincodeStatus] = useState("");
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
  const isPmVishwakarma = selectedServices.length === 1 && selectedServices[0]?.slug === "pm-vishwakarma-yojana";
  const isItrMsmeCombo = selectedServices.length >= 2 && [...comboServiceSlugs].every((slug) => selectedServices.some((item) => item.slug === slug));
  const totalAmount = isItrMsmeCombo ? 699 : selectedServices.reduce((total, item) => total + item.amount, 0);
  const wallet = useWallet(totalAmount);
  const clampedWalletUseAmount = Math.min(walletUseAmount, wallet.maxUsable);
  const realPayableAmount = getRealPayableAmount(totalAmount, clampedWalletUseAmount);
  const walletLimitMessage = "You can redeem up to 50% of your wallet balance, limited to 50% of service amount.";
  const hasFirstServiceCashback = wallet.transactions.some((transaction) => transaction.type === "first_service_cashback");
  const expectedCashback = calculateCashbackForFreshPayment(realPayableAmount, !hasFirstServiceCashback);
  const payableAmountPaise = Math.round(realPayableAmount * 100);
  const paymentReceipt = useMemo(() => `digi-${selectedServices[0]?.slug ?? "service"}-${Date.now()}`, [selectedServices]);
  const normalizedApplicationDraft = useMemo(
    () =>
      buildNormalizedApplicationDraft({
        name: applicantName,
        mobile: applicantMobile,
        email: applicantEmail,
        city: applicantCity,
        address: applicantAddress,
        message: applicantMessage,
      }),
    [applicantAddress, applicantCity, applicantEmail, applicantMessage, applicantMobile, applicantName],
  );
  const pmVishwakarmaDetailsForPayment = useMemo(
    () =>
      isPmVishwakarma
        ? {
            pincode,
            district,
            state: stateName,
            maritalStatus,
            casteCategory,
            tradeWorkType,
            traditionalOccupationCommunity,
            migrantWorker,
            upResidentFamilyBenefit,
            termsAccepted: termsAccepted ? "true" : "",
            address: applicantAddress.trim(),
          }
        : normalizedApplicationDraft.details,
    [
      applicantAddress,
      casteCategory,
      district,
      isPmVishwakarma,
      maritalStatus,
      migrantWorker,
      normalizedApplicationDraft.details,
      pincode,
      stateName,
      termsAccepted,
      traditionalOccupationCommunity,
      tradeWorkType,
      upResidentFamilyBenefit,
    ],
  );
  const canStartPayment =
    !isSubmitting &&
    !getApplicantValidationError(normalizedApplicationDraft, { emailOptional: isPmVishwakarma }) &&
    /^\d{10}$/.test(normalizedApplicationDraft.customer.mobile) &&
    selectedDocuments.length > 0 &&
    (!isPmVishwakarma ||
      Boolean(/^\d{6}$/.test(pincode) &&
        district.trim() &&
        stateName.trim() &&
        maritalStatus &&
        casteCategory.trim() &&
        tradeWorkType &&
        traditionalOccupationCommunity &&
        migrantWorker &&
        upResidentFamilyBenefit &&
        termsAccepted));

  useEffect(() => {
    setRazorpayPayment(null);
  }, [payableAmountPaise]);

  useEffect(() => {
    if (!isPmVishwakarma) return;

    if (!/^\d{6}$/.test(pincode)) {
      setPincodeStatus("");
      return;
    }

    const controller = new AbortController();
    setPincodeStatus("Fetching city, district and state...");

    fetch(`/api/pincode?pincode=${encodeURIComponent(pincode)}`, { signal: controller.signal })
      .then(async (response) => {
        const result = (await response.json()) as PincodeLookupResponse;
        if (!response.ok || !result.ok) throw new Error(result.message || "PIN code lookup failed.");
        if (result.city) setApplicantCity(result.city);
        if (result.district) setDistrict(result.district);
        if (result.state) setStateName(result.state);
        setPincodeStatus("Location auto-filled. You can edit it if needed.");
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setPincodeStatus("Auto-fetch failed. Please enter city, district and state manually.");
      });

    return () => controller.abort();
  }, [isPmVishwakarma, pincode]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

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

    const submittedDraft = buildNormalizedApplicationDraft({
      name: String(formData.get("name") ?? ""),
      mobile: String(formData.get("mobile") ?? ""),
      email: String(formData.get("email") ?? ""),
      city: String(formData.get("city") ?? ""),
      address: String(formData.get("address") ?? ""),
      message: String(formData.get("message") ?? ""),
    });
    const pmVishwakarmaDetails: Record<string, string> = isPmVishwakarma
      ? {
          pincode: String(formData.get("pincode") ?? "").trim(),
          district: String(formData.get("district") ?? "").trim(),
          state: String(formData.get("state") ?? "").trim(),
          maritalStatus: String(formData.get("maritalStatus") ?? "").trim(),
          casteCategory: String(formData.get("casteCategory") ?? "").trim(),
          tradeWorkType: String(formData.get("tradeWorkType") ?? "").trim(),
          traditionalOccupationCommunity: String(formData.get("traditionalOccupationCommunity") ?? "").trim(),
          migrantWorker: String(formData.get("migrantWorker") ?? "").trim(),
          upResidentFamilyBenefit: String(formData.get("upResidentFamilyBenefit") ?? "").trim(),
          termsAccepted: formData.get("termsAccepted") === "true" ? "true" : "",
        }
      : {};
    const applicantValidationError = getApplicantValidationError(submittedDraft, { emailOptional: isPmVishwakarma });

    devInfo("[service-application-form] Applicant validation before submit", {
      hasName: Boolean(submittedDraft.customer.name),
      hasMobile: Boolean(submittedDraft.customer.mobile),
      hasEmail: Boolean(submittedDraft.customer.email),
      hasCity: Boolean(submittedDraft.customer.city),
      emailLength: submittedDraft.customer.email.length,
      cityLength: submittedDraft.customer.city.length,
      walletUseAmount: clampedWalletUseAmount,
      payableAmountPaise,
    });

    if (applicantValidationError) {
      toastError(applicantValidationError);
      return;
    }

    if (!/^\d{10}$/.test(submittedDraft.customer.mobile)) {
      toastError("Enter a valid 10 digit Indian mobile number.");
      return;
    }

    if (isPmVishwakarma) {
      if (!/^\d{6}$/.test(pmVishwakarmaDetails.pincode)) {
        toastError("Enter a valid 6 digit PIN code.");
        return;
      }

      const missingPmField = Object.entries(pmVishwakarmaDetails).find(([, value]) => !value);
      if (missingPmField) {
        toastError("Please complete all required PM Vishwakarma fields.");
        return;
      }
    }

    for (const file of selectedDocuments) {
      const validationError = validateFile(file, file.name);

      if (validationError) {
        toastError(validationError);
        return;
      }
    }

    if (realPayableAmount > 0 && !razorpayPayment) {
      toastError("Please complete Razorpay checkout before submitting.");
      return;
    }

    if (walletUseAmount > wallet.maxUsable) {
      toastError(walletLimitMessage);
      return;
    }

    if (razorpayPayment && razorpayPayment.amount_paise !== payableAmountPaise) {
      toastError("Payment amount changed. Please complete Razorpay checkout again.");
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

      setProgressText("Saving application...");

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
          customer: submittedDraft.customer,
          details: {
            ...submittedDraft.details,
            ...pmVishwakarmaDetails,
            address: submittedDraft.details.address,
          },
          documents: uploadedDocuments,
          razorpayPayment,
          applicationIds: razorpayPayment?.application_ids,
          walletUseAmount: clampedWalletUseAmount,
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
      trackSubmitApplication();
      trackApplicationSubmit();
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
    <form onSubmit={onSubmit} className="grid gap-4 pb-4 lg:grid-cols-[1fr_340px]" aria-busy={isSubmitting}>
      <fieldset disabled={isSubmitting} className="contents">
      <Card className="rounded-2xl border-blue-100 bg-white/95 p-4 shadow-sm md:p-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--secondary)]">Complete Application</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">
            {selectedServices.length > 1 ? "Multiple Service Application" : service.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Fill the form, upload documents, pay securely with Razorpay, and track your application in the dashboard.
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
          {isPmVishwakarma ? (
            <div className="mt-3 grid gap-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="grid gap-1.5">
                  <FieldLabel>Full Name <RequiredMark /></FieldLabel>
                  <Input name="name" placeholder="Enter full name" required className="h-12 text-sm" value={applicantName} onChange={(event) => setApplicantName(event.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <FieldLabel>Mobile Number <RequiredMark /></FieldLabel>
                  <Input
                    name="mobile"
                    placeholder="10 digit mobile number"
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    required
                    className="h-12 text-sm"
                    value={applicantMobile}
                    onChange={(event) => setApplicantMobile(event.target.value.replace(/\D/g, "").slice(0, 10))}
                  />
                </div>
                <div className="grid gap-1.5">
                  <FieldLabel>Pin Code <RequiredMark /></FieldLabel>
                  <Input
                    name="pincode"
                    placeholder="6 digit PIN code"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    required
                    className="h-12 text-sm"
                    value={pincode}
                    onChange={(event) => setPincode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  />
                  {pincodeStatus ? <p className="text-xs font-semibold text-blue-700">{pincodeStatus}</p> : null}
                </div>
                <div className="grid gap-1.5">
                  <FieldLabel>City <RequiredMark /></FieldLabel>
                  <Input name="city" placeholder="City" required className="h-12 text-sm" value={applicantCity} onChange={(event) => setApplicantCity(event.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <FieldLabel>District <RequiredMark /></FieldLabel>
                  <Input name="district" placeholder="District" required className="h-12 text-sm" value={district} onChange={(event) => setDistrict(event.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <FieldLabel>State <RequiredMark /></FieldLabel>
                  <Input name="state" placeholder="State" required className="h-12 text-sm" value={stateName} onChange={(event) => setStateName(event.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <FieldLabel>Marital Status <RequiredMark /></FieldLabel>
                  <select name="maritalStatus" required value={maritalStatus} onChange={(event) => setMaritalStatus(event.target.value)} className="h-12 rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]">
                    <option value="">Select marital status</option>
                    <option value="Married">Married</option>
                    <option value="Unmarried">Unmarried</option>
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <FieldLabel>Caste / Category <RequiredMark /></FieldLabel>
                  <Input name="casteCategory" placeholder="Caste / Category" required className="h-12 text-sm" value={casteCategory} onChange={(event) => setCasteCategory(event.target.value)} />
                </div>
                <div className="grid gap-1.5 md:col-span-2">
                  <FieldLabel>Trade / Work Type <RequiredMark /></FieldLabel>
                  <select name="tradeWorkType" required value={tradeWorkType} onChange={(event) => setTradeWorkType(event.target.value)} className="h-12 rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]">
                    <option value="">Select trade / work type</option>
                    {pmVishwakarmaTrades.map((trade) => <option key={trade} value={trade}>{trade}</option>)}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <FieldLabel>Email</FieldLabel>
                  <Input name="email" placeholder="Email (optional)" type="email" className="h-12 text-sm" value={applicantEmail} onChange={(event) => setApplicantEmail(event.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <FieldLabel>Address</FieldLabel>
                  <Input name="address" placeholder="Address (optional)" className="h-12 text-sm" value={applicantAddress} onChange={(event) => setApplicantAddress(event.target.value)} />
                </div>
                <div className="grid gap-1.5 md:col-span-2">
                  <FieldLabel>Note / Message</FieldLabel>
                  <Textarea name="message" placeholder="Note / Message (optional)" className="min-h-24 text-sm" value={applicantMessage} onChange={(event) => setApplicantMessage(event.target.value)} />
                </div>
              </div>

              <div className="grid gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                {[
                  {
                    name: "traditionalOccupationCommunity",
                    value: traditionalOccupationCommunity,
                    setter: setTraditionalOccupationCommunity,
                    label: "Are you from a caste/community related to a traditional occupation?",
                  },
                  {
                    name: "migrantWorker",
                    value: migrantWorker,
                    setter: setMigrantWorker,
                    label: "Are you a migrant worker/artisan?",
                    helper: "Migrant means a worker from another state.",
                  },
                  {
                    name: "upResidentFamilyBenefit",
                    value: upResidentFamilyBenefit,
                    setter: setUpResidentFamilyBenefit,
                    label: "I am a permanent resident of Uttar Pradesh. No other person in my family has taken benefit under this scheme. Family means husband/wife only.",
                  },
                ].map((question) => (
                  <fieldset key={question.name} className="rounded-xl bg-white p-3">
                    <legend className="text-sm font-bold leading-6 text-slate-900">{question.label} <RequiredMark /></legend>
                    {question.helper ? <p className="mt-1 text-xs font-semibold text-slate-500">{question.helper}</p> : null}
                    <div className="mt-3 flex gap-4">
                      {["Yes", "No"].map((option) => (
                        <label key={option} className="inline-flex items-center gap-2 text-sm font-bold text-slate-700">
                          <input type="radio" name={question.name} value={option} required checked={question.value === option} onChange={() => question.setter(option)} />
                          {option}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-orange-100 bg-orange-50/60 p-4 text-sm leading-6 text-slate-700">
                <input type="checkbox" name="termsAccepted" value="true" required checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="mt-1" />
                <span>
                  <span className="font-bold text-slate-950">I accept the terms and conditions <RequiredMark /></span>
                  <span className="mt-2 block">
                    I confirm that all information provided is true and correct. I understand that approval and benefits depend on government eligibility, verification, and official scheme rules. I understand that DigiConnect Dukan is an assistance/service provider, not a government authority. I understand that service fee may be non-refundable after processing starts.
                  </span>
                </span>
              </label>
            </div>
          ) : (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Input name="name" placeholder="Full Name" aria-label="Full Name" required className="h-12 text-sm" value={applicantName} onChange={(event) => setApplicantName(event.target.value)} />
              <Input
                name="mobile"
                placeholder="Mobile Number"
                aria-label="Mobile Number"
                inputMode="numeric"
                pattern="[0-9]{10}"
                required
                className="h-12 text-sm"
                value={applicantMobile}
                onChange={(event) => setApplicantMobile(event.target.value.replace(/\D/g, "").slice(0, 10))}
              />
              <Input name="email" placeholder="Email" aria-label="Email" type="email" required className="h-12 text-sm" value={applicantEmail} onChange={(event) => setApplicantEmail(event.target.value)} />
              <Input name="city" placeholder="City" aria-label="City" required className="h-12 text-sm" value={applicantCity} onChange={(event) => setApplicantCity(event.target.value)} />
              <Input name="address" placeholder="Address (optional)" aria-label="Address (optional)" className="h-12 text-sm" value={applicantAddress} onChange={(event) => setApplicantAddress(event.target.value)} />
              <Textarea name="message" placeholder="Notes / Message (optional)" aria-label="Notes / Message (optional)" className="min-h-24 text-sm md:col-span-2" value={applicantMessage} onChange={(event) => setApplicantMessage(event.target.value)} />
            </div>
          )}
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
                disabled={isSubmitting}
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
                        disabled={isSubmitting}
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
              <p className="text-sm font-medium text-slate-500">Order Total</p>
              <p className="text-2xl font-bold text-slate-950">{formatCurrency(totalAmount)}</p>
              {clampedWalletUseAmount > 0 ? <p className="mt-1 text-xs font-bold text-blue-700">Pay now: {formatCurrency(realPayableAmount)}</p> : null}
            </div>
          </div>
        </Card>

        {realPayableAmount > 0 ? (
          <Card className="rounded-2xl border-orange-100 bg-white/95 p-4 md:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-700">
                <CreditCard className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-950">Razorpay Checkout</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Pay securely by card, UPI, net banking, or wallet. Payment status is verified directly by Razorpay.
                </p>
                <div className="mt-4">
                  <RazorpayCheckoutButton
                    amountPaise={payableAmountPaise}
                    receipt={paymentReceipt}
                    serviceSlug={selectedServices[0]?.slug}
                    serviceSlugs={selectedServices.map((item) => item.slug)}
                    walletUseAmount={clampedWalletUseAmount}
                    customer={{
                      name: normalizedApplicationDraft.customer.name,
                      email: normalizedApplicationDraft.customer.email,
                      mobile: normalizedApplicationDraft.customer.mobile,
                    }}
                    applicationDraft={{
                      customer: normalizedApplicationDraft.customer,
                      details: pmVishwakarmaDetailsForPayment,
                    }}
                    description={selectedServices.map((item) => item.title).join(", ")}
                    disabled={!canStartPayment}
                    onVerified={(payment) => {
                      setRazorpayPayment({
                        ...payment,
                        amount_paise: payableAmountPaise,
                      });
                    }}
                  />
                </div>
                {razorpayPayment ? (
                  <div className="mt-3 flex items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Payment verified: {razorpayPayment.razorpay_payment_id}
                  </div>
                ) : null}
                {!canStartPayment ? (
                  <p className="mt-3 rounded-2xl bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700">
                    {isPmVishwakarma
                      ? "Fill all required PM Vishwakarma fields, accept terms, and upload documents before payment."
                      : "Fill name, 10 digit mobile, email, city, and upload documents before payment."}
                  </p>
                ) : null}
              </div>
            </div>
          </Card>
        ) : null}

        <LoadingOverlay show={wallet.isLoading} label="Checking wallet balance...">
        <Card className="rounded-2xl border-blue-100 bg-white/95 p-4 md:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <WalletCards className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-950">Use DigiWallet</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Available: {wallet.isLoading ? "Checking..." : formatCurrency(wallet.balance)} | Max redeem: {formatCurrency(wallet.maxUsable)}
              </p>
              {!wallet.isLoading && wallet.balance <= 0 ? (
                <p className="mt-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">No reward balance available.</p>
              ) : null}
              <p className="mt-2 rounded-2xl bg-blue-50 px-3 py-2 text-xs font-semibold leading-5 text-blue-800">
                You can redeem up to 50% of your wallet balance, limited to 50% of service amount.
              </p>
              <div className="mt-3 grid gap-2">
                <button
                  type="button"
                  disabled={isSubmitting || wallet.isLoading || wallet.maxUsable <= 0}
                  onClick={() => setWalletUseAmount(wallet.maxUsable)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full border bg-white px-4 text-sm font-bold text-blue-700 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  <BadgePercent className="h-4 w-4" />
                  Apply max wallet
                </button>
                <Input
                  type="number"
                  min={0}
                  max={wallet.maxUsable}
                  disabled={isSubmitting || wallet.isLoading || wallet.maxUsable <= 0}
                  value={walletUseAmount}
                  onChange={(event) => {
                    const nextValue = Math.max(0, Math.round(Number(event.target.value || 0)));
                    if (nextValue > wallet.maxUsable) {
                      setWalletUseAmount(wallet.maxUsable);
                      toastError(walletLimitMessage);
                      return;
                    }
                    setWalletUseAmount(nextValue);
                  }}
                  aria-label="DigiWallet amount to use"
                  placeholder="Wallet amount"
                />
              </div>
              {clampedWalletUseAmount > 0 ? (
                <p className="mt-2 text-xs font-bold text-emerald-700">
                  {formatCurrency(clampedWalletUseAmount)} wallet credit applied. Remaining {formatCurrency(realPayableAmount)} must be paid.
                </p>
              ) : null}
              <div className="mt-4 grid gap-2 rounded-2xl bg-slate-50 p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-600">Total Amount</span>
                  <span className="font-bold text-slate-950">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-600">Wallet Redeem</span>
                  <span className="font-bold text-orange-700">-{formatCurrency(clampedWalletUseAmount)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-600">Fresh Payable via Razorpay</span>
                  <span className="font-bold text-blue-700">{formatCurrency(realPayableAmount)}</span>
                </div>
                <div className="flex justify-between gap-3 border-t pt-2">
                  <span className="text-slate-600">Expected Cashback</span>
                  <span className="font-bold text-emerald-700">{formatCurrency(expectedCashback)}</span>
                </div>
                <p className="text-xs font-semibold leading-5 text-slate-500">
                  {hasFirstServiceCashback
                    ? "Get 20% cashback on fresh paid amount after service completion."
                    : "Eligible for 100% cashback after service completion if this is your first paid service."}
                </p>
              </div>
            </div>
          </div>
        </Card>
        </LoadingOverlay>

        <FormSubmitButton type="submit" size="lg" loading={isSubmitting} loadingText={progressText || "Please wait..."} className="sticky bottom-3 mb-4 h-14 w-full rounded-2xl shadow-lg md:static md:mb-0">
          Submit Application
        </FormSubmitButton>
      </div>
      </fieldset>
    </form>
    </>
  );
}
