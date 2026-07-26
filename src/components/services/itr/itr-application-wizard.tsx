/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, {
  useState, useEffect, useCallback, useMemo,
} from "react";
import Script from "next/script";
import Link from "next/link";
import {
  Check, ArrowLeft, ArrowRight, RefreshCw, CreditCard, AlertTriangle, X, FileText,
} from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { createClient } from "@/lib/supabase/browser";
import { normalizeAgentService, type AgentService } from "@/lib/agent-services";
import { cn } from "@/lib/utils";
import { ITR_SERVICE_SLUG } from "@/lib/itr/constants";
import { DEFAULT_ITR_DOCUMENTS, DEFAULT_ITR_SETTINGS } from "@/lib/itr/defaults";
import {
  classifyItrComplexity,
  resolveItrCatalogPrice,
  requiredItrDocuments,
  type ItrPricingRecommendation,
} from "@/lib/itr/pricing";
import type { ItrDocumentItem } from "@/lib/itr/types";
import {
  ProfileStep,
  PersonalStep,
  IncomeSourcesStep,
  TaxDeductionsStep,
  UploadsStep,
  ReviewStep,
  SuccessStep,
  defaultProfile,
  defaultPersonal,
  defaultIncome,
  defaultTax,
  mapItrDocumentsToRequirements,
  type ItrProfileForm,
  type ItrPersonalForm,
  type ItrIncomeForm,
  type ItrTaxForm,
} from "@/components/services/itr/itr-wizard-steps";

const DRAFT_KEY = "itr_wizard_draft_v1";

const STEPS = [
  { id: 1, label: "Profile" },
  { id: 2, label: "Personal" },
  { id: 3, label: "Income" },
  { id: 4, label: "Tax" },
  { id: 5, label: "Uploads" },
  { id: 6, label: "Review" },
] as const;

type PaymentStage = "ORDER_CREATE" | "RAZORPAY_OPEN" | "PAYMENT_DONE" | "VERIFY" | "FINALIZE";

function payLog(stage: PaymentStage, detail: Record<string, unknown>) {
  console.info(`[ITR:PAY:${stage}]`, detail);
}

export type ItrApplicationWizardProps = {
  initialProfileFields?: { mobile?: string; pincode?: string; city?: string; state?: string };
  assessmentYear?: string;
  customerDeclaration?: string;
  cmsDocuments?: ItrDocumentItem[];
};

interface WizardDraft {
  currentStep: number;
  profile: ItrProfileForm;
  personal: ItrPersonalForm;
  income: ItrIncomeForm;
  tax: ItrTaxForm;
  selectedPlanKey: string;
}

interface SuccessDetails {
  applicationIds: string[];
  customerName: string;
  amountPaid: number;
  isQuoteRequest: boolean;
}

function profileToComplexityInput(profile: ItrProfileForm, income: ItrIncomeForm) {
  const sources = new Set(income.incomeSources.map((s) => s.toLowerCase()));
  return {
    incomeSources: income.incomeSources,
    employerCount: Number(income.employerCount) || 1,
    filingType: profile.filingType,
    hasHouseProperty: sources.has("house_property") || sources.has("rental"),
    hasBusiness: sources.has("business") || sources.has("profession") || sources.has("freelancing"),
    hasCapitalGains: sources.has("shares") || sources.has("mutual_funds") || sources.has("property_cg"),
    hasFno: sources.has("fno") || sources.has("intraday"),
    hasIntraday: sources.has("intraday"),
    hasCrypto: sources.has("crypto"),
    hasForeignIncome: sources.has("foreign_income"),
    hasForeignAssets: sources.has("foreign_assets"),
  };
}

function incomeProfileKey(profile: string): string {
  const map: Record<string, string> = {
    Salaried: "salaried",
    Pensioner: "pensioner",
    Business: "business",
    Professional: "professional",
    Freelancer: "freelancer",
    Investor: "investor",
    "Property owner": "property_owner",
    "Mixed income": "mixed",
  };
  return map[profile] ?? profile.toLowerCase().replace(/\s+/g, "_");
}

function buildDetailsPayload(
  profile: ItrProfileForm,
  personal: ItrPersonalForm,
  income: ItrIncomeForm,
  tax: ItrTaxForm,
  selectedPlanKey: string,
  recommendation: ItrPricingRecommendation,
) {
  const selectedPlan = {
    planKey: selectedPlanKey,
    price: resolveItrCatalogPrice(selectedPlanKey),
  };

  return {
    address: personal.address,
    pincode: personal.pincode,
    state: personal.state,
    district: personal.district || personal.city,
    selectedPlan: selectedPlanKey,
    itr: {
      profile,
      personal: {
        fatherName: personal.fatherName,
        dob: personal.dob,
        gender: personal.gender,
        pan: personal.pan,
        aadhaar: personal.aadhaar,
        email: personal.email,
        city: personal.city,
        bankAccount: personal.bankAccount,
        ifsc: personal.ifsc,
        accountType: personal.accountType,
        bankName: personal.bankName,
      },
      income,
      tax,
      selectedPlan,
      recommendation,
      assessmentYear: profile.assessmentYear,
    },
  };
}

export function ItrApplicationWizard({
  initialProfileFields,
  assessmentYear = DEFAULT_ITR_SETTINGS.assessmentYear,
  customerDeclaration = DEFAULT_ITR_SETTINGS.customerDeclaration ?? "I confirm the information provided is true and complete.",
  cmsDocuments,
}: ItrApplicationWizardProps) {
  const { success: toastSuccess, error: toastError } = useToast();

  const documentCatalog = useMemo(
    () => (cmsDocuments?.length ? cmsDocuments : DEFAULT_ITR_DOCUMENTS),
    [cmsDocuments],
  );

  const [currentStep, setCurrentStep] = useState(1);
  const [profile, setProfile] = useState<ItrProfileForm>(() => defaultProfile(assessmentYear));
  const [personal, setPersonal] = useState<ItrPersonalForm>(() => defaultPersonal(initialProfileFields));
  const [income, setIncome] = useState<ItrIncomeForm>(defaultIncome);
  const [tax, setTax] = useState<ItrTaxForm>(defaultTax);
  const [selectedPlanKey, setSelectedPlanKey] = useState("basic");

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);

  const [docFiles, setDocFiles] = useState<Record<string, File | null>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string | null>>({});

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [declarationAccepted, setDeclarationAccepted] = useState(false);

  const [dbService, setDbService] = useState<AgentService | null>(null);
  const [loadingService, setLoadingService] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScriptReady, setIsScriptReady] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [successDetails, setSuccessDetails] = useState<SuccessDetails | null>(null);

  const recommendation = useMemo(
    () => classifyItrComplexity(profileToComplexityInput(profile, income)),
    [profile, income],
  );

  const requiredDocuments = useMemo(() => {
    const filtered = requiredItrDocuments({
      incomeSources: income.incomeSources,
      profile: incomeProfileKey(profile.incomeProfile),
      documents: documentCatalog,
    });
    const keys = new Set(filtered.map((d) => d.documentKey));
    const fullDocs = documentCatalog.filter((d) => keys.has(d.documentKey));
    return mapItrDocumentsToRequirements(fullDocs);
  }, [income.incomeSources, profile.incomeProfile, documentCatalog]);

  const catalogPrice = useMemo(
    () => resolveItrCatalogPrice(selectedPlanKey),
    [selectedPlanKey],
  );

  const isCustomQuote = resolveItrCatalogPrice(selectedPlanKey) === 0;

  // Sync assessment year prop
  useEffect(() => {
    setProfile((p) => ({ ...p, assessmentYear }));
  }, [assessmentYear]);

  // Auto-select recommended plan when income/profile changes
  useEffect(() => {
    setSelectedPlanKey(recommendation.recommendedPlanKey);
  }, [recommendation.recommendedPlanKey]);

  // Layout height vars
  useEffect(() => {
    const update = () => {
      const header = document.querySelector(".site-header");
      const stepper = document.querySelector(".wizard-stepper");
      const bottomNav = document.querySelector(".bottom-nav-container");
      const stickyActions = document.querySelector(".wizard-sticky-actions");
      const root = document.documentElement;
      root.style.setProperty("--site-header-height", `${header ? header.getBoundingClientRect().height : 0}px`);
      root.style.setProperty("--stepper-height", `${stepper ? stepper.getBoundingClientRect().height : 0}px`);
      root.style.setProperty("--bottom-nav-height", `${bottomNav && window.getComputedStyle(bottomNav).display !== "none" ? bottomNav.getBoundingClientRect().height : 0}px`);
      root.style.setProperty("--sticky-action-bar-height", `${stickyActions ? stickyActions.getBoundingClientRect().height : 0}px`);
    };
    update();
    const observer = new ResizeObserver(update);
    ["site-header", "wizard-stepper", "bottom-nav-container", "wizard-sticky-actions"].forEach((cls) => {
      const el = document.querySelector(`.${cls}`);
      if (el) observer.observe(el);
    });
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [currentStep, successDetails]);

  // Load agent service
  useEffect(() => {
    (async () => {
      try {
        const sb = createClient();
        if (!sb) throw new Error("No client");
        const { data, error } = await sb
          .from("agent_services")
          .select("*")
          .eq("slug", ITR_SERVICE_SLUG)
          .eq("is_active", true)
          .maybeSingle();
        if (!error && data) {
          setDbService(normalizeAgentService(data));
        }
      } catch (e) {
        console.warn("[ITR wizard] service load fallback", e);
      } finally {
        setLoadingService(false);
      }
    })();
  }, []);

  // Razorpay script readiness
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).Razorpay) {
      setIsScriptReady(true);
      return;
    }
    const interval = setInterval(() => {
      if ((window as any).Razorpay) {
        setIsScriptReady(true);
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Restore draft
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as WizardDraft;
      if (draft.profile) setProfile((p) => ({ ...p, ...draft.profile, assessmentYear: draft.profile.assessmentYear || p.assessmentYear }));
      if (draft.personal) setPersonal((p) => ({ ...p, ...draft.personal, mobile: draft.personal.mobile || p.mobile }));
      if (draft.income) setIncome(draft.income);
      if (draft.tax) setTax(draft.tax);
      if (draft.selectedPlanKey) setSelectedPlanKey(draft.selectedPlanKey);
      if (draft.currentStep) setCurrentStep(Math.min(Math.max(draft.currentStep, 1), 6));
    } catch { /* ignore */ }
  }, []);

  // Auto-save draft
  useEffect(() => {
    const t = setTimeout(() => {
      const draft: WizardDraft = {
        currentStep,
        profile,
        personal,
        income,
        tax,
        selectedPlanKey,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setAutoSaved(true);
      setTimeout(() => setAutoSaved(false), 2000);
    }, 1500);
    return () => clearTimeout(t);
  }, [currentStep, profile, personal, income, tax, selectedPlanKey]);

  const handlePincodeChange = useCallback(async (pincode: string) => {
    setPersonal((p) => ({ ...p, pincode }));
    if (!/^\d{6}$/.test(pincode)) return;
    setPincodeLoading(true);
    try {
      const r = await fetch(`/api/pincode?pincode=${pincode}`);
      const d = await r.json();
      if (d?.state || d?.district) {
        setPersonal((p) => ({
          ...p,
          state: d.state ?? p.state,
          district: d.district ?? d.city ?? p.district,
          city: d.city ?? d.district ?? p.city,
        }));
      }
    } catch { /* silent */ } finally {
      setPincodeLoading(false);
    }
  }, []);

  const toggleIncomeSource = useCallback((id: string) => {
    setIncome((prev) => {
      const set = new Set(prev.incomeSources);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...prev, incomeSources: Array.from(set) };
    });
  }, []);

  const validateStep = useCallback((step: number): boolean => {
    const e: Record<string, string> = {};

    if (step === 1) {
      if (!profile.assessmentYear.trim()) e.assessmentYear = "Assessment year is required.";
      if (!profile.applicantType) e.applicantType = "Select applicant type.";
      if (!profile.incomeProfile) e.incomeProfile = "Select income profile.";
      if (!profile.residentialStatus) e.residentialStatus = "Select residential status.";
      if (!profile.filingType) e.filingType = "Select filing type.";
      if (!profile.previousReturnFiled) e.previousReturnFiled = "Required.";
    }

    if (step === 2) {
      if (!personal.name.trim()) e.name = "Full name is required.";
      if (!personal.fatherName.trim()) e.fatherName = "Father's name is required.";
      if (!personal.dob) e.dob = "Date of birth is required.";
      if (!personal.gender) e.gender = "Select gender.";
      if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(personal.pan)) e.pan = "Enter valid PAN.";
      if (!/^\d{12}$/.test(personal.aadhaar)) e.aadhaar = "Enter valid 12-digit Aadhaar.";
      if (!/^[6-9]\d{9}$/.test(personal.mobile)) e.mobile = "Enter valid 10-digit mobile.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personal.email)) e.email = "Enter valid email.";
      if (!personal.address.trim()) e.address = "Address is required.";
      if (!/^\d{6}$/.test(personal.pincode)) e.pincode = "Enter valid pincode.";
      if (!personal.city.trim()) e.city = "City is required.";
      if (!personal.district.trim()) e.district = "District is required.";
      if (!personal.state.trim()) e.state = "State is required.";
      if (!personal.bankAccount.trim()) e.bankAccount = "Bank account is required.";
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(personal.ifsc)) e.ifsc = "Enter valid IFSC.";
      if (!personal.accountType) e.accountType = "Select account type.";
      if (!personal.bankName.trim()) e.bankName = "Bank name is required.";
    }

    if (step === 3) {
      if (!income.incomeSources.length) e.incomeSources = "Select at least one income source.";
    }

    if (step === 6) {
      if (!termsAccepted) e.terms = "Accept terms to continue.";
      if (!declarationAccepted) e.declaration = "Accept declaration to continue.";
    }

    setValidationErrors(e);
    return Object.keys(e).length === 0;
  }, [profile, personal, income.incomeSources, termsAccepted, declarationAccepted]);

  const handleFileSelect = useCallback((slotId: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setUploadErrors((p) => ({ ...p, [slotId]: "File exceeds 5 MB limit." }));
      setUploadProgress((p) => ({ ...p, [slotId]: 0 }));
      setDocFiles((p) => ({ ...p, [slotId]: null }));
      return;
    }
    setUploadErrors((p) => ({ ...p, [slotId]: null }));
    setUploadProgress((p) => ({ ...p, [slotId]: 0 }));
    let pct = 0;
    const iv = setInterval(() => {
      pct = Math.min(pct + 25, 100);
      setUploadProgress((p) => ({ ...p, [slotId]: pct }));
      if (pct >= 100) {
        clearInterval(iv);
        setDocFiles((p) => ({ ...p, [slotId]: file }));
      }
    }, 80);
  }, []);

  const handleFinalSubmit = useCallback(async (
    razorpayDetails?: Record<string, unknown> | null,
    applicationIds?: string[],
    quoteRequest = false,
  ) => {
    setIsSubmitting(true);
    try {
      const details = buildDetailsPayload(profile, personal, income, tax, selectedPlanKey, recommendation);

      const payload: Record<string, unknown> = {
        serviceSlugs: [ITR_SERVICE_SLUG],
        serviceSlug: ITR_SERVICE_SLUG,
        customer: {
          name: personal.name,
          mobile: personal.mobile,
          email: personal.email,
          city: personal.city || personal.district || personal.state,
          message: `ITR filing — ${profile.assessmentYear} — ${profile.incomeProfile}`,
        },
        details: {
          ...details,
          paymentMethod: quoteRequest ? "quote_request" : razorpayDetails ? "razorpay" : "pending",
        },
        walletUseAmount: 0,
        razorpayPayment: razorpayDetails ?? null,
        isDraft: quoteRequest,
        status: quoteRequest ? "submitted" : "submitted",
      };
      if (applicationIds?.length) payload.applicationIds = applicationIds;

      const fd = new FormData();
      fd.append("payload", JSON.stringify(payload));

      const docLabels: string[] = [];
      for (const doc of requiredDocuments) {
        const file = docFiles[doc.id];
        if (file) {
          docLabels.push(doc.name);
          fd.append(doc.id, file, file.name);
        }
      }
      fd.append("documentTypes", JSON.stringify(docLabels));

      const res = await fetch("/api/applications", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message ?? data.error ?? "Submission failed.");

      localStorage.removeItem(DRAFT_KEY);

      const paidAmount = quoteRequest ? 0 : (dbService?.customer_fee ?? catalogPrice);

      setSuccessDetails({
        applicationIds: data.applicationIds ?? (data.applicationId ? [data.applicationId] : []),
        customerName: personal.name,
        amountPaid: paidAmount,
        isQuoteRequest: quoteRequest,
      });
      toastSuccess?.(quoteRequest ? "ITR quote request submitted!" : "ITR application submitted!");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  }, [profile, personal, income, tax, selectedPlanKey, recommendation, requiredDocuments, docFiles, catalogPrice, dbService, toastSuccess, toastError]);

  const triggerRazorpayCheckout = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
      const msg = "Razorpay key is not configured. Contact support.";
      setPaymentError(msg);
      toastError(msg);
      return;
    }
    setIsSubmitting(true);
    setPaymentError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const details = buildDetailsPayload(profile, personal, income, tax, selectedPlanKey, recommendation);

      payLog("ORDER_CREATE", { slug: ITR_SERVICE_SLUG, stage: "START", selectedPlan: selectedPlanKey });

      const orderRes = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceSlugs: [ITR_SERVICE_SLUG],
          currency: "INR",
          receipt: `itr-${Date.now()}`,
          applicationDraft: {
            customer: {
              name: personal.name,
              mobile: personal.mobile,
              email: personal.email,
              city: personal.city || personal.district || personal.state,
            },
            details,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const orderData = await orderRes.json();
      payLog("ORDER_CREATE", {
        status: orderRes.status,
        orderId: orderData.order_id,
        amount: orderData.amount,
        appIds: orderData.application_ids,
      });

      if (orderData.servicePrice === 0 && !orderData.order_id) {
        await handleFinalSubmit(null, orderData.application_ids as string[] | undefined, true);
        return;
      }

      if (!orderRes.ok || !orderData.order_id) {
        throw new Error(orderData.error ?? orderData.message ?? `Order creation failed (HTTP ${orderRes.status})`);
      }

      const reviewTotal = catalogPrice;
      const backendTotal = Number(orderData.servicePrice);
      const razorpayAmount = Number(orderData.amount) / 100;

      if (reviewTotal > 0 && (reviewTotal !== backendTotal || backendTotal !== razorpayAmount)) {
        console.error("[ITR:PAY:MISMATCH]", { reviewTotal, backendTotal, razorpayAmount });
        throw new Error("Payment amount mismatch detected. Please refresh and try again.");
      }

      payLog("RAZORPAY_OPEN", { orderId: orderData.order_id, amountINR: razorpayAmount });

      const rzp = new (window as any).Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency ?? "INR",
        name: "DigiConnect Dukan",
        description: "Income Tax Return Filing",
        order_id: orderData.order_id,
        prefill: { name: personal.name, contact: personal.mobile, email: personal.email || undefined },
        theme: { color: "#2563eb" },
        handler: async (payRes: Record<string, unknown>) => {
          payLog("PAYMENT_DONE", { paymentId: payRes.razorpay_payment_id });
          try {
            const verRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...payRes,
                application_id: orderData.application_id,
                application_ids: orderData.application_ids,
              }),
            });
            const verData = await verRes.json();
            if (!verRes.ok || !verData.success) {
              throw new Error(verData.error ?? verData.message ?? "Verification failed.");
            }
            payLog("FINALIZE", { applicationIds: orderData.application_ids });
            await handleFinalSubmit(
              { ...payRes, amount_paise: orderData.amount },
              orderData.application_ids as string[],
            );
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Verification failed.";
            setPaymentError(msg);
            toastError(msg);
            setIsSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => {
            toastError("Payment cancelled.");
            setIsSubmitting(false);
          },
        },
      });
      rzp.open();
    } catch (e: any) {
      clearTimeout(timeoutId);
      const errMsg = e.name === "AbortError"
        ? "Order creation timed out. Check your connection and try again."
        : e instanceof Error ? e.message : String(e);
      setPaymentError(errMsg);
      toastError(errMsg);
      setIsSubmitting(false);
    }
  }, [profile, personal, income, tax, selectedPlanKey, recommendation, catalogPrice, handleFinalSubmit, toastError]);

  const handleQuoteSubmit = useCallback(async () => {
    if (!validateStep(6)) {
      toastError("Please accept terms and declaration.");
      return;
    }
    await handleFinalSubmit(null, undefined, true);
  }, [validateStep, handleFinalSubmit, toastError]);

  const handleNext = useCallback(() => {
    if (isSubmitting) return;
    if (currentStep < 6) {
      if (!validateStep(currentStep)) {
        toastError("Please fix the form errors.");
        return;
      }
      setCurrentStep((s) => s + 1);
    } else if (isCustomQuote) {
      handleQuoteSubmit();
    } else {
      if (!validateStep(6)) {
        toastError("Please accept terms and declaration.");
        return;
      }
      triggerRazorpayCheckout();
    }
  }, [currentStep, validateStep, triggerRazorpayCheckout, handleQuoteSubmit, toastError, isSubmitting, isCustomQuote]);

  const handlePrev = useCallback(() => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  }, [currentStep]);

  const assessmentYearOptions = useMemo(
    () => [assessmentYear, "AY 2025-26 (FY 2024-25)"].filter((v, i, a) => a.indexOf(v) === i),
    [assessmentYear],
  );

  if (successDetails) {
    return (
      <div className="max-w-4xl mx-auto w-full px-0 sm:px-4 py-0 sm:py-4">
        <div className="w-full bg-white sm:bg-white/80 sm:backdrop-blur-md border-0 sm:border border-slate-200 sm:rounded-2xl sm:shadow-xs overflow-hidden">
          <SuccessStep
            applicationIds={successDetails.applicationIds}
            customerName={successDetails.customerName}
            amountPaid={successDetails.amountPaid}
            isQuoteRequest={successDetails.isQuoteRequest}
          />
          <div className="px-6 pb-8 flex gap-4">
            <Link
              href="/customer/dashboard"
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl text-xs text-center transition active:scale-95"
            >
              Go to Dashboard
            </Link>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl text-xs transition active:scale-95"
            >
              + Apply Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setIsScriptReady(true)}
      />

      {autoSaved && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900/95 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg pointer-events-none">
          <Check className="h-3 w-3 text-emerald-400" /> Draft saved
        </div>
      )}

      <div className="w-full">
        <div className="max-w-4xl mx-auto w-full px-0 sm:px-4 py-0 sm:py-4 space-y-0 sm:space-y-4">
          <div className="wizard-stepper sticky top-[calc(var(--site-header-height,0px)+env(safe-area-inset-top))] z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/60 sm:border sm:rounded-2xl p-3 flex flex-col items-center w-full shadow-xs">
            <div className="relative flex items-center justify-between w-full max-w-lg">
              <div className="absolute left-4 right-4 top-[14px] sm:top-4 h-[2px] bg-slate-100 z-0">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-blue-600 transition-all duration-500"
                  style={{ width: `${((Math.min(currentStep, 6) - 1) / 5) * 100}%` }}
                />
              </div>
              {STEPS.map((step) => {
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;
                return (
                  <div key={step.id} className="relative z-10 flex flex-col items-center flex-1">
                    <button
                      type="button"
                      onClick={() => { if (step.id < currentStep) setCurrentStep(step.id); }}
                      disabled={step.id >= currentStep}
                      className={cn(
                        "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-black transition-all",
                        isCompleted
                          ? "bg-emerald-500 text-white shadow-sm cursor-pointer"
                          : isActive
                            ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md scale-110"
                            : "bg-white text-slate-400 border-2 border-slate-200 cursor-not-allowed",
                      )}
                    >
                      {isCompleted ? <Check className="h-4 w-4 stroke-[3]" /> : step.id}
                    </button>
                    <span
                      className={cn(
                        "text-[8px] xs:text-[9px] sm:text-[10px] font-bold mt-1.5 text-center leading-tight max-w-[52px] break-words",
                        isActive ? "text-blue-600 font-black" : isCompleted ? "text-slate-700" : "text-slate-450",
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="w-full bg-white sm:bg-white/80 sm:backdrop-blur-md border-0 sm:border border-slate-200 sm:rounded-2xl sm:shadow-xs overflow-hidden">
            {currentStep === 1 && (
              <ProfileStep
                values={profile}
                errors={validationErrors}
                assessmentYearOptions={assessmentYearOptions}
                onChange={(patch) => setProfile((p) => ({ ...p, ...patch }))}
              />
            )}
            {currentStep === 2 && (
              <PersonalStep
                values={personal}
                errors={validationErrors}
                pincodeLoading={pincodeLoading}
                onChange={(patch) => setPersonal((p) => ({ ...p, ...patch }))}
                onPincodeChange={handlePincodeChange}
              />
            )}
            {currentStep === 3 && (
              <IncomeSourcesStep
                values={income}
                errors={validationErrors}
                onChange={(patch) => setIncome((p) => ({ ...p, ...patch }))}
                onToggleSource={toggleIncomeSource}
              />
            )}
            {currentStep === 4 && (
              <TaxDeductionsStep
                values={tax}
                onChange={(patch) => setTax((p) => ({ ...p, ...patch }))}
              />
            )}
            {currentStep === 5 && (
              <UploadsStep
                documents={requiredDocuments}
                docFiles={docFiles}
                uploadProgress={uploadProgress}
                uploadErrors={uploadErrors}
                onFileSelect={handleFileSelect}
                onRemove={(id) => {
                  setDocFiles((p) => ({ ...p, [id]: null }));
                  setUploadProgress((p) => ({ ...p, [id]: 0 }));
                  setUploadErrors((p) => ({ ...p, [id]: null }));
                }}
              />
            )}
            {currentStep === 6 && (
              <ReviewStep
                profile={profile}
                personal={personal}
                income={income}
                documents={requiredDocuments}
                docFiles={docFiles}
                recommendation={recommendation}
                selectedPlanKey={selectedPlanKey}
                catalogPrice={catalogPrice}
                customerDeclaration={customerDeclaration}
                termsAccepted={termsAccepted}
                declarationAccepted={declarationAccepted}
                onTermsChange={setTermsAccepted}
                onDeclarationChange={setDeclarationAccepted}
                onPlanChange={setSelectedPlanKey}
                isCustomQuote={isCustomQuote}
                isScriptReady={isScriptReady}
              />
            )}
          </div>
        </div>
      </div>

      <div
        className="wizard-sticky-actions fixed bottom-0 left-0 right-0 z-40 bg-white/70 backdrop-blur-xl border-t border-slate-200/50 px-4 py-3 flex items-center gap-3"
        style={{
          boxShadow: "0 -8px 30px rgba(15, 23, 42, 0.05)",
          paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
        }}
      >
        {currentStep > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-slate-900 px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition disabled:opacity-40 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        )}

        <button
          type="button"
          onClick={handleNext}
          disabled={isSubmitting || (currentStep === 6 && !isCustomQuote && !isScriptReady)}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 text-sm font-bold py-3.5 rounded-xl transition active:scale-[0.98]",
            currentStep === 6
              ? isCustomQuote
                ? "bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-500/10"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/10"
              : "bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-900/10",
            (isSubmitting || (currentStep === 6 && !isCustomQuote && !isScriptReady)) && "opacity-60 cursor-not-allowed",
          )}
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              {currentStep === 6 ? "Processing…" : "Please wait…"}
            </>
          ) : currentStep === 6 ? (
            isCustomQuote ? (
              <>
                <FileText className="h-4 w-4" />
                Request Quote — Submit Application
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                Pay ₹{loadingService ? "…" : catalogPrice} with Razorpay
              </>
            )
          ) : (
            <>Continue <ArrowRight className="h-4 w-4" /></>
          )}
        </button>
      </div>

      {paymentError && currentStep === 6 && !isCustomQuote && (
        <div className="fixed bottom-20 left-4 right-4 z-50 bg-red-600 text-white rounded-2xl px-4 py-3 flex items-start gap-3 shadow-xl">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black">Payment Error</p>
            <p className="text-[11px] font-medium mt-0.5 leading-snug">{paymentError}</p>
          </div>
          <button type="button" onClick={() => setPaymentError(null)} className="shrink-0 p-1 hover:bg-white/20 rounded-lg">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </>
  );
}
