/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, {
  useState, useEffect, useCallback, useMemo,
} from "react";
import { useSearchParams } from "next/navigation";
import Script from "next/script";
import Link from "next/link";
import {
  Check, ArrowLeft, ArrowRight, RefreshCw, CreditCard, AlertTriangle, X,
} from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { createClient } from "@/lib/supabase/browser";
import { normalizeAgentService, type AgentService } from "@/lib/agent-services";
import { cn } from "@/lib/utils";
import {
  DPR_SERVICE_SLUG,
  DPR_LAUNCH_PRICE,
} from "@/lib/dpr/constants";
import { getDynamicServiceConfig } from "@/lib/services-config";
import type { PlanSchema } from "@/lib/services-config";
import {
  PersonalStep,
  BusinessStep,
  ProjectStep,
  MachineryStep,
  UploadsStep,
  ReviewStep,
  SuccessStep,
  createMachineryRow,
  computeMarginPercent,
  type DprPersonalForm,
  type DprBusinessForm,
  type DprProjectForm,
  type MachineryRow,
} from "@/components/services/dpr/dpr-wizard-steps";

const DRAFT_KEY = "dpr_wizard_draft_v1";

const STEPS = [
  { id: 1, label: "Personal" },
  { id: 2, label: "Business" },
  { id: 3, label: "Project" },
  { id: 4, label: "Machinery" },
  { id: 5, label: "Uploads" },
  { id: 6, label: "Review" },
] as const;

type PaymentStage = "ORDER_CREATE" | "RAZORPAY_OPEN" | "PAYMENT_DONE" | "VERIFY" | "FINALIZE";

function payLog(stage: PaymentStage, detail: Record<string, unknown>) {
  console.info(`[DPR:PAY:${stage}]`, detail);
}

export type DprApplicationWizardProps = {
  initialProfileFields?: { mobile?: string; pincode?: string; city?: string; state?: string };
};

interface WizardDraft {
  currentStep: number;
  personal: DprPersonalForm;
  business: DprBusinessForm;
  project: DprProjectForm;
  machinery: MachineryRow[];
  selectedPlanId: string;
  marginManual: boolean;
}

interface SuccessDetails {
  applicationIds: string[];
  customerName: string;
  amountPaid: number;
}

function defaultPersonal(initial?: DprApplicationWizardProps["initialProfileFields"]): DprPersonalForm {
  return {
    name: "",
    mobile: initial?.mobile ?? "",
    altMobile: "",
    email: "",
    pincode: initial?.pincode ?? "",
    state: initial?.state ?? "",
    district: initial?.city ?? "",
    address: "",
  };
}

function defaultBusiness(): DprBusinessForm {
  return {
    businessName: "",
    businessType: "",
    businessAddress: "",
    gstin: "",
    udyam: "",
  };
}

function defaultProject(): DprProjectForm {
  return {
    scheme: "",
    projectCost: "",
    ownContribution: "",
    loanAmount: "",
    expectedSubsidy: "",
    annualSales: "",
    annualProfit: "",
    tenureYears: "",
    marginPercent: "",
  };
}

function buildDetailsPayload(
  personal: DprPersonalForm,
  business: DprBusinessForm,
  project: DprProjectForm,
  machinery: MachineryRow[],
  selectedPlan: PlanSchema | null,
) {
  return {
    address: personal.address,
    pincode: personal.pincode,
    state: personal.state,
    district: personal.district,
    altMobile: personal.altMobile,
    selectedPlan: selectedPlan?.name ?? selectedPlan?.id ?? "",
    dpr: {
      personal: {
        email: personal.email,
      },
      business,
      project,
      machinery: machinery.map((row) => ({
        itemName: row.itemName,
        qty: Number(row.qty) || 0,
        unitCost: Number(row.unitCost) || 0,
        total: (Number(row.qty) || 0) * (Number(row.unitCost) || 0),
      })),
      plan: selectedPlan
        ? { id: selectedPlan.id, name: selectedPlan.name, price: selectedPlan.price }
        : null,
    },
  };
}

export function DprApplicationWizard({ initialProfileFields }: DprApplicationWizardProps) {
  const searchParams = useSearchParams();
  const { success: toastSuccess, error: toastError } = useToast();

  const serviceConfig = useMemo(() => getDynamicServiceConfig(DPR_SERVICE_SLUG, "loans"), []);
  const documents = serviceConfig.documents;
  const plans = useMemo(() => serviceConfig.plans ?? [], [serviceConfig.plans]);

  const planFromUrl = searchParams?.get("plan")?.toLowerCase() ?? "";
  const initialPlanId = plans.find((p) => p.id === planFromUrl)?.id ?? plans[0]?.id ?? "basic";

  const [currentStep, setCurrentStep] = useState(1);
  const [personal, setPersonal] = useState<DprPersonalForm>(() => defaultPersonal(initialProfileFields));
  const [business, setBusiness] = useState<DprBusinessForm>(defaultBusiness);
  const [project, setProject] = useState<DprProjectForm>(defaultProject);
  const [machinery, setMachinery] = useState<MachineryRow[]>([createMachineryRow()]);
  const [selectedPlanId, setSelectedPlanId] = useState(initialPlanId);
  const [marginManual, setMarginManual] = useState(false);

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);

  const [docFiles, setDocFiles] = useState<Record<string, File | null>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string | null>>({});

  const [dbService, setDbService] = useState<AgentService | null>(null);
  const [loadingService, setLoadingService] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScriptReady, setIsScriptReady] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [successDetails, setSuccessDetails] = useState<SuccessDetails | null>(null);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  );

  const servicePrice = dbService?.customer_fee ?? DPR_LAUNCH_PRICE;

  // Layout height vars (match customer wizard)
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

  // Load agent service price
  useEffect(() => {
    (async () => {
      try {
        const sb = createClient();
        if (!sb) throw new Error("No client");
        const { data, error } = await sb
          .from("agent_services")
          .select("*")
          .eq("slug", DPR_SERVICE_SLUG)
          .eq("is_active", true)
          .maybeSingle();
        if (!error && data) {
          setDbService(normalizeAgentService(data));
        }
      } catch (e) {
        console.warn("[DPR wizard] service load fallback", e);
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
      if (draft.personal) setPersonal((p) => ({ ...p, ...draft.personal, mobile: draft.personal.mobile || p.mobile }));
      if (draft.business) setBusiness(draft.business);
      if (draft.project) setProject(draft.project);
      if (draft.machinery?.length) setMachinery(draft.machinery);
      if (draft.selectedPlanId) setSelectedPlanId(draft.selectedPlanId);
      if (draft.currentStep) setCurrentStep(Math.min(Math.max(draft.currentStep, 1), 6));
      if (draft.marginManual) setMarginManual(true);
    } catch { /* ignore */ }
  }, []);

  // Auto-save draft (form data only — files excluded)
  useEffect(() => {
    const t = setTimeout(() => {
      const draft: WizardDraft = {
        currentStep,
        personal,
        business,
        project,
        machinery,
        selectedPlanId,
        marginManual,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setAutoSaved(true);
      setTimeout(() => setAutoSaved(false), 2000);
    }, 1500);
    return () => clearTimeout(t);
  }, [currentStep, personal, business, project, machinery, selectedPlanId, marginManual]);

  // Auto-compute margin %
  useEffect(() => {
    if (marginManual) return;
    const computed = computeMarginPercent(project.projectCost, project.ownContribution);
    if (computed !== project.marginPercent) {
      setProject((p) => ({ ...p, marginPercent: computed }));
    }
  }, [project.projectCost, project.ownContribution, marginManual, project.marginPercent]);

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
        }));
      }
    } catch { /* silent */ } finally {
      setPincodeLoading(false);
    }
  }, []);

  const validateStep = useCallback((step: number): boolean => {
    const e: Record<string, string> = {};

    if (step === 1) {
      if (!personal.name.trim()) e.name = "Full name is required.";
      if (!/^[6-9]\d{9}$/.test(personal.mobile)) e.mobile = "Enter valid 10-digit mobile.";
      if (personal.altMobile && !/^[6-9]\d{9}$/.test(personal.altMobile)) e.altMobile = "Enter valid alternate mobile.";
      if (personal.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personal.email)) e.email = "Enter valid email.";
      if (!/^\d{6}$/.test(personal.pincode)) e.pincode = "Enter valid 6-digit pincode.";
      if (!personal.state.trim()) e.state = "State is required.";
      if (!personal.district.trim()) e.district = "City / District is required.";
      if (!personal.address.trim()) e.address = "Address is required.";
    }

    if (step === 2) {
      if (!business.businessName.trim()) e.businessName = "Business name is required.";
      if (!business.businessType) e.businessType = "Select constitution.";
      if (!business.businessAddress.trim()) e.businessAddress = "Business address is required.";
    }

    if (step === 3) {
      if (!project.scheme) e.scheme = "Select target scheme.";
      if (!project.projectCost || Number(project.projectCost) <= 0) e.projectCost = "Enter project cost.";
      if (!project.ownContribution || Number(project.ownContribution) < 0) e.ownContribution = "Enter own contribution.";
      if (!project.loanAmount || Number(project.loanAmount) <= 0) e.loanAmount = "Enter loan amount.";
      if (!project.annualSales || Number(project.annualSales) <= 0) e.annualSales = "Enter expected annual sales.";
      if (!project.annualProfit || Number(project.annualProfit) < 0) e.annualProfit = "Enter expected annual profit.";
      if (!project.tenureYears || Number(project.tenureYears) <= 0) e.tenureYears = "Enter loan tenure.";
    }

    setValidationErrors(e);
    return Object.keys(e).length === 0;
  }, [personal, business, project]);

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
  ) => {
    setIsSubmitting(true);
    try {
      const details = buildDetailsPayload(personal, business, project, machinery, selectedPlan);

      const payload: Record<string, unknown> = {
        serviceSlugs: [DPR_SERVICE_SLUG],
        serviceSlug: DPR_SERVICE_SLUG,
        customer: {
          name: personal.name,
          mobile: personal.mobile,
          email: personal.email,
          city: personal.district || personal.state,
          message: `DPR application — ${project.scheme}`,
        },
        details: {
          ...details,
          paymentMethod: razorpayDetails ? "razorpay" : "cash",
        },
        walletUseAmount: 0,
        razorpayPayment: razorpayDetails ?? null,
        isDraft: false,
        status: "submitted",
      };
      if (applicationIds?.length) payload.applicationIds = applicationIds;

      const fd = new FormData();
      fd.append("payload", JSON.stringify(payload));

      const docLabels: string[] = [];
      for (const doc of documents) {
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

      setSuccessDetails({
        applicationIds: data.applicationIds ?? (data.applicationId ? [data.applicationId] : []),
        customerName: personal.name,
        amountPaid: servicePrice,
      });
      toastSuccess?.("DPR application submitted!");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  }, [personal, business, project, machinery, selectedPlan, documents, docFiles, servicePrice, toastSuccess, toastError]);

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
      const details = buildDetailsPayload(personal, business, project, machinery, selectedPlan);

      payLog("ORDER_CREATE", { slug: DPR_SERVICE_SLUG, stage: "START" });

      const orderRes = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceSlugs: [DPR_SERVICE_SLUG],
          currency: "INR",
          receipt: `dpr-${Date.now()}`,
          applicationDraft: {
            customer: {
              name: personal.name,
              mobile: personal.mobile,
              email: personal.email,
              city: personal.district || personal.state,
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

      if (!orderRes.ok || !orderData.order_id) {
        throw new Error(orderData.error ?? orderData.message ?? `Order creation failed (HTTP ${orderRes.status})`);
      }

      const reviewTotal = servicePrice;
      const backendTotal = Number(orderData.servicePrice);
      const razorpayAmount = Number(orderData.amount) / 100;

      if (reviewTotal !== backendTotal || backendTotal !== razorpayAmount) {
        console.error("[DPR:PAY:MISMATCH]", { reviewTotal, backendTotal, razorpayAmount });
        throw new Error("Payment amount mismatch detected. Please refresh and try again.");
      }

      payLog("RAZORPAY_OPEN", { orderId: orderData.order_id, amountINR: razorpayAmount });

      const rzp = new (window as any).Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency ?? "INR",
        name: "DigiConnect Dukan",
        description: "Detailed Project Report (DPR)",
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
  }, [personal, business, project, machinery, selectedPlan, servicePrice, handleFinalSubmit, toastError]);

  const handleNext = useCallback(() => {
    if (isSubmitting) return;
    if (currentStep < 6) {
      if (!validateStep(currentStep)) {
        toastError("Please fix the form errors.");
        return;
      }
      setCurrentStep((s) => s + 1);
    } else {
      triggerRazorpayCheckout();
    }
  }, [currentStep, validateStep, triggerRazorpayCheckout, toastError, isSubmitting]);

  const handlePrev = useCallback(() => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  }, [currentStep]);

  const updateMachinery = useCallback((id: string, patch: Partial<MachineryRow>) => {
    setMachinery((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  if (successDetails) {
    return (
      <div className="max-w-4xl mx-auto w-full px-0 sm:px-4 py-0 sm:py-4">
        <div className="w-full bg-white sm:bg-white/80 sm:backdrop-blur-md border-0 sm:border border-slate-200 sm:rounded-2xl sm:shadow-xs overflow-hidden">
          <SuccessStep
            applicationIds={successDetails.applicationIds}
            customerName={successDetails.customerName}
            amountPaid={successDetails.amountPaid}
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
              <PersonalStep
                values={personal}
                errors={validationErrors}
                pincodeLoading={pincodeLoading}
                onChange={(patch) => setPersonal((p) => ({ ...p, ...patch }))}
                onPincodeChange={handlePincodeChange}
              />
            )}
            {currentStep === 2 && (
              <BusinessStep
                values={business}
                errors={validationErrors}
                onChange={(patch) => setBusiness((p) => ({ ...p, ...patch }))}
              />
            )}
            {currentStep === 3 && (
              <ProjectStep
                values={project}
                errors={validationErrors}
                onChange={(patch) => setProject((p) => ({ ...p, ...patch }))}
                onMarginManual={(v) => {
                  setMarginManual(true);
                  setProject((p) => ({ ...p, marginPercent: v }));
                }}
              />
            )}
            {currentStep === 4 && (
              <MachineryStep
                rows={machinery}
                onChange={updateMachinery}
                onAdd={() => setMachinery((rows) => [...rows, createMachineryRow()])}
                onRemove={(id) => setMachinery((rows) => rows.filter((r) => r.id !== id))}
              />
            )}
            {currentStep === 5 && (
              <UploadsStep
                documents={documents}
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
              <>
                {plans.length > 0 && (
                  <div className="px-4 sm:px-5 pt-4">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">DPR Package</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {plans.map((plan) => (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => setSelectedPlanId(plan.id)}
                          className={cn(
                            "text-left border rounded-xl p-2.5 transition-all",
                            selectedPlanId === plan.id
                              ? "border-blue-500 bg-blue-50 ring-1 ring-blue-400/30"
                              : "border-slate-200 bg-white hover:border-slate-300",
                          )}
                        >
                          <p className="text-[10px] font-black text-slate-900">{plan.name}</p>
                          <p className="text-xs font-bold text-blue-600 mt-0.5">₹{plan.price}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5 line-clamp-2">{plan.description}</p>
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">
                      Plan selection is stored with your application. Checkout uses the configured service fee (₹{loadingService ? "…" : servicePrice}).
                    </p>
                  </div>
                )}
                <ReviewStep
                  personal={personal}
                  business={business}
                  project={project}
                  machinery={machinery}
                  documents={documents}
                  docFiles={docFiles}
                  selectedPlan={selectedPlan}
                  servicePrice={servicePrice}
                  isScriptReady={isScriptReady}
                />
              </>
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
          disabled={isSubmitting || (currentStep === 6 && !isScriptReady)}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 text-sm font-bold py-3.5 rounded-xl transition active:scale-[0.98]",
            currentStep === 6
              ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/10"
              : "bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-900/10",
            (isSubmitting || (currentStep === 6 && !isScriptReady)) && "opacity-60 cursor-not-allowed",
          )}
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              {currentStep === 6 ? "Processing Payment…" : "Please wait…"}
            </>
          ) : currentStep === 6 ? (
            <>
              <CreditCard className="h-4 w-4" />
              Pay ₹{servicePrice} with Razorpay
            </>
          ) : (
            <>Continue <ArrowRight className="h-4 w-4" /></>
          )}
        </button>
      </div>

      {paymentError && currentStep === 6 && (
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
