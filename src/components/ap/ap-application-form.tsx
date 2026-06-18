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

  // Wizard Step Tracker
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

    setPincodeAutofillStatus("Checking...");
    const controller = new AbortController();
    fetch(`/api/pincode?pincode=${encodeURIComponent(cleanPincode)}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.city && data.state) {
          setCustomerCity(data.city);
          setCustomerState(data.state);
          setCustomerDistrict(data.district || data.city || "");
          setPincodeAutofillStatus("Auto-filled");
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

  // Debounced API call for real-time customer search
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

  // Auto-save draft variables to localStorage on field update
  useEffect(() => {
    setDraftStatus("Saving...");
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

    // Prefill profile fields
    setCustomerName(cust.full_name || "");
    setCustomerMobile(cust.mobile || "");
    setCustomerEmail(cust.email || "");
    setCustomerAddress(cust.address || "");
    setCustomerCity(cust.city || "");
    setCustomerPincode(cust.pincode || "");
    setCustomerState(cust.state || "");

    success(`Prefilled details for: ${cust.full_name}`);

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

  // Parse service's required documents checklist
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
      // Simulate file upload validation with progress ticker
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
    } catch (err) {
      toastError("Could not access camera device.");
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
          
          // Append to uploaded files list
          const fileId = Math.random().toString(36).substring(7);
          const newFileObj = {
            id: fileId,
            file,
            documentType: activeChecklistItem,
            status: "validated" as const,
            progress: 100
          };
          setUploadedFiles(prev => [...prev, newFileObj]);
          success(`Captured scan for ${activeChecklistItem}`);
        }
        stopCamera();
      }, "image/jpeg");
    }
  };

  const removeUploadedFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  // Check if a document from checklist has been uploaded
  const isDocumentUploaded = (docName: string) => {
    return uploadedFiles.some(f => f.documentType === docName && f.status === "validated");
  };

  // Commission Calculations
  const calculatedGST = Math.round(Number(selectedService?.customer_fee ?? 0) * 0.18);
  const grossTotal = Number(selectedService?.customer_fee ?? 0) + calculatedGST;
  const partnerNetMargin = selectedPayout;

  // Step Navigations & Validation
  const validateStep1 = () => {
    if (!customerName.trim()) {
      toastError("Please enter the customer name.");
      return false;
    }
    if (customerMobile.length !== 10) {
      toastError("Please enter a valid 10-digit mobile number.");
      return false;
    }
    if (customerPincode.length !== 6) {
      toastError("Please enter a valid 6-digit pincode.");
      return false;
    }
    if (!customerCity.trim() || !customerState.trim() || !customerAddress.trim()) {
      toastError("Please complete the address details.");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!serviceId) {
      toastError("Please select a service.");
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

  const triggerDraftSave = () => {
    const draft = {
      customerName, customerMobile, customerEmail, customerGender, customerDob,
      customerAddress, customerState, customerDistrict, customerPincode, customerCity,
      serviceId, isNewCustomer
    };
    localStorage.setItem("ap_new_application_draft", JSON.stringify(draft));
    success("Application draft saved successfully.");
  };

  // Submit Application handler
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    if (payableAmountPaise > 0 && !razorpayPayment) {
      toastError("Please complete Razorpay checkout before submitting.");
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
          throw new Error(result.message ?? "Application could not be created.");
        }

        success(result.message ?? "Application created successfully.");
        trackApplicationSubmit();
        saveRecentService(serviceId);

        // Save submitted info to display victory details
        setSubmittedApplication({
          id: result.applicationId,
          invoiceId: result.invoiceId,
          applicationCode: `APP-${result.applicationId.substring(0, 8).toUpperCase()}`
        });
        setSubmitSuccess(true);
        
        // Clear recovered draft from localStorage
        localStorage.removeItem("ap_new_application_draft");
        
        router.refresh();
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Application could not be created.");
      }
    });
  }

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // Section 10: Submission Success state UI
  if (submitSuccess && submittedApplication) {
    return (
      <div className="mx-auto max-w-2xl bg-white border border-slate-100 rounded-3xl p-8 text-center shadow-lg animate-in fade-in zoom-in-95 duration-500">
        <div className="mx-auto w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6">
          <Check className="w-10 h-10 stroke-[3]" />
        </div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Application Submitted!</h1>
        <p className="text-sm text-slate-500 mt-2">
          Your customer application is now processing on the DigiConnect portal.
        </p>

        {/* Info card */}
        <div className="bg-slate-50 rounded-2xl p-5 my-6 text-left border border-slate-100 space-y-3">
          <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-2">
            <span className="text-slate-500 font-semibold">Application Reference</span>
            <span className="font-mono font-bold text-slate-800">{submittedApplication.applicationCode}</span>
          </div>
          <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-2">
            <span className="text-slate-500 font-semibold">Selected Service</span>
            <span className="font-bold text-slate-800">{selectedService?.title}</span>
          </div>
          <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-2">
            <span className="text-slate-500 font-semibold">Customer Name</span>
            <span className="font-bold text-slate-800">{customerName}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500 font-semibold">Partner Commission</span>
            <span className="font-bold text-emerald-600">{formatCurrency(partnerNetMargin)}</span>
          </div>
        </div>

        {/* Action Triggers */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
          <Link
            href={`/ap/applications/${submittedApplication.id}`}
            className="flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs transition duration-150 shadow-sm"
          >
            <Clock className="w-4 h-4" />
            Track Status
          </Link>
          <button
            onClick={() => handlePrint()}
            className="flex items-center justify-center gap-2 py-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs text-slate-700 transition duration-150"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </button>
          <a
            href={`https://wa.me/${customerMobile.replace(/\D/g, "")}?text=Hello%20${encodeURIComponent(customerName)},%20your%20application%20for%20${encodeURIComponent(selectedService?.title ?? "")}%20has%20been%20submitted%20successfully.%20Tracking%20Reference:%20${submittedApplication.applicationCode}`}
            target="_blank"
            rel="noopener noreferrer"
            className="col-span-2 md:col-span-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-xs transition duration-150"
          >
            <Share2 className="w-4 h-4" />
            Share WhatsApp
          </a>
        </div>

        <button
          onClick={() => {
            // Reset state to submit new application
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
          className="mt-6 text-sm font-bold text-blue-600 hover:underline block mx-auto cursor-pointer"
        >
          Submit Another Application
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_360px]" aria-busy={isPending}>
      {/* SECTION 1: Sticky Header */}
      <div className="lg:col-span-2 bg-white/70 backdrop-blur-xl border border-slate-100/80 px-4 py-3 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-4 z-40 max-w-full overflow-hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black text-slate-800 tracking-tight">Create Application</h1>
            <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border ${
              draftStatus === "Saved" 
                ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                : "bg-amber-50 text-amber-600 border-amber-100"
            }`}>
              <Sparkles className="w-2.5 h-2.5" />
              {draftStatus}
            </span>
          </div>
          <p className="text-[10px] text-slate-500">Create and submit customer services quickly.</p>
        </div>
        
        <div className="flex gap-2 items-center">
          <button
            type="button"
            onClick={() => setShowRecentDrawer(true)}
            className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-650 bg-slate-50 hover:bg-slate-150 px-3 py-1.5 border border-slate-200 rounded-full transition"
          >
            <History className="w-3.5 h-3.5" />
            Recents
          </button>
          <button
            type="button"
            onClick={() => setShowHelpModal(true)}
            className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-655 bg-slate-50 hover:bg-slate-150 px-3 py-1.5 border border-slate-200 rounded-full transition"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Help
          </button>
        </div>
      </div>

      {/* SECTION 7: Compact Stepper Progress tracker */}
      <div className="lg:col-span-2 bg-white/70 backdrop-blur-xl border border-slate-100 p-4 rounded-2xl shadow-sm flex justify-between items-center text-[10px] md:text-xs font-bold text-slate-500 overflow-x-auto scrollbar-none gap-2">
        {[
          { step: 1, label: "Customer Profile" },
          { step: 2, label: "Service & Docs" },
          { step: 3, label: "Review & Checkout" }
        ].map((s, idx) => {
          const isDone = currentStep > s.step;
          const isActive = currentStep === s.step;
          return (
            <div key={s.step} className="flex items-center gap-1.5 shrink-0">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center border font-bold text-[10px] ${
                isDone ? "bg-emerald-500 border-emerald-500 text-white" : isActive ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-400"
              }`}>
                {isDone ? "✓" : s.step}
              </div>
              <span className={isActive ? "text-slate-800 font-extrabold" : "text-slate-400"}>{s.label}</span>
              {idx < 2 && <ChevronRight className="w-3 h-3 text-slate-300 ml-1.5" />}
            </div>
          );
        })}
      </div>

      <fieldset disabled={isPending} className="contents">
        {/* Main Wizard Form Steps container */}
        <div className="space-y-6 lg:col-span-1">
          {/* STEP 1: Customer Profile Search & Form */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* SECTION 2: Smart Customer Search */}
              <Card className="bg-white/70 backdrop-blur-xl border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-800">Smart Customer Search</h2>
                      <p className="text-[10px] text-slate-400">Search customer profiles instantly</p>
                    </div>
                  </div>
                  
                  <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setIsNewCustomer(false)}
                      className={`px-3 py-1 rounded-md transition ${!isNewCustomer ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
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
                      }}
                      className={`px-3 py-1 rounded-md transition ${isNewCustomer ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                    >
                      New
                    </button>
                  </div>
                </div>

                {!isNewCustomer && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="text"
                        placeholder="Search by Mobile, Aadhaar, PAN, Customer ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-11 border-slate-200 bg-white/80 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-xs"
                      />
                      {searchLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
                      )}
                    </div>

                    {/* Suggestions list */}
                    {lookupResults.length > 0 && (
                      <div className="border border-slate-100 rounded-2xl bg-white shadow-lg overflow-hidden divide-y divide-slate-100 z-55 max-h-60 overflow-y-auto">
                        {lookupResults.map((res) => (
                          <button
                            key={res.customer.id}
                            type="button"
                            onClick={() => selectCustomerResult(res)}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between transition cursor-pointer"
                          >
                            <div>
                              <p className="text-xs font-bold text-slate-800">{res.customer.full_name}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">{res.customer.mobile} &bull; {res.customer.city || "No City"}</p>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Result Card */}
                    {selectedResult && (
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-3 relative animate-in slide-in-from-top-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Selected Profile</span>
                            <h4 className="text-xs font-extrabold text-slate-800 mt-0.5">{selectedResult.customer.full_name}</h4>
                            <p className="text-[10px] text-slate-500">{selectedResult.customer.mobile} &bull; {selectedResult.customer.email || "No email"}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedResult(null);
                              setCustomerId("");
                            }}
                            className="text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded-full p-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {isNewCustomer && (
                  <div className="flex items-center gap-3 bg-blue-50 border border-blue-100/50 rounded-2xl p-3 text-blue-750 animate-in slide-in-from-top-1">
                    <UserPlus className="w-4 h-4 shrink-0 stroke-[2.5]" />
                    <div>
                      <p className="text-[11px] font-bold">New Customer Creation Mode</p>
                      <p className="text-[9px] text-blue-600 mt-0.5">Please fill details in the profile block below.</p>
                    </div>
                  </div>
                )}
              </Card>

              {/* SECTION 3: Customer Profile Form */}
              <Card className="bg-white/70 backdrop-blur-xl border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">Customer Information</h3>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Full Name</label>
                    <Input
                      name="customerName"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Enter full name"
                      className="h-10 border-slate-200 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Mobile Number</label>
                    <Input
                      name="mobile"
                      value={customerMobile}
                      onChange={(e) => setCustomerMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="10-digit mobile"
                      inputMode="numeric"
                      className="h-10 border-slate-200 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Email Address</label>
                    <Input
                      name="email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="customer@domain.com"
                      className="h-10 border-slate-200 bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Gender</label>
                      <Select value={customerGender} onValueChange={setCustomerGender}>
                        <SelectTrigger className="h-10 border-slate-200 bg-white text-xs">
                          <SelectValue placeholder="Gender" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Date of Birth</label>
                      <Input
                        name="dob"
                        type="date"
                        value={customerDob}
                        onChange={(e) => setCustomerDob(e.target.value)}
                        className="h-10 border-slate-200 bg-white text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Pincode</label>
                    <div className="relative">
                      <Input
                        name="pincode"
                        value={customerPincode}
                        onChange={(e) => setCustomerPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="6-digit PIN"
                        maxLength={6}
                        inputMode="numeric"
                        className="h-10 border-slate-200 bg-white pr-16"
                      />
                      {pincodeAutofillStatus && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-blue-600 bg-blue-50 px-1 rounded py-0.5">
                          {pincodeAutofillStatus}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">District</label>
                      <Input
                        name="district"
                        value={customerDistrict}
                        onChange={(e) => setCustomerDistrict(e.target.value)}
                        placeholder="District"
                        className="h-10 border-slate-200 bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">State</label>
                      <Input
                        name="state"
                        value={customerState}
                        onChange={(e) => setCustomerState(e.target.value)}
                        placeholder="State"
                        className="h-10 border-slate-200 bg-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Full Address</label>
                    <Textarea
                      name="address"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Address details..."
                      rows={2}
                      className="border-slate-200 bg-white text-xs"
                    />
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* STEP 2: Service & Document Center */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-3 duration-300">
              {/* SECTION 4: Service Selection */}
              <Card className="bg-white/70 backdrop-blur-xl border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">Choose Service</h3>
                
                {/* Horizontal categories list */}
                <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none pr-1">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 text-[10px] font-bold rounded-full transition whitespace-nowrap cursor-pointer ${
                        selectedCategory === cat 
                          ? "bg-blue-600 text-white shadow-sm" 
                          : "bg-slate-100 text-slate-600 hover:bg-slate-1.50"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search services catalog..."
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    className="pl-10 h-10 border-slate-200 bg-white"
                  />
                </div>

                <Select value={serviceId} onValueChange={setServiceId}>
                  <SelectTrigger className="h-11 border-slate-200 bg-white text-xs text-slate-800">
                    <SelectValue placeholder="Select Service" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {filteredServices.map((service) => (
                      <SelectItem key={service.id} value={service.id} className="hover:bg-slate-50 text-slate-700 text-xs">
                        {service.title} - {formatCurrency(service.customer_fee)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Shortcut badges */}
                <div className="flex flex-wrap gap-1 border-t border-slate-100 pt-2.5">
                  {services.slice(0, 3).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setServiceId(s.id)}
                      className={`px-2.5 py-1 text-[9px] font-extrabold rounded-lg border transition ${
                        serviceId === s.id 
                          ? "bg-blue-50 border-blue-200 text-blue-600" 
                          : "bg-white border-slate-200 text-slate-650 hover:bg-slate-50"
                      }`}
                    >
                      {s.title.replace("Registration", "").replace("Application", "").trim()}
                    </button>
                  ))}
                </div>
              </Card>

              {/* Service Details & Commission */}
              {selectedService && (
                <Card className="bg-white/70 backdrop-blur-xl border-slate-100 rounded-3xl p-5 shadow-sm space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[8px] font-bold text-slate-400 uppercase">Fee</span>
                      <p className="text-xs font-black text-slate-800 mt-0.5">{formatCurrency(selectedService.customer_fee)}</p>
                    </div>
                    <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100">
                      <span className="text-[8px] font-bold text-emerald-600 uppercase">Earn Commission</span>
                      <p className="text-xs font-black text-emerald-600 mt-0.5">{formatCurrency(selectedPayout)}</p>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[8px] font-bold text-slate-400 uppercase">Time</span>
                      <p className="text-xs font-bold text-slate-700 mt-0.5 truncate">{selectedService.processing_time || "1-3 Days"}</p>
                    </div>
                  </div>
                </Card>
              )}

              {/* PM Vishwakarma inputs */}
              {isPmVishwakarma && (
                <Card className="bg-white/70 backdrop-blur-xl border-slate-100 rounded-3xl p-5 shadow-sm space-y-3">
                  <PmVishwakarmaApplicationFields 
                    values={pmVishwakarmaValues} 
                    onChange={updatePmVishwakarmaValue} 
                    pincodeStatus={pincodeStatus} 
                  />
                </Card>
              )}

              {/* SECTION 6: Document Upload Center */}
              <Card className="bg-white/70 backdrop-blur-xl border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">Scanner upload center</h3>
                
                {/* Document lists */}
                {serviceChecklist.length > 0 ? (
                  <div className="space-y-2">
                    {serviceChecklist.map((doc, idx) => {
                      const uploaded = isDocumentUploaded(doc);
                      return (
                        <div key={idx} className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-xl p-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                              uploaded ? "bg-emerald-500 text-white animate-in zoom-in" : "bg-slate-200 text-slate-450"
                            }`}>
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            </div>
                            <span className="text-xs font-bold text-slate-700">{doc}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => startCamera(doc)}
                              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-650 p-1.5 rounded-lg shadow-sm transition inline-flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              Scan
                            </button>
                            <label className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-655 p-1.5 rounded-lg shadow-sm transition inline-flex items-center gap-1 text-[10px] font-bold cursor-pointer">
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
                ) : (
                  <div className="text-center py-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-450 text-[11px] font-bold">
                    No documents mandatory for this service.
                  </div>
                )}

                {/* Drag Drop box */}
                <div 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFileUpload(e.dataTransfer.files);
                  }}
                  className="border border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-4 text-center bg-slate-50/50 transition cursor-pointer flex flex-col items-center justify-center"
                >
                  <FileUp className="w-6 h-6 text-slate-400 mb-1" />
                  <p className="text-[11px] font-bold text-slate-700">Drag or drop scanned files here</p>
                  <label className="mt-2 px-3 py-1 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-[10px] font-bold shadow-sm transition inline-block">
                    Add Scans
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files)}
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                  </label>
                </div>

                {/* Uploaded lists */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-1.5 border-t border-slate-100 pt-3">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Scans Attachment:</span>
                    {uploadedFiles.map((uf) => (
                      <div key={uf.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm animate-in fade-in">
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-800 truncate block max-w-[150px]">{uf.file.name}</span>
                            <span className="text-[8px] font-extrabold text-blue-600 bg-blue-50 px-1 rounded">{uf.documentType}</span>
                          </div>

                          {uf.status === "validated" && (
                            <span className="inline-flex items-center gap-0.5 text-[8px] font-extrabold text-emerald-600 mt-1">
                              <ShieldCheck className="w-2.5 h-2.5" /> Checked & Scanned
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeUploadedFile(uf.id)}
                          className="text-slate-400 hover:text-red-500 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* STEP 3: Review & Payment Checkouts */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-3 duration-300">
              {/* SECTION 9: Pre-Submit Summary Card */}
              <Card className="bg-white/70 backdrop-blur-xl border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">Workspace Summary</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Customer Profile</span>
                    <span className="font-extrabold text-slate-700">{customerName}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Selected Service</span>
                    <span className="font-extrabold text-slate-700 truncate max-w-[180px]">{selectedService?.title}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Documents Attached</span>
                    <span className="font-extrabold text-slate-700">{uploadedFiles.length} Scans</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">TAT Duration</span>
                    <span className="font-bold text-blue-600">{selectedService?.processing_time || "1-3 working days"}</span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Filings Service Charge</span>
                    <span className="font-mono">{formatCurrency(selectedService?.customer_fee ?? 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-500">
                    <span>GST Taxes (18%)</span>
                    <span className="font-mono">{formatCurrency(calculatedGST)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700 border-t border-slate-200/60 pt-2 font-black">
                    <span>Grand Total</span>
                    <span className="font-mono text-slate-800 text-sm">{formatCurrency(grossTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-600 pt-1 font-bold">
                    <span>Partner Payout margin</span>
                    <span>{formatCurrency(partnerNetMargin)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowInvoicePreview(true)}
                  className="w-full h-10 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Generate Invoice
                </button>
              </Card>

              {/* SECTION 5: Razorpay Checkout Integration */}
              <Card className="bg-white/70 backdrop-blur-xl border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">Online Payment</h3>
                
                <div className="bg-blue-50 border border-blue-100/50 rounded-2xl p-3 text-blue-800 flex gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-[10px] leading-relaxed">
                    <p className="font-bold">Automated online verification only</p>
                    <p className="mt-0.5 text-blue-600">DigiConnect ecosystem strictly mandates Razorpay checkout. Cash or manual entries are not allowed.</p>
                  </div>
                </div>

                <div className="pt-2">
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
                    <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-2.5 text-xs font-bold text-emerald-600 mt-3 animate-in fade-in">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      Checkout verified: {razorpayPayment.razorpay_payment_id}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Desktop sidebar summary card (only visible on large screens) */}
        <div className="hidden lg:block space-y-6 h-fit lg:sticky lg:top-24">
          <Card className="bg-white/70 backdrop-blur-xl border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">Attribution</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Workspace</span><span className="font-bold text-slate-700">Agent Partner POS</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Service Fee</span><span className="font-mono text-slate-800">{formatCurrency(selectedService?.customer_fee ?? 0)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Commission Payout</span><span className="font-mono text-emerald-600 font-bold">{formatCurrency(partnerNetMargin)}</span></div>
            </div>
            
            {/* Desktop form navigation controllers */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  className="w-full h-10 border border-slate-200 bg-white text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
              )}
              {currentStep === 1 && (
                <button
                  type="button"
                  onClick={() => { if (validateStep1()) setCurrentStep(2); }}
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center"
                >
                  Next Step: Choose Service
                </button>
              )}
              {currentStep === 2 && (
                <button
                  type="button"
                  onClick={() => { if (validateStep2()) setCurrentStep(3); }}
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center"
                >
                  Next Step: Review & Pay
                </button>
              )}
              {currentStep === 3 && (
                <FormSubmitButton
                  loading={isPending}
                  disabled={!serviceId || !customerName || !customerMobile || !razorpayPayment}
                  loadingText="Submitting..."
                  icon={<Send className="h-4 w-4" />}
                  className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/10 cursor-pointer"
                >
                  Submit Application
                </FormSubmitButton>
              )}
              
              <button
                type="button"
                onClick={triggerDraftSave}
                className="w-full h-10 bg-slate-50 hover:bg-slate-100 border border-slate-250 text-slate-650 rounded-xl text-xs font-bold transition flex items-center justify-center"
              >
                Save Draft
              </button>
            </div>
          </Card>
        </div>
      </fieldset>

      {/* SECTION 4: APPLE-STYLE FLOATING STICKY BOTTOM ACTION FOOTER FOR MOBILE */}
      <div className="fixed bottom-[68px] inset-x-4 p-3 bg-white/90 backdrop-blur-xl border border-slate-100/80 shadow-2xl rounded-2xl z-40 lg:hidden flex items-center gap-2 animate-in slide-in-from-bottom duration-300">
        {currentStep > 1 && (
          <button
            type="button"
            onClick={() => setCurrentStep(prev => prev - 1)}
            className="h-10 px-3 border border-slate-200 bg-white text-slate-700 rounded-xl text-xs font-bold transition shrink-0 flex items-center justify-center"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}

        {currentStep < 3 && (
          <button
            type="button"
            onClick={triggerDraftSave}
            className="h-10 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-[10px] font-bold transition whitespace-nowrap shrink-0 flex items-center justify-center"
          >
            Save Draft
          </button>
        )}

        {currentStep === 3 && selectedService && (
          <button
            type="button"
            onClick={() => setShowInvoicePreview(true)}
            className="h-10 px-3 border border-slate-200 bg-white text-slate-700 rounded-xl text-[10px] font-bold transition whitespace-nowrap shrink-0 flex items-center justify-center"
          >
            Invoice
          </button>
        )}

        {/* Primary wizard checkout CTA */}
        {currentStep === 1 && (
          <button
            type="button"
            onClick={() => { if (validateStep1()) setCurrentStep(2); }}
            className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-extrabold transition flex items-center justify-center"
          >
            Continue
          </button>
        )}

        {currentStep === 2 && (
          <button
            type="button"
            onClick={() => { if (validateStep2()) setCurrentStep(3); }}
            className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-extrabold transition flex items-center justify-center"
          >
            Review & Pay
          </button>
        )}

        {currentStep === 3 && (
          <FormSubmitButton
            loading={isPending}
            disabled={!serviceId || !customerName || !customerMobile || !razorpayPayment}
            loadingText="Submitting..."
            icon={<Send className="h-3.5 w-3.5" />}
            className="flex-1 h-10 bg-gradient-to-r from-blue-600 to-indigo-650 text-white font-extrabold rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/10 cursor-pointer text-[11px]"
          >
            Submit Application
          </FormSubmitButton>
        )}
      </div>

      {/* DIALOGS AND OVERLAYS */}

      {/* WebRTC Camera Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-55 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Document Scanner</h3>
                <p className="text-[10px] text-slate-400">Position the document within boundaries</p>
              </div>
              <button
                type="button"
                onClick={() => stopCamera()}
                className="text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full p-1.5"
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
                <Camera className="w-4 h-4" />
                Capture
              </button>
              <button
                type="button"
                onClick={() => stopCamera()}
                className="px-4 h-11 bg-slate-100 hover:bg-slate-200 text-slate-705 font-bold rounded-xl text-xs transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-slate-950/40 flex items-center justify-center p-4 z-55 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-500" />
                Guidelines Help Desk
              </h3>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-650 max-h-80 overflow-y-auto pr-1">
              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-800">1. Wizard Navigation</h4>
                <p className="leading-relaxed">
                  Complete the customer details in Step 1, select the service catalog in Step 2, and checkout with online Razorpay payments in Step 3.
                </p>
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-800">2. Mandatory Online Pay</h4>
                <p className="leading-relaxed">
                  Platform guidelines mandate verified online gateway transactions. Offline cash entries and manual UPI inputs are disabled.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="w-full h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Invoice Center Modal */}
      {showInvoicePreview && selectedService && (
        <div className="fixed inset-0 bg-slate-950/40 flex items-center justify-center p-4 z-55 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-4 print:p-0 print:border-none print:shadow-none">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2 print:hidden">
              <h3 className="font-bold text-slate-800 text-sm">Invoice Center Preview</h3>
              <button
                type="button"
                onClick={() => setShowInvoicePreview(false)}
                className="text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Invoice card content */}
            <div className="border border-slate-200 rounded-2xl p-6 bg-white space-y-4 text-xs text-slate-700 print:border-0 print:p-4">
              <div className="flex justify-between items-start border-b border-slate-150 pb-3">
                <div>
                  <h2 className="text-sm font-black text-slate-800 tracking-tight">DIGICONNECT</h2>
                  <p className="text-[8px] text-slate-400 uppercase">POS RECEIPT</p>
                </div>
                <div className="text-right">
                  <span className="bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded text-[8px] border border-blue-100">
                    Draft Receipt
                  </span>
                  <p className="text-[9px] text-slate-500 font-mono mt-0.5">Date: {new Date().toLocaleDateString("en-IN")}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wide block">Customer Info</span>
                  <p className="font-bold text-slate-800 mt-0.5">{customerName || "Customer Name"}</p>
                  <p className="text-slate-500 font-mono mt-0.5">{customerMobile || "Mobile Number"}</p>
                  <p className="text-slate-500 truncate mt-0.5">{customerEmail || "No Email"}</p>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wide block">attributives</span>
                  <p className="font-bold text-slate-800 mt-0.5">Agency Partner POS</p>
                  <p className="text-slate-500 mt-0.5">Gateway: Razorpay Online</p>
                </div>
              </div>

              <div className="border border-slate-150 rounded-xl overflow-hidden">
                <div className="grid grid-cols-3 bg-slate-50 px-3 py-1.5 border-b border-slate-150 text-[9px] font-bold text-slate-400">
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

              <div className="flex justify-between items-center border-t border-slate-150 pt-2">
                <span className="text-xs font-bold text-slate-800">Total Payable Amount</span>
                <span className="text-sm font-black text-slate-800 font-mono">{formatCurrency(grossTotal)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100 print:hidden">
              <button
                type="button"
                onClick={() => handlePrint()}
                className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button
                type="button"
                onClick={() => setShowInvoicePreview(false)}
                className="px-5 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
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
          <div className="bg-white border-l border-slate-150 w-full max-w-md h-full p-6 shadow-2xl flex flex-col space-y-4 animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Recent Applications</h3>
                <p className="text-[10px] text-slate-400">Latest customer filings</p>
              </div>
              <button
                type="button"
                onClick={() => setShowRecentDrawer(false)}
                className="text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1">
              {customers.slice(0, 10).map((c, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
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
              className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-707 font-bold rounded-xl text-xs transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
