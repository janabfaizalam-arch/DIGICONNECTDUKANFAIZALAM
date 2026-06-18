"use client";

import { type FormEvent, useEffect, useMemo, useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  CheckCircle2, CreditCard, FileUp, Send, Search, User, UserPlus, 
  Sparkles, ShieldCheck, Check, AlertTriangle, Trash2, Camera, QrCode, 
  History, HelpCircle, Phone, Mail, MapPin, Download, Printer, Share2, 
  Clock, IndianRupee, Layers, FileText, ChevronRight, X, AlertCircle, ArrowLeft
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

  // Section 10: Submission Success state UI
  if (submitSuccess && submittedApplication) {
    return (
      <div className="mx-auto max-w-md bg-white border border-slate-100 rounded-3xl p-6 text-center shadow-lg animate-in fade-in zoom-in-95 duration-300">
        <div className="mx-auto w-14 h-14 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4">
          <Check className="w-7 h-7 stroke-[3]" />
        </div>
        <h1 className="text-xl font-black text-slate-800 tracking-tight">Application Submitted!</h1>
        <p className="text-xs text-slate-500 mt-1">
          Processing reference generated successfully.
        </p>

        {/* Info card */}
        <div className="bg-slate-50 rounded-2xl p-4 my-4 text-left border border-slate-100 space-y-2 text-xs">
          <div className="flex justify-between items-center pb-1">
            <span className="text-slate-500">Reference ID</span>
            <span className="font-mono font-bold text-slate-800">{submittedApplication.applicationCode}</span>
          </div>
          <div className="flex justify-between items-center pb-1">
            <span className="text-slate-500">Service</span>
            <span className="font-bold text-slate-800 truncate max-w-[150px]">{selectedService?.title}</span>
          </div>
          <div className="flex justify-between items-center pb-1">
            <span className="text-slate-500">Customer</span>
            <span className="font-bold text-slate-800">{customerName}</span>
          </div>
        </div>

        {/* Action Triggers */}
        <div className="grid gap-2 grid-cols-3">
          <Link
            href={`/ap/applications/${submittedApplication.id}`}
            className="flex flex-col items-center justify-center gap-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[10px] transition shadow-sm"
          >
            <Clock className="w-3.5 h-3.5" />
            Track
          </Link>
          <button
            onClick={() => handlePrint()}
            className="flex flex-col items-center justify-center gap-1 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl font-bold text-[10px] text-slate-700 transition"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
          <a
            href={`https://wa.me/${customerMobile.replace(/\D/g, "")}?text=Hello%20${encodeURIComponent(customerName)},%20your%20application%20for%20${encodeURIComponent(selectedService?.title ?? "")}%20has%20been%20submitted.%20Ref:%20${submittedApplication.applicationCode}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-[10px] transition"
          >
            <Share2 className="w-3.5 h-3.5" />
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
          className="mt-5 text-xs font-bold text-blue-600 hover:underline block mx-auto"
        >
          New Application
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="max-w-full overflow-hidden pb-16" aria-busy={isPending}>
      
      {/* HEADER SECTION (Max Height 120px) */}
      <div className="w-full bg-white/80 border border-slate-100/60 px-3.5 py-2.5 rounded-2xl shadow-sm flex items-center justify-between mb-3 gap-2 z-40 max-h-[60px]">
        <div className="flex items-center gap-2">
          <Link
            href="/ap/dashboard"
            className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 border border-slate-200/50"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xs font-bold text-slate-800 leading-tight">Apply</h1>
            <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded border border-emerald-100">
              {draftStatus}
            </span>
          </div>
        </div>

        <div className="flex gap-1.5 items-center">
          <button
            type="button"
            onClick={() => setShowRecentDrawer(true)}
            className="h-8 w-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center border border-slate-200/50"
            title="Recents"
          >
            <History className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowHelpModal(true)}
            className="h-8 w-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center border border-slate-200/50"
            title="Help Desk"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SINGLE GLASS SURFACE WRAPPER */}
      <div className="bg-white/70 backdrop-blur-xl border border-slate-100 rounded-3xl overflow-hidden shadow-sm divide-y divide-slate-100/80 max-w-full">
        <fieldset disabled={isPending} className="contents">
          
          {/* STEP 1: Customer */}
          <div className="p-3.5 transition-all">
            {currentStep > 1 ? (
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] shrink-0 font-bold shadow-sm">
                    ✓
                  </div>
                  <div className="text-slate-500 font-bold">
                    Step 1: Customer: <span className="text-slate-800 font-semibold">{customerName || "Selected"}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-blue-600 hover:text-blue-700 font-bold text-[11px]"
                >
                  Edit
                </button>
              </div>
            ) : currentStep === 1 ? (
              <div className="space-y-3.5 animate-in fade-in duration-200">
                <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wide">Step 1: Customer</span>
                  <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setIsNewCustomer(false)}
                      className={`px-2 py-0.5 rounded transition ${!isNewCustomer ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
                    >
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
                      className={`px-2 py-0.5 rounded transition ${isNewCustomer ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
                    >
                      New
                    </button>
                  </div>
                </div>

                {!isNewCustomer && (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-455" />
                      <Input
                        type="text"
                        placeholder="Search profile..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 border-slate-200 bg-white text-xs rounded-xl"
                      />
                      {searchLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border border-slate-300 border-t-blue-500 rounded-full animate-spin" />
                      )}
                    </div>

                    {lookupResults.length > 0 && (
                      <div className="border border-slate-100 rounded-xl bg-white shadow-md overflow-hidden divide-y divide-slate-100 z-50 max-h-40 overflow-y-auto">
                        {lookupResults.map((res) => (
                          <button
                            key={res.customer.id}
                            type="button"
                            onClick={() => selectCustomerResult(res)}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between text-[11px] transition"
                          >
                            <div>
                              <p className="font-bold text-slate-800">{res.customer.full_name}</p>
                              <p className="text-[9px] text-slate-400 mt-0.5">{res.customer.mobile} &bull; {res.customer.city || "No City"}</p>
                            </div>
                            <ChevronRight className="w-3 h-3 text-slate-450" />
                          </button>
                        ))}
                      </div>
                    )}

                    {selectedResult && (
                      <div className="bg-slate-50/50 rounded-xl p-2.5 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-slate-850">{selectedResult.customer.full_name}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{selectedResult.customer.mobile}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setSelectedResult(null); setCustomerId(""); }}
                          className="text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded-full p-1 shadow-xs"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Customer Profile inputs */}
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Customer Name</label>
                    <Input
                      name="customerName"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Enter name"
                      className="h-9 border-slate-200 bg-white text-xs"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Mobile Number</label>
                    <Input
                      name="mobile"
                      value={customerMobile}
                      onChange={(e) => setCustomerMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="10-digit mobile"
                      inputMode="numeric"
                      className="h-9 border-slate-200 bg-white text-xs"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Email Address</label>
                    <Input
                      name="email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="email@address.com"
                      className="h-9 border-slate-200 bg-white text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Gender</label>
                      <Select value={customerGender} onValueChange={setCustomerGender}>
                        <SelectTrigger className="h-9 border-slate-200 bg-white text-xs">
                          <SelectValue placeholder="Gender" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-0.5">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">DOB</label>
                      <Input
                        name="dob"
                        type="date"
                        value={customerDob}
                        onChange={(e) => setCustomerDob(e.target.value)}
                        className="h-9 border-slate-200 bg-white text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Pincode</label>
                    <div className="relative">
                      <Input
                        name="pincode"
                        value={customerPincode}
                        onChange={(e) => setCustomerPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="6-digit PIN"
                        maxLength={6}
                        inputMode="numeric"
                        className="h-9 border-slate-200 bg-white pr-14 text-xs"
                      />
                      {pincodeAutofillStatus && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-extrabold text-blue-600 bg-blue-50 px-1 py-0.2 rounded">
                          {pincodeAutofillStatus}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">District</label>
                      <Input
                        name="district"
                        value={customerDistrict}
                        onChange={(e) => setCustomerDistrict(e.target.value)}
                        placeholder="District"
                        className="h-9 border-slate-200 bg-white text-xs"
                      />
                    </div>

                    <div className="space-y-0.5">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">State</label>
                      <Input
                        name="state"
                        value={customerState}
                        onChange={(e) => setCustomerState(e.target.value)}
                        placeholder="State"
                        className="h-9 border-slate-200 bg-white text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-0.5 sm:col-span-2">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Address</label>
                    <Textarea
                      name="address"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Complete address..."
                      rows={1.5}
                      className="border-slate-200 bg-white text-xs"
                    />
                  </div>
                </div>

                {/* Duplicate App warnings */}
                {showDuplicateWarning && activeDuplicateApp && (
                  <div className="bg-amber-50/50 rounded-2xl p-3 flex items-start gap-2.5 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex-1 text-[10px]">
                      <p className="font-bold text-amber-800">Duplicate Application Alert</p>
                      <p className="text-slate-600 mt-0.5">Active application exists for this customer.</p>
                      <div className="flex gap-2 mt-2">
                        <Link
                          href={`/ap/applications/${activeDuplicateApp.id}`}
                          className="px-2.5 py-1 bg-amber-600 text-white font-bold rounded-lg text-[9px]"
                        >
                          View Existing
                        </Link>
                        <button
                          type="button"
                          onClick={() => setShowDuplicateWarning(false)}
                          className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-650"
                        >
                          Continue
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs py-0.5 text-slate-400">
                <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[10px] shrink-0 font-bold">
                  1
                </div>
                <span className="font-semibold text-slate-400">Step 1: Customer</span>
              </div>
            )}
          </div>

          {/* STEP 2: Service */}
          <div className="p-3.5 transition-all">
            {currentStep > 2 ? (
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] shrink-0 font-bold shadow-sm">
                    ✓
                  </div>
                  <div className="text-slate-500 font-bold">
                    Step 2: Service: <span className="text-slate-800 font-semibold">{selectedService?.title || "Selected"}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="text-blue-600 hover:text-blue-700 font-bold text-[11px]"
                >
                  Change
                </button>
              </div>
            ) : currentStep === 2 ? (
              <div className="space-y-3.5 animate-in fade-in duration-200">
                <span className="text-xs font-black text-slate-800 uppercase block border-b border-slate-100 pb-1.5">Step 2: Service</span>
                
                <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none pr-1">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 text-[9px] font-bold rounded-full transition whitespace-nowrap cursor-pointer ${
                        selectedCategory === cat 
                          ? "bg-blue-600 text-white shadow-sm" 
                          : "bg-slate-100 text-slate-655 hover:bg-slate-150"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search service item..."
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    className="pl-9 h-9 border-slate-200 bg-white"
                  />
                </div>

                <Select value={serviceId} onValueChange={setServiceId}>
                  <SelectTrigger className="h-10 border-slate-200 bg-white text-xs text-slate-800">
                    <SelectValue placeholder="Select Service" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {filteredServices.map((service) => (
                      <SelectItem key={service.id} value={service.id} className="hover:bg-slate-50 text-slate-707 text-xs">
                        {service.title} - {formatCurrency(service.customer_fee)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedService && (
                  <div className="grid grid-cols-3 gap-2 bg-slate-50/50 p-2.5 rounded-2xl text-center text-xs font-bold">
                    <div>
                      <span className="text-[8px] font-bold text-slate-455 block uppercase">Fee</span>
                      <p className="text-slate-800 mt-0.5">{formatCurrency(selectedService.customer_fee)}</p>
                    </div>
                    <div>
                      <span className="text-[8px] font-bold text-emerald-600 block uppercase">Payout</span>
                      <p className="text-emerald-600 mt-0.5">{formatCurrency(selectedPayout)}</p>
                    </div>
                    <div>
                      <span className="text-[8px] font-bold text-slate-455 block uppercase">TAT</span>
                      <p className="text-slate-750 mt-0.5 truncate">{selectedService.processing_time || "1-3 Days"}</p>
                    </div>
                  </div>
                )}

                {isPmVishwakarma && (
                  <PmVishwakarmaApplicationFields 
                    values={pmVishwakarmaValues} 
                    onChange={updatePmVishwakarmaValue} 
                    pincodeStatus={pincodeStatus} 
                  />
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs py-0.5 text-slate-400">
                <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[10px] shrink-0 font-bold">
                  2
                </div>
                <span className="font-semibold text-slate-400">Step 2: Service</span>
              </div>
            )}
          </div>

          {/* STEP 3: Documents */}
          <div className="p-3.5 transition-all">
            {currentStep > 3 ? (
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] shrink-0 font-bold shadow-sm">
                    ✓
                  </div>
                  <div className="text-slate-500 font-bold">
                    Step 3: Documents: <span className="text-slate-800 font-semibold">{uploadedFiles.length} files attached</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="text-blue-600 hover:text-blue-700 font-bold text-[11px]"
                >
                  Manage
                </button>
              </div>
            ) : currentStep === 3 ? (
              <div className="space-y-3.5 animate-in fade-in duration-200">
                <span className="text-xs font-black text-slate-800 uppercase block border-b border-slate-100 pb-1.5">Step 3: Documents</span>

                {serviceChecklist.length > 0 ? (
                  <div className="space-y-1.5">
                    {serviceChecklist.map((doc, idx) => {
                      const uploaded = isDocumentUploaded(doc);
                      return (
                        <div key={idx} className="flex justify-between items-center bg-slate-50/50 rounded-xl p-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                              uploaded ? "bg-emerald-500 text-white animate-in zoom-in" : "bg-slate-200 text-slate-400"
                            }`}>
                              <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                            </div>
                            <span className="text-xs font-bold text-slate-700 truncate">{doc}</span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => startCamera(doc)}
                              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 p-1.5 rounded-lg shadow-xs text-[9px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Camera className="w-3.5 h-3.5" /> Scan
                            </button>
                            <label className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 p-1.5 rounded-lg shadow-xs text-[9px] font-bold flex items-center gap-1 cursor-pointer">
                              <FileUp className="w-3.5 h-3.5" /> Add
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
                ) : (
                  <div className="text-center py-4 bg-slate-50/30 rounded-2xl text-[10px] font-bold text-slate-400">
                    No documents required for this service.
                  </div>
                )}

                {/* Compact general upload */}
                <div 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFileUpload(e.dataTransfer.files);
                  }}
                  className="border border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-3 text-center bg-slate-50/20 cursor-pointer transition flex flex-col items-center justify-center"
                >
                  <FileUp className="w-5 h-5 text-slate-400 mb-1" />
                  <p className="text-[10px] font-bold text-slate-600">Drag scans here</p>
                  <label className="mt-1.5 px-3 py-1 bg-white border border-slate-250 hover:bg-slate-100 rounded-lg text-[9px] font-bold shadow-xs transition inline-block">
                    Browse Scans
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files)}
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                  </label>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="space-y-1.5 border-t border-slate-100 pt-2">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wide block">Attached ({uploadedFiles.length})</span>
                    {uploadedFiles.map((uf) => (
                      <div key={uf.id} className="flex items-center justify-between bg-white/50 rounded-lg p-2 animate-in">
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="font-bold text-slate-800 truncate block max-w-[120px]">{uf.file.name}</span>
                            <span className="text-[8px] font-extrabold text-blue-600 bg-blue-50 px-1 rounded">{uf.documentType}</span>
                          </div>
                          {uf.status === "validated" && (
                            <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-emerald-600 mt-0.5">
                              <ShieldCheck className="w-2.5 h-2.5" /> Validated
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeUploadedFile(uf.id)}
                          className="text-slate-400 hover:text-red-500 p-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs py-0.5 text-slate-400">
                <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[10px] shrink-0 font-bold">
                  3
                </div>
                <span className="font-semibold text-slate-400">Step 3: Documents</span>
              </div>
            )}
          </div>

          {/* STEP 4: Payment */}
          <div className="p-3.5 transition-all">
            {currentStep > 4 ? (
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] shrink-0 font-bold shadow-sm">
                    ✓
                  </div>
                  <div className="text-slate-500 font-bold">
                    Step 4: Payment: <span className="text-emerald-600 font-bold">Verified ({formatCurrency(grossTotal)})</span>
                  </div>
                </div>
              </div>
            ) : currentStep === 4 ? (
              <div className="space-y-3.5 animate-in fade-in duration-200">
                <span className="text-xs font-black text-slate-800 uppercase block border-b border-slate-100 pb-1.5">Step 4: Payment</span>

                <div className="bg-slate-50/50 rounded-2xl p-3.5 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Filings Charge</span>
                    <span className="font-mono">{formatCurrency(selectedService?.customer_fee ?? 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-500">
                    <span>GST Taxes (18%)</span>
                    <span className="font-mono">{formatCurrency(calculatedGST)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700 border-t border-slate-200/50 pt-2 font-black text-sm">
                    <span>Payable Total</span>
                    <span className="font-mono text-slate-800">{formatCurrency(grossTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-600 pt-0.5 font-bold">
                    <span>Earning margin</span>
                    <span>{formatCurrency(partnerNetMargin)}</span>
                  </div>
                </div>

                <div className="pt-1.5">
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
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3.5 py-2 text-xs font-bold text-emerald-600 mt-2.5 animate-in fade-in">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      Transaction verified successfully.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs py-0.5 text-slate-400">
                <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[10px] shrink-0 font-bold">
                  4
                </div>
                <span className="font-semibold text-slate-400">Step 4: Payment</span>
              </div>
            )}
          </div>

          {/* STEP 5: Submit */}
          <div className="p-3.5 transition-all">
            {currentStep === 5 ? (
              <div className="space-y-3.5 animate-in fade-in duration-200">
                <span className="text-xs font-black text-slate-800 uppercase block border-b border-slate-100 pb-1.5">Step 5: Submit</span>

                <div className="space-y-2.5 text-xs bg-slate-50/50 rounded-2xl p-3.5">
                  <div className="flex justify-between pb-1 border-b border-slate-200/20">
                    <span className="text-slate-400">Customer Profile</span>
                    <span className="font-bold text-slate-800">{customerName}</span>
                  </div>
                  <div className="flex justify-between pb-1 border-b border-slate-200/20">
                    <span className="text-slate-400">Service Title</span>
                    <span className="font-bold text-slate-800 truncate max-w-[155px]">{selectedService?.title}</span>
                  </div>
                  <div className="flex justify-between pb-1 border-b border-slate-200/20">
                    <span className="text-slate-400">Documents Attached</span>
                    <span className="font-bold text-slate-800">{uploadedFiles.length} files</span>
                  </div>
                  <div className="flex justify-between pb-1 border-b border-slate-200/20">
                    <span className="text-slate-400">Processing TAT</span>
                    <span className="font-bold text-slate-800">{selectedService?.processing_time || "As per catalog"}</span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-600 font-extrabold pt-0.5">
                    <span>Commission Margin</span>
                    <span>{formatCurrency(partnerNetMargin)}</span>
                  </div>
                </div>

                {selectedService && (
                  <button
                    type="button"
                    onClick={() => setShowInvoicePreview(true)}
                    className="w-full h-10 border border-slate-200 bg-white hover:bg-slate-50 text-slate-750 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5" /> Preview Invoice
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs py-0.5 text-slate-400">
                <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[10px] shrink-0 font-bold">
                  5
                </div>
                <span className="font-semibold text-slate-450">Step 5: Submit</span>
              </div>
            )}
          </div>

        </fieldset>
      </div>

      {/* STICKY BOTTOM ACTION BAR (56px) */}
      <div className="fixed bottom-[60px] md:bottom-0 inset-x-0 h-[56px] px-4 py-2 bg-white/85 backdrop-blur-md border-t border-slate-150 flex items-center justify-between gap-2.5 z-40 max-w-xl mx-auto shadow-lg pb-safe-bottom">
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={() => setCurrentStep(prev => prev - 1)}
            className="h-9 px-3.5 border border-slate-200 bg-white text-slate-707 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
        ) : (
          <button
            type="button"
            onClick={triggerDraftSave}
            className="h-9 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-[10px] font-bold transition shrink-0 cursor-pointer"
          >
            Save Draft
          </button>
        )}

        {currentStep === 1 && (
          <button
            type="button"
            onClick={() => { if (validateStep1()) setCurrentStep(2); }}
            className="flex-1 h-9 bg-blue-600 hover:bg-blue-750 text-white rounded-xl text-xs font-extrabold transition flex items-center justify-center cursor-pointer"
          >
            Continue
          </button>
        )}

        {currentStep === 2 && (
          <button
            type="button"
            onClick={() => { if (validateStep2()) setCurrentStep(3); }}
            className="flex-1 h-9 bg-blue-600 hover:bg-blue-755 text-white rounded-xl text-xs font-extrabold transition flex items-center justify-center cursor-pointer"
          >
            Continue
          </button>
        )}

        {currentStep === 3 && (
          <button
            type="button"
            onClick={() => { if (validateStep3()) setCurrentStep(4); }}
            className="flex-1 h-9 bg-blue-600 hover:bg-blue-755 text-white rounded-xl text-xs font-extrabold transition flex items-center justify-center cursor-pointer"
          >
            Continue
          </button>
        )}

        {currentStep === 4 && (
          <button
            type="button"
            onClick={() => { if (validateStep4()) setCurrentStep(5); }}
            className="flex-1 h-9 bg-blue-600 hover:bg-blue-755 text-white rounded-xl text-xs font-extrabold transition flex items-center justify-center cursor-pointer"
          >
            Continue
          </button>
        )}

        {currentStep === 5 && (
          <FormSubmitButton
            loading={isPending}
            disabled={!serviceId || !customerName || !customerMobile || !razorpayPayment}
            loadingText="Submitting"
            icon={<Send className="h-3.5 w-3.5" />}
            className="flex-1 h-9 bg-gradient-to-r from-blue-600 to-indigo-650 text-white font-extrabold rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/10 cursor-pointer text-xs"
          >
            Submit
          </FormSubmitButton>
        )}
      </div>

      {/* DIALOGS AND MODALS */}

      {/* WebRTC Camera Scanner */}
      {showCameraModal && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-55 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Scan Document</h3>
                <p className="text-[10px] text-slate-450">Position the document inside boundaries</p>
              </div>
              <button
                type="button"
                onClick={() => stopCamera()}
                className="text-slate-400 hover:text-slate-655 bg-slate-100 rounded-full p-1.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="aspect-[4/3] rounded-2xl bg-black overflow-hidden relative border border-slate-100">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-4 border-2 border-dashed border-white/50 rounded-xl pointer-events-none flex items-center justify-center">
                <div className="w-full h-0.5 bg-blue-500/60 top-1/2 absolute animate-pulse" />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => capturePhoto()}
                className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1"
              >
                <Camera className="w-4 h-4" /> Capture Scan
              </button>
              <button
                type="button"
                onClick={() => stopCamera()}
                className="px-4 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guidelines Guide */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-slate-950/40 flex items-center justify-center p-4 z-55 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-blue-500" />
                POS Guidelines
              </h3>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-slate-655 bg-slate-100 rounded-full p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-650 max-h-60 overflow-y-auto pr-1">
              <p className="leading-relaxed">
                Step-by-step wizard guides you to verify customer details, select filing services, upload required document formats, check out using Razorpay gateway validation, and submit the final applications timeline.
              </p>
              <p className="leading-relaxed">
                Automated payments online are mandatory. Offline checkout formats are disabled.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="w-full h-9 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoicePreview && selectedService && (
        <div className="fixed inset-0 bg-slate-950/40 flex items-center justify-center p-4 z-55 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-xl p-5 shadow-2xl space-y-4 print:p-0 print:border-none print:shadow-none animate-in scale-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2 print:hidden">
              <h3 className="font-bold text-slate-800 text-sm">Invoice Center Preview</h3>
              <button
                type="button"
                onClick={() => setShowInvoicePreview(false)}
                className="text-slate-400 hover:text-slate-655 bg-slate-100 rounded-full p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-4 text-xs text-slate-700 print:border-0 print:p-3">
              <div className="flex justify-between items-start border-b border-slate-150 pb-3">
                <div>
                  <h2 className="text-sm font-black text-slate-800 tracking-tight">DIGICONNECT</h2>
                  <p className="text-[8px] text-slate-400">POS RECEIPT</p>
                </div>
                <div className="text-right">
                  <span className="bg-blue-50 text-blue-600 font-bold px-1.5 py-0.2 rounded text-[8px] border border-blue-100">
                    Draft
                  </span>
                  <p className="text-[9px] text-slate-500 font-mono mt-0.5">Date: {new Date().toLocaleDateString("en-IN")}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[10px]">
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wide block">Customer Info</span>
                  <p className="font-bold text-slate-800 mt-0.5">{customerName || "Customer Name"}</p>
                  <p className="text-slate-500 font-mono mt-0.5">{customerMobile || "Mobile Number"}</p>
                  <p className="text-slate-500 truncate mt-0.5">{customerEmail || "No Email"}</p>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wide block">Attribution</span>
                  <p className="font-bold text-slate-800 mt-0.5">Agency Partner POS</p>
                  <p className="text-slate-500 mt-0.5">Gateway: Razorpay Online</p>
                </div>
              </div>

              <div className="border border-slate-150 rounded-xl overflow-hidden text-[10px]">
                <div className="grid grid-cols-3 bg-slate-50 px-3 py-1.5 border-b border-slate-150 font-bold text-slate-400">
                  <span className="col-span-2">Service Description</span>
                  <span className="text-right">Amount</span>
                </div>
                <div className="grid grid-cols-3 px-3 py-2 text-slate-700 font-bold border-b border-slate-100">
                  <span className="col-span-2 truncate">{selectedService.title}</span>
                  <span className="text-right font-mono font-medium">{formatCurrency(selectedService.customer_fee)}</span>
                </div>
                <div className="grid grid-cols-3 px-3 py-1.5 text-slate-500">
                  <span className="col-span-2">Taxes & GST (18%)</span>
                  <span className="text-right font-mono">{formatCurrency(calculatedGST)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-slate-150 pt-2 font-bold text-slate-800">
                <span>Total Payable Amount</span>
                <span className="font-mono text-sm">{formatCurrency(grossTotal)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100 print:hidden">
              <button
                type="button"
                onClick={() => handlePrint()}
                className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1"
              >
                <Printer className="w-4 h-4" /> Print Invoice
              </button>
              <button
                type="button"
                onClick={() => setShowInvoicePreview(false)}
                className="px-5 h-10 bg-slate-100 hover:bg-slate-200 text-slate-705 font-bold rounded-xl text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Applications Drawer */}
      {showRecentDrawer && (
        <div className="fixed inset-0 bg-slate-950/40 flex justify-end z-55 animate-in fade-in duration-200">
          <div className="bg-white border-l border-slate-150 w-full max-w-sm h-full p-5 shadow-2xl flex flex-col space-y-4 animate-in slide-in-from-right duration-250">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Recent Applications</h3>
                <p className="text-[10px] text-slate-400">Latest customer submissions</p>
              </div>
              <button
                type="button"
                onClick={() => setShowRecentDrawer(false)}
                className="text-slate-400 hover:text-slate-655 bg-slate-100 rounded-full p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1">
              {customers.slice(0, 10).map((c, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between text-xs">
                  <div>
                    <h5 className="font-bold text-slate-800">{c.full_name}</h5>
                    <p className="text-[9px] text-slate-500 font-mono mt-0.5">{c.mobile} &bull; {new Date(c.created_at).toLocaleDateString("en-IN")}</p>
                  </div>
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    Submitted
                  </span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowRecentDrawer(false)}
              className="w-full h-10 bg-slate-100 hover:bg-slate-200 text-slate-707 font-bold rounded-xl text-xs transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
