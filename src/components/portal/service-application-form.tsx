"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CreditCard, FileCheck2, FileUp, IndianRupee, Trash2, WalletCards, Sparkles } from "lucide-react";

import { RazorpayCheckoutButton, type VerifiedRazorpayPayment } from "@/components/payments/razorpay-checkout-button";
import {
  buildEshramDetails,
  createEshramInitialValues,
  EshramApplicationFields,
  getEshramValidationError,
  isEshramComplete,
  type EshramApplicationValues,
  useEshramPincodeAutofill,
} from "@/components/portal/eshram-application-fields";
import {
  buildPmVishwakarmaDetails,
  createPmVishwakarmaInitialValues,
  getPmVishwakarmaValidationError,
  isPmVishwakarmaComplete,
  PmVishwakarmaApplicationFields,
  type PmVishwakarmaApplicationValues,
  usePmVishwakarmaPincodeAutofill,
} from "@/components/portal/pm-vishwakarma-application-fields";
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

export function ServiceApplicationForm({
  service,
  services,
  isProfileIncompleteInitial = false,
  initialProfileFields = { mobile: "", pincode: "", city: "", state: "" },
}: {
  service: ApplicationFormService;
  services?: ApplicationFormService[];
  isProfileIncompleteInitial?: boolean;
  initialProfileFields?: {
    mobile: string;
    pincode: string;
    city: string;
    state: string;
  };
}) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [selectedDocuments, setSelectedDocuments] = useState<File[]>([]);
  const [razorpayPayment, setRazorpayPayment] = useState<VerifiedApplicationPayment | null>(null);
  const [walletUseAmount, setWalletUseAmount] = useState(0);
  const [applicantName, setApplicantName] = useState("");
  const [applicantMobile, setApplicantMobile] = useState(initialProfileFields.mobile || "");
  const [applicantEmail, setApplicantEmail] = useState("");
  const [applicantCity, setApplicantCity] = useState(initialProfileFields.city || "");
  const [applicantAddress, setApplicantAddress] = useState("");
  const [applicantMessage, setApplicantMessage] = useState("");

  const [isProfileIncomplete, setIsProfileIncomplete] = useState(isProfileIncompleteInitial);
  const [completeMobile, setCompleteMobile] = useState(initialProfileFields.mobile || "");
  const [completePincode, setCompletePincode] = useState(initialProfileFields.pincode || "");
  const [completeCity, setCompleteCity] = useState(initialProfileFields.city || "");
  const [completeState, setCompleteState] = useState(initialProfileFields.state || "");
  const [completeDistrict, setCompleteDistrict] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [pmVishwakarmaValues, setPmVishwakarmaValues] = useState(() => createPmVishwakarmaInitialValues());
  const [eshramValues, setEshramValues] = useState(() => createEshramInitialValues());
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
  const isEshram = selectedServices.length === 1 && selectedServices[0]?.slug === "eshram-card-registration";
  const isItrMsmeCombo = selectedServices.length >= 2 && [...comboServiceSlugs].every((slug) => selectedServices.some((item) => item.slug === slug));
  const totalAmount = isItrMsmeCombo ? 699 : selectedServices.reduce((total, item) => total + item.amount, 0);
  const wallet = useWallet(totalAmount);
  const clampedWalletUseAmount = Math.min(walletUseAmount, wallet.maxUsable);
  const realPayableAmount = getRealPayableAmount(totalAmount, clampedWalletUseAmount);
  const walletLimitMessage = "You can redeem up to 50% of your wallet balance, limited to 50% of service amount.";
  const hasFirstServiceCashback = wallet.transactions.some((transaction) => transaction.type === "first_service_cashback");
  const expectedCashback = calculateCashbackForFreshPayment(realPayableAmount, !hasFirstServiceCashback);
  const payableAmountPaise = Math.round(realPayableAmount * 100);
  const receiptPrefix = `digi-${selectedServices[0]?.slug ?? "service"}`;
  const [paymentReceipt, setPaymentReceipt] = useState(receiptPrefix);
  const normalizedApplicationDraft = useMemo(
    () =>
      buildNormalizedApplicationDraft(
        isPmVishwakarma
          ? {
              name: pmVishwakarmaValues.name,
              mobile: pmVishwakarmaValues.mobile,
              email: pmVishwakarmaValues.email,
              city: pmVishwakarmaValues.city,
              address: pmVishwakarmaValues.address,
              message: pmVishwakarmaValues.message,
            }
          : isEshram
            ? {
                name: eshramValues.name,
                mobile: eshramValues.mobile,
                email: eshramValues.email,
                city: eshramValues.city,
                message: eshramValues.message,
              }
          : {
              name: applicantName,
              mobile: applicantMobile,
              email: applicantEmail,
              city: applicantCity,
              address: applicantAddress,
              message: applicantMessage,
            },
      ),
    [applicantAddress, applicantCity, applicantEmail, applicantMessage, applicantMobile, applicantName, eshramValues, isEshram, isPmVishwakarma, pmVishwakarmaValues],
  );
  const serviceDetailsForPayment = useMemo(
    () =>
      isPmVishwakarma
        ? buildPmVishwakarmaDetails(pmVishwakarmaValues)
        : isEshram
          ? buildEshramDetails(eshramValues)
          : normalizedApplicationDraft.details,
    [eshramValues, isEshram, isPmVishwakarma, normalizedApplicationDraft.details, pmVishwakarmaValues],
  );
  const canStartPayment =
    !isSubmitting &&
    !getApplicantValidationError(normalizedApplicationDraft, { emailOptional: isPmVishwakarma || isEshram }) &&
    /^[6-9]\d{9}$/.test(normalizedApplicationDraft.customer.mobile) &&
    (selectedDocuments.length > 0 || isEshram) &&
    (!isPmVishwakarma || isPmVishwakarmaComplete(pmVishwakarmaValues)) &&
    (!isEshram || isEshramComplete(eshramValues));

  useEffect(() => {
    setRazorpayPayment(null);
  }, [payableAmountPaise]);

  useEffect(() => {
    console.info("FORM_COMPONENT_MOUNTED", {
      serviceSlug: selectedServices[0]?.slug ?? service.slug,
    });
    console.info("SUBMIT_HANDLER_ATTACHED", {
      serviceSlug: selectedServices[0]?.slug ?? service.slug,
    });
  }, [selectedServices, service.slug]);

  useEffect(() => {
    setPaymentReceipt(`${receiptPrefix}-${Date.now()}`);
  }, [receiptPrefix]);

  usePmVishwakarmaPincodeAutofill({
    enabled: isPmVishwakarma,
    values: pmVishwakarmaValues,
    setValues: setPmVishwakarmaValues,
    setStatus: setPincodeStatus,
  });

  useEshramPincodeAutofill({
    enabled: isEshram,
    values: eshramValues,
    setValues: setEshramValues,
    setStatus: setPincodeStatus,
  });

  function updatePmVishwakarmaValue<Key extends keyof PmVishwakarmaApplicationValues>(key: Key, value: PmVishwakarmaApplicationValues[Key]) {
    setPmVishwakarmaValues((current) => ({ ...current, [key]: value }));
  }

  function updateEshramValue<Key extends keyof EshramApplicationValues>(key: Key, value: EshramApplicationValues[Key]) {
    setEshramValues((current) => ({ ...current, [key]: value }));
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.info("SUBMIT_CLICKED", {
      selectedDocumentCount: selectedDocuments.length,
      hasVerifiedPayment: Boolean(razorpayPayment),
    });
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

    if (!selectedDocuments.length && !isEshram) {
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
    const submittedPmVishwakarmaValues = createPmVishwakarmaInitialValues({
      name: submittedDraft.customer.name,
      mobile: submittedDraft.customer.mobile,
      email: submittedDraft.customer.email,
      city: submittedDraft.customer.city,
      address: submittedDraft.details.address,
      message: submittedDraft.customer.message,
      pincode: String(formData.get("pincode") ?? "").trim(),
      district: String(formData.get("district") ?? "").trim(),
      state: String(formData.get("state") ?? "").trim(),
      maritalStatus: String(formData.get("maritalStatus") ?? "").trim(),
      casteCategory: String(formData.get("casteCategory") ?? "").trim(),
      tradeWorkType: String(formData.get("tradeWorkType") ?? "").trim(),
      traditionalOccupationCommunity: String(formData.get("traditionalOccupationCommunity") ?? "").trim(),
      migrantWorker: String(formData.get("migrantWorker") ?? "").trim(),
      upResidentFamilyBenefit: String(formData.get("upResidentFamilyBenefit") ?? "").trim(),
      termsAccepted: formData.get("termsAccepted") === "true",
    });
    const submittedEshramValues = createEshramInitialValues({
      name: submittedDraft.customer.name,
      mobile: submittedDraft.customer.mobile,
      email: submittedDraft.customer.email,
      city: submittedDraft.customer.city,
      message: submittedDraft.customer.message,
      pincode: String(formData.get("pincode") ?? "").trim(),
      district: String(formData.get("district") ?? "").trim(),
      state: String(formData.get("state") ?? "").trim(),
      maritalStatus: String(formData.get("maritalStatus") ?? "").trim(),
      workerCategory: String(formData.get("workerCategory") ?? "").trim(),
      primaryOccupation: String(formData.get("primaryOccupation") ?? "").trim(),
      monthlyIncomeRange: String(formData.get("monthlyIncomeRange") ?? "").trim(),
      nomineeName: String(formData.get("nomineeName") ?? "").trim(),
      nomineeRelation: String(formData.get("nomineeRelation") ?? "").trim(),
      nomineeMobile: String(formData.get("nomineeMobile") ?? "").trim(),
      serviceType: String(formData.get("serviceType") ?? "").trim(),
      consentAccepted: formData.get("consentAccepted") === "true",
    });
    const pmVishwakarmaDetails = isPmVishwakarma ? buildPmVishwakarmaDetails(submittedPmVishwakarmaValues) : {};
    const eshramDetails = isEshram ? buildEshramDetails(submittedEshramValues) : {};
    const applicantValidationError = getApplicantValidationError(submittedDraft, { emailOptional: isPmVishwakarma || isEshram });

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

    if (!/^[6-9]\d{9}$/.test(submittedDraft.customer.mobile)) {
      toastError("Enter a valid 10 digit Indian mobile number.");
      return;
    }

    if (isPmVishwakarma) {
      const pmValidationError = getPmVishwakarmaValidationError(submittedPmVishwakarmaValues);
      if (pmValidationError) {
        toastError(pmValidationError);
        return;
      }
    }

    if (isEshram) {
      const eshramValidationError = getEshramValidationError(submittedEshramValues);
      if (eshramValidationError) {
        toastError(eshramValidationError);
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

      console.info("CLIENT_DOCUMENT_COUNT_BEFORE_SUBMIT", {
        count: selectedDocuments.length,
        fileNames: selectedDocuments.map((file) => file.name),
      });

      setProgressText(selectedDocuments.length ? "Uploading documents and saving application..." : "Saving application...");

      const payload = {
        serviceSlug: selectedServices[0]?.slug,
        serviceSlugs: selectedServices.map((item) => item.slug),
        customer: submittedDraft.customer,
        details: {
          ...submittedDraft.details,
          ...pmVishwakarmaDetails,
          ...eshramDetails,
          address: submittedDraft.details.address,
        },
        documents: [],
        razorpayPayment,
        applicationIds: razorpayPayment?.application_ids,
        walletUseAmount: clampedWalletUseAmount,
      };
      const submitFormData = new FormData();
      submitFormData.append("payload", JSON.stringify(payload));
      submitFormData.append(
        "documentTypes",
        JSON.stringify(selectedDocuments.map((_, index) => (index === 0 ? "Aadhaar / Document Proof" : "Additional Document"))),
      );

      for (const file of selectedDocuments) {
        submitFormData.append("documents", file, file.name);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);
      console.info("BEFORE_API_APPLICATIONS_CALL", {
        selectedDocumentCount: selectedDocuments.length,
        hasVerifiedPayment: Boolean(razorpayPayment),
      });
      const response = await fetch("/api/applications", {
        method: "POST",
        body: submitFormData,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      const text = await response.text();
      let result: { success?: boolean; message?: string; error?: string; applicationId?: string; applicationIds?: string[]; invoiceId?: string | null };

      try {
        result = JSON.parse(text) as { success?: boolean; message?: string; error?: string; applicationId?: string; applicationIds?: string[]; invoiceId?: string | null };
      } catch {
        throw new Error(text || "The server did not return a valid response. Please try again.");
      }

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? result.error ?? "Application submission failed.");
      }

      success("Application submitted successfully.");
      trackSubmitApplication();
      trackApplicationSubmit();
      router.push(result.invoiceId ? `/invoice/${result.invoiceId}` : result.applicationId ? `/dashboard/applications/${result.applicationId}` : "/customer/dashboard");
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

  if (isProfileIncomplete) {
    return (
      <Card className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm md:p-6 lg:col-span-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
          <Sparkles className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-slate-900">Complete your profile to continue</h2>
        <p className="mt-2 text-sm text-slate-600">
          Provide your mobile number and address details to continue with your application and secure your rewards.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">Mobile Number</span>
            <Input
              type="tel"
              inputMode="numeric"
              pattern="[6-9][0-9]{9}"
              maxLength={10}
              placeholder="10-digit mobile number"
              value={completeMobile}
              onChange={(e) => setCompleteMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
              required
              className="h-12 bg-white text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">Pincode</span>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="6-digit pincode"
              value={completePincode}
              onChange={(e) => setCompletePincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              className="h-12 bg-white text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">City</span>
            <Input
              type="text"
              placeholder="City Name"
              value={completeCity}
              onChange={(e) => setCompleteCity(e.target.value)}
              required
              className="h-12 bg-white text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">State</span>
            <Input
              type="text"
              placeholder="State Name"
              value={completeState}
              onChange={(e) => setCompleteState(e.target.value)}
              required
              className="h-12 bg-white text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]"
            />
          </label>
          <label className="grid gap-2 sm:col-span-2">
            <span className="text-sm font-semibold text-slate-700">District (Optional)</span>
            <Input
              type="text"
              placeholder="District Name"
              value={completeDistrict}
              onChange={(e) => setCompleteDistrict(e.target.value)}
              className="h-12 bg-white text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]"
            />
          </label>
        </div>

        <button
          type="button"
          disabled={isSavingProfile}
          onClick={async () => {
            if (!/^[6-9]\d{9}$/.test(completeMobile)) {
              toastError("Enter a valid 10-digit Indian mobile number.");
              return;
            }
            if (!/^\d{6}$/.test(completePincode)) {
              toastError("Enter a valid 6-digit PIN code.");
              return;
            }
            if (!completeCity.trim() || !completeState.trim()) {
              toastError("City and state are mandatory fields.");
              return;
            }
            setIsSavingProfile(true);
            try {
              const res = await fetch("/api/customer/complete-profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  mobile: completeMobile,
                  pincode: completePincode,
                  city: completeCity,
                  state: completeState,
                  district: completeDistrict,
                }),
              });
              const data = await res.json();
              if (!res.ok || !data.success) {
                throw new Error(data.error || "Failed to update profile.");
              }
              success("Profile updated successfully! You can now complete your application.");
              setIsProfileIncomplete(false);
              setApplicantMobile(completeMobile);
              setApplicantCity(completeCity);
              setApplicantAddress(completeDistrict ? `${completeDistrict}, ${completeCity}` : completeCity);
            } catch (err) {
              toastError(err instanceof Error ? err.message : "Failed to update profile.");
            } finally {
              setIsSavingProfile(false);
            }
          }}
          className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-slate-950 font-extrabold text-white hover:bg-slate-900 shadow-md transition"
        >
          {isSavingProfile ? "Saving Profile..." : "Save & Continue"}
        </button>
      </Card>
    );
  }

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
            <PmVishwakarmaApplicationFields values={pmVishwakarmaValues} onChange={updatePmVishwakarmaValue} pincodeStatus={pincodeStatus} />
          ) : isEshram ? (
            <EshramApplicationFields values={eshramValues} onChange={updateEshramValue} pincodeStatus={pincodeStatus} />
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

        <div className="mt-5 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/30 p-4 md:p-6 transition duration-200 hover:border-blue-300 hover:bg-blue-50/10">
          <div className="flex items-start gap-3">
            <FileUp className="mt-1 h-5 w-5 text-blue-600" />
            <div className="min-w-0 flex-1">
              <p className="font-extrabold text-slate-950 text-sm md:text-base">{isEshram ? "Upload Supporting Documents (Optional)" : "Upload Aadhaar / Required Documents"}</p>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                {isEshram ? "No Aadhaar upload is mandatory here. Add files only when you want our team to review them." : "Aadhaar document is required. Add additional files only if needed."}
              </p>
              <Input
                name="documents"
                type="file"
                multiple
                required={!selectedDocuments.length && !isEshram}
                accept=".pdf,.jpg,.jpeg,.png"
                className="mt-4 text-xs font-bold"
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
                <div className="mt-4 grid gap-2">
                  {selectedDocuments.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-3.5 py-2.5 text-xs shadow-sm">
                      <span className="flex min-w-0 items-center gap-2 font-bold text-slate-700">
                        <FileCheck2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span className="truncate">{file.name}</span>
                      </span>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => setSelectedDocuments((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-extrabold text-red-600 hover:bg-red-100 transition"
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
        {/* Dynamic Ledger Summary Card */}
        <Card className="rounded-3xl border border-slate-100 bg-white/78 p-4 shadow-sm backdrop-blur-sm md:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-700">
              <IndianRupee className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Order Total</p>
              <p className="text-2xl font-extrabold text-slate-950 leading-tight">{formatCurrency(totalAmount)}</p>
              {clampedWalletUseAmount > 0 ? <p className="mt-1 text-xs font-bold text-blue-700">Net Payable: {formatCurrency(realPayableAmount)}</p> : null}
            </div>
          </div>
        </Card>

        {realPayableAmount > 0 ? (
          <Card className="rounded-3xl border border-orange-100 bg-orange-50/10 p-4 shadow-sm md:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
                <CreditCard className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-slate-950 text-sm">Secure Razorpay Gateway</p>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                  Pay securely by card, UPI, net banking, or wallet. All transactions are monitored and verified directly by Razorpay.
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
                      details: serviceDetailsForPayment,
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
                  <div className="mt-3 flex items-center gap-2 rounded-2xl bg-emerald-50 px-3.5 py-2 text-xs font-extrabold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    Payment verified: {razorpayPayment.razorpay_payment_id}
                  </div>
                ) : null}
                {!canStartPayment ? (
                  <p className="mt-3 rounded-2xl bg-orange-50 border border-orange-100/50 px-3 py-2.5 text-xs font-extrabold text-orange-700 leading-normal">
                    {isPmVishwakarma
                      ? "Fill all required PM Vishwakarma fields, accept terms, and upload documents before payment."
                      : isEshram
                        ? "Fill required e-Shram fields and consent before payment. Document upload is optional."
                        : "Fill name, 10 digit mobile, email, city, and upload Aadhaar before payment."}
                  </p>
                ) : null}
              </div>
            </div>
          </Card>
        ) : null}

        <LoadingOverlay show={wallet.isLoading} label="Checking wallet balance...">
        <Card className="rounded-3xl border border-slate-100 bg-white/78 p-4 shadow-sm backdrop-blur-sm md:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <WalletCards className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-extrabold text-slate-950 text-sm">Redeem Rewards</p>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                Available: {wallet.isLoading ? "Checking..." : formatCurrency(wallet.balance)} | Max usable: {formatCurrency(wallet.maxUsable)}
              </p>
              {!wallet.isLoading && wallet.balance <= 0 ? (
                <p className="mt-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">No reward balance available.</p>
              ) : null}
              
              {/* Wallet Cap Notice Box */}
              <p className="mt-2.5 rounded-2xl bg-blue-50/50 border border-blue-50/80 px-3 py-2 text-xs font-extrabold leading-normal text-blue-700">
                &bull; Wallet Cap Rule: You can redeem up to 50% of the service/order value using your reward wallet credits.
              </p>
              
              <div className="mt-3.5 grid gap-2">
                <button
                  type="button"
                  disabled={isSubmitting || wallet.isLoading || wallet.maxUsable <= 0}
                  onClick={() => setWalletUseAmount(wallet.maxUsable)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-blue-200 bg-blue-50/30 px-4 text-xs font-extrabold text-blue-700 transition hover:bg-blue-600 hover:text-white hover:border-blue-600 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  Apply Max Wallet Discount
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
                  placeholder="Enter custom wallet credit"
                  className="h-10 text-xs font-bold"
                />
              </div>
              {clampedWalletUseAmount > 0 ? (
                <p className="mt-2 text-xs font-extrabold text-emerald-700">
                  {formatCurrency(clampedWalletUseAmount)} reward deduction applied.
                </p>
              ) : null}
              
              {/* Modern Ledger breakdown */}
              <div className="mt-4 grid gap-2.5 rounded-2xl bg-slate-50 border border-slate-100 p-3 text-xs">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500 font-semibold">Service Subtotal</span>
                  <span className="font-extrabold text-slate-800">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500 font-semibold">Rewards Discount</span>
                  <span className="font-extrabold text-orange-600">-{formatCurrency(clampedWalletUseAmount)}</span>
                </div>
                <div className="flex justify-between gap-3 border-t border-slate-200/60 pt-2">
                  <span className="text-slate-600 font-extrabold">Net Payable Amount</span>
                  <span className="font-extrabold text-blue-700 text-sm">{formatCurrency(realPayableAmount)}</span>
                </div>
                <div className="flex justify-between gap-3 border-t border-dashed border-slate-200/60 pt-2">
                  <span className="text-slate-500 font-semibold">Expected Wallet Cashback</span>
                  <span className="font-extrabold text-emerald-600">{formatCurrency(expectedCashback)}</span>
                </div>
                <p className="text-[10px] font-bold leading-relaxed text-slate-400">
                  {hasFirstServiceCashback
                    ? "* Get 20% cashback credited to your reward wallet after completed service verification."
                    : "* Get 100% cashback credited to your reward wallet after service verification (First paid service bonus)."}
                </p>
              </div>
            </div>
          </div>
        </Card>
        </LoadingOverlay>

        <FormSubmitButton type="submit" size="lg" loading={isSubmitting} loadingText={progressText || "Please wait..."} className="sticky bottom-3 mb-4 h-13 w-full rounded-2xl shadow-lg md:static md:mb-0 bg-slate-950 font-extrabold hover:bg-slate-900">
          Submit Application
        </FormSubmitButton>
      </div>
      </fieldset>
    </form>
    </>
  );
}
