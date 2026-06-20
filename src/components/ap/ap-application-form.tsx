"use client";

import { type FormEvent, useEffect, useMemo, useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  CheckCircle2, CreditCard, FileUp, Send, Search, User, UserPlus, 
  Sparkles, ShieldCheck, Check, AlertTriangle, Trash2, Camera, QrCode, 
  History, HelpCircle, Phone, Mail, MapPin, Download, Printer, Share2, 
  Clock, IndianRupee, Layers, FileText, ChevronRight, X, AlertCircle, ArrowLeft,
  MoreHorizontal, Star, ChevronDown
} from "lucide-react";

import { RazorpayCheckoutButton, type VerifiedRazorpayPayment } from "@/components/payments/razorpay-checkout-button";
import {
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
import { FormSubmitButton } from "@/components/ui/loading";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trackApplicationSubmit } from "@/lib/google-analytics";
import { payoutForAgentService, type AgentService } from "@/lib/agent-services";
import { formatCurrency } from "@/lib/portal-data";
import type { Customer } from "@/lib/portal-types";

interface CustomerLookupResult {
  customer: {
    id: string;
    full_name: string;
    mobile: string;
    email?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    address?: string | null;
  };
  previousApplications: Array<{
    id: string;
    service_name: string;
    service_slug: string;
    status: string;
    created_at: string;
  }>;
  duplicateApplication: {
    id: string;
    service_name: string;
    service_slug: string;
    status: string;
    created_at: string;
  } | null;
}

/* ═══════════════════════════════════════════════════════════
   STEP LABELS — used by the horizontal progress tracker
   ═══════════════════════════════════════════════════════════ */
const STEP_LABELS = ["Customer", "Service", "Documents", "Payment", "Submit"] as const;

export function APApplicationForm({
  customers,
  services,
  defaultCustomerId,
  defaultServiceId,
  defaultName,
  defaultMobile,
}: {
  customers: Customer[];
  services: AgentService[];
  defaultCustomerId?: string;
  defaultServiceId?: string;
  defaultName?: string;
  defaultMobile?: string;
}) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  // Wizard Step Tracker (1 to 5)
  const [currentStep, setCurrentStep] = useState(1);

  // Basic States
  const [customerId, setCustomerId] = useState(defaultCustomerId ?? "");
  const [serviceId, setServiceId] = useState(defaultServiceId ?? services[0]?.id ?? "");
  const [razorpayPayment, setRazorpayPayment] = useState<(VerifiedRazorpayPayment & { amount_paise: number }) | null>(null);
  
  // Search states
  const [searchQuery, setSearchQuery] = useState(defaultMobile ?? "");
  const [searchLoading, setSearchLoading] = useState(false);
  const [lookupResults, setLookupResults] = useState<CustomerLookupResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<CustomerLookupResult | null>(null);
  
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [activeDuplicateApp, setActiveDuplicateApp] = useState<CustomerLookupResult["duplicateApplication"] | null>(null);

  // Customer Profile form fields
  const [customerName, setCustomerName] = useState(defaultName ?? "");
  const [customerMobile, setCustomerMobile] = useState(defaultMobile ?? "");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerGender, setCustomerGender] = useState("");
  const [customerDob, setCustomerDob] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerState, setCustomerState] = useState("");
  const [customerDistrict, setCustomerDistrict] = useState("");
  const [customerPincode, setCustomerPincode] = useState("");
  const [customerCity, setCustomerCity] = useState("");

  const [pincodeAutofillStatus, setPincodeAutofillStatus] = useState("");
  const [isNewCustomer, setIsNewCustomer] = useState(!defaultCustomerId);

  // Service catalog category/search States
  const [serviceSearch, setServiceSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [recentServiceIds, setRecentServiceIds] = useState<string[]>([]);

  // PM Vishwakarma States
  const [pmVishwakarmaValues, setPmVishwakarmaValues] = useState(() => createPmVishwakarmaInitialValues());
  const [pincodeStatus, setPincodeStatus] = useState("");

  // Document upload list
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    id: string;
    file: File;
    documentType: string;
    status: "validating" | "validated";
    progress: number;
  }>>([]);

  // Camera integration States
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [activeChecklistItem, setActiveChecklistItem] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // UI overlays & drawer toggles
  const [showRecentDrawer, setShowRecentDrawer] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const [draftStatus, setDraftStatus] = useState("Saved");

  // Submission outcome
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submittedApplication, setSubmittedApplication] = useState<{
    id: string;
    invoiceId?: string;
    applicationCode?: string;
  } | null>(null);

  const selectedService = services.find((service) => service.id === serviceId);
  const selectedPayout = selectedService ? payoutForAgentService(selectedService) : 0;
  const payableAmountPaise = Math.round(Number(selectedService?.customer_fee ?? 0) * 100);
  const receiptPrefix = `ap-${selectedService?.slug ?? "service"}`;
  const [paymentReceipt, setPaymentReceipt] = useState(receiptPrefix);
  const isPmVishwakarma = selectedService?.slug === "pm-vishwakarma-yojana";

  // Category Catalog list
  const categories = [
    "All", "Identity", "Certificates", "Business", "GST", "Tax", "Banking", "Licenses", "Education", "RTO", "Passport"
  ];

  // Map service slug to UI categories
  const getServiceCategory = (s: AgentService) => {
    if (s.category) return s.category.toLowerCase();
    const slug = s.slug.toLowerCase();
    if (slug.includes("gst")) return "gst";
    if (slug.includes("itr") || slug.includes("tax") || slug.includes("income")) return "tax";
    if (slug.includes("vishwakarma") || slug.includes("eshram") || slug.includes("aadhaar") || slug.includes("pan")) return "identity";
    if (slug.includes("pvc") || slug.includes("certificate") || slug.includes("voter")) return "certificates";
    if (slug.includes("loan") || slug.includes("banking") || slug.includes("cibil") || slug.includes("credit")) return "banking";
    if (slug.includes("rto") || slug.includes("dl") || slug.includes("rc")) return "rto";
    if (slug.includes("passport")) return "passport";
    return "business";
  };

  // Filter service items
  const filteredServices = useMemo(() => {
    let list = services;
    if (selectedCategory !== "All") {
      list = list.filter(s => getServiceCategory(s) === selectedCategory.toLowerCase());
    }
    if (serviceSearch) {
      const lower = serviceSearch.toLowerCase();
      list = list.filter(s => s.title.toLowerCase().includes(lower) || s.slug.toLowerCase().includes(lower));
    }
    return list;
  }, [services, selectedCategory, serviceSearch]);

  // Featured / popular services
  const popularServices = useMemo(() => services.filter(s => s.is_featured).slice(0, 4), [services]);

  // Recent services from localStorage
  const recentServices = useMemo(
    () => recentServiceIds.map(id => services.find(s => s.id === id)).filter(Boolean).slice(0, 3) as AgentService[],
    [recentServiceIds, services]
  );

  // Load dynamically tracked recent services
  useEffect(() => {
    const saved = localStorage.getItem("ap_recent_services");
    if (saved) {
      try {
        setRecentServiceIds(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse recent services", e);
      }
    }
  }, []);

  const saveRecentService = (id: string) => {
    const updated = [id, ...recentServiceIds.filter((x) => x !== id)].slice(0, 5);
    setRecentServiceIds(updated);
    localStorage.setItem("ap_recent_services", JSON.stringify(updated));
  };

  // Generate Receipt code
  useEffect(() => {
    setRazorpayPayment(null);
    setPaymentReceipt(`${receiptPrefix}-${Date.now()}`);
  }, [payableAmountPaise, receiptPrefix]);

  // Auto pincode check for customer profile
  useEffect(() => {
    const cleanPincode = customerPincode.replace(/\D/g, "").slice(0, 6);
    if (cleanPincode.length !== 6) return;

    setPincodeAutofillStatus("Syncing");
    const controller = new AbortController();
    fetch(`/api/pincode?pincode=${encodeURIComponent(cleanPincode)}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.city && data.state) {
          setCustomerCity(data.city);
          setCustomerState(data.state);
          setCustomerDistrict(data.district || data.city || "");
          setPincodeAutofillStatus("Verified");
          setDraftStatus("Draft Saved");
        } else {
          setPincodeAutofillStatus("Invalid");
        }
      })
      .catch(() => {
        setPincodeAutofillStatus("");
      });

    return () => controller.abort();
  }, [customerPincode]);

  // Debounced API for customer lookup
  useEffect(() => {
    if (searchQuery.length < 3) {
      setLookupResults([]);
      return;
    }

    setSearchLoading(true);
    const controller = new AbortController();
    const serviceSlug = selectedService?.slug ?? "";

    const delayDebounce = setTimeout(() => {
      fetch(`/api/ap/customers/lookup?search=${encodeURIComponent(searchQuery)}&serviceSlug=${encodeURIComponent(serviceSlug)}`, {
        signal: controller.signal
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.results) {
            setLookupResults(data.results as CustomerLookupResult[]);
          }
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            console.error("Suggestions search failed", err);
          }
        })
        .finally(() => setSearchLoading(false));
    }, 400);

    return () => {
      clearTimeout(delayDebounce);
      controller.abort();
    };
  }, [searchQuery, selectedService?.slug]);

  // Load draft from localStorage on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem("ap_new_application_draft");
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.customerName) setCustomerName(draft.customerName);
        if (draft.customerMobile) setCustomerMobile(draft.customerMobile);
        if (draft.customerEmail) setCustomerEmail(draft.customerEmail);
        if (draft.customerGender) setCustomerGender(draft.customerGender);
        if (draft.customerDob) setCustomerDob(draft.customerDob);
        if (draft.customerAddress) setCustomerAddress(draft.customerAddress);
        if (draft.customerState) setCustomerState(draft.customerState);
        if (draft.customerDistrict) setCustomerDistrict(draft.customerDistrict);
        if (draft.customerPincode) setCustomerPincode(draft.customerPincode);
        if (draft.customerCity) setCustomerCity(draft.customerCity);
        if (draft.serviceId) setServiceId(draft.serviceId);
        if (draft.isNewCustomer !== undefined) setIsNewCustomer(draft.isNewCustomer);
      } catch (e) {
        console.error("Failed to recover draft", e);
      }
    }
  }, []);

  // Auto-save draft variables on update
  useEffect(() => {
    setDraftStatus("Saving");
    const saveTimer = setTimeout(() => {
      const draft = {
        customerName, customerMobile, customerEmail, customerGender, customerDob,
        customerAddress, customerState, customerDistrict, customerPincode, customerCity,
        serviceId, isNewCustomer
      };
      localStorage.setItem("ap_new_application_draft", JSON.stringify(draft));
      setDraftStatus("Draft Saved");
    }, 800);

    return () => clearTimeout(saveTimer);
  }, [
    customerName, customerMobile, customerEmail, customerGender, customerDob,
    customerAddress, customerState, customerDistrict, customerPincode, customerCity,
    serviceId, isNewCustomer
  ]);

  // Select searched customer result
  const selectCustomerResult = (result: CustomerLookupResult) => {
    const cust = result.customer;
    setCustomerId(cust.id);
    setSelectedResult(result);
    setSearchQuery(cust.mobile);
    setLookupResults([]);
    setIsNewCustomer(false);

    setCustomerName(cust.full_name || "");
    setCustomerMobile(cust.mobile || "");
    setCustomerEmail(cust.email || "");
    setCustomerAddress(cust.address || "");
    setCustomerCity(cust.city || "");
    setCustomerPincode(cust.pincode || "");
    setCustomerState(cust.state || "");

    success(`Attributed: ${cust.full_name}`);

    if (result.duplicateApplication) {
      setActiveDuplicateApp(result.duplicateApplication);
      setShowDuplicateWarning(true);
    } else {
      setActiveDuplicateApp(null);
      setShowDuplicateWarning(false);
    }
  };

  // Sync PM Vishwakarma fields if selected
  useEffect(() => {
    if (!isPmVishwakarma) return;
    setPmVishwakarmaValues((current) => ({
      ...current,
      name: customerName || current.name,
      mobile: customerMobile.replace(/\D/g, "").slice(0, 10) || current.mobile,
      email: customerEmail || current.email,
      pincode: customerPincode || current.pincode,
      city: customerCity || current.city,
      state: customerState || current.state,
      address: customerAddress || current.address,
    }));
  }, [isPmVishwakarma, customerName, customerMobile, customerEmail, customerPincode, customerCity, customerState, customerAddress]);

  usePmVishwakarmaPincodeAutofill({
    enabled: Boolean(isPmVishwakarma),
    values: pmVishwakarmaValues,
    setValues: setPmVishwakarmaValues,
    setStatus: setPincodeStatus,
  });

  function updatePmVishwakarmaValue<Key extends keyof PmVishwakarmaApplicationValues>(key: Key, value: PmVishwakarmaApplicationValues[Key]) {
    setPmVishwakarmaValues((current) => ({ ...current, [key]: value }));
  }

  // Parse service required documents
  const serviceChecklist = useMemo(() => {
    if (!selectedService || !selectedService.required_documents) return [];
    return selectedService.required_documents
      .split(/,|\n/)
      .map(doc => doc.trim())
      .filter(Boolean);
  }, [selectedService]);

  // Drag and drop zone upload
  const handleFileUpload = (files: FileList | null, checklistType?: string) => {
    if (!files) return;
    const array = Array.from(files);

    array.forEach((file) => {
      const fileId = Math.random().toString(36).substring(7);
      const docType = checklistType || "Customer Document";
      
      const newFileObj = {
        id: fileId,
        file,
        documentType: docType,
        status: "validating" as const,
        progress: 10
      };

      setUploadedFiles(prev => [...prev, newFileObj]);

      let prg = 10;
      const interval = setInterval(() => {
        prg += 30;
        setUploadedFiles(prev => prev.map(item => {
          if (item.id === fileId) {
            return {
              ...item,
              progress: Math.min(prg, 100),
              status: prg >= 100 ? ("validated" as const) : ("validating" as const)
            };
          }
          return item;
        }));

        if (prg >= 100) {
          clearInterval(interval);
        }
      }, 150);
    });
  };

  // WebRTC Camera capture implementation
  const startCamera = async (checklistName: string) => {
    setActiveChecklistItem(checklistName);
    setShowCameraModal(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      toastError("Camera access denied.");
      setShowCameraModal(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCameraModal(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `${activeChecklistItem.toLowerCase().replace(/\s+/g, "_")}.jpg`, {
            type: "image/jpeg"
          });
          
          const fileId = Math.random().toString(36).substring(7);
          const newFileObj = {
            id: fileId,
            file,
            documentType: activeChecklistItem,
            status: "validated" as const,
            progress: 100
          };
          setUploadedFiles(prev => [...prev, newFileObj]);
          success(`Attached scan for ${activeChecklistItem}`);
        }
        stopCamera();
      }, "image/jpeg");
    }
  };

  const removeUploadedFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const isDocumentUploaded = (docName: string) => {
    return uploadedFiles.some(f => f.documentType === docName && f.status === "validated");
  };

  // Calculations Breakout
  const calculatedGST = Math.round(Number(selectedService?.customer_fee ?? 0) * 0.18);
  const grossTotal = Number(selectedService?.customer_fee ?? 0) + calculatedGST;
  const partnerNetMargin = selectedPayout;

  // Wizard Step Validation
  const validateStep1 = () => {
    if (!customerName.trim()) {
      toastError("Enter customer name.");
      return false;
    }
    if (customerMobile.length !== 10) {
      toastError("Enter 10-digit mobile number.");
      return false;
    }
    if (customerPincode.length !== 6) {
      toastError("Enter 6-digit pincode.");
      return false;
    }
    if (!customerCity.trim() || !customerState.trim() || !customerAddress.trim()) {
      toastError("Address fields are mandatory.");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!serviceId) {
      toastError("Select service.");
      return false;
    }
    if (isPmVishwakarma) {
      const pmValidationError = getPmVishwakarmaValidationError(pmVishwakarmaValues);
      if (pmValidationError) {
        toastError(pmValidationError);
        return false;
      }
    }
    return true;
  };

  const validateStep3 = () => {
    // Check if any mandatory checklist is pending upload
    const pending = serviceChecklist.filter(doc => !isDocumentUploaded(doc));
    if (pending.length > 0) {
      toastError(`Please upload: ${pending[0]}`);
      return false;
    }
    return true;
  };

  const validateStep4 = () => {
    if (!razorpayPayment && payableAmountPaise > 0) {
      toastError("Please complete online payment.");
      return false;
    }
    return true;
  };

  const triggerDraftSave = () => {
    const draft = {
      customerName, customerMobile, customerEmail, customerGender, customerDob,
      customerAddress, customerState, customerDistrict, customerPincode, customerCity,
      serviceId, isNewCustomer
    };
    localStorage.setItem("ap_new_application_draft", JSON.stringify(draft));
    success("Draft updated.");
  };

  // Submit Application handler
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    if (payableAmountPaise > 0 && !razorpayPayment) {
      toastError("Razorpay verification is mandatory.");
      return;
    }

    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    formData.set("customerId", isNewCustomer ? "" : customerId);
    formData.set("agentServiceId", serviceId);
    formData.set("serviceId", selectedService?.service_id ?? "");

    // Set Customer Details manually
    formData.set("customerName", customerName);
    formData.set("mobile", customerMobile);
    formData.set("email", customerEmail);
    formData.set("pincode", customerPincode);
    formData.set("city", customerCity);
    formData.set("district", customerDistrict);
    formData.set("state", customerState);
    formData.set("address", customerAddress);
    formData.set("gender", customerGender);
    formData.set("dob", customerDob);

    if (razorpayPayment) {
      formData.set("razorpay_payment_id", razorpayPayment.razorpay_payment_id);
      formData.set("razorpay_order_id", razorpayPayment.razorpay_order_id);
      formData.set("razorpay_signature", razorpayPayment.razorpay_signature);
      formData.set("razorpay_amount_paise", String(razorpayPayment.amount_paise));
    }

    // Append files manually to override default input behavior
    formData.delete("documents");
    uploadedFiles.forEach(uf => {
      formData.append("documents", uf.file);
    });

    startTransition(async () => {
      try {
        const response = await fetch("/api/ap/applications", {
          method: "POST",
          body: formData,
        });
        const result = (await response.json()) as { message?: string; applicationId?: string; invoiceId?: string };

        if (!response.ok || !result.applicationId) {
          throw new Error(result.message ?? "Application failed.");
        }

        success(result.message ?? "Application submitted.");
        trackApplicationSubmit();
        saveRecentService(serviceId);

        setSubmittedApplication({
          id: result.applicationId,
          invoiceId: result.invoiceId,
          applicationCode: `APP-${result.applicationId.substring(0, 8).toUpperCase()}`
        });
        setSubmitSuccess(true);
        
        localStorage.removeItem("ap_new_application_draft");
        router.refresh();
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Application failed.");
      }
    });
  }

  /* ═══════════════════════════════════════════════════════════
     HELPER: Service card for the catalog
     ═══════════════════════════════════════════════════════════ */
  const ServiceCard = ({ service, compact }: { service: AgentService; compact?: boolean }) => {
    const isSelected = serviceId === service.id;
    const payout = payoutForAgentService(service);
    const docCount = service.required_documents
      ? service.required_documents.split(/,|\n/).filter(d => d.trim()).length
      : 0;

    return (
      <button
        type="button"
        onClick={() => {
          setServiceId(service.id);
          saveRecentService(service.id);
        }}
        className={`w-full text-left rounded-2xl p-4 transition-all duration-150 active:scale-[0.98] ${
          isSelected
            ? "bg-blue-50 border-2 border-blue-500 shadow-sm shadow-blue-500/10"
            : "bg-white border border-slate-100 hover:border-slate-200 hover:shadow-sm"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold leading-snug ${isSelected ? "text-blue-700" : "text-slate-800"}`}>
              {service.title}
            </p>
            {!compact && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-slate-500">
                <span className="flex items-center gap-1 font-medium">
                  <IndianRupee className="w-3 h-3" />
                  {formatCurrency(service.customer_fee)}
                </span>
                <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                  +{formatCurrency(payout)} earn
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {service.processing_time || "1-3 Days"}
                </span>
                {docCount > 0 && (
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {docCount} docs
                  </span>
                )}
              </div>
            )}
          </div>
          <div className={`flex items-center justify-center w-6 h-6 rounded-full shrink-0 mt-0.5 transition-colors ${
            isSelected
              ? "bg-blue-500 text-white"
              : "border-2 border-slate-200"
          }`}>
            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          </div>
        </div>
      </button>
    );
  };

  /* ═══════════════════════════════════════════════════════════
     RENDER: Submission Success Screen
     ═══════════════════════════════════════════════════════════ */
  if (submitSuccess && submittedApplication) {
    return (
      <div className="mx-auto max-w-md space-y-5 animate-in fade-in zoom-in-95 duration-300">
        {/* Success Icon */}
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-100">
          <div className="mx-auto w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-5">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Application Submitted!</h1>
          <p className="text-sm text-slate-500 mt-1">
            Processing reference generated successfully.
          </p>

          {/* Info rows */}
          <div className="bg-slate-50 rounded-xl p-4 mt-5 text-left space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Reference</span>
              <span className="font-mono font-bold text-slate-800">{submittedApplication.applicationCode}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Service</span>
              <span className="font-semibold text-slate-800 truncate max-w-[180px]">{selectedService?.title}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Customer</span>
              <span className="font-semibold text-slate-800">{customerName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Amount</span>
              <span className="font-semibold text-slate-800">{formatCurrency(grossTotal)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-2">
          <Link
            href={`/ap/applications/${submittedApplication.id}`}
            className="flex flex-col items-center justify-center gap-1.5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs transition active:scale-[0.97] min-h-[52px]"
          >
            <Clock className="w-4 h-4" />
            Track
          </Link>
          <button
            onClick={() => handlePrint()}
            className="flex flex-col items-center justify-center gap-1.5 py-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl font-semibold text-xs text-slate-700 transition active:scale-[0.97] min-h-[52px]"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <a
            href={`https://wa.me/${customerMobile.replace(/\D/g, "")}?text=Hello%20${encodeURIComponent(customerName)},%20your%20application%20for%20${encodeURIComponent(selectedService?.title ?? "")}%20has%20been%20submitted.%20Ref:%20${submittedApplication.applicationCode}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-1.5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold text-xs transition active:scale-[0.97] min-h-[52px]"
          >
            <Share2 className="w-4 h-4" />
            Share
          </a>
        </div>

        <button
          onClick={() => {
            setSubmitSuccess(false);
            setSubmittedApplication(null);
            setCustomerId("");
            setCustomerName("");
            setCustomerMobile("");
            setCustomerEmail("");
            setCustomerAddress("");
            setCustomerCity("");
            setCustomerState("");
            setCustomerPincode("");
            setCustomerGender("");
            setCustomerDob("");
            setUploadedFiles([]);
            setRazorpayPayment(null);
            setCurrentStep(1);
          }}
          className="w-full py-3.5 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition active:scale-[0.98]"
        >
          + New Application
        </button>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     MAIN RENDER: Application Creation Wizard
     ═══════════════════════════════════════════════════════════ */
  const docsUploaded = serviceChecklist.filter(doc => isDocumentUploaded(doc)).length;
  const docsTotal = serviceChecklist.length;

  return (
    <form onSubmit={onSubmit} className="max-w-full overflow-hidden pb-28" aria-busy={isPending}>
      
      {/* ─── COMPACT HEADER (max 56px) ─── */}
      <div className="flex items-center justify-between h-14 mb-3">
        <div className="flex items-center gap-3">
          <Link
            href="/ap/dashboard"
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-100 text-slate-500 hover:bg-slate-50 active:scale-95 transition shadow-sm"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-slate-800 leading-tight">New Application</h1>
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <Check className="w-3 h-3" />
              {draftStatus}
            </span>
          </div>
        </div>

        {/* Overflow Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowOverflowMenu(!showOverflowMenu)}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-100 text-slate-500 hover:bg-slate-50 active:scale-95 transition shadow-sm"
          >
            <MoreHorizontal className="w-4.5 h-4.5" />
          </button>
          {showOverflowMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowOverflowMenu(false)} />
              <div className="absolute right-0 top-12 z-50 w-48 bg-white rounded-xl border border-slate-100 shadow-lg py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                <button
                  type="button"
                  onClick={() => { setShowRecentDrawer(true); setShowOverflowMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition"
                >
                  <History className="w-4 h-4 text-slate-400" />
                  Recent Applications
                </button>
                <button
                  type="button"
                  onClick={() => { setShowHelpModal(true); setShowOverflowMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition"
                >
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                  Help & Guidelines
                </button>
                <button
                  type="button"
                  onClick={() => { triggerDraftSave(); setShowOverflowMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition"
                >
                  <Download className="w-4 h-4 text-slate-400" />
                  Save Draft
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── HORIZONTAL PROGRESS TRACKER (sticky) ─── */}
      <div className="sticky top-14 z-30 bg-[#F7F8FA] pt-1 pb-3 -mx-3 px-3">
        <div className="flex items-center justify-between bg-white rounded-2xl px-3 py-3 border border-slate-100 shadow-sm">
          {STEP_LABELS.map((label, idx) => {
            const stepNum = idx + 1;
            const isCompleted = currentStep > stepNum;
            const isCurrent = currentStep === stepNum;
            const isFuture = currentStep < stepNum;

            return (
              <div key={label} className="flex flex-col items-center flex-1 relative">
                {/* Connector line */}
                {idx > 0 && (
                  <div className={`absolute top-3 right-1/2 w-full h-0.5 -translate-y-1/2 ${
                    isCompleted ? "bg-emerald-400" : "bg-slate-100"
                  }`} style={{ left: "-50%", width: "100%", zIndex: 0 }} />
                )}
                
                <button
                  type="button"
                  disabled={isFuture}
                  onClick={() => { if (isCompleted) setCurrentStep(stepNum); }}
                  className={`relative z-10 flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all duration-200 ${
                    isCompleted
                      ? "bg-emerald-500 text-white shadow-sm cursor-pointer active:scale-95"
                      : isCurrent
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-4 ring-blue-500/10"
                        : "bg-slate-100 text-slate-400 cursor-default"
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : stepNum}
                </button>
                <span className={`text-[11px] mt-1.5 font-medium leading-none ${
                  isCurrent ? "text-blue-600 font-semibold" : isCompleted ? "text-emerald-600" : "text-slate-400"
                }`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── FORM CONTENT AREA ─── */}
      <fieldset disabled={isPending} className="contents">

        {/* ═══════════════════════════════════════════════
            STEP 1: CUSTOMER
            ═══════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
            
            {/* Search / New toggle */}
            <div className="flex items-center gap-2 bg-white rounded-xl p-1.5 border border-slate-100">
              <button
                type="button"
                onClick={() => setIsNewCustomer(false)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition active:scale-[0.98] ${
                  !isNewCustomer ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <Search className="w-4 h-4" />
                Search
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsNewCustomer(true);
                  setCustomerId("");
                  setSelectedResult(null);
                  setCustomerName("");
                  setCustomerMobile("");
                  setCustomerEmail("");
                  setCustomerAddress("");
                  setCustomerPincode("");
                  setCustomerCity("");
                  setCustomerGender("");
                  setCustomerDob("");
                  setCustomerDistrict("");
                  setCustomerState("");
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition active:scale-[0.98] ${
                  isNewCustomer ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <UserPlus className="w-4 h-4" />
                New Customer
              </button>
            </div>

            {/* Customer Search */}
            {!isNewCustomer && (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search by name or mobile..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-11"
                  />
                  {searchLoading && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
                  )}
                </div>

                {/* Search Results */}
                {lookupResults.length > 0 && (
                  <div className="rounded-xl bg-white border border-slate-100 shadow-lg overflow-hidden divide-y divide-slate-50 max-h-48 overflow-y-auto">
                    {lookupResults.map((res) => (
                      <button
                        key={res.customer.id}
                        type="button"
                        onClick={() => selectCustomerResult(res)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between transition active:bg-slate-100"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{res.customer.full_name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{res.customer.mobile} • {res.customer.city || "No City"}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Customer Intelligence Panel */}
            {selectedResult && !isNewCustomer && (
              <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                      {selectedResult.customer.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{selectedResult.customer.full_name}</p>
                      <p className="text-xs text-slate-500">{selectedResult.customer.mobile}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedResult(null); setCustomerId(""); }}
                    className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Intelligence Stats */}
                {selectedResult.previousApplications.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50">
                    <div className="bg-slate-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-slate-500">Applications</p>
                      <p className="text-sm font-bold text-slate-800">{selectedResult.previousApplications.length}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-slate-500">Last Service</p>
                      <p className="text-sm font-bold text-slate-800 truncate">{selectedResult.previousApplications[0]?.service_name || "—"}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Duplicate Warning */}
            {showDuplicateWarning && activeDuplicateApp && (
              <div className="bg-amber-50 rounded-2xl p-4 flex items-start gap-3 border border-amber-100">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800">Duplicate Application</p>
                  <p className="text-xs text-slate-600 mt-0.5">Active application exists for this customer and service.</p>
                  <div className="flex gap-2 mt-3">
                    <Link
                      href={`/ap/applications/${activeDuplicateApp.id}`}
                      className="px-3 py-2 bg-amber-600 text-white font-semibold rounded-lg text-xs transition active:scale-95"
                    >
                      View Existing
                    </Link>
                    <button
                      type="button"
                      onClick={() => setShowDuplicateWarning(false)}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-lg font-semibold text-xs text-slate-600 transition active:scale-95"
                    >
                      Continue Anyway
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Grouped Form Fields ── */}

            {/* Group: Personal Information */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4 shadow-sm">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <User className="w-3.5 h-3.5" />
                Personal Information
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1.5 block">Full Name</label>
                  <Input
                    name="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer's full name"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1.5 block">Mobile Number</label>
                  <Input
                    name="mobile"
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="10-digit mobile"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1.5 block">Email Address</label>
                  <Input
                    name="email"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="email@address.com"
                  />
                </div>
              </div>
            </div>

            {/* Group: Identity Information */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4 shadow-sm">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Identity Information
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1.5 block">Gender</label>
                  <Select value={customerGender} onValueChange={setCustomerGender}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1.5 block">Date of Birth</label>
                  <Input
                    name="dob"
                    type="date"
                    value={customerDob}
                    onChange={(e) => setCustomerDob(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Group: Address Information */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4 shadow-sm">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" />
                Address Information
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1.5 block">Pincode</label>
                  <div className="relative">
                    <Input
                      name="pincode"
                      value={customerPincode}
                      onChange={(e) => setCustomerPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="6-digit PIN code"
                      maxLength={6}
                      inputMode="numeric"
                    />
                    {pincodeAutofillStatus && (
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold px-2 py-0.5 rounded-md ${
                        pincodeAutofillStatus === "Verified"
                          ? "text-emerald-600 bg-emerald-50"
                          : pincodeAutofillStatus === "Invalid"
                            ? "text-red-600 bg-red-50"
                            : "text-blue-600 bg-blue-50"
                      }`}>
                        {pincodeAutofillStatus}
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1.5 block">District</label>
                    <Input
                      name="district"
                      value={customerDistrict}
                      onChange={(e) => setCustomerDistrict(e.target.value)}
                      placeholder="District"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1.5 block">State</label>
                    <Input
                      name="state"
                      value={customerState}
                      onChange={(e) => setCustomerState(e.target.value)}
                      placeholder="State"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1.5 block">Full Address</label>
                  <Textarea
                    name="address"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="House no, street, locality..."
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            STEP 2: SERVICE SELECTION
            ═══════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search service..."
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                className="pl-11"
              />
            </div>

            {/* Popular Services */}
            {!serviceSearch && popularServices.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
                  <Star className="w-3.5 h-3.5 text-amber-400" />
                  Popular Services
                </h3>
                <div className="space-y-2">
                  {popularServices.map(s => (
                    <ServiceCard key={s.id} service={s} />
                  ))}
                </div>
              </div>
            )}

            {/* Recent Services */}
            {!serviceSearch && recentServices.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
                  <Clock className="w-3.5 h-3.5" />
                  Recent Services
                </h3>
                <div className="space-y-2">
                  {recentServices.map(s => (
                    <ServiceCard key={`recent-${s.id}`} service={s} compact />
                  ))}
                </div>
              </div>
            )}

            {/* Category Filter */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-full transition whitespace-nowrap cursor-pointer active:scale-95 min-h-[36px] ${
                    selectedCategory === cat 
                      ? "bg-blue-600 text-white shadow-sm" 
                      : "bg-white text-slate-600 border border-slate-100 hover:border-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* All / Filtered Services */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
                {serviceSearch ? `Results for "${serviceSearch}"` : selectedCategory !== "All" ? selectedCategory : "All Services"}
              </h3>
              {filteredServices.length > 0 ? (
                <div className="space-y-2">
                  {filteredServices.map(s => (
                    <ServiceCard key={s.id} service={s} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-white rounded-2xl border border-slate-100">
                  <p className="text-sm text-slate-400">No services found.</p>
                </div>
              )}
            </div>

            {/* Selected Service Summary */}
            {selectedService && (
              <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 space-y-2">
                <p className="text-sm font-semibold text-blue-800">Selected: {selectedService.title}</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white/80 rounded-lg py-2">
                    <p className="text-xs text-slate-500">Fee</p>
                    <p className="text-sm font-bold text-slate-800">{formatCurrency(selectedService.customer_fee)}</p>
                  </div>
                  <div className="bg-white/80 rounded-lg py-2">
                    <p className="text-xs text-emerald-600">Earn</p>
                    <p className="text-sm font-bold text-emerald-600">{formatCurrency(selectedPayout)}</p>
                  </div>
                  <div className="bg-white/80 rounded-lg py-2">
                    <p className="text-xs text-slate-500">Time</p>
                    <p className="text-sm font-bold text-slate-800">{selectedService.processing_time || "1-3 Days"}</p>
                  </div>
                </div>
              </div>
            )}

            {/* PM Vishwakarma Extension */}
            {isPmVishwakarma && (
              <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                <PmVishwakarmaApplicationFields 
                  values={pmVishwakarmaValues} 
                  onChange={updatePmVishwakarmaValue} 
                  pincodeStatus={pincodeStatus} 
                />
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            STEP 3: DOCUMENTS
            ═══════════════════════════════════════════════ */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
            
            {/* Document Progress */}
            {docsTotal > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-slate-800">Required Documents</p>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    docsUploaded === docsTotal
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-slate-100 text-slate-500"
                  }`}>
                    {docsUploaded} of {docsTotal}
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
                    style={{ width: docsTotal > 0 ? `${(docsUploaded / docsTotal) * 100}%` : "0%" }}
                  />
                </div>

                {/* Checklist */}
                <div className="space-y-2">
                  {serviceChecklist.map((doc, idx) => {
                    const uploaded = isDocumentUploaded(doc);
                    return (
                      <div key={idx} className={`flex items-center justify-between rounded-xl p-3 transition-colors ${
                        uploaded ? "bg-emerald-50/50" : "bg-slate-50"
                      }`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                            uploaded
                              ? "bg-emerald-500 text-white"
                              : "border-2 border-slate-200"
                          }`}>
                            {uploaded && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <span className={`text-sm font-medium truncate ${uploaded ? "text-emerald-700" : "text-slate-700"}`}>
                            {doc}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => startCamera(doc)}
                            className="flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition active:scale-95 min-h-[36px]"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            Scan
                          </button>
                          <label className="flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition cursor-pointer active:scale-95 min-h-[36px]">
                            <FileUp className="w-3.5 h-3.5" />
                            Add
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => handleFileUpload(e.target.files, doc)}
                              accept=".pdf,.jpg,.jpeg,.png"
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* General Upload Zone */}
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFileUpload(e.dataTransfer.files);
              }}
              className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-6 text-center bg-white cursor-pointer transition"
            >
              <FileUp className="w-6 h-6 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">Drop files here or browse</p>
              <label className="mt-3 inline-block px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer transition active:scale-95">
                Browse Files
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  accept=".pdf,.jpg,.jpeg,.png"
                />
              </label>
            </div>

            {/* Attached Files */}
            {uploadedFiles.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-2 shadow-sm">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Attached ({uploadedFiles.length})
                </p>
                {uploadedFiles.map((uf) => (
                  <div key={uf.id} className="flex items-center justify-between rounded-xl p-3 bg-slate-50 animate-in fade-in">
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-800 truncate block max-w-[160px]">{uf.file.name}</span>
                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md shrink-0 ml-2">
                          {uf.documentType}
                        </span>
                      </div>
                      {uf.status === "validated" && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 mt-1">
                          <ShieldCheck className="w-3 h-3" />
                          Validated
                        </span>
                      )}
                      {uf.status === "validating" && (
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-300"
                            style={{ width: `${uf.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeUploadedFile(uf.id)}
                      className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition min-h-[36px] min-w-[36px] flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* No documents required */}
            {docsTotal === 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center shadow-sm">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">No required documents for this service.</p>
                <p className="text-xs text-slate-400 mt-1">You can still upload optional documents above.</p>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            STEP 4: PAYMENT
            ═══════════════════════════════════════════════ */}
        {currentStep === 4 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
            
            {/* Payment Summary */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-slate-800">Payment Summary</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Service Fee</span>
                  <span className="font-mono font-medium">{formatCurrency(selectedService?.customer_fee ?? 0)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>GST (18%)</span>
                  <span className="font-mono font-medium">{formatCurrency(calculatedGST)}</span>
                </div>
                <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                  <span className="font-bold text-slate-800">Total Payable</span>
                  <span className="font-mono font-bold text-lg text-slate-800">{formatCurrency(grossTotal)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-emerald-600 font-medium">Your Commission</p>
                  <p className="text-base font-bold text-emerald-700 mt-0.5">{formatCurrency(partnerNetMargin)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500 font-medium">Expected Delivery</p>
                  <p className="text-base font-bold text-slate-800 mt-0.5">{selectedService?.processing_time || "1-3 Days"}</p>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Payment Method</h3>
                <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-md">Razorpay Only</span>
              </div>

              {selectedService && (
                <RazorpayCheckoutButton
                  amountPaise={payableAmountPaise}
                  receipt={paymentReceipt}
                  serviceSlug={selectedService?.slug}
                  customer={{
                    name: customerName,
                    email: customerEmail || undefined,
                    mobile: customerMobile,
                  }}
                  description={selectedService?.title ?? "Agency Partner POS application"}
                  disabled={isPending || !selectedService || Boolean(isPmVishwakarma && !isPmVishwakarmaComplete(pmVishwakarmaValues))}
                  onVerified={(payment) =>
                    setRazorpayPayment({
                      ...payment,
                      amount_paise: payableAmountPaise,
                    })
                  }
                />
              )}

              {razorpayPayment && (
                <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-600 animate-in fade-in">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  Payment verified successfully
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            STEP 5: REVIEW & SUBMIT
            ═══════════════════════════════════════════════ */}
        {currentStep === 5 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
            
            {/* Review Summary */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-slate-800">Review Application</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-slate-500">Customer</span>
                  <span className="font-semibold text-slate-800">{customerName}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-slate-500">Mobile</span>
                  <span className="font-mono font-medium text-slate-800">{customerMobile}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-slate-500">Service</span>
                  <span className="font-semibold text-slate-800 text-right max-w-[180px] truncate">{selectedService?.title}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-slate-500">Documents</span>
                  <span className="font-semibold text-slate-800">{uploadedFiles.length} attached</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-slate-500">Amount Paid</span>
                  <span className="font-mono font-bold text-slate-800">{formatCurrency(grossTotal)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-slate-500">Processing Time</span>
                  <span className="font-semibold text-slate-800">{selectedService?.processing_time || "1-3 Days"}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-emerald-600 font-semibold">Your Commission</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(partnerNetMargin)}</span>
                </div>
              </div>
            </div>

            {/* Invoice Preview Button */}
            {selectedService && (
              <button
                type="button"
                onClick={() => setShowInvoicePreview(true)}
                className="w-full py-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <FileText className="w-4 h-4" />
                Preview Invoice
              </button>
            )}

            {/* Payment Status */}
            {razorpayPayment && (
              <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3.5 text-sm font-semibold text-emerald-600">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                Payment verified — Ready to submit
              </div>
            )}
          </div>
        )}

      </fieldset>

      {/* ─── STICKY BOTTOM ACTION BAR ─── */}
      <div className="fixed bottom-[60px] md:bottom-0 inset-x-0 z-40 max-w-lg mx-auto">
        <div className="h-[72px] px-4 py-3 bg-white/95 backdrop-blur-md border-t border-slate-100 flex items-center gap-3 shadow-[0_-4px_24px_rgba(15,23,42,0.05)] pb-safe-bottom">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(prev => prev - 1)}
              className="h-12 px-5 border border-slate-200 bg-white text-slate-700 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 active:scale-95 min-w-[80px]"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <div className="w-1" />
          )}

          {currentStep < 5 && (
            <button
              type="button"
              onClick={() => {
                if (currentStep === 1 && validateStep1()) setCurrentStep(2);
                else if (currentStep === 2 && validateStep2()) setCurrentStep(3);
                else if (currentStep === 3 && validateStep3()) setCurrentStep(4);
                else if (currentStep === 4 && validateStep4()) setCurrentStep(5);
              }}
              className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition flex items-center justify-center cursor-pointer active:scale-[0.97] shadow-sm shadow-blue-500/20"
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          )}

          {currentStep === 5 && (
            <FormSubmitButton
              loading={isPending}
              disabled={!serviceId || !customerName || !customerMobile || (!razorpayPayment && payableAmountPaise > 0)}
              loadingText="Submitting"
              icon={<Send className="h-4 w-4" />}
              className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/15 cursor-pointer text-sm active:scale-[0.97]"
            >
              Submit Application
            </FormSubmitButton>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          MODALS
          ═══════════════════════════════════════════════ */}

      {/* Camera Scanner Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-slate-800 text-base">Scan Document</h3>
                <p className="text-xs text-slate-500 mt-0.5">Position {activeChecklistItem} inside frame</p>
              </div>
              <button
                type="button"
                onClick={() => stopCamera()}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-[4/3] rounded-xl bg-black overflow-hidden relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-4 border-2 border-dashed border-white/40 rounded-xl pointer-events-none flex items-center justify-center">
                <div className="w-full h-0.5 bg-blue-500/50 top-1/2 absolute animate-pulse" />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => capturePhoto()}
                className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition flex items-center justify-center gap-2 active:scale-95"
              >
                <Camera className="w-4 h-4" />
                Capture
              </button>
              <button
                type="button"
                onClick={() => stopCamera()}
                className="px-5 h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-slate-950/40 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-slate-800 text-base flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-500" />
                Help & Guidelines
              </h3>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-600 max-h-64 overflow-y-auto">
              <p className="leading-relaxed">
                This wizard guides you through 5 simple steps to submit a customer application: verify customer, select service, upload documents, collect payment, and submit.
              </p>
              <p className="leading-relaxed">
                All payments are processed securely through Razorpay. Offline payments are not supported.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition active:scale-95"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Invoice Preview Modal */}
      {showInvoicePreview && selectedService && (
        <div className="fixed inset-0 bg-slate-950/40 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4 print:p-0 print:border-none print:shadow-none animate-in scale-in-95 duration-200">
            <div className="flex justify-between items-center print:hidden">
              <h3 className="font-semibold text-slate-800 text-base">Invoice Preview</h3>
              <button
                type="button"
                onClick={() => setShowInvoicePreview(false)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4 text-sm text-slate-700 print:border-0 print:p-3">
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-800">DIGICONNECT</h2>
                  <p className="text-xs text-slate-400">POS RECEIPT</p>
                </div>
                <div className="text-right">
                  <span className="bg-blue-50 text-blue-600 font-semibold px-2 py-0.5 rounded text-xs">Draft</span>
                  <p className="text-xs text-slate-500 font-mono mt-1">Date: {new Date().toLocaleDateString("en-IN")}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase">Customer</p>
                  <p className="font-semibold text-slate-800 mt-1">{customerName || "Customer Name"}</p>
                  <p className="text-slate-500 font-mono">{customerMobile || "Mobile"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase">Payment</p>
                  <p className="font-semibold text-slate-800 mt-1">Agency Partner POS</p>
                  <p className="text-slate-500">Gateway: Razorpay</p>
                </div>
              </div>

              <div className="border border-slate-100 rounded-lg overflow-hidden text-xs">
                <div className="grid grid-cols-3 bg-slate-50 px-3 py-2 font-semibold text-slate-500">
                  <span className="col-span-2">Description</span>
                  <span className="text-right">Amount</span>
                </div>
                <div className="grid grid-cols-3 px-3 py-2.5 font-medium border-b border-slate-50">
                  <span className="col-span-2 truncate">{selectedService.title}</span>
                  <span className="text-right font-mono">{formatCurrency(selectedService.customer_fee)}</span>
                </div>
                <div className="grid grid-cols-3 px-3 py-2 text-slate-500">
                  <span className="col-span-2">GST (18%)</span>
                  <span className="text-right font-mono">{formatCurrency(calculatedGST)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-slate-100 pt-3 font-bold text-slate-800">
                <span>Total</span>
                <span className="font-mono text-base">{formatCurrency(grossTotal)}</span>
              </div>
            </div>

            <div className="flex gap-2 print:hidden">
              <button
                type="button"
                onClick={() => handlePrint()}
                className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition flex items-center justify-center gap-2 active:scale-95"
              >
                <Printer className="w-4 h-4" />
                Print Invoice
              </button>
              <button
                type="button"
                onClick={() => setShowInvoicePreview(false)}
                className="px-5 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Applications Drawer */}
      {showRecentDrawer && (
        <div className="fixed inset-0 bg-slate-950/40 flex justify-end z-50 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm h-full p-5 shadow-2xl flex flex-col space-y-4 animate-in slide-in-from-right duration-250">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-semibold text-slate-800 text-base">Recent Applications</h3>
                <p className="text-xs text-slate-400 mt-0.5">Latest customer submissions</p>
              </div>
              <button
                type="button"
                onClick={() => setShowRecentDrawer(false)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
              {customers.slice(0, 10).map((c, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{c.full_name}</p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{c.mobile} • {new Date(c.created_at).toLocaleDateString("en-IN")}</p>
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                    Submitted
                  </span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowRecentDrawer(false)}
              className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition active:scale-95"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
