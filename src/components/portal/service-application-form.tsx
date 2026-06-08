"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CreditCard, FileCheck2, IndianRupee, Trash2, WalletCards, ArrowLeft, ArrowRight, UploadCloud, Shield, Check, Lock } from "lucide-react";

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
import {
  buildPvcCardDetails,
  createPvcCardInitialValues,
  getPvcCardValidationError,
  isPvcCardComplete,
  PvcCardApplicationFields,
  type PvcCardApplicationValues,
  usePvcCardPincodeAutofill,
} from "@/components/portal/pvc-card-application-fields";
import {
  buildCmYuvaDetails,
  createCmYuvaInitialValues,
  getCmYuvaValidationError,
  isCmYuvaComplete,
  CmYuvaApplicationFields,
  type CmYuvaApplicationValues,
  useCmYuvaPincodeAutofill,
} from "@/components/portal/cm-yuva-application-fields";
import { useToast } from "@/components/providers/toast-provider";
import { Card } from "@/components/ui/card";
import { FormSubmitButton, LoadingOverlay } from "@/components/ui/loading";
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
  const isGst = selectedServices.length === 1 && (selectedServices[0]?.slug === "gst-registration" || selectedServices[0]?.slug === "gst-return-filing");
  const isItr = selectedServices.length === 1 && selectedServices[0]?.slug === "itr-filing";

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

  // Removed profile completeness form state declarations as profile completion is now optional and non-blocking
  const [pmVishwakarmaValues, setPmVishwakarmaValues] = useState(() => createPmVishwakarmaInitialValues());
  const [eshramValues, setEshramValues] = useState(() => createEshramInitialValues());
  const [pvcCardValues, setPvcCardValues] = useState(() => createPvcCardInitialValues());
  const [cmYuvaValues, setCmYuvaValues] = useState(() => createCmYuvaInitialValues());
  const [cmYuvaStep, setCmYuvaStep] = useState(1);
  const [cmYuvaFiles, setCmYuvaFiles] = useState<{
    pan: File | null;
    aadhaar: File | null;
    bankPassbook: File | null;
    marksheet: File | null;
  }>({
    pan: null,
    aadhaar: null,
    bankPassbook: null,
    marksheet: null,
  });
  const [pincodeStatus, setPincodeStatus] = useState("");
  const [appliedCouponCode, setAppliedCouponCode] = useState("");
  const [appliedCouponDiscount, setAppliedCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponApplying, setCouponApplying] = useState(false);

  // Resume Draft alert indicator
  const [showResumeAlert, setShowResumeAlert] = useState(false);

  // Document Upload progress simulation tracking
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  // GST Redesigned Multi-Step Wizard States
  const [gstStep, setGstStep] = useState(1);
  const [gstBusinessName, setGstBusinessName] = useState("");
  const [gstPanNumber, setGstPanNumber] = useState("");
  const [gstBusinessType, setGstBusinessType] = useState("individual");
  const [gstSchemeType, setGstSchemeType] = useState("regular");
  const [gstPincode, setGstPincode] = useState("");
  const [gstState, setGstState] = useState("");
  const [gstFiles, setGstFiles] = useState<{
    pan: File | null;
    aadhaar: File | null;
    addressProof: File | null;
    noc: File | null;
    photo: File | null;
  }>({
    pan: null,
    aadhaar: null,
    addressProof: null,
    noc: null,
    photo: null,
  });

  // ITR Redesigned Multi-Step Wizard States
  const [itrStep, setItrStep] = useState(1);
  const [itrPanNumber, setItrPanNumber] = useState("");
  const [itrAadhaarNumber, setItrAadhaarNumber] = useState("");
  const [itrSalaryIncome, setItrSalaryIncome] = useState("");
  const [itrBusinessIncome, setItrBusinessIncome] = useState("");
  const [itrCapGains, setItrCapGains] = useState("");
  const [itrRentIncome, setItrRentIncome] = useState("");
  const [itrOtherIncome, setItrOtherIncome] = useState("");
  const [itr80C, setItr80C] = useState("");
  const [itr80D, setItr80D] = useState("");
  const [itrHra, setItrHra] = useState("");
  const [itrOtherDeductions, setItrOtherDeductions] = useState("");
  const [itrFiles, setItrFiles] = useState<{
    form16: File | null;
    ais: File | null;
    form26as: File | null;
    bankStatements: File | null;
    capGains: File | null;
    businessBooks: File | null;
    interestCert: File | null;
  }>({
    form16: null,
    ais: null,
    form26as: null,
    bankStatements: null,
    capGains: null,
    businessBooks: null,
    interestCert: null,
  });

  // Save/load draft from localStorage for GST Registration auto-save and draft recovery
  useEffect(() => {
    if (!isGst) return;
    const saved = localStorage.getItem("gst_apply_draft");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        let loadedAny = false;
        if (parsed.name) { setApplicantName(parsed.name); loadedAny = true; }
        if (parsed.mobile) setApplicantMobile(parsed.mobile);
        if (parsed.email) setApplicantEmail(parsed.email);
        if (parsed.city) setApplicantCity(parsed.city);
        if (parsed.address) setApplicantAddress(parsed.address);
        if (parsed.message) setApplicantMessage(parsed.message);
        if (parsed.businessName) setGstBusinessName(parsed.businessName);
        if (parsed.panNumber) setGstPanNumber(parsed.panNumber);
        if (parsed.businessType) setGstBusinessType(parsed.businessType);
        if (parsed.schemeType) setGstSchemeType(parsed.schemeType);
        if (parsed.pincode) setGstPincode(parsed.pincode);
        if (parsed.state) setGstState(parsed.state);
        
        if (loadedAny) {
          setShowResumeAlert(true);
        }
      } catch (e) {
        console.error("Failed to parse GST draft", e);
      }
    }
  }, [isGst]);

  useEffect(() => {
    if (!isGst) return;
    const dataToSave = {
      name: applicantName,
      mobile: applicantMobile,
      email: applicantEmail,
      city: applicantCity,
      address: applicantAddress,
      message: applicantMessage,
      businessName: gstBusinessName,
      panNumber: gstPanNumber,
      businessType: gstBusinessType,
      schemeType: gstSchemeType,
      pincode: gstPincode,
      state: gstState,
    };
    localStorage.setItem("gst_apply_draft", JSON.stringify(dataToSave));
  }, [isGst, applicantName, applicantMobile, applicantEmail, applicantCity, applicantAddress, applicantMessage, gstBusinessName, gstPanNumber, gstBusinessType, gstSchemeType, gstPincode, gstState]);

  // Save/load draft from localStorage for ITR auto-save and draft recovery
  useEffect(() => {
    if (!isItr) return;
    const saved = localStorage.getItem("itr_apply_draft");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        let loadedAny = false;
        if (parsed.name) { setApplicantName(parsed.name); loadedAny = true; }
        if (parsed.mobile) setApplicantMobile(parsed.mobile);
        if (parsed.email) setApplicantEmail(parsed.email);
        if (parsed.city) setApplicantCity(parsed.city);
        if (parsed.address) setApplicantAddress(parsed.address);
        if (parsed.message) setApplicantMessage(parsed.message);
        if (parsed.panNumber) setItrPanNumber(parsed.panNumber);
        if (parsed.aadhaarNumber) setItrAadhaarNumber(parsed.aadhaarNumber);
        if (parsed.salaryIncome) setItrSalaryIncome(parsed.salaryIncome);
        if (parsed.businessIncome) setItrBusinessIncome(parsed.businessIncome);
        if (parsed.capGains) setItrCapGains(parsed.capGains);
        if (parsed.rentIncome) setItrRentIncome(parsed.rentIncome);
        if (parsed.otherIncome) setItrOtherIncome(parsed.otherIncome);
        if (parsed.deductions80C) setItr80C(parsed.deductions80C);
        if (parsed.deductions80D) setItr80D(parsed.deductions80D);
        if (parsed.hraExempt) setItrHra(parsed.hraExempt);
        if (parsed.otherDeductions) setItrOtherDeductions(parsed.otherDeductions);
        
        if (loadedAny) {
          setShowResumeAlert(true);
        }
      } catch (e) {
        console.error("Failed to parse ITR draft", e);
      }
    }
  }, [isItr]);

  useEffect(() => {
    if (!isItr) return;
    const dataToSave = {
      name: applicantName,
      mobile: applicantMobile,
      email: applicantEmail,
      city: applicantCity,
      address: applicantAddress,
      message: applicantMessage,
      panNumber: itrPanNumber,
      aadhaarNumber: itrAadhaarNumber,
      salaryIncome: itrSalaryIncome,
      businessIncome: itrBusinessIncome,
      capGains: itrCapGains,
      rentIncome: itrRentIncome,
      otherIncome: itrOtherIncome,
      deductions80C: itr80C,
      deductions80D: itr80D,
      hraExempt: itrHra,
      otherDeductions: itrOtherDeductions,
    };
    localStorage.setItem("itr_apply_draft", JSON.stringify(dataToSave));
  }, [isItr, applicantName, applicantMobile, applicantEmail, applicantCity, applicantAddress, applicantMessage, itrPanNumber, itrAadhaarNumber, itrSalaryIncome, itrBusinessIncome, itrCapGains, itrRentIncome, itrOtherIncome, itr80C, itr80D, itrHra, itrOtherDeductions]);

  // File upload change handler for ITR
  const handleItrFileChange = (slot: keyof typeof itrFiles, file: File | null) => {
    if (file) {
      const err = validateFile(file, file.name);
      if (err) {
        toastError(err);
        return;
      }

      setUploadProgress(prev => ({ ...prev, [slot]: 0 }));
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setUploadProgress(prev => ({ ...prev, [slot]: progress }));
        if (progress >= 100) {
          clearInterval(interval);
          setItrFiles((current) => ({ ...current, [slot]: file }));
        }
      }, 80);
    } else {
      setItrFiles((current) => ({ ...current, [slot]: null }));
      setUploadProgress(prev => {
        const next = { ...prev };
        delete next[slot];
        return next;
      });
    }
  };

  // Pincode lookup for GST
  useEffect(() => {
    if (!isGst || gstPincode.length !== 6) return;
    setPincodeStatus("Verifying pincode...");
    const controller = new AbortController();
    fetch(`/api/pincode?pincode=${encodeURIComponent(gstPincode)}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.city && data.state) {
          setApplicantCity(data.city);
          setGstState(data.state);
          setPincodeStatus("");
        } else {
          setPincodeStatus("Invalid pincode.");
        }
      })
      .catch(() => {
        setPincodeStatus("");
      });
    return () => controller.abort();
  }, [isGst, gstPincode]);

  const handleGstFileChange = (slot: keyof typeof gstFiles, file: File | null) => {
    if (file) {
      const err = validateFile(file, file.name);
      if (err) {
        toastError(err);
        return;
      }

      // Simulate file upload progress
      setUploadProgress(prev => ({ ...prev, [slot]: 0 }));
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setUploadProgress(prev => ({ ...prev, [slot]: progress }));
        if (progress >= 100) {
          clearInterval(interval);
          setGstFiles((current) => ({ ...current, [slot]: file }));
        }
      }, 80);
    } else {
      setGstFiles((current) => ({ ...current, [slot]: null }));
      setUploadProgress(prev => {
        const next = { ...prev };
        delete next[slot];
        return next;
      });
    }
  };

  const handleApplyCoupon = async (code: string) => {
    setCouponError(null);
    setCouponApplying(true);
    try {
      const response = await fetch(`/api/coupons/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          couponCode: code,
          serviceSlug: "cm-yuva-entrepreneur-loan-assistance",
          amount: 13499,
        }),
      });
      const result = await response.json();
      if (response.ok && result.success && result.valid) {
        setAppliedCouponCode(code.trim().toUpperCase());
        setAppliedCouponDiscount(Number(result.discountAmount ?? 0));
        success("Coupon applied successfully!");
        return true;
      } else {
        setCouponError(result.message || "Invalid coupon code.");
        return false;
      }
    } catch {
      setCouponError("Failed to validate coupon with server.");
      return false;
    } finally {
      setCouponApplying(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCouponCode("");
    setAppliedCouponDiscount(0);
    setCouponError(null);
    success("Coupon removed successfully.");
  };

  const isPmVishwakarma = selectedServices.length === 1 && selectedServices[0]?.slug === "pm-vishwakarma-yojana";
  const isEshram = selectedServices.length === 1 && (selectedServices[0]?.slug === "eshram-card" || selectedServices[0]?.slug === "eshram-card-registration");
  const isPvcCard = selectedServices.length === 1 && (selectedServices[0]?.slug === "pvc-card" || selectedServices[0]?.slug === "pvc-card-printing");
  const isCmYuva = selectedServices.length === 1 && selectedServices[0]?.slug === "cm-yuva-entrepreneur-loan-assistance";
  const isItrMsmeCombo = selectedServices.length >= 2 && [...comboServiceSlugs].every((slug) => selectedServices.some((item) => item.slug === slug));
  const isCibil = selectedServices.length === 1 && selectedServices[0]?.slug === "cibil-report-analysis-and-credit-health-consultation";
  const totalAmount = isCmYuva ? (13499 - appliedCouponDiscount) : isItrMsmeCombo ? 699 : selectedServices.reduce((total, item) => total + item.amount, 0);
  const wallet = useWallet(totalAmount);
  const cmYuvaWalletRedeem = isCmYuva && wallet.balance > 0 ? Math.min(wallet.balance, totalAmount * 0.5) : 0;
  const clampedWalletUseAmount = isCmYuva ? cmYuvaWalletRedeem : Math.min(walletUseAmount, wallet.maxUsable);
  const realPayableAmount = getRealPayableAmount(totalAmount, clampedWalletUseAmount);
  const walletLimitMessage = "You can redeem up to 50% of service price and 50% of wallet balance.";
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
          : isPvcCard
            ? {
                name: pvcCardValues.name,
                mobile: pvcCardValues.mobile,
                email: pvcCardValues.email,
                city: pvcCardValues.city,
                address: pvcCardValues.deliveryAddress,
                message: pvcCardValues.message,
              }
          : isCmYuva
            ? {
                name: cmYuvaValues.name,
                mobile: cmYuvaValues.mobile,
                email: cmYuvaValues.email,
                city: cmYuvaValues.city,
                address: cmYuvaValues.businessAddress,
                message: cmYuvaValues.message,
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
    [applicantAddress, applicantCity, applicantEmail, applicantMessage, applicantMobile, applicantName, eshramValues, isEshram, isPmVishwakarma, pmVishwakarmaValues, pvcCardValues, isPvcCard, isCmYuva, cmYuvaValues],
  );
  const serviceDetailsForPayment: Record<string, string> = useMemo(
    () => {
      const baseDetails: Record<string, string> = isPmVishwakarma
        ? buildPmVishwakarmaDetails(pmVishwakarmaValues)
        : isEshram
          ? buildEshramDetails(eshramValues)
          : isPvcCard
            ? buildPvcCardDetails(pvcCardValues)
            : isCmYuva
              ? buildCmYuvaDetails(cmYuvaValues)
              : isGst
                ? {
                    businessName: gstBusinessName,
                    panNumber: gstPanNumber,
                    businessType: gstBusinessType,
                    schemeType: gstSchemeType,
                    pincode: gstPincode,
                    state: gstState,
                  }
                : isItr
                  ? {
                      panNumber: itrPanNumber,
                      aadhaarNumber: itrAadhaarNumber,
                      salaryIncome: itrSalaryIncome,
                      businessIncome: itrBusinessIncome,
                      capitalGains: itrCapGains,
                      rentIncome: itrRentIncome,
                      otherIncome: itrOtherIncome,
                      deductions80C: itr80C,
                      deductions80D: itr80D,
                      hraExempt: itrHra,
                      otherDeductions: itrOtherDeductions,
                    }
                  : (normalizedApplicationDraft.details || {});

      if (isCibil) {
        return {
          ...baseDetails,
          selectedPlan: selectedServices[0]?.title || "Premium CIBIL Analysis & Consultation",
          planPrice: formatCurrency(totalAmount),
        };
      }
      return baseDetails;
    },
    [eshramValues, isEshram, isPmVishwakarma, isPvcCard, pvcCardValues, isCmYuva, cmYuvaValues, normalizedApplicationDraft.details, pmVishwakarmaValues, isCibil, selectedServices, totalAmount, isGst, gstBusinessName, gstPanNumber, gstBusinessType, gstSchemeType, gstPincode, gstState, isItr, itrPanNumber, itrAadhaarNumber, itrSalaryIncome, itrBusinessIncome, itrCapGains, itrRentIncome, itrOtherIncome, itr80C, itr80D, itrHra, itrOtherDeductions],
  );
  const canStartPayment =
    !isSubmitting &&
    !getApplicantValidationError(normalizedApplicationDraft, { emailOptional: isPmVishwakarma || isEshram || isPvcCard || isCmYuva || isGst || isItr }) &&
    /^[6-9]\d{9}$/.test(normalizedApplicationDraft.customer.mobile) &&
    (selectedDocuments.length > 0 || isEshram || isCmYuva || isGst || isItr) &&
    (!isPmVishwakarma || isPmVishwakarmaComplete(pmVishwakarmaValues)) &&
    (!isEshram || isEshramComplete(eshramValues)) &&
    (!isPvcCard || isPvcCardComplete(pvcCardValues, selectedDocuments)) &&
    (!isCmYuva || isCmYuvaComplete(cmYuvaValues, cmYuvaFiles)) &&
    (!isGst || (gstFiles.pan !== null && gstFiles.aadhaar !== null)) &&
    (!isItr || (itrPanNumber.length === 10 && itrAadhaarNumber.length === 12));

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

  usePvcCardPincodeAutofill({
    enabled: isPvcCard,
    values: pvcCardValues,
    setValues: setPvcCardValues,
    setStatus: setPincodeStatus,
  });

  useCmYuvaPincodeAutofill({
    enabled: isCmYuva,
    values: cmYuvaValues,
    setValues: setCmYuvaValues,
    setStatus: setPincodeStatus,
  });

  // Listen for CM YUVA validation errors from the step navigation
  useEffect(() => {
    function handleCmYuvaError(event: Event) {
      const customEvent = event as CustomEvent<string>;
      if (customEvent.detail) {
        toastError(customEvent.detail);
      }
    }
    window.addEventListener("cm-yuva-validation-error", handleCmYuvaError);
    return () => window.removeEventListener("cm-yuva-validation-error", handleCmYuvaError);
  }, [toastError]);

  function updatePmVishwakarmaValue<Key extends keyof PmVishwakarmaApplicationValues>(key: Key, value: PmVishwakarmaApplicationValues[Key]) {
    setPmVishwakarmaValues((current) => ({ ...current, [key]: value }));
  }

  function updateEshramValue<Key extends keyof EshramApplicationValues>(key: Key, value: EshramApplicationValues[Key]) {
    setEshramValues((current) => ({ ...current, [key]: value }));
  }

  function updatePvcCardValue<Key extends keyof PvcCardApplicationValues>(key: Key, value: PvcCardApplicationValues[Key]) {
    setPvcCardValues((current) => ({ ...current, [key]: value }));
  }

  function updateCmYuvaValue<Key extends keyof CmYuvaApplicationValues>(key: Key, value: CmYuvaApplicationValues[Key]) {
    setCmYuvaValues((current) => ({ ...current, [key]: value }));
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

    if (!selectedDocuments.length && !isEshram && !isCmYuva && !isGst && !isItr) {
      toastError("Please upload Aadhaar / Documents.");
      return;
    }

    if (isGst && (!gstFiles.pan || !gstFiles.aadhaar)) {
      toastError("Please upload both PAN and Aadhaar cards.");
      return;
    }

    if (isItr && (!itrPanNumber || !itrAadhaarNumber)) {
      toastError("Please enter both PAN and Aadhaar card numbers.");
      return;
    }

    if (isItr && Object.values(itrFiles).filter(Boolean).length === 0) {
      toastError("Please upload at least one tax document (Form 16, AIS, or Bank Statement).");
      return;
    }

    const submittedDraft = buildNormalizedApplicationDraft({
      name: (isGst || isItr) ? applicantName : String(formData.get("name") ?? ""),
      mobile: (isGst || isItr) ? applicantMobile : String(formData.get("mobile") ?? ""),
      email: (isGst || isItr) ? applicantEmail : String(formData.get("email") ?? ""),
      city: (isGst || isItr) ? applicantCity : String(formData.get("city") ?? ""),
      address: (isGst || isItr) ? applicantAddress : String(formData.get("address") ?? ""),
      message: (isGst || isItr) ? applicantMessage : String(formData.get("message") ?? ""),
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
    const submittedPvcCardValues = createPvcCardInitialValues({
      name: submittedDraft.customer.name,
      mobile: submittedDraft.customer.mobile,
      email: submittedDraft.customer.email,
      city: submittedDraft.customer.city,
      deliveryAddress: submittedDraft.details.address,
      message: submittedDraft.customer.message,
      pincode: String(formData.get("pincode") ?? "").trim(),
      district: String(formData.get("district") ?? "").trim(),
      state: String(formData.get("state") ?? "").trim(),
      cardType: String(formData.get("cardType") ?? "").trim(),
      consentOwnership: formData.get("consentOwnership") === "true",
      consentProcessing: formData.get("consentProcessing") === "true",
    });
    const pmVishwakarmaDetails = isPmVishwakarma ? buildPmVishwakarmaDetails(submittedPmVishwakarmaValues) : {};
    const eshramDetails = isEshram ? buildEshramDetails(submittedEshramValues) : {};
    const pvcCardDetails = isPvcCard ? buildPvcCardDetails(submittedPvcCardValues) : {};
    const cmYuvaDetails = isCmYuva ? buildCmYuvaDetails(cmYuvaValues) : {};
    const applicantValidationError = getApplicantValidationError(submittedDraft, { emailOptional: isPmVishwakarma || isEshram || isPvcCard || isCmYuva });

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

    if (isPvcCard) {
      const pvcValidationError = getPvcCardValidationError(submittedPvcCardValues, selectedDocuments);
      if (pvcValidationError) {
        toastError(pvcValidationError);
        return;
      }
    }

    if (isCmYuva) {
      const cmYuvaValidationError = getCmYuvaValidationError(cmYuvaValues, undefined, cmYuvaFiles);
      if (cmYuvaValidationError) {
        toastError(cmYuvaValidationError);
        return;
      }
    }

    const filesToValidate = isCmYuva
      ? ([cmYuvaFiles.pan, cmYuvaFiles.aadhaar, cmYuvaFiles.bankPassbook, cmYuvaFiles.marksheet].filter(Boolean) as File[])
      : isItr
      ? (Object.values(itrFiles).filter(Boolean) as File[])
      : selectedDocuments;

    for (const file of filesToValidate) {
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

    // Zero-payment wallet-only flow: submit directly to create-order which handles wallet debit server-side
    if (realPayableAmount === 0 && clampedWalletUseAmount > 0 && !razorpayPayment) {
      // Simulate a zero-payment order via create-order API
      try {
        const zeroPayResponse = await fetch("/api/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: 0,
            serviceSlug: selectedServices[0]?.slug,
            serviceSlugs: selectedServices.map((item) => item.slug),
            walletUseAmount: clampedWalletUseAmount,
            applicationDraft: {
              customer: normalizedApplicationDraft.customer,
              details: serviceDetailsForPayment,
            },
          }),
        });
        const zeroPayResult = await zeroPayResponse.json() as { order_id: string | null; application_id?: string; application_ids?: string[]; wallet_only?: boolean; message?: string; error?: string };
        if (!zeroPayResponse.ok) {
          throw new Error(zeroPayResult.error || zeroPayResult.message || "Wallet payment failed.");
        }
        if (zeroPayResult.wallet_only && zeroPayResult.application_ids?.length) {
          setRazorpayPayment({
            razorpay_payment_id: "wallet_only",
            razorpay_order_id: "wallet_only",
            razorpay_signature: "wallet_only",
            application_id: zeroPayResult.application_id ?? zeroPayResult.application_ids[0],
            application_ids: zeroPayResult.application_ids,
            amount_paise: 0,
          });
        }
      } catch (zeroPayError) {
        toastError(zeroPayError instanceof Error ? zeroPayError.message : "Wallet payment failed.");
        return;
      }
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

      const cmYuvaDocList = isCmYuva
        ? [
            { file: cmYuvaFiles.pan, type: "PAN Card" },
            { file: cmYuvaFiles.aadhaar, type: "Aadhaar Card" },
            { file: cmYuvaFiles.bankPassbook, type: "Bank Passbook" },
            { file: cmYuvaFiles.marksheet, type: "Class 8 Marksheet or Above" },
          ].filter((item): item is { file: File; type: string } => item.file !== null)
        : [];

      const gstDocList = isGst
        ? [
            { file: gstFiles.pan, type: "PAN Card" },
            { file: gstFiles.aadhaar, type: "Aadhaar Card" },
            { file: gstFiles.addressProof, type: "Premises Address Proof" },
            { file: gstFiles.noc, type: "Consent Letter/NOC" },
            { file: gstFiles.photo, type: "Passport Photograph" },
          ].filter((item): item is { file: File; type: string } => item.file !== null)
        : [];

      const itrDocList = isItr
        ? [
            { file: itrFiles.form16, type: "Form 16" },
            { file: itrFiles.ais, type: "AIS Statement" },
            { file: itrFiles.form26as, type: "26AS statement" },
            { file: itrFiles.bankStatements, type: "Bank Statements" },
            { file: itrFiles.capGains, type: "Capital Gain Reports" },
            { file: itrFiles.businessBooks, type: "Business Books" },
            { file: itrFiles.interestCert, type: "Interest Certificates" },
          ].filter((item): item is { file: File; type: string } => item.file !== null)
        : [];

      const uploadFiles = isCmYuva
        ? cmYuvaDocList.map((item) => item.file)
        : isGst
        ? gstDocList.map((item) => item.file)
        : isItr
        ? itrDocList.map((item) => item.file)
        : selectedDocuments;
      const documentTypes = isCmYuva
        ? cmYuvaDocList.map((item) => item.type)
        : isGst
        ? gstDocList.map((item) => item.type)
        : isItr
        ? itrDocList.map((item) => item.type)
        : isPvcCard
          ? ["Front Side Image", "Back Side Image"].slice(0, selectedDocuments.length)
          : selectedDocuments.map((_, index) => (index === 0 ? "Aadhaar / Document Proof" : "Additional Document"));

      console.info("CLIENT_DOCUMENT_COUNT_BEFORE_SUBMIT", {
        count: uploadFiles.length,
        fileNames: uploadFiles.map((file) => file.name),
      });

      setProgressText(uploadFiles.length ? "Uploading documents and saving application..." : "Saving application...");

      const payload = {
        serviceSlug: selectedServices[0]?.slug,
        serviceSlugs: selectedServices.map((item) => item.slug),
        customer: submittedDraft.customer,
        details: {
          ...submittedDraft.details,
          ...pmVishwakarmaDetails,
          ...eshramDetails,
          ...pvcCardDetails,
          ...cmYuvaDetails,
          address: submittedDraft.details.address,
          ...(isGst ? {
            businessName: gstBusinessName,
            panNumber: gstPanNumber,
            businessType: gstBusinessType,
            schemeType: gstSchemeType,
            pincode: gstPincode,
            state: gstState,
          } : {}),
          ...(isItr ? {
            panNumber: itrPanNumber,
            aadhaarNumber: itrAadhaarNumber,
            salaryIncome: itrSalaryIncome,
            businessIncome: itrBusinessIncome,
            capitalGains: itrCapGains,
            rentIncome: itrRentIncome,
            otherIncome: itrOtherIncome,
            deductions80C: itr80C,
            deductions80D: itr80D,
            hraExempt: itrHra,
            otherDeductions: itrOtherDeductions,
          } : {}),
          ...(isCibil ? {
            selectedPlan: selectedServices[0]?.title || "Premium CIBIL Analysis & Consultation",
            planPrice: formatCurrency(totalAmount),
          } : {})
        },
        documents: [],
        razorpayPayment,
        applicationIds: razorpayPayment?.application_ids,
        walletUseAmount: clampedWalletUseAmount,
        ...(isCmYuva
          ? {
              originalPrice: 39999,
              discountedPrice: 13499,
              couponCode: appliedCouponCode,
              couponDiscount: appliedCouponDiscount,
              walletUsed: clampedWalletUseAmount,
              freshAmount: realPayableAmount,
              finalAmount: totalAmount,
            }
          : {}),
      };
      const submitFormData = new FormData();
      submitFormData.append("payload", JSON.stringify(payload));
      submitFormData.append("documentTypes", JSON.stringify(documentTypes));

      for (const file of uploadFiles) {
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

  if (isGst) {
    const handleGstNext = () => {
      if (gstStep === 1) {
        if (!applicantName.trim()) {
          toastError("Please enter your name.");
          return;
        }
        if (!applicantMobile.trim() || !/^[6-9]\d{9}$/.test(applicantMobile)) {
          toastError("Please enter a valid 10-digit mobile number.");
          return;
        }
        if (!applicantEmail.trim() || !applicantEmail.includes("@")) {
          toastError("Please enter a valid email address.");
          return;
        }
        if (!applicantCity.trim()) {
          toastError("Please enter your city.");
          return;
        }
      } else if (gstStep === 2) {
        if (!gstBusinessName.trim()) {
          toastError("Please enter your business name.");
          return;
        }
      } else if (gstStep === 3) {
        if (!applicantAddress.trim()) {
          toastError("Please enter business address details.");
          return;
        }
        if (!gstPincode.trim() || gstPincode.length !== 6) {
          toastError("Please enter a valid 6-digit business pincode.");
          return;
        }
      } else if (gstStep === 4) {
        if (!gstFiles.pan) {
          toastError("Please upload your PAN card document.");
          return;
        }
        if (!gstFiles.aadhaar) {
          toastError("Please upload your Aadhaar card document.");
          return;
        }
      }
      setGstStep((s) => s + 1);
    };

    return (
      <form onSubmit={onSubmit} className="grid gap-6 pb-6 lg:grid-cols-[1fr_340px] w-full" aria-busy={isSubmitting}>
        <fieldset disabled={isSubmitting} className="contents">
          
          {/* Hidden inputs to feed standard FormData */}
          <input type="hidden" name="name" value={applicantName} />
          <input type="hidden" name="mobile" value={applicantMobile} />
          <input type="hidden" name="email" value={applicantEmail} />
          <input type="hidden" name="city" value={applicantCity} />
          <input type="hidden" name="address" value={applicantAddress} />
          <input type="hidden" name="message" value={applicantMessage} />
          <input type="hidden" name="pincode" value={gstPincode} />
          <input type="hidden" name="state" value={gstState} />
          <input type="hidden" name="businessName" value={gstBusinessName} />
          <input type="hidden" name="panNumber" value={gstPanNumber} />
          <input type="hidden" name="businessType" value={gstBusinessType} />
          <input type="hidden" name="schemeType" value={gstSchemeType} />

          <Card className="rounded-[36px] border border-blue-150/60 bg-white/95 p-6 md:p-8 shadow-xl relative overflow-hidden backdrop-blur-md">
            
            {showResumeAlert && (
              <div className="mb-6 p-4 rounded-2xl bg-blue-50/50 border border-blue-150/50 flex items-center justify-between text-xs font-semibold text-blue-800 animate-[fadeIn_0.3s_ease-out]">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-black">✓</span>
                  <span>Resumed application draft from 10 seconds ago. All fields recovered.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowResumeAlert(false)}
                  className="text-blue-700 hover:text-blue-950 font-black text-xs px-2 py-1 bg-white border border-slate-100 rounded-full shadow-sm"
                >
                  Dismiss
                </button>
              </div>
            )}
            
            {/* Elegant Stepper Timeline */}
            <div className="mb-8 border-b border-slate-100 pb-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-4">DigiConnect Fast-Track Apply</p>
              
              <div className="relative flex items-center justify-between max-w-xl mx-auto px-4">
                {/* Connector line behind */}
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -translate-y-1/2 z-0" />
                <div 
                  className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-blue-500 to-blue-600 -translate-y-1/2 z-0 transition-all duration-300" 
                  style={{ width: `${((gstStep - 1) / 4) * 100}%` }}
                />

                {[
                  { step: 1, label: "Personal" },
                  { step: 2, label: "Business" },
                  { step: 3, label: "Address" },
                  { step: 4, label: "Documents" },
                  { step: 5, label: "Checkout" }
                ].map((s) => {
                  const isCompleted = s.step < gstStep;
                  const isActive = s.step === gstStep;
                  return (
                    <div key={s.step} className="flex flex-col items-center relative z-10">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 text-[10px] font-black transition-all ${
                        isCompleted 
                          ? "bg-blue-600 border-blue-600 text-white" 
                          : isActive 
                          ? "bg-white border-blue-600 text-blue-600 active-glow-ring scale-110 shadow-md shadow-blue-500/10" 
                          : "bg-white border-slate-200 text-slate-400"
                      }`}>
                        {isCompleted ? "✓" : s.step}
                      </div>
                      <span className={`text-[9px] font-bold mt-1.5 ${
                        isActive ? "text-blue-600" : isCompleted ? "text-slate-800" : "text-slate-400"
                      }`}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step Content */}
            <div className="mt-8">
              {gstStep === 1 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-900">Personal Information</h3>
                  <p className="text-xs text-slate-400 font-medium">Verify your profile details for communication purposes.</p>
                  
                  <div className="grid gap-4 sm:grid-cols-2 pt-2">
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400">Full Name</label>
                      <input 
                        type="text" 
                        required
                        value={applicantName}
                        onChange={(e) => setApplicantName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        className="mt-1 block w-full glass-input-premium transition bg-white/70"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400">Mobile Number</label>
                      <input 
                        type="tel" 
                        required
                        pattern="[0-9]{10}"
                        value={applicantMobile}
                        onChange={(e) => setApplicantMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        placeholder="e.g. 9876543210"
                        className="mt-1 block w-full glass-input-premium transition bg-white/70"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400">Email Address</label>
                      <input 
                        type="email" 
                        required
                        value={applicantEmail}
                        onChange={(e) => setApplicantEmail(e.target.value)}
                        placeholder="e.g. rahul@example.com"
                        className="mt-1 block w-full glass-input-premium transition bg-white/70"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400">City</label>
                      <input 
                        type="text" 
                        required
                        value={applicantCity}
                        onChange={(e) => setApplicantCity(e.target.value)}
                        placeholder="e.g. Lucknow"
                        className="mt-1 block w-full glass-input-premium transition bg-white/70"
                      />
                    </div>
                  </div>
                </div>
              )}

              {gstStep === 2 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-900">Business Details</h3>
                  <p className="text-xs text-slate-400 font-medium">Add parameters describing your business entity.</p>

                  <div className="grid gap-4 sm:grid-cols-2 pt-2">
                    <div className="sm:col-span-2">
                      <label className="text-[9px] font-black uppercase text-slate-400">Trade Name / Business Name</label>
                      <input 
                        type="text" 
                        required
                        value={gstBusinessName}
                        onChange={(e) => setGstBusinessName(e.target.value)}
                        placeholder="e.g. Sharma Retails Private Limited"
                        className="mt-1 block w-full glass-input-premium transition bg-white/70"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400">PAN Number (Optional)</label>
                      <input 
                        type="text" 
                        value={gstPanNumber}
                        onChange={(e) => setGstPanNumber(e.target.value.toUpperCase())}
                        placeholder="e.g. ABCDE1234F"
                        className="mt-1 block w-full glass-input-premium transition bg-white/70"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400">Business Structure</label>
                      <select 
                        value={gstBusinessType}
                        onChange={(e) => setGstBusinessType(e.target.value)}
                        className="mt-1 block w-full glass-input-premium transition bg-white/70"
                      >
                        <option value="individual">Individual</option>
                        <option value="proprietorship">Proprietorship</option>
                        <option value="partnership">Partnership Firm</option>
                        <option value="llp">LLP (Limited Liability Partnership)</option>
                        <option value="private">Private Limited Company</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400">GST Registration Scheme</label>
                      <select 
                        value={gstSchemeType}
                        onChange={(e) => setGstSchemeType(e.target.value)}
                        className="mt-1 block w-full glass-input-premium transition bg-white/70"
                      >
                        <option value="regular">Regular Taxpayer Scheme</option>
                        <option value="composition">Composition Taxpayer Scheme</option>
                        <option value="casual">Casual Taxable Trader</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {gstStep === 3 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-900">Office Location Address</h3>
                  <p className="text-xs text-slate-400 font-medium">Verify the premises address proof matching documents.</p>

                  <div className="grid gap-4 sm:grid-cols-2 pt-2">
                    <div className="sm:col-span-2">
                      <label className="text-[9px] font-black uppercase text-slate-400">Full Business Address Details</label>
                      <input 
                        type="text" 
                        required
                        value={applicantAddress}
                        onChange={(e) => setApplicantAddress(e.target.value)}
                        placeholder="e.g. Shop No. 12, Ground Floor, Sharma Complex"
                        className="mt-1 block w-full glass-input-premium transition bg-white/70"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400">Office Pincode</label>
                      <input 
                        type="text" 
                        required
                        maxLength={6}
                        value={gstPincode}
                        onChange={(e) => setGstPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="e.g. 226001"
                        className="mt-1 block w-full glass-input-premium transition bg-white/70"
                      />
                      {pincodeStatus && (
                        <p className="text-[10px] text-blue-600 font-bold mt-1">{pincodeStatus}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400">State</label>
                      <input 
                        type="text" 
                        required
                        value={gstState}
                        onChange={(e) => setGstState(e.target.value)}
                        placeholder="e.g. Uttar Pradesh"
                        className="mt-1 block w-full glass-input-premium transition bg-white/70"
                      />
                    </div>
                  </div>
                </div>
              )}

              {gstStep === 4 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-900">Upload Identity Documents</h3>
                  <p className="text-xs text-slate-400 font-medium">Provide clear scanned PDF / JPG copies of required proofs (Max 5MB each).</p>

                  <div className="grid gap-4 sm:grid-cols-2 pt-2">
                    {/* PAN slot */}
                    <div className="p-5 rounded-[24px] border border-dashed border-slate-200 bg-slate-50/20 flex flex-col items-center text-center relative hover:bg-slate-50/40 transition group">
                      <UploadCloud className="h-8 w-8 text-blue-500 mb-2 group-hover:scale-110 transition" />
                      <h4 className="text-xs font-black text-slate-800">Owner PAN Card *</h4>
                      <p className="text-[9px] text-slate-400 mt-1">Upload PDF, JPG or PNG (Max 5MB)</p>
                      <input 
                        type="file" 
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleGstFileChange("pan", e.target.files?.[0] || null)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      {uploadProgress.pan !== undefined && uploadProgress.pan < 100 && (
                        <div className="absolute inset-0 bg-white/95 rounded-[24px] flex flex-col items-center justify-center p-4 z-20">
                          <p className="text-[10px] font-black text-blue-600 mb-1.5 font-mono">Uploading PAN Card... {uploadProgress.pan}%</p>
                          <div className="h-1.5 w-full max-w-[150px] bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 transition-all duration-100" style={{ width: `${uploadProgress.pan}%` }} />
                          </div>
                        </div>
                      )}
                      {gstFiles.pan && (
                        <div className="mt-3 px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-black rounded-lg flex items-center gap-1.5 z-10">
                          <Check className="h-3.5 w-3.5 text-emerald-650" />
                          <span className="truncate max-w-[150px]">{gstFiles.pan.name}</span>
                          <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); handleGstFileChange("pan", null); }}
                            className="ml-1 text-emerald-800 hover:text-emerald-950 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Aadhaar slot */}
                    <div className="p-5 rounded-[24px] border border-dashed border-slate-200 bg-slate-50/20 flex flex-col items-center text-center relative hover:bg-slate-50/40 transition group">
                      <UploadCloud className="h-8 w-8 text-blue-500 mb-2 group-hover:scale-110 transition" />
                      <h4 className="text-xs font-black text-slate-800">Owner Aadhaar Card *</h4>
                      <p className="text-[9px] text-slate-400 mt-1">Upload PDF, JPG or PNG (Max 5MB)</p>
                      <input 
                        type="file" 
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleGstFileChange("aadhaar", e.target.files?.[0] || null)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      {uploadProgress.aadhaar !== undefined && uploadProgress.aadhaar < 100 && (
                        <div className="absolute inset-0 bg-white/95 rounded-[24px] flex flex-col items-center justify-center p-4 z-20">
                          <p className="text-[10px] font-black text-blue-600 mb-1.5 font-mono">Uploading Aadhaar Card... {uploadProgress.aadhaar}%</p>
                          <div className="h-1.5 w-full max-w-[150px] bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 transition-all duration-100" style={{ width: `${uploadProgress.aadhaar}%` }} />
                          </div>
                        </div>
                      )}
                      {gstFiles.aadhaar && (
                        <div className="mt-3 px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-black rounded-lg flex items-center gap-1.5 z-10">
                          <Check className="h-3.5 w-3.5 text-emerald-650" />
                          <span className="truncate max-w-[150px]">{gstFiles.aadhaar.name}</span>
                          <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); handleGstFileChange("aadhaar", null); }}
                            className="ml-1 text-emerald-800 hover:text-emerald-950 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Premises Address Proof */}
                    <div className="p-5 rounded-[24px] border border-dashed border-slate-200 bg-slate-50/20 flex flex-col items-center text-center relative hover:bg-slate-50/40 transition group">
                      <UploadCloud className="h-8 w-8 text-blue-500 mb-2 group-hover:scale-110 transition" />
                      <h4 className="text-xs font-black text-slate-800">Office Address Proof</h4>
                      <p className="text-[9px] text-slate-400 mt-1">Upload PDF, JPG or PNG (Max 5MB)</p>
                      <input 
                        type="file" 
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleGstFileChange("addressProof", e.target.files?.[0] || null)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      {uploadProgress.addressProof !== undefined && uploadProgress.addressProof < 100 && (
                        <div className="absolute inset-0 bg-white/95 rounded-[24px] flex flex-col items-center justify-center p-4 z-20">
                          <p className="text-[10px] font-black text-blue-600 mb-1.5 font-mono">Uploading Address... {uploadProgress.addressProof}%</p>
                          <div className="h-1.5 w-full max-w-[150px] bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 transition-all duration-100" style={{ width: `${uploadProgress.addressProof}%` }} />
                          </div>
                        </div>
                      )}
                      {gstFiles.addressProof && (
                        <div className="mt-3 px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-black rounded-lg flex items-center gap-1.5 z-10">
                          <Check className="h-3.5 w-3.5 text-emerald-650" />
                          <span className="truncate max-w-[150px]">{gstFiles.addressProof.name}</span>
                          <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); handleGstFileChange("addressProof", null); }}
                            className="ml-1 text-emerald-800 hover:text-emerald-950 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Rent Agreement/NOC */}
                    <div className="p-5 rounded-[24px] border border-dashed border-slate-200 bg-slate-50/20 flex flex-col items-center text-center relative hover:bg-slate-50/40 transition group">
                      <UploadCloud className="h-8 w-8 text-blue-500 mb-2 group-hover:scale-110 transition" />
                      <h4 className="text-xs font-black text-slate-800">Consent Letter / NOC</h4>
                      <p className="text-[9px] text-slate-400 mt-1">Upload PDF, JPG or PNG (Max 5MB)</p>
                      <input 
                        type="file" 
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleGstFileChange("noc", e.target.files?.[0] || null)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      {uploadProgress.noc !== undefined && uploadProgress.noc < 100 && (
                        <div className="absolute inset-0 bg-white/95 rounded-[24px] flex flex-col items-center justify-center p-4 z-20">
                          <p className="text-[10px] font-black text-blue-600 mb-1.5 font-mono">Uploading NOC... {uploadProgress.noc}%</p>
                          <div className="h-1.5 w-full max-w-[150px] bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 transition-all duration-100" style={{ width: `${uploadProgress.noc}%` }} />
                          </div>
                        </div>
                      )}
                      {gstFiles.noc && (
                        <div className="mt-3 px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-black rounded-lg flex items-center gap-1.5 z-10">
                          <Check className="h-3.5 w-3.5 text-emerald-650" />
                          <span className="truncate max-w-[150px]">{gstFiles.noc.name}</span>
                          <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); handleGstFileChange("noc", null); }}
                            className="ml-1 text-emerald-800 hover:text-emerald-950 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Passport Photo */}
                    <div className="p-5 rounded-[24px] border border-dashed border-slate-200 bg-slate-50/20 flex flex-col items-center text-center relative hover:bg-slate-50/40 transition group sm:col-span-2">
                      <UploadCloud className="h-8 w-8 text-blue-500 mb-2 group-hover:scale-110 transition" />
                      <h4 className="text-xs font-black text-slate-800">Passport Photograph</h4>
                      <p className="text-[9px] text-slate-400 mt-1">Upload PDF, JPG or PNG (Max 5MB)</p>
                      <input 
                        type="file" 
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleGstFileChange("photo", e.target.files?.[0] || null)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      {uploadProgress.photo !== undefined && uploadProgress.photo < 100 && (
                        <div className="absolute inset-0 bg-white/95 rounded-[24px] flex flex-col items-center justify-center p-4 z-20">
                          <p className="text-[10px] font-black text-blue-600 mb-1.5 font-mono">Uploading Photograph... {uploadProgress.photo}%</p>
                          <div className="h-1.5 w-full max-w-[150px] bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 transition-all duration-100" style={{ width: `${uploadProgress.photo}%` }} />
                          </div>
                        </div>
                      )}
                      {gstFiles.photo && (
                        <div className="mt-3 px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-black rounded-lg flex items-center gap-1.5 z-10">
                          <Check className="h-3.5 w-3.5 text-emerald-650" />
                          <span className="truncate max-w-[150px]">{gstFiles.photo.name}</span>
                          <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); handleGstFileChange("photo", null); }}
                            className="ml-1 text-emerald-800 hover:text-emerald-950 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {gstStep === 5 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-900">Review & Payment</h3>
                  <p className="text-xs text-slate-400 font-medium">Verify your application ledger and initiate secure payment.</p>

                  <div className="p-4 rounded-3xl border border-slate-100 bg-slate-50/50 space-y-4">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-slate-500">Applicant:</span>
                      <span className="font-black text-slate-900">{applicantName}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-slate-500">Business Name:</span>
                      <span className="font-black text-slate-900">{gstBusinessName}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-slate-500">Address:</span>
                      <span className="font-black text-slate-900 truncate max-w-[180px]">{applicantAddress}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-semibold border-t border-slate-200/50 pt-3">
                      <span className="text-slate-500">Documents Attached:</span>
                      <span className="font-black text-blue-700">
                        {[gstFiles.pan, gstFiles.aadhaar, gstFiles.addressProof, gstFiles.noc, gstFiles.photo].filter(Boolean).length} Files
                      </span>
                    </div>
                  </div>

                  {/* Razorpay Trigger integration */}
                  <div className="mt-4 pt-2">
                    {realPayableAmount > 0 ? (
                      <div className="space-y-4">
                        <RazorpayCheckoutButton
                          amountPaise={payableAmountPaise}
                          receipt={paymentReceipt}
                          serviceSlug={selectedServices[0]?.slug}
                          serviceSlugs={selectedServices.map((item) => item.slug)}
                          walletUseAmount={clampedWalletUseAmount}
                          couponCode={appliedCouponCode}
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

                        {razorpayPayment && (
                          <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-100 px-3.5 py-2 text-xs font-black text-emerald-700">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                            Payment verified: {razorpayPayment.razorpay_payment_id}
                          </div>
                        )}

                        {/* Secure Checkout Trust Info */}
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            <div className="flex items-center gap-1.5 text-blue-600">
                              <Lock className="h-3.5 w-3.5 shrink-0" />
                              <span>SECURE 256-BIT SSL</span>
                            </div>
                            <span className="text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-100">Razorpay Secured</span>
                          </div>

                          <p className="text-[10px] font-bold text-slate-400 leading-normal">
                            All card details, UPI transactions and netbanking sessions are encrypted and securely authenticated directly via Razorpay. We do not store your financial information.
                          </p>

                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {["UPI & AutoPay", "Credit/Debit Cards", "NetBanking", "Popular Wallets"].map((method, idx) => (
                              <span key={idx} className="inline-flex items-center text-[9px] font-extrabold text-slate-500 bg-white border border-slate-100 px-2 py-0.5 rounded-md">
                                {method}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-emerald-50 px-4 py-3.5 text-xs font-black text-emerald-800 border border-emerald-100 text-center">
                        🎉 Wallet balance covers 100% of order. Click submit below.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center mt-10 pt-6 border-t border-slate-100/80">
              <button
                type="button"
                disabled={gstStep === 1 || isSubmitting}
                onClick={() => setGstStep((s) => s - 1)}
                className="inline-flex h-10 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              {gstStep < 5 ? (
                <button
                  type="button"
                  onClick={handleGstNext}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full bg-blue-600 px-6 text-xs font-bold text-white shadow hover:bg-blue-700 transition active:scale-95"
                >
                  Next Step
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <FormSubmitButton 
                  type="submit" 
                  size="lg" 
                  loading={isSubmitting} 
                  loadingText={progressText || "Please wait..."}
                  disabled={!canStartPayment || (realPayableAmount > 0 && !razorpayPayment)}
                  className="h-10 rounded-full bg-slate-950 font-black hover:bg-slate-900 text-xs px-6 shadow"
                >
                  Submit GST Application
                </FormSubmitButton>
              )}
            </div>

          </Card>

          {/* Right Summary Column */}
          <div className="space-y-4">
            
            {/* Wallet Deductions Card */}
            <Card className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-700">
                  <IndianRupee className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pricing Summary</p>
                  <p className="text-2xl font-black text-slate-900 mt-0.5">{formatCurrency(totalAmount)}</p>
                  {clampedWalletUseAmount > 0 && (
                    <p className="text-[10px] font-bold text-blue-700 mt-0.5">Net Payable: {formatCurrency(realPayableAmount)}</p>
                  )}
                </div>
              </div>

              {/* Wallet Redeem Input (if balance exists) */}
              {wallet.balance > 0 && (
                <div className="mt-5 border-t border-slate-100/80 pt-4 space-y-2.5">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-slate-500">Available Wallet Balance</span>
                    <span className="text-slate-800 font-bold">{formatCurrency(wallet.balance)}</span>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400">Redeem Credits (Max: {formatCurrency(wallet.maxUsable)})</label>
                    <input 
                      type="number"
                      min={0}
                      max={wallet.maxUsable}
                      value={walletUseAmount}
                      onChange={(e) => {
                        const val = Math.max(0, Math.round(Number(e.target.value || 0)));
                        if (val > wallet.maxUsable) {
                          setWalletUseAmount(wallet.maxUsable);
                          toastError(walletLimitMessage);
                          return;
                        }
                        setWalletUseAmount(val);
                      }}
                      className="mt-1 block w-full glass-input-premium bg-white/70 py-2.5 px-3.5 text-xs font-semibold focus:bg-white transition"
                      placeholder="Redemption sum"
                    />
                  </div>
                  {clampedWalletUseAmount > 0 && (
                    <p className="text-[10px] font-black text-emerald-700">{formatCurrency(clampedWalletUseAmount)} deduction applied.</p>
                  )}
                </div>
              )}

              {/* Ledger Breakdown details */}
              <div className="mt-5 border-t border-slate-100/80 pt-4 space-y-2 text-xs font-semibold text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Service Fee</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
                {clampedWalletUseAmount > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>Credits Redeemed</span>
                    <span>-{formatCurrency(clampedWalletUseAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-100 pt-2 font-black text-slate-900 text-xs">
                  <span>Net Payable</span>
                  <span className="text-blue-700">{formatCurrency(realPayableAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-dashed border-slate-100 pt-2 text-[10px] text-slate-400 font-bold">
                  <span>Expected Cashback</span>
                  <span className="text-emerald-600">{formatCurrency(expectedCashback)}</span>
                </div>
              </div>
            </Card>

            {/* Trust badge */}
            <Card className="rounded-3xl border border-blue-50/50 bg-blue-50/10 p-5 shadow-sm space-y-3.5">
              <div className="flex items-center gap-2.5">
                <Shield className="h-5 w-5 text-blue-600" />
                <h4 className="text-xs font-black text-slate-900">CA Audit Protection</h4>
              </div>
              <p className="text-[10px] leading-relaxed text-slate-500 font-medium">
                Our network of certified corporate Chartered Accountants will review your paperwork beforehand to guarantee a query-free submission.
              </p>
            </Card>

          </div>

        </fieldset>
      </form>
    );
  }

  if (isItr) {
    const handleItrNext = () => {
      if (itrStep === 1) {
        if (!applicantName.trim()) {
          toastError("Please enter your name.");
          return;
        }
        if (!applicantMobile.trim() || !/^[6-9]\d{9}$/.test(applicantMobile)) {
          toastError("Please enter a valid 10-digit mobile number.");
          return;
        }
        if (!applicantEmail.trim() || !applicantEmail.includes("@")) {
          toastError("Please enter a valid email address.");
          return;
        }
        if (!applicantCity.trim()) {
          toastError("Please enter your city.");
          return;
        }
        if (!itrPanNumber.trim() || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(itrPanNumber.toUpperCase())) {
          toastError("Please enter a valid 10-digit PAN number.");
          return;
        }
        if (!itrAadhaarNumber.trim() || !/^[0-9]{12}$/.test(itrAadhaarNumber)) {
          toastError("Please enter a valid 12-digit Aadhaar number.");
          return;
        }
      } else if (itrStep === 4) {
        if (Object.values(itrFiles).filter(Boolean).length === 0) {
          toastError("Please upload at least one tax document (Form 16, AIS, or Bank Statement) to proceed.");
          return;
        }
      }
      setItrStep((s) => s + 1);
    };

    return (
      <form onSubmit={onSubmit} className="grid gap-6 pb-6 lg:grid-cols-[1fr_340px] w-full" aria-busy={isSubmitting}>
        <fieldset disabled={isSubmitting} className="contents">
          
          {/* Hidden inputs to feed standard FormData */}
          <input type="hidden" name="name" value={applicantName} />
          <input type="hidden" name="mobile" value={applicantMobile} />
          <input type="hidden" name="email" value={applicantEmail} />
          <input type="hidden" name="city" value={applicantCity} />
          <input type="hidden" name="address" value={applicantAddress} />
          <input type="hidden" name="message" value={applicantMessage} />
          <input type="hidden" name="panNumber" value={itrPanNumber} />
          <input type="hidden" name="aadhaarNumber" value={itrAadhaarNumber} />

          <Card className="rounded-[36px] border border-blue-150/60 bg-white/95 p-6 md:p-8 shadow-xl relative overflow-hidden backdrop-blur-md">
            
            {showResumeAlert && (
              <div className="mb-6 p-4 rounded-2xl bg-blue-50/50 border border-blue-150/50 flex items-center justify-between text-xs font-semibold text-blue-800 animate-[fadeIn_0.3s_ease-out]">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-black">✓</span>
                  <span>Resumed tax filing draft from last session. All progress restored.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowResumeAlert(false)}
                  className="text-blue-700 hover:text-blue-950 font-black text-xs px-2 py-1 bg-white border border-slate-100 rounded-full shadow-sm"
                >
                  Dismiss
                </button>
              </div>
            )}
            
            {/* Stepper Timeline */}
            <div className="mb-8 border-b border-slate-100 pb-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-4">Assisted ITR Filing Wizard</p>
              
              <div className="relative flex items-center justify-between max-w-2xl mx-auto px-2">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -translate-y-1/2 z-0" />
                <div 
                  className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-600 -translate-y-1/2 z-0 transition-all duration-300" 
                  style={{ width: `${((itrStep - 1) / 5) * 100}%` }}
                />

                {[
                  { step: 1, label: "Personal" },
                  { step: 2, label: "Income" },
                  { step: 3, label: "Deductions" },
                  { step: 4, label: "Documents" },
                  { step: 5, label: "Review" },
                  { step: 6, label: "Payment" }
                ].map((s) => {
                  const isCompleted = s.step < itrStep;
                  const isActive = s.step === itrStep;
                  return (
                    <div key={s.step} className="flex flex-col items-center relative z-10">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 text-[10px] font-black transition-all ${
                        isCompleted 
                          ? "bg-blue-600 border-blue-600 text-white" 
                          : isActive 
                          ? "bg-white border-blue-600 text-blue-600 active-glow-ring scale-110 shadow-md shadow-blue-500/10" 
                          : "bg-white border-slate-200 text-slate-400"
                      }`}>
                        {isCompleted ? "✓" : s.step}
                      </div>
                      <span className={`text-[9px] font-bold mt-1.5 ${
                        isActive ? "text-blue-600" : isCompleted ? "text-slate-800" : "text-slate-400"
                      }`}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step Content */}
            <div className="mt-8">
              {itrStep === 1 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-900">Personal & Tax Identity</h3>
                  <p className="text-xs text-slate-400 font-medium">Verify credentials for direct government income tax portal mapping.</p>
                  
                  <div className="grid gap-4 sm:grid-cols-2 pt-2">
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400">Full Name (As per PAN)</label>
                      <input 
                        type="text" 
                        required
                        value={applicantName}
                        onChange={(e) => setApplicantName(e.target.value)}
                        placeholder="e.g. Alok Sharma"
                        className="mt-1 block w-full glass-input-premium transition bg-white/70"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400">Mobile Number (Aadhaar linked)</label>
                      <input 
                        type="tel" 
                        required
                        pattern="[0-9]{10}"
                        value={applicantMobile}
                        onChange={(e) => setApplicantMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        placeholder="e.g. 9876543210"
                        className="mt-1 block w-full glass-input-premium transition bg-white/70"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400">Email Address</label>
                      <input 
                        type="email" 
                        required
                        value={applicantEmail}
                        onChange={(e) => setApplicantEmail(e.target.value)}
                        placeholder="e.g. alok@example.com"
                        className="mt-1 block w-full glass-input-premium transition bg-white/70"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400">City</label>
                      <input 
                        type="text" 
                        required
                        value={applicantCity}
                        onChange={(e) => setApplicantCity(e.target.value)}
                        placeholder="e.g. Pune"
                        className="mt-1 block w-full glass-input-premium transition bg-white/70"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400">PAN Card Number *</label>
                      <input 
                        type="text" 
                        required
                        maxLength={10}
                        value={itrPanNumber}
                        onChange={(e) => setItrPanNumber(e.target.value.toUpperCase())}
                        placeholder="e.g. ABCDE1234F"
                        className="mt-1 block w-full glass-input-premium transition bg-white/70 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400">Aadhaar Card Number *</label>
                      <input 
                        type="text" 
                        required
                        maxLength={12}
                        value={itrAadhaarNumber}
                        onChange={(e) => setItrAadhaarNumber(e.target.value.replace(/\D/g, "").slice(0, 12))}
                        placeholder="e.g. 123456789012"
                        className="mt-1 block w-full glass-input-premium transition bg-white/70 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {itrStep === 2 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-900">Gross Income Details</h3>
                  <p className="text-xs text-slate-400 font-medium">Provide approximate values for AY 2026-27 (Enter 0 if not applicable).</p>

                  <div className="grid gap-4 sm:grid-cols-2 pt-2">
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400">Annual Salary Income</label>
                      <input 
                        type="number" 
                        value={itrSalaryIncome}
                        onChange={(e) => setItrSalaryIncome(e.target.value)}
                        placeholder="e.g. 750000"
                        className="mt-1 block w-full glass-input-premium transition bg-white/70"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400">Business / Freelance Profits</label>
                      <input 
                        type="number" 
                        value={itrBusinessIncome}
                        onChange={(e) => setItrBusinessIncome(e.target.value)}
                        placeholder="e.g. 350500"
                        className="mt-1 block w-full glass-input-premium transition bg-white/70"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400">Capital Gains (Equity/Property)</label>
                      <input 
                        type="number" 
                        value={itrCapGains}
                        onChange={(e) => setItrCapGains(e.target.value)}
                        placeholder="e.g. 50000"
                        className="mt-1 block w-full glass-input-premium transition bg-white/70"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400">House Property Rent Received</label>
                      <input 
                        type="number" 
                        value={itrRentIncome}
                        onChange={(e) => setItrRentIncome(e.target.value)}
                        placeholder="e.g. 120000"
                        className="mt-1 block w-full glass-input-premium transition bg-white/70"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[9px] font-black uppercase text-slate-400">Other Sources (Interest / Dividends / Gift)</label>
                      <input 
                        type="number" 
                        value={itrOtherIncome}
                        onChange={(e) => setItrOtherIncome(e.target.value)}
                        placeholder="e.g. 25000"
                        className="mt-1 block w-full glass-input-premium transition bg-white/70"
                      />
                    </div>
                  </div>
                </div>
              )}

              {itrStep === 3 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-900">Deductions Claimed</h3>
                  <p className="text-xs text-slate-400 font-medium">Declare tax savings for tax optimizations (Enter 0 if none).</p>

                  <div className="grid gap-4 sm:grid-cols-2 pt-2">
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400">Section 80C (EPF/PPF/ELSS/LIC - Max 1.5L)</label>
                      <input 
                        type="number" 
                        value={itr80C}
                        onChange={(e) => setItr80C(e.target.value)}
                        placeholder="e.g. 150000"
                        className="mt-1 block w-full glass-input-premium transition bg-white/70"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400">Section 80D (Health Insurance Premium)</label>
                      <input 
                        type="number" 
                        value={itr80D}
                        onChange={(e) => setItr80D(e.target.value)}
                        placeholder="e.g. 25000"
                        className="mt-1 block w-full glass-input-premium transition bg-white/70"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400">HRA Tax Exemption (House Rent Allowance)</label>
                      <input 
                        type="number" 
                        value={itrHra}
                        onChange={(e) => setItrHra(e.target.value)}
                        placeholder="e.g. 80000"
                        className="mt-1 block w-full glass-input-premium transition bg-white/70"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400">Other Deductions (80G/80E/80TTA)</label>
                      <input 
                        type="number" 
                        value={itrOtherDeductions}
                        onChange={(e) => setItrOtherDeductions(e.target.value)}
                        placeholder="e.g. 10000"
                        className="mt-1 block w-full glass-input-premium transition bg-white/70"
                      />
                    </div>
                  </div>
                </div>
              )}

              {itrStep === 4 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-900">Upload Supporting Documents</h3>
                  <p className="text-xs text-slate-400 font-medium">Please attach at least one document to assist our Chartered Accountants (Max 5MB each).</p>

                  <div className="grid gap-4 sm:grid-cols-2 pt-2">
                    {/* Form 16 slot */}
                    <div className="p-5 rounded-[24px] border border-dashed border-slate-200 bg-slate-50/20 flex flex-col items-center text-center relative hover:bg-slate-50/40 transition group">
                      <UploadCloud className="h-8 w-8 text-blue-500 mb-2 group-hover:scale-110 transition" />
                      <h4 className="text-xs font-black text-slate-800">Form 16 (Salary Certificate)</h4>
                      <p className="text-[9px] text-slate-400 mt-1">Upload PDF, JPG or PNG</p>
                      <input 
                        type="file" 
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleItrFileChange("form16", e.target.files?.[0] || null)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      {uploadProgress.form16 !== undefined && uploadProgress.form16 < 100 && (
                        <div className="absolute inset-0 bg-white/95 rounded-[24px] flex flex-col items-center justify-center p-4 z-20">
                          <p className="text-[10px] font-black text-blue-600 mb-1.5 font-mono">Uploading Form 16... {uploadProgress.form16}%</p>
                          <div className="h-1.5 w-full max-w-[150px] bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 transition-all duration-100" style={{ width: `${uploadProgress.form16}%` }} />
                          </div>
                        </div>
                      )}
                      {itrFiles.form16 && (
                        <div className="mt-3 px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-black rounded-lg flex items-center gap-1.5 z-10">
                          <Check className="h-3.5 w-3.5 text-emerald-650" />
                          <span className="truncate max-w-[150px]">{itrFiles.form16.name}</span>
                          <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); handleItrFileChange("form16", null); }}
                            className="ml-1 text-emerald-800 hover:text-emerald-950 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>

                    {/* AIS Statement slot */}
                    <div className="p-5 rounded-[24px] border border-dashed border-slate-200 bg-slate-50/20 flex flex-col items-center text-center relative hover:bg-slate-50/40 transition group">
                      <UploadCloud className="h-8 w-8 text-blue-500 mb-2 group-hover:scale-110 transition" />
                      <h4 className="text-xs font-black text-slate-800">AIS / TIS Statement</h4>
                      <p className="text-[9px] text-slate-400 mt-1">Upload PDF, JPG or PNG</p>
                      <input 
                        type="file" 
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleItrFileChange("ais", e.target.files?.[0] || null)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      {uploadProgress.ais !== undefined && uploadProgress.ais < 100 && (
                        <div className="absolute inset-0 bg-white/95 rounded-[24px] flex flex-col items-center justify-center p-4 z-20">
                          <p className="text-[10px] font-black text-blue-600 mb-1.5 font-mono">Uploading AIS... {uploadProgress.ais}%</p>
                          <div className="h-1.5 w-full max-w-[150px] bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 transition-all duration-100" style={{ width: `${uploadProgress.ais}%` }} />
                          </div>
                        </div>
                      )}
                      {itrFiles.ais && (
                        <div className="mt-3 px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-black rounded-lg flex items-center gap-1.5 z-10">
                          <Check className="h-3.5 w-3.5 text-emerald-650" />
                          <span className="truncate max-w-[150px]">{itrFiles.ais.name}</span>
                          <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); handleItrFileChange("ais", null); }}
                            className="ml-1 text-emerald-800 hover:text-emerald-950 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Bank Statements slot */}
                    <div className="p-5 rounded-[24px] border border-dashed border-slate-200 bg-slate-50/20 flex flex-col items-center text-center relative hover:bg-slate-50/40 transition group">
                      <UploadCloud className="h-8 w-8 text-blue-500 mb-2 group-hover:scale-110 transition" />
                      <h4 className="text-xs font-black text-slate-800">Bank Statements (FY 25-26)</h4>
                      <p className="text-[9px] text-slate-400 mt-1">Upload PDF, JPG or PNG</p>
                      <input 
                        type="file" 
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleItrFileChange("bankStatements", e.target.files?.[0] || null)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      {uploadProgress.bankStatements !== undefined && uploadProgress.bankStatements < 100 && (
                        <div className="absolute inset-0 bg-white/95 rounded-[24px] flex flex-col items-center justify-center p-4 z-20">
                          <p className="text-[10px] font-black text-blue-600 mb-1.5 font-mono">Uploading Bank... {uploadProgress.bankStatements}%</p>
                          <div className="h-1.5 w-full max-w-[150px] bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 transition-all duration-100" style={{ width: `${uploadProgress.bankStatements}%` }} />
                          </div>
                        </div>
                      )}
                      {itrFiles.bankStatements && (
                        <div className="mt-3 px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-black rounded-lg flex items-center gap-1.5 z-10">
                          <Check className="h-3.5 w-3.5 text-emerald-650" />
                          <span className="truncate max-w-[150px]">{itrFiles.bankStatements.name}</span>
                          <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); handleItrFileChange("bankStatements", null); }}
                            className="ml-1 text-emerald-800 hover:text-emerald-950 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Capital Gains reports slot */}
                    <div className="p-5 rounded-[24px] border border-dashed border-slate-200 bg-slate-50/20 flex flex-col items-center text-center relative hover:bg-slate-50/40 transition group">
                      <UploadCloud className="h-8 w-8 text-blue-500 mb-2 group-hover:scale-110 transition" />
                      <h4 className="text-xs font-black text-slate-800">Capital Gain Reports (Broker Ledger)</h4>
                      <p className="text-[9px] text-slate-400 mt-1">Upload PDF, JPG or PNG</p>
                      <input 
                        type="file" 
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleItrFileChange("capGains", e.target.files?.[0] || null)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      {uploadProgress.capGains !== undefined && uploadProgress.capGains < 100 && (
                        <div className="absolute inset-0 bg-white/95 rounded-[24px] flex flex-col items-center justify-center p-4 z-20">
                          <p className="text-[10px] font-black text-blue-600 mb-1.5 font-mono">Uploading Ledger... {uploadProgress.capGains}%</p>
                          <div className="h-1.5 w-full max-w-[150px] bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 transition-all duration-100" style={{ width: `${uploadProgress.capGains}%` }} />
                          </div>
                        </div>
                      )}
                      {itrFiles.capGains && (
                        <div className="mt-3 px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-black rounded-lg flex items-center gap-1.5 z-10">
                          <Check className="h-3.5 w-3.5 text-emerald-650" />
                          <span className="truncate max-w-[150px]">{itrFiles.capGains.name}</span>
                          <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); handleItrFileChange("capGains", null); }}
                            className="ml-1 text-emerald-800 hover:text-emerald-950 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {itrStep === 5 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-900">Review Declaration Summary</h3>
                  <p className="text-xs text-slate-400 font-medium">Verify your tax ledger coordinates before routing to payment gateways.</p>

                  <div className="p-4 rounded-3xl border border-slate-100 bg-slate-50/50 space-y-4">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-slate-500">Applicant:</span>
                      <span className="font-black text-slate-900">{applicantName}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-slate-500">PAN / Aadhaar:</span>
                      <span className="font-black text-slate-900 font-mono">{itrPanNumber} / {itrAadhaarNumber.slice(0, 4)}...</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-slate-500">Total Declared Income:</span>
                      <span className="font-black text-slate-900">
                        {formatCurrency(
                          Number(itrSalaryIncome || 0) + 
                          Number(itrBusinessIncome || 0) + 
                          Number(itrCapGains || 0) + 
                          Number(itrRentIncome || 0) + 
                          Number(itrOtherIncome || 0)
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-slate-500">Total Deductions:</span>
                      <span className="font-black text-emerald-700">
                        {formatCurrency(
                          Number(itr80C || 0) + 
                          Number(itr80D || 0) + 
                          Number(itrHra || 0) + 
                          Number(itrOtherDeductions || 0)
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-semibold border-t border-slate-200/50 pt-3">
                      <span className="text-slate-500">Attached Certificates:</span>
                      <span className="font-black text-blue-700">
                        {Object.values(itrFiles).filter(Boolean).length} Documents
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {itrStep === 6 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-900">Review & Payment</h3>
                  <p className="text-xs text-slate-400 font-medium">Verify your application ledger and initiate secure payment.</p>

                  <div className="p-4 rounded-3xl border border-slate-100 bg-slate-50/50 space-y-3 text-xs font-semibold">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Filing Plan:</span>
                      <span className="font-black text-slate-900">{selectedServices[0]?.title}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Service Fee:</span>
                      <span className="font-black text-slate-900">{formatCurrency(totalAmount)}</span>
                    </div>
                    {clampedWalletUseAmount > 0 && (
                      <div className="flex justify-between items-center text-orange-600">
                        <span>Wallet Redeemed:</span>
                        <span>-{formatCurrency(clampedWalletUseAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center border-t border-slate-250 pt-2 font-black text-slate-900 text-sm">
                      <span>Net Payable:</span>
                      <span className="text-blue-700">{formatCurrency(realPayableAmount)}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-2">
                    {realPayableAmount > 0 ? (
                      <div className="space-y-4">
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

                        {razorpayPayment && (
                          <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-100 px-3.5 py-2 text-xs font-black text-emerald-700">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-650" />
                            Payment verified: {razorpayPayment.razorpay_payment_id}
                          </div>
                        )}

                        <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            <div className="flex items-center gap-1.5 text-blue-600">
                              <Lock className="h-3.5 w-3.5 shrink-0" />
                              <span>SECURE 256-BIT SSL</span>
                            </div>
                            <span className="text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-100">Razorpay Secured</span>
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 leading-normal">
                            All card details, UPI transactions and netbanking sessions are encrypted and securely authenticated directly via Razorpay.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-emerald-50 px-4 py-3.5 text-xs font-black text-emerald-800 border border-emerald-100 text-center">
                        🎉 Wallet balance covers 100% of order. Click submit below.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center mt-10 pt-6 border-t border-slate-100/80">
              <button
                type="button"
                disabled={itrStep === 1 || isSubmitting}
                onClick={() => setItrStep((s) => s - 1)}
                className="inline-flex h-10 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              {itrStep < 6 ? (
                <button
                  type="button"
                  onClick={handleItrNext}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full bg-blue-600 px-6 text-xs font-bold text-white shadow hover:bg-blue-700 transition active:scale-95"
                >
                  Next Step
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <FormSubmitButton 
                  type="submit" 
                  size="lg" 
                  loading={isSubmitting} 
                  loadingText={progressText || "Please wait..."}
                  disabled={!canStartPayment || (realPayableAmount > 0 && !razorpayPayment)}
                  className="h-10 rounded-full bg-slate-950 font-black hover:bg-slate-900 text-xs px-6 shadow"
                >
                  Submit ITR Application
                </FormSubmitButton>
              )}
            </div>

          </Card>

          {/* Right Summary Column */}
          <div className="space-y-4">
            
            {/* Wallet Deductions Card */}
            <Card className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-700">
                  <IndianRupee className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pricing Summary</p>
                  <p className="text-2xl font-black text-slate-900 mt-0.5">{formatCurrency(totalAmount)}</p>
                  {clampedWalletUseAmount > 0 && (
                    <p className="text-[10px] font-bold text-blue-700 mt-0.5">Net Payable: {formatCurrency(realPayableAmount)}</p>
                  )}
                </div>
              </div>

              {/* Wallet Redeem Input (if balance exists) */}
              {wallet.balance > 0 && (
                <div className="mt-5 border-t border-slate-100/80 pt-4 space-y-2.5">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-slate-500">Available Wallet Balance</span>
                    <span className="text-slate-800 font-bold">{formatCurrency(wallet.balance)}</span>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400">Redeem Credits (Max: {formatCurrency(wallet.maxUsable)})</label>
                    <input 
                      type="number"
                      min={0}
                      max={wallet.maxUsable}
                      value={walletUseAmount}
                      onChange={(e) => {
                        const val = Math.max(0, Math.round(Number(e.target.value || 0)));
                        if (val > wallet.maxUsable) {
                          setWalletUseAmount(wallet.maxUsable);
                          toastError(walletLimitMessage);
                          return;
                        }
                        setWalletUseAmount(val);
                      }}
                      className="mt-1 block w-full glass-input-premium bg-white/70 py-2.5 px-3.5 text-xs font-semibold focus:bg-white transition"
                      placeholder="Redemption sum"
                    />
                  </div>
                  {clampedWalletUseAmount > 0 && (
                    <p className="text-[10px] font-black text-emerald-700">{formatCurrency(clampedWalletUseAmount)} deduction applied.</p>
                  )}
                </div>
              )}

              {/* Ledger Breakdown details */}
              <div className="mt-5 border-t border-slate-100/80 pt-4 space-y-2 text-xs font-semibold text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Service Fee</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
                {clampedWalletUseAmount > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>Credits Redeemed</span>
                    <span>-{formatCurrency(clampedWalletUseAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-100 pt-2 font-black text-slate-900 text-xs">
                  <span>Net Payable</span>
                  <span className="text-blue-700">{formatCurrency(realPayableAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-dashed border-slate-100 pt-2 text-[10px] text-slate-400 font-bold">
                  <span>Expected Cashback</span>
                  <span className="text-emerald-600">{formatCurrency(expectedCashback)}</span>
                </div>
              </div>
            </Card>

            {/* Trust badge */}
            <Card className="rounded-3xl border border-blue-50/50 bg-blue-50/10 p-5 shadow-sm space-y-3.5">
              <div className="flex items-center gap-2.5">
                <Shield className="h-5 w-5 text-blue-600" />
                <h4 className="text-xs font-black text-slate-900">CA Audit Protection</h4>
              </div>
              <p className="text-[10px] leading-relaxed text-slate-500 font-medium">
                Our network of certified corporate Chartered Accountants will review your tax filing details to guarantee a query-free submission and secure maximum refund.
              </p>
            </Card>

          </div>

        </fieldset>
      </form>
    );
  }

  if (isCmYuva) {
    return (
      <form onSubmit={onSubmit} className="mx-auto max-w-3xl w-full pb-10" aria-busy={isSubmitting}>
        <fieldset disabled={isSubmitting} className="contents">
          <Card className="rounded-2xl border border-blue-100 bg-white/95 p-4 shadow-sm md:p-6">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">Premium Assistance</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                {service.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500 font-semibold">
                Complete the official 6-step form to register and prepare your CM YUVA business loan documentation.
              </p>
            </div>

            <CmYuvaApplicationFields
              values={cmYuvaValues}
              onChange={updateCmYuvaValue}
              pincodeStatus={pincodeStatus}
              currentStep={cmYuvaStep}
              onStepChange={setCmYuvaStep}
              filesState={cmYuvaFiles}
              onFileChange={(key, file) => {
                setCmYuvaFiles((prev) => ({ ...prev, [key]: file }));
              }}
              walletBalance={wallet.balance}
              paymentVerified={Boolean(razorpayPayment)}
              appliedCouponCode={appliedCouponCode}
              appliedCouponDiscount={appliedCouponDiscount}
              onApplyCouponCode={handleApplyCoupon}
              onRemoveCouponCode={handleRemoveCoupon}
              couponError={couponError}
              couponApplying={couponApplying}
              razorpayButton={
                realPayableAmount > 0 ? (
                  <RazorpayCheckoutButton
                    amountPaise={payableAmountPaise}
                    receipt={paymentReceipt}
                    serviceSlug={selectedServices[0]?.slug}
                    serviceSlugs={selectedServices.map((item) => item.slug)}
                    walletUseAmount={clampedWalletUseAmount}
                    couponCode={appliedCouponCode}
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
                ) : (
                  <div className="rounded-xl bg-emerald-50 px-3.5 py-3 text-xs font-extrabold text-emerald-800 border border-emerald-100">
                    🎉 100% Wallet discount applied! Zero fresh payment required.
                  </div>
                )
              }
            />

            {/* Custom submit button for Step 6 if payment verified or amount is 0 */}
            {cmYuvaStep === 6 && (
              <div className="mt-6 pt-4 border-t border-slate-100">
                <FormSubmitButton
                  type="submit"
                  size="lg"
                  loading={isSubmitting}
                  loadingText={progressText || "Please wait..."}
                  disabled={!canStartPayment || (realPayableAmount > 0 && !razorpayPayment)}
                  className="w-full h-12 rounded-xl bg-slate-950 text-sm font-extrabold hover:bg-slate-900 shadow-md shadow-slate-950/10"
                >
                  Submit Application
                </FormSubmitButton>
              </div>
            )}
          </Card>
        </fieldset>
      </form>
    );
  }

  return (
    <>
    <form onSubmit={onSubmit} className="grid gap-4 pb-4 lg:grid-cols-[1fr_340px]" aria-busy={isSubmitting}>
      <fieldset disabled={isSubmitting} className="contents">
      <Card className="rounded-[28px] border border-slate-100 bg-white/70 backdrop-blur-xl p-5 md:p-7 shadow-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Complete Application</p>
          <h2 className="mt-2 text-xl font-black text-slate-900 tracking-tight">
            {selectedServices.length > 1 ? "Multiple Service Application" : service.title}
          </h2>
          <p className="mt-1 text-xs text-slate-400 font-medium">
            Fill the form, upload documents, pay securely with Razorpay, and track your application in the dashboard.
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800">Selected Services</p>
              <p className="mt-0.5 text-[10px] text-slate-400 font-medium">Each service will be submitted as a separate application record.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {selectedServices.map((item) => (
              <div key={item.slug} className="min-w-0 rounded-xl bg-white border border-slate-100 p-3 shadow-sm">
                <p className="truncate text-xs font-bold text-slate-800">{item.title}</p>
                <p className="mt-1 text-xs font-extrabold text-orange-600">{formatCurrency(item.amount)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <p className="text-xs font-bold text-slate-800">Applicant Details</p>
          {isPmVishwakarma ? (
            <PmVishwakarmaApplicationFields values={pmVishwakarmaValues} onChange={updatePmVishwakarmaValue} pincodeStatus={pincodeStatus} />
          ) : isEshram ? (
            <EshramApplicationFields values={eshramValues} onChange={updateEshramValue} pincodeStatus={pincodeStatus} />
          ) : isPvcCard ? (
            <PvcCardApplicationFields
              values={pvcCardValues}
              onChange={updatePvcCardValue}
              pincodeStatus={pincodeStatus}
              selectedFiles={selectedDocuments}
              onFilesChange={setSelectedDocuments}
            />
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400">Full Name *</label>
                <input 
                  type="text" 
                  name="name"
                  required
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="mt-1 block w-full glass-input-premium transition bg-white/70"
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400">Mobile Number *</label>
                <input 
                  type="tel" 
                  name="mobile"
                  required
                  pattern="[0-9]{10}"
                  value={applicantMobile}
                  onChange={(e) => setApplicantMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="e.g. 9876543210"
                  className="mt-1 block w-full glass-input-premium transition bg-white/70"
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400">Email Address *</label>
                <input 
                  type="email" 
                  name="email"
                  required
                  value={applicantEmail}
                  onChange={(e) => setApplicantEmail(e.target.value)}
                  placeholder="e.g. rahul@example.com"
                  className="mt-1 block w-full glass-input-premium transition bg-white/70"
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400">City *</label>
                <input 
                  type="text" 
                  name="city"
                  required
                  value={applicantCity}
                  onChange={(e) => setApplicantCity(e.target.value)}
                  placeholder="e.g. Lucknow"
                  className="mt-1 block w-full glass-input-premium transition bg-white/70"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[9px] font-black uppercase text-slate-400">Full Address Details (Optional)</label>
                <input 
                  type="text" 
                  name="address"
                  value={applicantAddress}
                  onChange={(e) => setApplicantAddress(e.target.value)}
                  placeholder="e.g. Flat 302, Sharma Heights"
                  className="mt-1 block w-full glass-input-premium transition bg-white/70"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[9px] font-black uppercase text-slate-400">Notes / Special Instructions (Optional)</label>
                <textarea 
                  name="message"
                  value={applicantMessage}
                  onChange={(e) => setApplicantMessage(e.target.value)}
                  placeholder="Add any specific details our team should know about this filing..."
                  className="mt-1 block w-full glass-input-premium transition bg-white/70 min-h-24 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {!isPvcCard && !isCmYuva ? (
          <div className="mt-6 p-6 rounded-[28px] border border-dashed border-blue-200/80 bg-blue-50/5 hover:bg-blue-50/10 transition text-center flex flex-col items-center justify-center relative group">
            <UploadCloud className="h-9 w-9 text-blue-500 mb-2 group-hover:scale-110 transition duration-300" />
            <div className="max-w-md mx-auto relative z-10">
              <p className="font-black text-slate-900 text-xs sm:text-sm">{isEshram ? "Upload Supporting Documents (Optional)" : "Upload Aadhaar / Required Documents"}</p>
              <p className="mt-1 text-[10px] text-slate-400 font-semibold leading-normal">
                {isEshram ? "No Aadhaar upload is mandatory here. Add files only when you want our team to review them." : "Aadhaar document is required. Add additional files only if needed."}
              </p>
              <div className="mt-4 relative inline-block cursor-pointer">
                <input
                  name="documents"
                  type="file"
                  multiple
                  required={!selectedDocuments.length && !isEshram}
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
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
                <span className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-blue-600 px-5 text-xs font-bold text-white shadow hover:bg-blue-700 transition active:scale-95">
                  Browse Files
                </span>
              </div>
              
              {selectedDocuments.length ? (
                <div className="mt-5 grid gap-2">
                  {selectedDocuments.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3.5 py-2.5 text-xs shadow-sm">
                      <span className="flex min-w-0 items-center gap-2 font-bold text-slate-700">
                        <FileCheck2 className="h-4 w-4 shrink-0 text-emerald-500" />
                        <span className="truncate max-w-[180px]">{file.name}</span>
                      </span>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => setSelectedDocuments((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[9px] font-extrabold text-red-500 hover:bg-red-100 transition cursor-pointer border-none"
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
        ) : null}
      </Card>

      <div className="space-y-4">
        {/* Dynamic Ledger Summary Card */}
        <Card className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-sm border border-blue-100">
              <IndianRupee className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Service Subtotal</p>
              <p className="text-xl font-black text-slate-900 leading-tight mt-0.5">{formatCurrency(totalAmount)}</p>
              {clampedWalletUseAmount > 0 ? <p className="text-[10.5px] font-bold text-blue-600 mt-1">Payable Net: {formatCurrency(realPayableAmount)}</p> : null}
            </div>
          </div>
        </Card>

        {realPayableAmount > 0 ? (
          <Card className="rounded-[24px] border border-orange-100 bg-orange-50/10 p-5 shadow-sm space-y-3.5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600 border border-orange-200">
                <CreditCard className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-black text-slate-900 text-xs uppercase tracking-wide">Secure Checkout</p>
                <p className="mt-1 text-[10.5px] font-medium leading-relaxed text-slate-500">
                  Pay securely by UPI, Cards, Netbanking, or Wallet. Handled and verified directly by Razorpay secure channels.
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
                  <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-[10px] font-extrabold text-emerald-600 border border-emerald-100">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Payment verified: {razorpayPayment.razorpay_payment_id}
                  </div>
                ) : null}
                {!canStartPayment ? (
                  <p className="mt-3 rounded-xl bg-orange-50 border border-orange-100/50 px-3 py-2 text-[10px] font-bold text-orange-700 leading-normal">
                    {isPmVishwakarma
                      ? "Fill required PM Vishwakarma fields, accept terms, and upload documents before payment."
                      : isEshram
                        ? "Fill required e-Shram fields and consent before payment."
                      : isPvcCard
                        ? "Fill PVC card fields, accept terms, and upload front & back images before payment."
                      : isCmYuva
                        ? "Complete steps, select package, and upload documents before payment."
                        : "Complete name, 10-digit mobile, email, city, and upload Aadhaar before payment."}
                  </p>
                ) : null}
              </div>
            </div>
          </Card>
        ) : realPayableAmount === 0 && clampedWalletUseAmount > 0 ? (
          <Card className="rounded-[24px] border border-emerald-150 bg-emerald-50/15 p-5 shadow-sm space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <WalletCards className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-black text-slate-900 text-xs uppercase tracking-wide">100% Wallet Cover</p>
                <p className="mt-1 text-[10.5px] font-medium leading-relaxed text-slate-500">
                  Your wallet credits will cover the entire amount. Zero Razorpay payment needed.
                </p>
                <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-700 border border-emerald-100">
                  🎉 {formatCurrency(clampedWalletUseAmount)} will be debited from your DigiWallet.
                </div>
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
                &bull; Wallet Cap Rule: You can redeem up to 50% of service price and 50% of your wallet balance — whichever is lower.
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
                <input
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
                  className="h-10 w-full glass-input-premium bg-white/70 py-2.5 px-3.5 text-xs font-bold focus:bg-white transition"
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
                    ? "* Get 20% cashback credited to your reward wallet after successful payment."
                    : "* Get 100% cashback credited to your reward wallet after successful payment (First paid service bonus)."}
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
