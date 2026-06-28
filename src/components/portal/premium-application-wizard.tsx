"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  type LucideIcon,
  Search, Check, Shield, CreditCard, Wallet, AlertTriangle, ArrowLeft, ArrowRight,
  Camera, Upload, Trash2, Edit2, Download, Copy, RefreshCw, X, FileText, MapPin,
  UserCheck, Sparkles, Building, Briefcase, Car, FileCheck, HeartHandshake,
  RotateCw, ZoomIn, ZoomOut, AlertCircle, Share2, QrCode, ClipboardList
} from "lucide-react";
import { servicesData, type ServiceItem } from "@/lib/services-data";
import { getDynamicServiceConfig, type FieldSchema } from "@/lib/services-config";
import { useToast } from "@/components/providers/toast-provider";
import Script from "next/script";

// Icon mapping for categories
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  cards: CreditCard,
  loans: HeartHandshake,
  banking: Building,
  licence: Car,
  tax: FileCheck,
  company: Briefcase,
  insurance: Shield
};

const STEPS = [
  { id: 1, label: "Service" },
  { id: 2, label: "Details" },
  { id: 3, label: "Customer" },
  { id: 4, label: "Documents" },
  { id: 5, label: "Review" },
  { id: 6, label: "Payment" },
  { id: 7, label: "Success" }
];

export interface PremiumApplicationWizardProps {
  initialServiceSlug?: string;
  initialProfileFields?: {
    mobile?: string;
    pincode?: string;
    city?: string;
    state?: string;
  };
}

interface CustomerApplicationHistoryItem {
  id: string;
  serviceName: string;
  serviceSlug: string;
  status: string;
  amount: number;
  createdAt: string;
  assignedTo: string;
}

interface DuplicateMatchItem {
  applicationId: string;
  serviceName: string;
  status: string;
  createdAt: string;
  matchedField: string;
  matchedValue: string;
}

export function PremiumApplicationWizard({
  initialServiceSlug,
  initialProfileFields
}: PremiumApplicationWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { success: toastSuccess, error: toastError, toast } = useToast();

  const toastWarning = (title: string, description?: string) => {
    toast({ title, description, variant: "default" });
  };

  // Step state
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);

  // Dynamic Service Config derived from JSON Driven Configuration Registry
  const serviceConfig = useMemo(() => {
    if (!selectedService) return null;
    return getDynamicServiceConfig(selectedService.slug, selectedService.categorySlug);
  }, [selectedService]);

  // Selected Plan state
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");

  // Customer Contact State
  const [profileData, setProfileData] = useState<{
    name: string;
    mobile: string;
    altMobile: string;
    email: string;
    address: string;
    pincode: string;
    city: string;
    state: string;
    district: string;
  }>({
    name: "",
    mobile: initialProfileFields?.mobile || "",
    altMobile: "",
    email: "",
    address: "",
    pincode: initialProfileFields?.pincode || "",
    city: initialProfileFields?.city || "",
    state: initialProfileFields?.state || "",
    district: "",
  });

  // Customer 360 view details
  const [customer360, setCustomer360] = useState<{
    found: boolean;
    name: string;
    avatarUrl: string;
    totalApplications: number;
    completedApplications: number;
    pendingApplications: number;
    recentServices: string[];
    recentApplications: CustomerApplicationHistoryItem[];
    walletBalance: number;
    customerSince: string;
    lastVisit: string;
  } | null>(null);

  const [customerLookupStatus, setCustomerLookupStatus] = useState<"idle" | "searching" | "found" | "not_found">("idle");
  const [pincodeLookupStatus, setPincodeLookupStatus] = useState<"idle" | "searching" | "found" | "not_found">("idle");
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);

  // Dynamic Form Field details
  const [serviceDetails, setServiceDetails] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [validatedFields, setValidatedFields] = useState<Record<string, boolean>>({});

  // Document management center states
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [fileMetadata, setFileMetadata] = useState<Record<string, { size: string; type: string; sharpness: string; dpi: number; validationPassed: boolean; errors: string[] }>>({});
  const [rotateAngle, setRotateAngle] = useState<Record<string, number>>({});
  const [zoomScale, setZoomScale] = useState<Record<string, number>>({});

  // OCR scanning state
  const [ocrScanningSlot, setOcrScanningSlot] = useState<string | null>(null);
  const [ocrExtractionResult, setOcrExtractionResult] = useState<{
    slot: string;
    fields: { fieldName: string; extractedValue: string; confidence: number }[];
  } | null>(null);

  // Duplicate Check warning
  const [duplicateWarning, setDuplicateWarning] = useState<{
    show: boolean;
    duplicates: DuplicateMatchItem[];
  } | null>(null);

  // Pricing & Coupon
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);
  const [splitPayment, setSplitPayment] = useState(false);

  // Notifications Simulation
  const [notificationLogs, setNotificationLogs] = useState<{ type: "WhatsApp" | "Email" | "SMS"; message: string; timestamp: string }[]>([]);

  // Submission details
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScriptReady, setIsScriptReady] = useState(false);
  const [successDetails, setSuccessDetails] = useState<{
    applicationId: string;
    invoiceId: string;
    customerName: string;
    serviceTitle: string;
    amountPaid: number;
    processingTime: string;
    paymentStatus: string;
  } | null>(null);

  // Search Step 1
  const [searchQuery, setSearchQuery] = useState("");
  const [showAutoSaveToast, setShowAutoSaveToast] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>("");

  // Initialize service if slug is provided
  useEffect(() => {
    const slug = initialServiceSlug || searchParams.get("service");
    if (slug) {
      const found = servicesData.find((s) => s.slug === slug || (s.slug === `cibil-report-increase` && slug === `cibil-report-analysis-and-credit-health-consultation`));
      if (found) {
        setSelectedService(found);
        setCurrentStep(2);
      }
    }
  }, [initialServiceSlug, searchParams]);

  // Configure first plan if config details load
  useEffect(() => {
    if (serviceConfig?.plans && serviceConfig.plans.length > 0) {
      setSelectedPlanId(serviceConfig.plans[0].id);
    } else {
      setSelectedPlanId("");
    }
  }, [serviceConfig]);

  // Load profile statistics
  useEffect(() => {
    fetch("/api/customer/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.isLoggedIn && data.profile) {
          setProfileData((prev) => ({
            ...prev,
            name: prev.name || data.profile.name || "",
            mobile: prev.mobile || data.profile.mobile || "",
            email: prev.email || data.profile.email || "",
            address: prev.address || data.profile.address || "",
            pincode: prev.pincode || data.profile.pincode || "",
            city: prev.city || data.profile.city || "",
            state: prev.state || data.profile.state || "",
            district: prev.district || data.profile.district || "",
          }));
          if (data.wallet) {
            setWalletBalance(data.wallet.balance || 0);
          }
        }
      })
      .catch((err) => console.error("Error loading user profile:", err));
  }, []);

  // Restore Draft options
  useEffect(() => {
    const savedDraft = localStorage.getItem("dukan_wizard_enterprise_draft");
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed.selectedServiceSlug && !initialServiceSlug) {
          const found = servicesData.find((s) => s.slug === parsed.selectedServiceSlug);
          if (found) {
            setSelectedService(found);
            setServiceDetails(parsed.serviceDetails || {});
            setProfileData((prev) => ({ ...prev, ...parsed.profileData }));
            setCurrentStep(parsed.currentStep || 1);
            if (toastSuccess) toastSuccess("Restored your previous enterprise application draft!");
          }
        }
      } catch (e) {
        console.error("Error restoring draft", e);
      }
    }
  }, [initialServiceSlug, toastSuccess]);

  // Autosave
  useEffect(() => {
    if (!selectedService) return;
    const timeout = setTimeout(() => {
      const draft = {
        selectedServiceSlug: selectedService.slug,
        serviceDetails,
        profileData,
        currentStep
      };
      localStorage.setItem("dukan_wizard_enterprise_draft", JSON.stringify(draft));
      setLastSavedTime(new Date().toLocaleTimeString());
      setShowAutoSaveToast(true);
      setTimeout(() => setShowAutoSaveToast(false), 2000);
    }, 2000);

    return () => clearTimeout(timeout);
  }, [selectedService, serviceDetails, profileData, currentStep]);

  // PIN lookup
  useEffect(() => {
    const pin = profileData.pincode.replace(/\D/g, "");
    if (pin.length === 6) {
      setPincodeLookupStatus("searching");
      fetch(`/api/pincode?pincode=${pin}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setProfileData((prev) => ({
              ...prev,
              city: data.city || prev.city,
              state: data.state || prev.state,
              district: data.district || prev.district || "",
            }));
            setPincodeLookupStatus("found");
          } else {
            setPincodeLookupStatus("not_found");
          }
        })
        .catch(() => setPincodeLookupStatus("not_found"));
    } else {
      setPincodeLookupStatus("idle");
    }
  }, [profileData.pincode]);

  // Customer 360 Lookup
  useEffect(() => {
    const mob = profileData.mobile.replace(/\D/g, "");
    if (mob.length === 10) {
      setCustomerLookupStatus("searching");
      fetch(`/api/customer/lookup?mobile=${mob}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.found) {
            setCustomer360({
              found: true,
              name: data.profile.name,
              avatarUrl: data.profile.avatarUrl,
              totalApplications: data.stats.totalApplications,
              completedApplications: data.stats.completedApplications,
              pendingApplications: data.stats.pendingApplications,
              recentServices: data.stats.recentServices,
              recentApplications: data.stats.recentApplications,
              walletBalance: data.stats.walletBalance,
              customerSince: data.stats.customerSince,
              lastVisit: data.stats.lastVisit,
            });
            setCustomerLookupStatus("found");
            if (toastSuccess) toastSuccess("Customer record sync'd. Open 360° Panel below to autofill.");
          } else {
            setCustomerLookupStatus("not_found");
            setCustomer360(null);
          }
        })
        .catch(() => {
          setCustomerLookupStatus("not_found");
          setCustomer360(null);
        });
    } else {
      setCustomerLookupStatus("idle");
      setCustomer360(null);
    }
  }, [profileData.mobile, toastSuccess]);

  // Live Inline Validation for Dynamic Inputs
  const handleLiveValidate = (field: FieldSchema, value: string) => {
    const rule = field.validation?.ruleType;
    let err = "";
    if (field.required && !value.trim()) {
      err = `${field.label} is required.`;
    } else if (value.trim()) {
      if (rule === "pan") {
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(value)) {
          err = "Invalid PAN card format (e.g. ABCDE1234F).";
        }
      } else if (rule === "aadhaar") {
        if (!/^[2-9][0-9]{11}$/.test(value)) {
          err = "Invalid Aadhaar number (must be 12 digits).";
        }
      } else if (rule === "gstin") {
        if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(value)) {
          err = "Invalid GSTIN format (e.g. 07AAAAA1111A1Z1).";
        }
      } else if (rule === "pincode") {
        if (!/^\d{6}$/.test(value)) {
          err = "Invalid Pincode (must be 6 digits).";
        }
      } else if (rule === "email") {
        if (!/\S+@\S+\.\S+/.test(value)) {
          err = "Invalid Email address.";
        }
      } else if (rule === "phone") {
        if (!/^[6-9]\d{9}$/.test(value)) {
          err = "Invalid Indian mobile number.";
        }
      } else if (rule === "ifsc") {
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(value)) {
          err = "Invalid IFSC Code (e.g. SBIN0001234).";
        }
      } else if (rule === "bank_account") {
        if (!/^\d{9,18}$/.test(value)) {
          err = "Invalid Bank Account Number (9-18 digits).";
        }
      }
    }

    setValidationErrors((prev) => {
      const copy = { ...prev };
      if (err) copy[field.name] = err;
      else delete copy[field.name];
      return copy;
    });

    setValidatedFields((prev) => ({
      ...prev,
      [field.name]: !err && value.trim().length > 0
    }));

    // Trigger Async Duplicate check if unique field is completed (PAN, Aadhaar, GSTIN)
    if (!err && value.trim() && ["panNumber", "aadhaarNumber", "aadhaar", "businessPan", "gstin"].includes(field.name)) {
      void triggerDuplicateCheck(field.name, value);
    }
  };

  // Duplicate Check API invoker
  const triggerDuplicateCheck = async (fieldName: string, value: string) => {
    if (!selectedService) return;
    try {
      const response = await fetch("/api/applications/check-duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceSlug: selectedService.slug,
          identifiers: { [fieldName]: value }
        })
      });
      const result = await response.json();
      if (result.success && result.duplicateFound) {
        setDuplicateWarning({
          show: true,
          duplicates: result.duplicates
        });
        if (toastWarning) toastWarning(`Potential duplicate found for ${fieldName}! Check duplicate log.`);
      }
    } catch (e) {
      console.error("Error checking duplicates:", e);
    }
  };

  // Pricing calculations based on Selected Plan
  const planDetails = useMemo(() => {
    if (!serviceConfig) return null;
    if (!selectedPlanId) return null;
    return serviceConfig.plans?.find((p) => p.id === selectedPlanId) || null;
  }, [serviceConfig, selectedPlanId]);

  const basePrice = planDetails ? planDetails.price : (selectedService?.amount || 0);
  const govFee = serviceConfig?.govFee || 0;
  const serviceCharge = planDetails ? Math.max(0, planDetails.price - govFee) : (serviceConfig?.serviceCharge || 0);
  const gstAmount = Math.round(serviceCharge * 0.18);
  const totalDueBeforeOffsets = basePrice + gstAmount;

  const discountAmount = appliedCoupon ? appliedCoupon.discount : 0;
  const walletRedeemAmount = useWallet ? Math.min(walletBalance, Math.max(0, totalDueBeforeOffsets - discountAmount)) : 0;
  
  const totalAmountPayable = Math.max(0, totalDueBeforeOffsets - discountAmount - walletRedeemAmount);
  
  // Split payment configuration
  const initialInstallment = splitPayment ? Math.round(totalAmountPayable * 0.5) : totalAmountPayable;
  const payLaterInstallment = splitPayment ? Math.round(totalAmountPayable * 0.5) : 0;

  // Filter service catalog
  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return servicesData;
    return servicesData.filter(
      (s) =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.shortDescription.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  // Form Progress Completion Score
  const completionScore = useMemo(() => {
    let score = 0;
    if (selectedService) score += 20; // Step 1 Selected
    
    // Step 2 dynamic fields populated
    if (serviceConfig) {
      const activeFields = serviceConfig.formSections.flatMap((s) => s.fields);
      const reqCount = activeFields.filter((f) => f.required).length;
      if (reqCount === 0) {
        score += 20;
      } else {
        const completedReq = activeFields.filter((f) => f.required && serviceDetails[f.name]).length;
        score += Math.round((completedReq / reqCount) * 20);
      }
    }

    // Step 3 Customer contacts
    let contactsCount = 0;
    if (profileData.name) contactsCount++;
    if (profileData.mobile) contactsCount++;
    if (profileData.address) contactsCount++;
    if (profileData.pincode) contactsCount++;
    if (profileData.city) contactsCount++;
    if (profileData.state) contactsCount++;
    score += Math.round((contactsCount / 6) * 20);

    // Step 4 Documents uploaded
    if (serviceConfig) {
      const reqDocs = serviceConfig.documents.filter((d) => d.required);
      if (reqDocs.length === 0) {
        score += 20;
      } else {
        const uploadedCount = reqDocs.filter((d) => uploadedFiles[d.id]).length;
        score += Math.round((uploadedCount / reqDocs.length) * 20);
      }
    }

    // Step 5 Review check
    if (currentStep >= 5) score += 10;
    // Step 6 Payment check
    if (currentStep >= 6) score += 10;

    return Math.min(100, score);
  }, [selectedService, serviceConfig, serviceDetails, profileData, uploadedFiles, currentStep]);

  // AI Validation checks
  const runAiValidation = (docId: string, file: File) => {
    // Generate simulated metadata
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2) + " MB";
    const sharpness = Math.random() > 0.15 ? "High (92%)" : "Blurry (45%)";
    const dpi = Math.random() > 0.1 ? 300 : 150;
    
    const errors: string[] = [];
    if (sharpness.includes("Blurry")) {
      errors.push("Document text is blurry. Please upload a clear photo.");
    }
    if (dpi < 200) {
      errors.push("Low DPI detected. Recommended DPI is 200+.");
    }

    setFileMetadata((prev) => ({
      ...prev,
      [docId]: {
        size: sizeMb,
        type: file.type || "unknown",
        sharpness,
        dpi,
        validationPassed: errors.length === 0,
        errors
      }
    }));

    if (errors.length > 0) {
      if (toastWarning) toastWarning(`Document validation failed: ${errors[0]}`);
    } else {
      if (toastSuccess) toastSuccess(`AI validation passed for ${docId}!`);
    }
  };

  // Dropzone File handlers
  const handleFileChange = (docId: string, file: File) => {
    setUploadProgress((prev) => ({ ...prev, [docId]: 0 }));
    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      setUploadProgress((prev) => ({ ...prev, [docId]: progress }));
      if (progress >= 100) {
        clearInterval(interval);
        setUploadedFiles((prev) => ({ ...prev, [docId]: file }));
        runAiValidation(docId, file);
      }
    }, 100);
  };

  // Crop & rotate tools
  const handleRotate = (docId: string) => {
    setRotateAngle((prev) => ({
      ...prev,
      [docId]: ((prev[docId] || 0) + 90) % 360
    }));
  };

  const handleZoom = (docId: string, direction: "in" | "out") => {
    setZoomScale((prev) => {
      const current = prev[docId] || 1;
      const step = 0.25;
      const next = direction === "in" ? Math.min(2.5, current + step) : Math.max(0.5, current - step);
      return { ...prev, [docId]: next };
    });
  };

  // simulated OCR Extraction
  const handleOcrExtraction = (docId: string) => {
    const file = uploadedFiles[docId];
    if (!file) return;

    setOcrScanningSlot(docId);
    setTimeout(() => {
      setOcrScanningSlot(null);
      let ocrFields: { fieldName: string; extractedValue: string; confidence: number }[] = [];

      if (docId.includes("pan")) {
        ocrFields = [
          { fieldName: "panNumber", extractedValue: "AFIPA8392D", confidence: 99.1 },
          { fieldName: "businessName", extractedValue: "FAIZAL ENTERPRISES", confidence: 96.5 }
        ];
      } else if (docId.includes("aadhaar")) {
        ocrFields = [
          { fieldName: "aadhaarNumber", extractedValue: "483920194857", confidence: 98.4 },
          { fieldName: "name", extractedValue: "FAIZAL ALAM", confidence: 99.8 },
          { fieldName: "address", extractedValue: "Flat 402, Sector 15, Vasundhara", confidence: 94.2 },
          { fieldName: "pincode", extractedValue: "201012", confidence: 99.9 },
          { fieldName: "city", extractedValue: "Ghaziabad", confidence: 98.0 },
          { fieldName: "state", extractedValue: "Uttar Pradesh", confidence: 99.0 }
        ];
      } else {
        ocrFields = [
          { fieldName: "name", extractedValue: "FAIZAL ALAM", confidence: 92.5 }
        ];
      }

      setOcrExtractionResult({
        slot: docId,
        fields: ocrFields
      });
    }, 1500);
  };

  // Apply OCR values
  const applyOcrAutofill = () => {
    if (!ocrExtractionResult) return;
    
    ocrExtractionResult.fields.forEach((f) => {
      if (f.fieldName === "name") {
        setProfileData((prev) => ({ ...prev, name: f.extractedValue }));
      } else if (f.fieldName === "address") {
        setProfileData((prev) => ({ ...prev, address: f.extractedValue }));
      } else if (f.fieldName === "pincode") {
        setProfileData((prev) => ({ ...prev, pincode: f.extractedValue }));
      } else if (f.fieldName === "city") {
        setProfileData((prev) => ({ ...prev, city: f.extractedValue }));
      } else if (f.fieldName === "state") {
        setProfileData((prev) => ({ ...prev, state: f.extractedValue }));
      } else {
        setServiceDetails((prev) => ({ ...prev, [f.fieldName]: f.extractedValue }));
        setValidatedFields((prev) => ({ ...prev, [f.fieldName]: true }));
      }
    });

    setOcrExtractionResult(null);
    if (toastSuccess) toastSuccess("⚡ OCR Extracted fields populated onto applicant forms!");
  };

  // Autofill from customer 360
  const applyCustomer360Autofill = () => {
    if (!customer360) return;
    setProfileData((prev) => ({
      ...prev,
      name: customer360.name || prev.name,
      email: prev.email || "",
      address: prev.address || "",
      city: prev.city || "",
      state: prev.state || "",
      pincode: prev.pincode || "",
    }));
    if (toastSuccess) toastSuccess("⚡ Customer 360 metrics loaded into contacts!");
  };

  // Coupon validations
  const applyCouponCode = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    try {
      const response = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          couponCode,
          serviceSlug: selectedService?.slug,
          amount: basePrice
        })
      });
      const result = await response.json();
      if (result.success && result.valid) {
        setAppliedCoupon({
          code: couponCode.trim().toUpperCase(),
          discount: result.discountAmount || 0
        });
        logNotification("WhatsApp", "Coupon applied successfully! Total invoice modified.");
        if (toastSuccess) toastSuccess("Promo coupon code applied successfully!");
      } else {
        toastError(result.message || "Invalid coupon code.");
      }
    } catch {
      toastError("Failed to check coupon code.");
    } finally {
      setValidatingCoupon(false);
    }
  };

  // Submit flow
  const handleFinalSubmit = async (razorpayDetails?: Record<string, unknown> | null) => {
    setIsSubmitting(true);
    try {
      const payload = {
        serviceSlug: selectedService?.slug,
        serviceSlugs: [selectedService?.slug],
        customer: {
          name: profileData.name,
          mobile: profileData.mobile,
          email: profileData.email,
          city: profileData.city,
          message: `Application submitted via Dynamic Configuration Engine. Plan: ${selectedPlanId || "Default"}. Split Pay: ${splitPayment}`,
        },
        details: {
          ...serviceDetails,
          address: profileData.address,
          pincode: profileData.pincode,
          state: profileData.state,
          district: profileData.district,
          selectedPlan: planDetails?.name || "Standard",
          splitPaymentEnabled: String(splitPayment),
          installmentPaid: String(initialInstallment),
          installmentRemaining: String(payLaterInstallment)
        },
        walletUseAmount: walletRedeemAmount,
        razorpayPayment: razorpayDetails || null,
        couponCode: appliedCoupon?.code || ""
      };

      const formData = new FormData();
      formData.append("payload", JSON.stringify(payload));

      const docTypes = Object.keys(uploadedFiles);
      formData.append("documentTypes", JSON.stringify(docTypes));

      docTypes.forEach((docId) => {
        const file = uploadedFiles[docId];
        formData.append("documents", file, file.name);
      });

      const response = await fetch("/api/applications", {
        method: "POST",
        body: formData,
      });

      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch {
        throw new Error("Invalid response schema from backend.");
      }

      if (!response.ok || !result.success) {
        throw new Error(result.message || result.error || "Submission failed.");
      }

      // Clear draft cache
      localStorage.removeItem("dukan_wizard_enterprise_draft");
      
      setSuccessDetails({
        applicationId: result.applicationId || "DCD-" + Math.floor(Math.random() * 90000 + 10000),
        invoiceId: result.invoiceId || "",
        customerName: profileData.name,
        serviceTitle: planDetails ? `${selectedService?.title} (${planDetails.name})` : (selectedService?.title || ""),
        amountPaid: initialInstallment + walletRedeemAmount,
        processingTime: serviceConfig?.processingTime || "5-7 Working Days",
        paymentStatus: splitPayment ? "Partially Paid (50%)" : "Paid"
      });

      // Log notifications simulation
      logNotification("WhatsApp", `Order confirm. Application ID: ${result.applicationId} submitted.`);
      logNotification("Email", `Invoice details for ${selectedService?.title} delivery.`);

      setCurrentStep(7);
      if (toastSuccess) toastSuccess("Enterprise application submitted successfully!");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Submission failed.";
      toastError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerRazorpayCheckout = async () => {
    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
      toastError("Razorpay key configuration is missing.");
      return;
    }
    setIsSubmitting(true);
    try {
      const orderBody = {
        amount: Math.round(initialInstallment * 100),
        currency: "INR",
        receipt: `receipt-wiz-${Date.now()}`,
        serviceSlug: selectedService?.slug,
        walletUseAmount: walletRedeemAmount,
        couponCode: appliedCoupon?.code || "",
        applicationDraft: {
          customer: {
            name: profileData.name,
            email: profileData.email,
            mobile: profileData.mobile,
            city: profileData.city,
          },
          details: {
            ...serviceDetails,
            selectedPlan: planDetails?.name || "Standard",
          }
        }
      };

      const orderResponse = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderBody)
      });
      const orderData = await orderResponse.json();

      if (!orderResponse.ok || !orderData.order_id) {
        throw new Error(orderData.error || orderData.message || "Could not create Razorpay order.");
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "DigiConnect Dukan",
        description: `Apply for ${selectedService?.title}`,
        order_id: orderData.order_id,
        prefill: {
          name: profileData.name,
          email: profileData.email,
          contact: profileData.mobile
        },
        theme: { color: "#2563eb" },
        handler: async (paymentResponse: Record<string, unknown>) => {
          try {
            // Verify payment
            const verifyResponse = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...paymentResponse,
                application_id: orderData.application_id,
                application_ids: orderData.application_ids,
              })
            });
            const verifyData = await verifyResponse.json();
            if (!verifyResponse.ok || !verifyData.success) {
              throw new Error(verifyData.error || "Payment verification failed.");
            }

            await handleFinalSubmit({
              ...paymentResponse,
              application_id: orderData.application_id as string,
              application_ids: orderData.application_ids as string[],
              amount_paise: orderData.amount as number
            });
          } catch (e) {
            const errorMsg = e instanceof Error ? e.message : "Verification failed.";
            toastError(errorMsg);
            setIsSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => {
            toastError("Payment cancelled.");
            setIsSubmitting(false);
          }
        }
      };

      const rzpay = new (window as unknown as { Razorpay: new (options: Record<string, unknown>) => { open: () => void } }).Razorpay(options);
      rzpay.open();
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Payment window error.";
      toastError(errorMsg);
      setIsSubmitting(false);
    }
  };

  const logNotification = (type: "WhatsApp" | "Email" | "SMS", message: string) => {
    setNotificationLogs((prev) => [
      { type, message, timestamp: new Date().toLocaleTimeString() },
      ...prev
    ]);
  };

  // Navigations
  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!selectedService) {
        toastError("Please select a service.");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Validate form sections dynamically
      if (!serviceConfig) return;
      let valid = true;
      serviceConfig.formSections.flatMap((s) => s.fields).forEach((f) => {
        if (f.required && !serviceDetails[f.name]) {
          setValidationErrors((prev) => ({ ...prev, [f.name]: `${f.label} is required.` }));
          valid = false;
        }
      });
      if (Object.keys(validationErrors).length > 0) valid = false;

      if (valid) {
        setCurrentStep(3);
      } else {
        toastError("Please complete dynamic parameters validations.");
      }
    } else if (currentStep === 3) {
      // Validate customer contacts
      if (validateStep3()) {
        setCurrentStep(4);
      } else {
        toastError("Please verify contact parameters details.");
      }
    } else if (currentStep === 4) {
      // Validate documents uploads & AI passing checks
      if (!serviceConfig) return;
      const missing = serviceConfig.documents.filter((d) => d.required && !uploadedFiles[d.id]);
      if (missing.length > 0) {
        toastError(`Missing uploads: ${missing.map((m) => m.name).join(", ")}`);
        return;
      }
      
      const failedChecks = serviceConfig.documents.filter((d) => {
        const meta = fileMetadata[d.id];
        return meta && !meta.validationPassed;
      });

      if (failedChecks.length > 0) {
        toastError("Some documents failed validation check constraints.");
        return;
      }

      setCurrentStep(5);
    } else if (currentStep === 5) {
      setCurrentStep(6);
    } else if (currentStep === 6) {
      if (initialInstallment === 0) {
        void handleFinalSubmit();
      } else {
        void triggerRazorpayCheckout();
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1 && currentStep < 7) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const validateStep3 = () => {
    const errors: Record<string, string> = {};
    if (!profileData.name.trim()) errors.name = "Full Name is required.";
    if (!/^[6-9]\d{9}$/.test(profileData.mobile)) errors.mobile = "Enter 10-digit mobile number.";
    if (profileData.email && !/\S+@\S+\.\S+/.test(profileData.email)) errors.email = "Enter a valid email.";
    if (!profileData.address.trim()) errors.address = "Address is required.";
    if (!/^\d{6}$/.test(profileData.pincode)) errors.pincode = "Enter 6-digit Pincode.";
    if (!profileData.city.trim()) errors.city = "City is required.";
    if (!profileData.state.trim()) errors.state = "State is required.";

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  return (
    <div className="relative mx-auto w-full max-w-[1200px] px-4 py-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
      
      {/* Script load for Razorpay */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setIsScriptReady(true)}
      />

      {/* Dynamic Toast auto-save status */}
      {showAutoSaveToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-slate-900/95 text-white text-xs px-3.5 py-2 rounded-full shadow-lg border border-slate-800/80 backdrop-blur-sm transition-all duration-300">
          <Sparkles className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
          <span>Draft Saved ({lastSavedTime})</span>
        </div>
      )}

      {/* Left Wizard Body */}
      <div className="bg-white border border-slate-100 rounded-[28px] shadow-sm min-h-[600px] flex flex-col justify-between overflow-hidden relative w-full">
        
        {/* Sticky top step header */}
        {currentStep < 7 && (
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-slate-50 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-[10px] tracking-widest font-extrabold uppercase text-slate-400">
              Enterprise Wizard Engine v2
            </span>
            <div className="flex items-center gap-2 overflow-x-auto max-w-full no-scrollbar pb-1 sm:pb-0">
              {STEPS.slice(0, 6).map((step, idx) => {
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;
                return (
                  <React.Fragment key={step.id}>
                    <button
                      onClick={() => isCompleted && setCurrentStep(step.id)}
                      disabled={!isCompleted}
                      className={`flex items-center gap-1.5 text-xs font-semibold py-1.5 px-2.5 rounded-full transition-all shrink-0 ${
                        isActive
                          ? "bg-blue-50 text-blue-600 font-bold"
                          : isCompleted
                          ? "text-slate-800 hover:bg-slate-50 cursor-pointer"
                          : "text-slate-300 cursor-not-allowed"
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
                        isCompleted ? "bg-blue-600 text-white" : isActive ? "bg-blue-200 text-blue-700" : "bg-slate-100 text-slate-400"
                      }`}>
                        {isCompleted ? "✓" : step.id}
                      </span>
                      <span>{step.label}</span>
                    </button>
                    {idx < 5 && <span className="text-slate-200 text-[10px] shrink-0">➔</span>}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* Content Segment */}
        <div className="flex-1 p-6 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="h-full flex flex-col"
            >
              
              {/* STEP 1: SELECT SERVICE */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Select Government Service</h2>
                    <p className="text-sm text-slate-500 mt-1">Central dynamic configuration-driven services selection registry.</p>
                  </div>

                  <div className="relative max-w-lg bg-slate-50 border border-slate-200 focus-within:border-blue-300 rounded-2xl flex items-center px-4 py-2.5 transition-all">
                    <Search className="h-5 w-5 text-slate-400 mr-3" />
                    <input
                      type="text"
                      placeholder="Search from 100+ services (Passport, GST, PAN, DL)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-transparent border-0 outline-none w-full text-sm text-slate-800 placeholder-slate-400"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredServices.map((srv) => {
                      const IconComponent = CATEGORY_ICONS[srv.categorySlug] || CreditCard;
                      const isSelected = selectedService?.slug === srv.slug;
                      return (
                        <div
                          key={srv.slug}
                          onClick={() => setSelectedService(srv)}
                          className={`group flex items-start gap-4 p-5 rounded-2xl border text-left cursor-pointer transition-all ${
                            isSelected
                              ? "bg-blue-50/50 border-blue-600 shadow-xs ring-1 ring-blue-600/25"
                              : "bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50/30"
                          }`}
                        >
                          <div className={`p-3 rounded-xl transition-colors shrink-0 ${
                            isSelected ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-500 group-hover:bg-slate-100"
                          }`}>
                            <IconComponent className="h-5 w-5" />
                          </div>
                          <div className="space-y-1.5 w-full">
                            <div className="flex items-center justify-between">
                              <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                                {srv.title}
                              </h3>
                              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                {srv.priceLabel || `₹${srv.amount}`}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 leading-normal line-clamp-2">
                              {srv.shortDescription}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 2: DYNAMIC SERVICE DETAILS */}
              {currentStep === 2 && selectedService && serviceConfig && (
                <div className="space-y-6">
                  {/* Feature 2: Smart Service Summary Card */}
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-6 items-center">
                    <div>
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        {selectedService.category}
                      </span>
                      <h3 className="font-black text-slate-950 text-lg mt-2">{selectedService.title}</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{selectedService.shortDescription}</p>
                    </div>
                    <div className="border-t md:border-t-0 md:border-l border-slate-200/60 pt-4 md:pt-0 md:pl-6 space-y-2 text-xs font-semibold text-slate-700">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Government Fee:</span>
                        <span>₹{govFee}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Processing Time:</span>
                        <span>{serviceConfig.processingTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Required Documents:</span>
                        <span className="text-blue-600">{serviceConfig.documents.length} Files</span>
                      </div>
                    </div>
                  </div>

                  {/* Plan Selector if available */}
                  {serviceConfig.plans && serviceConfig.plans.length > 0 && (
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Available Plan</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {serviceConfig.plans.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => setSelectedPlanId(p.id)}
                            className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                              selectedPlanId === p.id
                                ? "bg-slate-900 border-slate-950 text-white shadow-xs"
                                : "bg-white border-slate-100 hover:border-slate-200 text-slate-800"
                            }`}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-extrabold text-sm">{p.name}</span>
                              <span className={`text-xs font-black ${selectedPlanId === p.id ? "text-blue-400" : "text-blue-600"}`}>
                                ₹{p.price}
                              </span>
                            </div>
                            <p className={`text-[11px] leading-relaxed ${selectedPlanId === p.id ? "text-slate-300" : "text-slate-400"}`}>
                              {p.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dynamic form sections engine */}
                  <div className="space-y-6">
                    {serviceConfig.formSections.map((sec) => (
                      <div key={sec.id} className="space-y-4">
                        <h4 className="font-black text-slate-900 text-sm border-b border-slate-100 pb-1.5">{sec.title}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {sec.fields.map((f) => {
                            const hasError = validationErrors[f.name];
                            const isVal = validatedFields[f.name];
                            return (
                              <div key={f.name} className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-700 tracking-wide">
                                  {f.label} {f.required && <span className="text-red-500">*</span>}
                                </label>
                                <div className="relative">
                                  {f.type === "select" ? (
                                    <select
                                      value={serviceDetails[f.name] || ""}
                                      onChange={(e) => {
                                        setServiceDetails({ ...serviceDetails, [f.name]: e.target.value });
                                        handleLiveValidate(f, e.target.value);
                                      }}
                                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm w-full focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                                    >
                                      <option value="">Select option...</option>
                                      {f.options?.map((o) => (
                                        <option key={o} value={o}>{o}</option>
                                      ))}
                                    </select>
                                  ) : f.type === "textarea" ? (
                                    <textarea
                                      value={serviceDetails[f.name] || ""}
                                      onChange={(e) => {
                                        setServiceDetails({ ...serviceDetails, [f.name]: e.target.value });
                                        handleLiveValidate(f, e.target.value);
                                      }}
                                      rows={2}
                                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm w-full focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                                      placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}...`}
                                    />
                                  ) : (
                                    <input
                                      type={f.type}
                                      value={serviceDetails[f.name] || ""}
                                      onChange={(e) => {
                                        setServiceDetails({ ...serviceDetails, [f.name]: e.target.value });
                                        handleLiveValidate(f, e.target.value);
                                      }}
                                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm w-full focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                                      placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}...`}
                                    />
                                  )}
                                  
                                  {/* Validate icons */}
                                  {isVal && !hasError && (
                                    <Check className="h-4 w-4 text-emerald-500 absolute right-3 top-3.5" />
                                  )}
                                  {hasError && (
                                    <AlertTriangle className="h-4 w-4 text-red-500 absolute right-3 top-3.5" />
                                  )}
                                </div>
                                {hasError && <span className="text-[10px] text-red-500 font-semibold">{hasError}</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Duplicate warning log */}
                  {duplicateWarning?.show && (
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-4">
                      <div className="flex gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                        <div>
                          <h4 className="text-xs font-bold text-amber-950">Active Duplicate Application Detected</h4>
                          <p className="text-[11px] text-amber-600 font-semibold mt-0.5">
                            Another active case exists with matches: ID {duplicateWarning.duplicates[0]?.applicationId.slice(0,8)}.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            router.push(`/customer/dashboard`);
                          }}
                          className="bg-amber-100 hover:bg-amber-250 text-amber-950 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          View Existing
                        </button>
                        <button
                          onClick={() => setDuplicateWarning(null)}
                          className="bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          Ignore & Continue
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: CUSTOMER DETAILS (WITH CUSTOMER 360) */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Customer Information</h2>
                    <p className="text-sm text-slate-500 mt-1">Fill client contacts and check matching records in CRM.</p>
                  </div>

                  {/* Feature 3: Existing Customer 360 Details */}
                  {customer360 && (
                    <div className="bg-white border border-slate-100 shadow-xs rounded-2xl p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-50 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center border border-blue-100 overflow-hidden shrink-0">
                            {customer360.avatarUrl ? (
                              <Image src={customer360.avatarUrl} alt="Avatar" className="h-full w-full object-cover" width={40} height={40} unoptimized />
                            ) : (
                              <UserCheck className="h-5 w-5 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                              <span>{customer360.name}</span>
                              <span className="text-[9px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold">Matched Profile</span>
                            </h3>
                            <p className="text-[11px] text-slate-400 font-semibold">Client since {customer360.customerSince}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={applyCustomer360Autofill}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-3.5 py-1.5 rounded-lg flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                          >
                            <Sparkles className="h-3 w-3" />
                            <span>1-Click Autofill</span>
                          </button>
                          <button
                            onClick={() => setShowHistoryDrawer(true)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold px-3.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <ClipboardList className="h-3 w-3" />
                            <span>View History ({customer360.totalApplications})</span>
                          </button>
                        </div>
                      </div>

                      {/* Stat summary grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                        <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50">
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Total Cases</p>
                          <p className="font-black text-slate-900 text-lg mt-0.5">{customer360.totalApplications}</p>
                        </div>
                        <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50">
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Completed</p>
                          <p className="font-black text-emerald-600 text-lg mt-0.5">{customer360.completedApplications}</p>
                        </div>
                        <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50">
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Pending</p>
                          <p className="font-black text-orange-500 text-lg mt-0.5">{customer360.pendingApplications}</p>
                        </div>
                        <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50">
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Wallet Balance</p>
                          <p className="font-black text-blue-600 text-lg mt-0.5">₹{customer360.walletBalance}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Mobile */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-700 tracking-wide">Mobile Number *</label>
                        <div className="relative">
                          <input
                            type="tel"
                            maxLength={10}
                            value={profileData.mobile}
                            onChange={(e) => setProfileData({ ...profileData, mobile: e.target.value })}
                            className="bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm w-full focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
                            placeholder="Enter 10-digit mobile"
                          />
                          {customerLookupStatus === "searching" && (
                            <RefreshCw className="h-4 w-4 animate-spin text-blue-500 absolute right-3.5 top-3.5" />
                          )}
                          {customerLookupStatus === "found" && (
                            <Check className="h-4 w-4 text-emerald-500 absolute right-3.5 top-3.5" />
                          )}
                        </div>
                        {validationErrors.mobile && <span className="text-[10px] text-red-500 font-semibold">{validationErrors.mobile}</span>}
                      </div>

                      {/* Name */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-700 tracking-wide">Applicant Full Name *</label>
                        <input
                          type="text"
                          value={profileData.name}
                          onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
                          placeholder="Client's full name"
                        />
                        {validationErrors.name && <span className="text-[10px] text-red-500 font-semibold">{validationErrors.name}</span>}
                      </div>

                      {/* Email */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-700 tracking-wide">Email Address</label>
                        <input
                          type="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
                          placeholder="Updates copy email"
                        />
                        {validationErrors.email && <span className="text-[10px] text-red-500 font-semibold">{validationErrors.email}</span>}
                      </div>

                      {/* Alt Mobile */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-700 tracking-wide">Alternate Mobile</label>
                        <input
                          type="tel"
                          maxLength={10}
                          value={profileData.altMobile}
                          onChange={(e) => setProfileData({ ...profileData, altMobile: e.target.value })}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
                          placeholder="Emergency alternative contact"
                        />
                      </div>

                      {/* Pincode */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-700 tracking-wide">Pincode *</label>
                        <div className="relative">
                          <input
                            type="text"
                            maxLength={6}
                            value={profileData.pincode}
                            onChange={(e) => setProfileData({ ...profileData, pincode: e.target.value })}
                            className="bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm w-full focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
                            placeholder="6-digit Pincode"
                          />
                          {pincodeLookupStatus === "searching" && (
                            <RefreshCw className="h-4 w-4 animate-spin text-blue-500 absolute right-3.5 top-3.5" />
                          )}
                          {pincodeLookupStatus === "found" && (
                            <MapPin className="h-4 w-4 text-emerald-500 absolute right-3.5 top-3.5" />
                          )}
                        </div>
                        {validationErrors.pincode && <span className="text-[10px] text-red-500 font-semibold">{validationErrors.pincode}</span>}
                      </div>

                      {/* City */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-700 tracking-wide">City/Town *</label>
                        <input
                          type="text"
                          value={profileData.city}
                          onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
                          placeholder="City name"
                        />
                        {validationErrors.city && <span className="text-[10px] text-red-500 font-semibold">{validationErrors.city}</span>}
                      </div>

                      {/* State */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-700 tracking-wide">State *</label>
                        <input
                          type="text"
                          value={profileData.state}
                          onChange={(e) => setProfileData({ ...profileData, state: e.target.value })}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
                          placeholder="State name"
                        />
                        {validationErrors.state && <span className="text-[10px] text-red-500 font-semibold">{validationErrors.state}</span>}
                      </div>

                      {/* District */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-700 tracking-wide">District</label>
                        <input
                          type="text"
                          value={profileData.district}
                          onChange={(e) => setProfileData({ ...profileData, district: e.target.value })}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
                          placeholder="District name"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-700 tracking-wide">Complete Address *</label>
                      <textarea
                        value={profileData.address}
                        onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                        rows={2}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
                        placeholder="Complete street address details"
                      />
                      {validationErrors.address && <span className="text-[10px] text-red-500 font-semibold">{validationErrors.address}</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: DOCUMENT CENTER & AI VALIDATION */}
              {currentStep === 4 && serviceConfig && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Document Upload Center</h2>
                    <p className="text-sm text-slate-500 mt-1">Upload files with automatic AI blur detection and resolution validation checks.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {serviceConfig.documents.map((d) => {
                      const file = uploadedFiles[d.id];
                      const progress = uploadProgress[d.id] || 0;
                      const inputId = `file-wiz-${d.id}`;
                      const isScanning = ocrScanningSlot === d.id;
                      const meta = fileMetadata[d.id];

                      return (
                        <div
                          key={d.id}
                          className={`border rounded-2xl p-5 flex flex-col justify-between min-h-[220px] relative transition-all ${
                            file ? "bg-slate-50/20 border-slate-200" : "bg-white border-dashed border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-start justify-between gap-3">
                              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                                <span>{d.name}</span>
                                {d.required && <span className="text-red-500 text-xs">*</span>}
                              </h3>
                              {file && meta && (
                                <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                  meta.validationPassed ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                                }`}>
                                  {meta.validationPassed ? "AI Validation Passed" : "AI Verification Failed"}
                                </span>
                              )}
                            </div>
                            {d.helpHint && <p className="text-[10px] text-slate-400 font-semibold">{d.helpHint}</p>}
                          </div>

                          {/* File controller pane */}
                          <div className="mt-4">
                            <input
                              type="file"
                              id={inputId}
                              className="hidden"
                              accept="image/*,application/pdf"
                              onChange={(e) => e.target.files?.[0] && handleFileChange(d.id, e.target.files[0])}
                            />

                            {file ? (
                              <div className="space-y-3">
                                {/* Metadata stats check */}
                                {meta && (
                                  <div className="bg-white border border-slate-100 rounded-xl p-3 space-y-2 text-[10px] font-semibold text-slate-500 shadow-xs">
                                    <div className="flex justify-between">
                                      <span>Resolution Quality:</span>
                                      <span className={meta.dpi >= 200 ? "text-emerald-600" : "text-red-500"}>
                                        {meta.dpi} DPI ({meta.dpi >= 200 ? "Pass" : "Low"})
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Image Blur Check:</span>
                                      <span className={meta.sharpness.includes("High") ? "text-emerald-600" : "text-red-500"}>
                                        {meta.sharpness}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>File Details:</span>
                                      <span>{meta.size} • {meta.type.split("/")[1]?.toUpperCase() || "PDF"}</span>
                                    </div>
                                    {meta.errors.map((e) => (
                                      <p key={e} className="text-red-500 font-bold text-[9px] mt-1">⚠️ {e}</p>
                                    ))}
                                  </div>
                                )}

                                {/* Editor bar */}
                                <div className="flex items-center justify-between bg-white border border-slate-100 rounded-xl p-2 shadow-xs">
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => handleRotate(d.id)}
                                      className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors cursor-pointer"
                                      title="Rotate Image"
                                    >
                                      <RotateCw className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleZoom(d.id, "in")}
                                      className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors cursor-pointer"
                                      title="Zoom In"
                                    >
                                      <ZoomIn className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleZoom(d.id, "out")}
                                      className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors cursor-pointer"
                                      title="Zoom Out"
                                    >
                                      <ZoomOut className="h-3.5 w-3.5" />
                                    </button>
                                  </div>

                                  <div className="flex items-center gap-1.5 px-2">
                                    {rotateAngle[d.id] ? (
                                      <span className="text-[9px] text-slate-400 font-bold font-mono bg-slate-50 px-1.5 py-0.5 rounded">{rotateAngle[d.id]}°</span>
                                    ) : null}
                                    {zoomScale[d.id] ? (
                                      <span className="text-[9px] text-slate-400 font-bold font-mono bg-slate-50 px-1.5 py-0.5 rounded">{zoomScale[d.id]}x</span>
                                    ) : null}
                                  </div>

                                  <div className="flex items-center gap-1">
                                    {d.ocrType && (
                                      <button
                                        onClick={() => handleOcrExtraction(d.id)}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                        title="OCR Extract Data"
                                      >
                                        <Sparkles className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => {
                                        setUploadedFiles((prev) => {
                                          const copy = { ...prev };
                                          delete copy[d.id];
                                          return copy;
                                        });
                                        setFileMetadata((prev) => {
                                          const copy = { ...prev };
                                          delete copy[d.id];
                                          return copy;
                                        });
                                      }}
                                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                      title="Delete Upload"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                {progress > 0 && progress < 100 ? (
                                  <div className="w-full space-y-1">
                                    <div className="flex justify-between text-[10px] text-slate-400 font-extrabold uppercase">
                                      <span>Uploading File...</span>
                                      <span>{progress}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                      <div className="bg-blue-600 h-full transition-all" style={{ width: `${progress}%` }}></div>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => document.getElementById(inputId)?.click()}
                                      className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                                    >
                                      <Upload className="h-3.5 w-3.5" />
                                      <span>Upload Document</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        document.getElementById(inputId)?.setAttribute("capture", "environment");
                                        document.getElementById(inputId)?.click();
                                      }}
                                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer sm:hidden"
                                    >
                                      <Camera className="h-3.5 w-3.5" />
                                      <span>Capture Camera</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Scanning loader */}
                          {isScanning && (
                            <div className="absolute inset-0 bg-white/95 rounded-2xl flex flex-col items-center justify-center gap-2 z-10 border border-blue-200">
                              <Sparkles className="h-6 w-6 text-blue-500 animate-spin" />
                              <p className="text-xs font-black text-blue-900">⚡ OCR Reading File Data...</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* OCR Extraction Result overlay modal */}
                  {ocrExtractionResult && (
                    <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
                      <div className="bg-white border border-slate-100 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-xl">
                        <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
                          <Sparkles className="h-5 w-5 text-blue-600" />
                          <h3 className="font-black text-slate-900 text-base">⚡ OCR Data Extraction</h3>
                        </div>

                        <div className="space-y-3">
                          {ocrExtractionResult.fields.map((f) => (
                            <div key={f.fieldName} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100/50 text-xs">
                              <div className="flex justify-between font-bold text-slate-400 text-[9px] uppercase">
                                <span>{f.fieldName}</span>
                                <span className="text-blue-600">{f.confidence}% Confidence</span>
                              </div>
                              <p className="font-extrabold text-slate-800 mt-0.5">{f.extractedValue}</p>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2 justify-end pt-2">
                          <button
                            onClick={() => setOcrExtractionResult(null)}
                            className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            Discard
                          </button>
                          <button
                            onClick={applyOcrAutofill}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                          >
                            Autofill Form
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 5: SMART REVIEW SEGMENTS */}
              {currentStep === 5 && selectedService && serviceConfig && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Review Verification Summary</h2>
                    <p className="text-sm text-slate-500 mt-1">Review applicant form sections details prior to secure checkout.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Customer */}
                    <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider">Customer Profile</h4>
                        <button onClick={() => setCurrentStep(3)} className="text-[10px] font-bold text-blue-600 flex items-center gap-0.5 hover:underline cursor-pointer">
                          <Edit2 className="h-3 w-3" />
                          <span>Edit</span>
                        </button>
                      </div>
                      <div className="space-y-2 text-xs font-semibold text-slate-700">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Name:</span>
                          <span>{profileData.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Mobile:</span>
                          <span>{profileData.mobile}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Email:</span>
                          <span className="truncate max-w-[150px]">{profileData.email || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Pincode:</span>
                          <span>{profileData.pincode} ({profileData.state})</span>
                        </div>
                      </div>
                    </div>

                    {/* Service Parameter details */}
                    <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider">Service Details</h4>
                        <button onClick={() => setCurrentStep(2)} className="text-[10px] font-bold text-blue-600 flex items-center gap-0.5 hover:underline cursor-pointer">
                          <Edit2 className="h-3 w-3" />
                          <span>Edit</span>
                        </button>
                      </div>
                      <div className="space-y-2 text-xs font-semibold text-slate-700">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Target Service:</span>
                          <span className="font-bold text-slate-900">{selectedService.title}</span>
                        </div>
                        {planDetails && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Selected Plan:</span>
                            <span>{planDetails.name}</span>
                          </div>
                        )}
                        {serviceConfig.formSections.flatMap((s) => s.fields).map((f) => (
                          <div key={f.name} className="flex justify-between">
                            <span className="text-slate-400">{f.label}:</span>
                            <span>{serviceDetails[f.name] || "N/A"}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Document Previews */}
                    <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 space-y-4 md:col-span-2">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider">Document Checklist</h4>
                        <button onClick={() => setCurrentStep(4)} className="text-[10px] font-bold text-blue-600 flex items-center gap-0.5 hover:underline cursor-pointer">
                          <Edit2 className="h-3 w-3" />
                          <span>Edit</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {serviceConfig.documents.map((d) => {
                          const file = uploadedFiles[d.id];
                          return (
                            <div key={d.id} className="bg-white border border-slate-150 p-3 rounded-xl flex justify-between items-center shadow-xs">
                              <div className="flex items-center gap-2.5 overflow-hidden">
                                <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                                <div className="overflow-hidden">
                                  <p className="text-[10px] text-slate-400 font-bold uppercase truncate">{d.name}</p>
                                  <p className="text-xs text-slate-700 font-bold truncate">{file?.name || "Missing Upload"}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 6: ADVANCED CHECKOUT & SPLIT PAYMENTS */}
              {currentStep === 6 && selectedService && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Gateway Checkout</h2>
                    <p className="text-sm text-slate-500 mt-1">Select transaction route, utilize wallets or choose split-payment options.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-8 items-start">
                    <div className="space-y-6">
                      
                      {/* Coupon input */}
                      <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-3">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Apply Promo Coupon</label>
                        {appliedCoupon ? (
                          <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex justify-between items-center text-xs font-bold">
                            <span className="text-emerald-950 flex items-center gap-1.5">
                              <Sparkles className="h-4 w-4 text-emerald-600" />
                              <span>Applied Code: {appliedCoupon.code}</span>
                            </span>
                            <button onClick={() => setAppliedCoupon(null)} className="text-red-500 hover:underline cursor-pointer">
                              Remove
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={couponCode}
                              onChange={(e) => setCouponCode(e.target.value)}
                              placeholder="Coupon Code (e.g. WELCOME)"
                              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm flex-1 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                            />
                            <button
                              onClick={applyCouponCode}
                              disabled={validatingCoupon}
                              className="bg-slate-900 text-white px-5 rounded-xl text-xs font-bold hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer"
                            >
                              {validatingCoupon ? "Validating..." : "Apply"}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Split Payment checkbox */}
                      <div className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center justify-between gap-4">
                        <div className="flex gap-3 items-center">
                          <div className="bg-slate-50 text-slate-700 p-2.5 rounded-xl border border-slate-100 shrink-0">
                            <CreditCard className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">Split Payment Option</p>
                            <p className="text-xs text-slate-400 font-semibold">Pay 50% now, pay remaining post-approval.</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSplitPayment(!splitPayment)}
                          className={`h-6 w-11 rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer ${
                            splitPayment ? "bg-blue-600" : "bg-slate-250"
                          }`}
                        >
                          <div className={`h-5 w-5 rounded-full bg-white shadow-xs transform transition duration-200 ease-in-out ${
                            splitPayment ? "translate-x-5" : "translate-x-0"
                          }`} />
                        </button>
                      </div>

                      {/* Wallet Redeem */}
                      {walletBalance > 0 && (
                        <div className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center justify-between gap-4">
                          <div className="flex gap-3 items-center">
                            <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl shrink-0">
                              <Wallet className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">Redeem Wallet Points</p>
                              <p className="text-xs text-slate-400 font-semibold">Available balance points: ₹{walletBalance}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setUseWallet(!useWallet)}
                            className={`h-6 w-11 rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer ${
                              useWallet ? "bg-blue-600" : "bg-slate-250"
                            }`}
                          >
                            <div className={`h-5 w-5 rounded-full bg-white shadow-xs transform transition duration-200 ease-in-out ${
                              useWallet ? "translate-x-5" : "translate-x-0"
                            }`} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Pricing breakdown card */}
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 space-y-4">
                      <h3 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-200 pb-2">
                        Checkout Summary
                      </h3>

                      <div className="space-y-3 text-xs font-semibold text-slate-600">
                        <div className="flex justify-between">
                          <span>Government Fee:</span>
                          <span className="font-bold text-slate-800">₹{govFee}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Dukan Service Fee:</span>
                          <span className="font-bold text-slate-800">₹{serviceCharge}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>GST (18%):</span>
                          <span className="font-bold text-slate-800">₹{gstAmount}</span>
                        </div>
                        {discountAmount > 0 && (
                          <div className="flex justify-between text-emerald-600">
                            <span>Promo Discount:</span>
                            <span>-₹{discountAmount}</span>
                          </div>
                        )}
                        {walletRedeemAmount > 0 && (
                          <div className="flex justify-between text-blue-600">
                            <span>Wallet Redeem:</span>
                            <span>-₹{walletRedeemAmount}</span>
                          </div>
                        )}
                        <div className="border-t border-slate-200 pt-3 flex justify-between text-sm font-black text-slate-900">
                          <span>Total Payable:</span>
                          <span>₹{totalAmountPayable}</span>
                        </div>

                        {splitPayment && (
                          <div className="bg-blue-50/50 p-2.5 rounded-xl border border-blue-100 text-[11px] font-bold text-blue-900 space-y-1">
                            <div className="flex justify-between">
                              <span>Payable Now (50%):</span>
                              <span>₹{initialInstallment}</span>
                            </div>
                            <div className="flex justify-between text-blue-600">
                              <span>Pay Later Post-Approval:</span>
                              <span>₹{payLaterInstallment}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 7: SUCCESS EXPERIENCE WITH TIMELINE */}
              {currentStep === 7 && successDetails && (
                <div className="text-center py-6 space-y-6 max-w-xl mx-auto">
                  <div className="flex flex-col items-center">
                    <div className="h-14 w-14 bg-emerald-50 rounded-full border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm mb-3">
                      <Check className="h-7 w-7" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Application Submitted Successfully</h2>
                    <p className="text-sm text-slate-500 mt-1">Our processors will update status timeline updates within 24 hours.</p>
                  </div>

                  {/* Summary details card */}
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-left grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Application ID</p>
                      <p className="font-extrabold text-slate-950 text-sm mt-0.5 select-all">{successDetails.applicationId}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Government Service</p>
                      <p className="font-bold text-slate-950 text-sm mt-0.5">{successDetails.serviceTitle}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Paid Amount</p>
                      <p className="font-bold text-slate-950 text-sm mt-0.5">₹{successDetails.amountPaid} ({successDetails.paymentStatus})</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Estimated Delivery</p>
                      <p className="font-bold text-slate-950 text-sm mt-0.5">{successDetails.processingTime}</p>
                    </div>
                  </div>

                  {/* Feature 12: Interactive Post-Submission Timeline */}
                  <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4 text-left">
                    <h3 className="font-black text-slate-900 text-xs border-b border-slate-50 pb-1.5 uppercase">
                      Application Workflow Timeline
                    </h3>
                    <div className="relative border-l border-slate-100 ml-3 pl-6 space-y-5">
                      <div className="relative">
                        <div className="absolute -left-[30px] top-1.5 bg-blue-600 rounded-full h-2 w-2 ring-4 ring-blue-50"></div>
                        <p className="text-xs font-extrabold text-slate-900">Application Submitted</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{new Date().toLocaleString("en-IN")}</p>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-[30px] top-1.5 bg-slate-300 rounded-full h-2 w-2"></div>
                        <p className="text-xs font-bold text-slate-400">Payment Verified</p>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-[30px] top-1.5 bg-slate-300 rounded-full h-2 w-2"></div>
                        <p className="text-xs font-bold text-slate-400">Documents Verification check</p>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-[30px] top-1.5 bg-slate-300 rounded-full h-2 w-2"></div>
                        <p className="text-xs font-bold text-slate-400">Processing & RTO Submission</p>
                      </div>
                    </div>
                  </div>

                  {/* Canvas simulated QR Code & Sharing options */}
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-xl border border-slate-100 shrink-0">
                        <QrCode className="h-10 w-10 text-slate-900" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-slate-800">Scan QR Code to Track</p>
                        <p className="text-[11px] text-slate-400 font-semibold">Track live status on your smartphone.</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const link = `${window.location.origin}/dashboard/applications/${successDetails.applicationId}`;
                          navigator.clipboard.writeText(link);
                          if (toastSuccess) toastSuccess("Link copied to clipboard!");
                        }}
                        className="bg-white border border-slate-150 hover:bg-slate-50 p-2 rounded-xl text-slate-700 transition-all cursor-pointer"
                        title="Copy tracking link"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          const text = encodeURIComponent(`Application submitted! ID: ${successDetails.applicationId}. Track at DigiConnect.`);
                          window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Share2 className="h-4 w-4" />
                        <span>Share WhatsApp</span>
                      </button>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                    {successDetails.invoiceId && (
                      <a
                        href={`/invoice/${successDetails.invoiceId}`}
                        className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        <span>Print Invoice Receipt</span>
                      </a>
                    )}
                    <button
                      onClick={() => router.push("/customer/dashboard")}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer"
                    >
                      Return to Dashboard
                    </button>
                    <button
                      onClick={() => {
                        setSelectedService(null);
                        setServiceDetails({});
                        setUploadedFiles({});
                        setFileMetadata({});
                        setAppliedCoupon(null);
                        setUseWallet(false);
                        setSplitPayment(false);
                        setCurrentStep(1);
                      }}
                      className="bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer"
                    >
                      Start New Application
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

        {/* Action button bar */}
        {currentStep < 7 && (
          <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 flex justify-between items-center z-10">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 text-xs font-extrabold text-slate-600 bg-slate-50 hover:bg-slate-100 px-4 py-2.5 rounded-xl border border-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              disabled={
                isSubmitting ||
                (currentStep === 1 && !selectedService) ||
                (currentStep === 6 && totalAmountPayable > 0 && !isScriptReady)
              }
              onClick={handleNextStep}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold px-6 py-2.5 rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : currentStep === 6 ? (
                <>
                  <CreditCard className="h-4 w-4" />
                  <span>{initialInstallment === 0 ? "Submit Application" : "Pay & Submit"}</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Right Desktop Floating Widget Panel (Sticky Card) */}
      <div className="w-full lg:sticky lg:top-24 space-y-6">
        
        {/* Floating Card */}
        {selectedService && currentStep < 7 && (
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-4">
            <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider border-b border-slate-50 pb-2">
              Application Tracker
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <p className="text-slate-400 font-bold text-[9px] uppercase">Service Type</p>
                <p className="font-extrabold text-slate-800 mt-0.5">{selectedService.title}</p>
              </div>
              
              <div>
                <p className="text-slate-400 font-bold text-[9px] uppercase">Form Progress Score</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full transition-all" style={{ width: `${completionScore}%` }}></div>
                  </div>
                  <span className="font-extrabold text-[10px] text-blue-600 shrink-0">{completionScore}%</span>
                </div>
              </div>

              <div>
                <p className="text-slate-400 font-bold text-[9px] uppercase">Total Cost Estimate</p>
                <p className="font-black text-slate-950 text-sm mt-0.5">₹{totalAmountPayable}</p>
              </div>
            </div>
          </div>
        )}

        {/* Feature 13: Simulated Notifications Log panel */}
        {notificationLogs.length > 0 && (
          <div className="bg-slate-950 text-white rounded-3xl p-5 space-y-3.5 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                <span>Trigger Notification logs</span>
              </h4>
              <button
                onClick={() => setNotificationLogs([])}
                className="text-[9px] text-slate-500 hover:text-slate-300 font-bold"
              >
                Clear
              </button>
            </div>
            
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto no-scrollbar">
              {notificationLogs.map((log, idx) => (
                <div key={idx} className="text-[10px] space-y-0.5 border-b border-slate-900 pb-2 last:border-b-0">
                  <div className="flex justify-between font-bold">
                    <span className={log.type === "WhatsApp" ? "text-emerald-400" : log.type === "Email" ? "text-blue-400" : "text-orange-400"}>
                      [{log.type}]
                    </span>
                    <span className="text-slate-600">{log.timestamp}</span>
                  </div>
                  <p className="text-slate-400 font-semibold leading-relaxed">{log.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Feature 4: CRM Customer Application History Drawer */}
      {showHistoryDrawer && customer360 && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex justify-end">
          <div className="bg-white border-l border-slate-100 w-full max-w-md h-full flex flex-col justify-between p-6 shadow-xl">
            <div className="space-y-6 flex-1 overflow-y-auto no-scrollbar">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-950 text-base flex items-center gap-1.5">
                  <ClipboardList className="h-5 w-5 text-blue-600" />
                  <span>Applicant Dossier History</span>
                </h3>
                <button
                  onClick={() => setShowHistoryDrawer(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 bg-slate-50 rounded-lg cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* History list */}
              <div className="space-y-4">
                {customer360.recentApplications.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center font-bold">No previous submissions records.</p>
                ) : (
                  customer360.recentApplications.map((app) => (
                    <div key={app.id} className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase select-all">ID: {app.id.slice(0, 8)}</span>
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          app.status === "completed" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                        }`}>
                          {app.status}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-xs">{app.serviceName}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Submitted {new Date(app.createdAt).toLocaleDateString("en-IN")}</p>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 pt-1.5 border-t border-slate-100/50">
                        <span>Paid amount: ₹{app.amount}</span>
                        <span>Assignee: {app.assignedTo}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex gap-2">
              <button
                onClick={() => {
                  setShowHistoryDrawer(false);
                  applyCustomer360Autofill();
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black py-2.5 rounded-xl w-full shadow-sm transition-all cursor-pointer text-center"
              >
                Autofill Contacts from History
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
