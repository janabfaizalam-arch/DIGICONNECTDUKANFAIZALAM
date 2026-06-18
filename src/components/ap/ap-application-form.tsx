"use client";

import { type FormEvent, useEffect, useMemo, useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  CheckCircle2, CreditCard, FileUp, Send, Search, User, UserPlus, 
  Sparkles, ShieldCheck, Check, AlertTriangle, Trash2, Camera, QrCode, 
  History, HelpCircle, Phone, Mail, MapPin, Download, Printer, Share2, 
  Clock, IndianRupee, Layers, FileText, ChevronRight, X, AlertCircle
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

  // Basic States
  const [customerId, setCustomerId] = useState(defaultCustomerId ?? "");
  const [serviceId, setServiceId] = useState(defaultServiceId ?? services[0]?.id ?? "");
  const [razorpayPayment, setRazorpayPayment] = useState<(VerifiedRazorpayPayment & { amount_paise: number }) | null>(null);
  
  // Advanced features / Section States
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

  // Payment Center States
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "cash" | "upi_qr">("razorpay");
  const [offlineReference, setOfflineReference] = useState("");

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

  // Debounced API call for real-time customer search (Mobile, Aadhaar, PAN, Customer ID)
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

  // Submit Application handler
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    if (payableAmountPaise > 0 && paymentMethod === "razorpay" && !razorpayPayment) {
      toastError("Please complete Razorpay checkout before submitting.");
      return;
    }

    if (isPmVishwakarma) {
      const pmValidationError = getPmVishwakarmaValidationError(pmVishwakarmaValues);
      if (pmValidationError) {
        toastError(pmValidationError);
        return;
      }
    }

    if (paymentMethod === "upi_qr" && !offlineReference) {
      toastError("Enter the UPI transaction reference ID before submitting.");
      return;
    }

    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    formData.set("customerId", isNewCustomer ? "" : customerId);
    formData.set("agentServiceId", serviceId);
    formData.set("serviceId", selectedService?.service_id ?? "");
    formData.set("paymentMethod", paymentMethod);
    formData.set("offlineReference", offlineReference);

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

    if (paymentMethod === "razorpay" && razorpayPayment) {
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
            setOfflineReference("");
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
      <div className="lg:col-span-2 bg-white/70 backdrop-blur-xl border border-slate-100/80 px-6 py-4 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-4 z-40">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-slate-800 tracking-tight">Create Application</h1>
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
              draftStatus === "Saved" 
                ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                : "bg-amber-50 text-amber-600 border-amber-100"
            }`}>
              <Sparkles className="w-2.5 h-2.5" />
              {draftStatus}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Create and submit customer services quickly.</p>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
          <button
            type="button"
            onClick={() => setShowRecentDrawer(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 px-4 py-2 border border-slate-200 rounded-full transition"
          >
            <History className="w-3.5 h-3.5" />
            Recent Applications
          </button>
          <button
            type="button"
            onClick={() => setShowHelpModal(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 px-4 py-2 border border-slate-200 rounded-full transition"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Help Guide
          </button>
        </div>
      </div>

      <fieldset disabled={isPending} className="contents">
        <div className="space-y-6">
          {/* SECTION 2: Smart Customer Search */}
          <Card className="bg-white/70 backdrop-blur-xl border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
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
                  Search Existing
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
                  Create New
                </button>
              </div>
            </div>

            {!isNewCustomer && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Enter mobile, Aadhaar (12-digit), PAN, or Customer ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11 border-slate-200 bg-white/80 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-xs"
                  />
                  {searchLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
                  )}
                </div>

                {/* Dropdown Match Results */}
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

                {/* Selected customer card */}
                {selectedResult && (
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-3 relative animate-in slide-in-from-top-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Selected Customer Profile</span>
                        <h4 className="text-sm font-extrabold text-slate-800 mt-0.5">{selectedResult.customer.full_name}</h4>
                        <p className="text-xs text-slate-500">{selectedResult.customer.mobile} &bull; {selectedResult.customer.email || "No email"}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedResult(null);
                          setCustomerId("");
                        }}
                        className="text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded-full p-1 shadow-sm"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>

                    {selectedResult.previousApplications.length > 0 && (
                      <div className="border-t border-slate-200/50 pt-2.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Previous Services:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedResult.previousApplications.slice(0, 3).map(app => (
                            <span key={app.id} className="inline-flex items-center text-[9px] font-bold bg-white text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                              {app.service_name} &bull; <span className="capitalize text-blue-600">{app.status.replace(/_/g, " ")}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {isNewCustomer && (
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-100/50 rounded-2xl p-4 text-blue-700 animate-in slide-in-from-top-1">
                <UserPlus className="w-5 h-5 shrink-0 stroke-[2.5]" />
                <div>
                  <p className="text-xs font-bold">New Customer Mode Active</p>
                  <p className="text-[10px] text-blue-600/90 mt-0.5">Please fill out the details form below to register.</p>
                </div>
              </div>
            )}

            {/* Duplicate Application Warn */}
            {showDuplicateWarning && activeDuplicateApp && (
              <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-4 flex items-start gap-3 animate-in fade-in duration-300">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <p className="text-xs font-bold text-amber-800">Duplicate Application Alert</p>
                  <p className="text-[10px] text-amber-700 leading-normal">
                    This customer has an active application for <strong>&quot;{activeDuplicateApp.service_name}&quot;</strong> with status <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold capitalize">{activeDuplicateApp.status.replace(/_/g, " ")}</span>.
                  </p>
                  <div className="flex gap-2">
                    <Link
                      href={`/ap/applications/${activeDuplicateApp.id}`}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[9px] rounded-lg transition"
                    >
                      View Existing
                    </Link>
                    <button
                      type="button"
                      onClick={() => setShowDuplicateWarning(false)}
                      className="px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-[9px] rounded-lg transition"
                    >
                      Continue Anyway
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* SECTION 3: Customer Profile Form */}
          <Card className="bg-white/70 backdrop-blur-xl border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800">Customer Profile Form</h2>
                <p className="text-[10px] text-slate-400">Essential customer information</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Full Name</label>
                <Input
                  name="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter full name"
                  required
                  className="h-10 border-slate-200 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Mobile Number</label>
                <Input
                  name="mobile"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="Enter 10-digit mobile"
                  required
                  inputMode="numeric"
                  className="h-10 border-slate-200 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Email Address</label>
                <Input
                  name="email"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="Enter email id"
                  className="h-10 border-slate-200 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Gender</label>
                  <Select value={customerGender} onValueChange={setCustomerGender}>
                    <SelectTrigger className="h-10 border-slate-200 bg-white text-xs">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Date of Birth</label>
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
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Pincode</label>
                <div className="relative">
                  <Input
                    name="pincode"
                    value={customerPincode}
                    onChange={(e) => setCustomerPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="6-digit pincode"
                    maxLength={6}
                    inputMode="numeric"
                    required
                    className="h-10 border-slate-200 bg-white pr-16"
                  />
                  {pincodeAutofillStatus && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                      {pincodeAutofillStatus}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">District</label>
                  <Input
                    name="district"
                    value={customerDistrict}
                    onChange={(e) => setCustomerDistrict(e.target.value)}
                    placeholder="District"
                    required
                    className="h-10 border-slate-200 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">State</label>
                  <Input
                    name="state"
                    value={customerState}
                    onChange={(e) => setCustomerState(e.target.value)}
                    placeholder="State"
                    required
                    className="h-10 border-slate-200 bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Address Details</label>
                <Textarea
                  name="address"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="House No, Street name, area..."
                  rows={2}
                  required
                  className="border-slate-200 bg-white text-xs"
                />
              </div>
            </div>
          </Card>

          {/* SECTION 4: Service Selection */}
          <Card className="bg-white/70 backdrop-blur-xl border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Service Selection</h2>
                  <p className="text-[10px] text-slate-400">Filter and choose digital services</p>
                </div>
              </div>
            </div>

            {/* Quick Categories Bar */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none pr-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-full transition whitespace-nowrap cursor-pointer ${
                    selectedCategory === cat 
                      ? "bg-blue-600 text-white shadow-sm" 
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1 md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search services by keyword..."
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    className="pl-10 h-10 border-slate-200 bg-white"
                  />
                </div>
              </div>

              {/* Service Select box */}
              <div className="space-y-1 md:col-span-2">
                <Select value={serviceId} onValueChange={setServiceId}>
                  <SelectTrigger className="h-11 border-slate-200 bg-white text-xs text-slate-800">
                    <SelectValue placeholder="Select service to apply" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {filteredServices.length > 0 ? (
                      filteredServices.map((service) => (
                        <SelectItem key={service.id} value={service.id} className="hover:bg-slate-50 text-slate-700">
                          {service.title} - {formatCurrency(service.customer_fee)}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-xs text-slate-400 text-center">No matching services</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Popular/Recent service shortcuts */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Shortcut Services</span>
              <div className="flex flex-wrap gap-1.5">
                {services.slice(0, 3).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setServiceId(s.id);
                      setServiceSearch("");
                    }}
                    className={`px-3 py-1 text-[10px] font-extrabold rounded-lg border transition ${
                      serviceId === s.id 
                        ? "bg-blue-50 border-blue-200 text-blue-600" 
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {s.title.replace("Registration", "").replace("Application", "").trim()}
                  </button>
                ))}

                {recentServiceIds.map((id) => {
                  const s = services.find((x) => x.id === id);
                  if (!s || services.slice(0, 3).some(x => x.id === id)) return null;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setServiceId(s.id);
                        setServiceSearch("");
                      }}
                      className={`px-3 py-1 text-[10px] font-extrabold rounded-lg border transition ${
                        serviceId === s.id 
                          ? "bg-blue-50 border-blue-200 text-blue-600" 
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      🕒 {s.title.replace("Registration", "").replace("Application", "").trim()}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* SECTION 5: Selected Service Stats */}
          {selectedService && (
            <Card className="bg-white/70 backdrop-blur-xl border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Service Specifications</h2>
                  <p className="text-[10px] text-slate-400">Processing levels and payouts</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Customer Fee</p>
                  <p className="text-base font-black text-slate-800 mt-1">{formatCurrency(selectedService.customer_fee)}</p>
                </div>

                <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100">
                  <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wide">Your Payout</p>
                  <p className="text-base font-black text-emerald-600 mt-1">{formatCurrency(selectedPayout)}</p>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 col-span-2 md:col-span-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Completion Time</p>
                  <p className="text-xs font-bold text-slate-700 mt-1">{selectedService.processing_time || "1-3 Working Days"}</p>
                </div>
              </div>

              {selectedService.instructions && (
                <div className="bg-blue-50/40 border border-blue-100/50 rounded-2xl p-4">
                  <span className="text-[9px] font-bold text-blue-700 uppercase tracking-wide block">Agent Instructions:</span>
                  <p className="text-[10px] text-slate-600 leading-normal mt-1 whitespace-pre-line">{selectedService.instructions}</p>
                </div>
              )}
            </Card>
          )}

          {/* PM Vishwakarma Fields if active */}
          {isPmVishwakarma && (
            <Card className="bg-white/70 backdrop-blur-xl border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <PmVishwakarmaApplicationFields 
                values={pmVishwakarmaValues} 
                onChange={updatePmVishwakarmaValue} 
                pincodeStatus={pincodeStatus} 
              />
            </Card>
          )}

          {/* SECTION 6: Document Upload Center */}
          <Card className="bg-white/70 backdrop-blur-xl border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                  <FileUp className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Document Upload Center</h2>
                  <p className="text-[10px] text-slate-400">Scan and drop customer documents</p>
                </div>
              </div>
            </div>

            {/* Required Checklist Banners */}
            {serviceChecklist.length > 0 && (
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Required Documents Checklist:</span>
                <div className="grid gap-2">
                  {serviceChecklist.map((doc, idx) => {
                    const uploaded = isDocumentUploaded(doc);
                    return (
                      <div key={idx} className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-xl p-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            uploaded ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-400"
                          }`}>
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                          <span className="text-xs font-bold text-slate-700">{doc}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => startCamera(doc)}
                            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 p-1.5 rounded-lg shadow-sm transition inline-flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            Scan
                          </button>
                          <label className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 p-1.5 rounded-lg shadow-sm transition inline-flex items-center gap-1 text-[10px] font-bold cursor-pointer">
                            <FileUp className="w-3.5 h-3.5" />
                            Upload
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

            {/* General Dropzone */}
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFileUpload(e.dataTransfer.files);
              }}
              className="border border-dashed border-slate-200 hover:border-blue-400/80 rounded-2xl p-6 text-center bg-slate-50/50 cursor-pointer transition flex flex-col items-center justify-center"
            >
              <FileUp className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-xs font-bold text-slate-700">Drag & Drop files here</p>
              <p className="text-[10px] text-slate-400 mt-1">Accepts PDF, JPG, PNG up to 5MB</p>
              <label className="mt-3 px-4 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold shadow-sm transition inline-block">
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

            {/* Uploaded File status blocks */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Uploaded Files:</span>
                <div className="grid gap-2">
                  {uploadedFiles.map((uf) => (
                    <div key={uf.id} className="flex items-center justify-between bg-white border border-slate-150 rounded-xl p-3 shadow-sm animate-in fade-in">
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 truncate block">{uf.file.name}</span>
                          <span className="text-[9px] font-bold text-blue-600">{uf.documentType}</span>
                        </div>
                        
                        <div className="flex items-center gap-3 mt-1.5">
                          <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-blue-600 h-full transition-all duration-300"
                              style={{ width: `${uf.progress}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 font-mono">{uf.progress}%</span>
                        </div>

                        {uf.status === "validated" && (
                          <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-emerald-600 bg-emerald-50/50 border border-emerald-100 rounded px-1.5 py-0.5 w-fit">
                            <ShieldCheck className="w-3 h-3" />
                            AI Scanned & Validated (96% confidence)
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeUploadedFile(uf.id)}
                        className="text-slate-400 hover:text-red-500 p-1.5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* SECTION 7: Payment Center */}
          <Card className="bg-white/70 backdrop-blur-xl border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Payment Checkout</h2>
                  <p className="text-[10px] text-slate-400">Select checkout method and view margins</p>
                </div>
              </div>
            </div>

            {/* Payment Method Switcher */}
            <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setPaymentMethod("razorpay")}
                className={`py-2 rounded-xl transition flex flex-col items-center gap-1 cursor-pointer ${
                  paymentMethod === "razorpay" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <CreditCard className="w-4 h-4" />
                Online
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("upi_qr")}
                className={`py-2 rounded-xl transition flex flex-col items-center gap-1 cursor-pointer ${
                  paymentMethod === "upi_qr" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <QrCode className="w-4 h-4" />
                UPI QR
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("cash")}
                className={`py-2 rounded-xl transition flex flex-col items-center gap-1 cursor-pointer ${
                  paymentMethod === "cash" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <IndianRupee className="w-4 h-4" />
                Cash Collected
              </button>
            </div>

            {/* Payment Sub-Sections */}
            {paymentMethod === "razorpay" && selectedService && (
              <div className="space-y-3">
                <p className="text-[10px] text-slate-400 leading-normal">
                  Redirects to secure Razorpay checkout modal supporting UPI, Cards, Netbanking, and Wallets.
                </p>
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
                {razorpayPayment && (
                  <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-2.5 text-xs font-bold text-emerald-600 animate-in fade-in">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Transaction Verified: {razorpayPayment.razorpay_payment_id}
                  </div>
                )}
              </div>
            )}

            {paymentMethod === "upi_qr" && selectedService && (
              <div className="space-y-4 bg-slate-50 p-4 border border-slate-100 rounded-2xl animate-in fade-in">
                <div className="flex items-center gap-4">
                  {/* Mock QR code container */}
                  <div className="w-24 h-24 bg-white border border-slate-200 rounded-xl flex items-center justify-center relative p-1.5 shadow-sm overflow-hidden shrink-0">
                    <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center rounded">
                      <QrCode className="w-10 h-10 text-slate-400 stroke-[1.5]" />
                      <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase">Scan to Pay</span>
                    </div>
                    {/* Scan beam line animation */}
                    <div className="absolute left-0 right-0 h-0.5 bg-blue-500/80 top-0 animate-bounce" />
                  </div>
                  
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Scan UPI QR</span>
                    <h4 className="text-base font-extrabold text-slate-800 mt-1">{formatCurrency(grossTotal)}</h4>
                    <p className="text-[10px] text-slate-500 leading-normal mt-1">
                      Customer scans this QR code via PhonePe, GooglePay, or Paytm to initiate direct payment.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">UPI Transaction UTR Reference ID *</label>
                  <Input
                    type="text"
                    placeholder="Enter 12-digit UTR ref ID"
                    value={offlineReference}
                    onChange={(e) => setOfflineReference(e.target.value.replace(/\D/g, "").slice(0, 12))}
                    required={paymentMethod === "upi_qr"}
                    maxLength={12}
                    className="h-10 border-slate-200 bg-white"
                  />
                </div>
              </div>
            )}

            {paymentMethod === "cash" && (
              <div className="space-y-4 bg-slate-50 p-4 border border-slate-100 rounded-2xl animate-in fade-in">
                <div className="flex gap-3 text-slate-700">
                  <IndianRupee className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold">Physical Cash Collected</p>
                    <p className="text-[10px] text-slate-500 leading-normal mt-0.5">
                      Confirm you have physically collected the fee sum of <strong>{formatCurrency(grossTotal)}</strong> in hand from the customer.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Internal Cash Receipt Reference (Optional)</label>
                  <Input
                    type="text"
                    placeholder="Enter manual receipt number"
                    value={offlineReference}
                    onChange={(e) => setOfflineReference(e.target.value)}
                    className="h-10 border-slate-200 bg-white"
                  />
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT SIDE STICKY SUMMARY COLUMN */}
        <div className="space-y-6 lg:sticky lg:top-24 h-fit">
          {/* SECTION 9: Application Summary */}
          <Card className="bg-white/70 backdrop-blur-xl border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">Application Checklist</h3>

            {/* Checklist items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white ${
                    customerName && customerMobile ? "bg-emerald-500" : "bg-slate-200"
                  }`}>
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span className="text-slate-500 font-semibold">Customer Details</span>
                </div>
                <span className="font-bold text-slate-700 truncate max-w-28 text-[11px]">
                  {customerName ? customerName : "Missing"}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white ${
                    selectedService ? "bg-emerald-500" : "bg-slate-200"
                  }`}>
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span className="text-slate-500 font-semibold">Selected Service</span>
                </div>
                <span className="font-bold text-slate-700 truncate max-w-28 text-[11px]">
                  {selectedService ? selectedService.title : "Missing"}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white ${
                    uploadedFiles.length > 0 ? "bg-emerald-500" : "bg-slate-200"
                  }`}>
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span className="text-slate-500 font-semibold">Documents Scanned</span>
                </div>
                <span className="font-bold text-slate-700 text-[11px]">
                  {uploadedFiles.length} file(s)
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white ${
                    (paymentMethod === "razorpay" && razorpayPayment) || (paymentMethod !== "razorpay" && offlineReference) ? "bg-emerald-500" : "bg-slate-200"
                  }`}>
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span className="text-slate-500 font-semibold">Payment Checkout</span>
                </div>
                <span className="font-bold text-slate-700 capitalize text-[11px]">
                  {paymentMethod === "razorpay" && razorpayPayment ? "Verified" : paymentMethod !== "razorpay" && offlineReference ? "Ready" : "Pending"}
                </span>
              </div>
            </div>

            {/* Pricing Breakout Card */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mt-4 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-500">
                <span>Service Fee</span>
                <span className="font-mono">{formatCurrency(selectedService?.customer_fee ?? 0)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Taxes & GST (18%)</span>
                <span className="font-mono">{formatCurrency(calculatedGST)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500 border-t border-slate-200/60 pt-2 font-bold text-slate-700">
                <span>Gross Total</span>
                <span className="font-mono text-slate-800">{formatCurrency(grossTotal)}</span>
              </div>

              <div className="border-t border-slate-200/60 pt-2 text-[10px] space-y-1.5">
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Your Commission Payout</span>
                  <span>{formatCurrency(partnerNetMargin)}</span>
                </div>
                <div className="flex justify-between text-blue-600 font-semibold">
                  <span>Estimated Completion</span>
                  <span>{selectedService?.processing_time || "As per catalog"}</span>
                </div>
              </div>
            </div>

            {/* Section 8: Invoice preview toggler */}
            {selectedService && (
              <button
                type="button"
                onClick={() => setShowInvoicePreview(true)}
                className="w-full h-10 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <FileText className="w-3.5 h-3.5" />
                Generate & Preview Invoice
              </button>
            )}

            {/* Bottom Sticky Submit area */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 shadow-lg lg:relative lg:shadow-none lg:p-0 lg:border-t-0 lg:bg-transparent z-40">
              <FormSubmitButton
                loading={isPending}
                disabled={!serviceId || !customerName || !customerMobile || (paymentMethod === "razorpay" && !razorpayPayment) || (paymentMethod === "upi_qr" && !offlineReference)}
                loadingText="Submitting..."
                icon={<Send className="h-4 w-4" />}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold rounded-2xl hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/10 cursor-pointer"
              >
                Submit Application
              </FormSubmitButton>
            </div>
          </Card>
        </div>
      </fieldset>

      {/* DIALOGS AND OVERLAYS */}

      {/* WebRTC Camera Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Document Scanner Camera</h3>
                <p className="text-[10px] text-slate-400">Position the document within the screen boundaries</p>
              </div>
              <button
                type="button"
                onClick={() => stopCamera()}
                className="text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full p-1.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Camera feed */}
            <div className="aspect-[4/3] rounded-2xl bg-black overflow-hidden relative border border-slate-100">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {/* Scan overlay grid lines */}
              <div className="absolute inset-4 border-2 border-dashed border-white/50 rounded-xl pointer-events-none flex items-center justify-center">
                <div className="w-full h-0.5 bg-blue-500/60 top-1/2 absolute animate-pulse" />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => capturePhoto()}
                className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition duration-150 flex items-center justify-center gap-1.5"
              >
                <Camera className="w-4 h-4" />
                Capture Document Snap
              </button>
              <button
                type="button"
                onClick={() => stopCamera()}
                className="px-4 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition duration-150"
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
          <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-500" />
                AP POS Guidelines & Help Center
              </h3>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 max-h-96 overflow-y-auto pr-1">
              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wide">1. Smart Customer Lookup</h4>
                <p className="leading-relaxed">
                  Enter the customer&apos;s 10-digit mobile number, 12-digit Aadhaar number, or PAN string into the lookup box. If they have previously submitted applications, their profile card will slide in instantly.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wide">2. Document Scanning Checklist</h4>
                <p className="leading-relaxed">
                  Always capture clear scans. We support WebRTC in-browser capture. Click &quot;Scan&quot; next to the document type checklist to capture directly from a smartphone or web camera. Uploaded documents are simulated scanned for validation.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wide">3. Flexible Checkout Modes</h4>
                <p className="leading-relaxed">
                  We support Cash Entry, offline UPI references, and online Razorpay checkouts. If you collect physical cash, choose &quot;Cash Collected&quot; and enter the local receipt reference number to bypass online payments.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wide">4. Direct Invoice Sharing</h4>
                <p className="leading-relaxed">
                  Preview the dynamically generated invoice before submitting. Post-submission, you can click the WhatsApp button to forward the digital invoice link to the customer.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="w-full h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition duration-150"
            >
              Close Guide
            </button>
          </div>
        </div>
      )}

      {/* Section 8: Invoice Center Drawer / Overlay */}
      {showInvoicePreview && selectedService && (
        <div className="fixed inset-0 bg-slate-950/40 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-4 print:p-0 print:border-none print:shadow-none">
            
            {/* Header hidden on print */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 print:hidden">
              <h3 className="font-bold text-slate-800 text-sm">Invoice Center Preview</h3>
              <button
                type="button"
                onClick={() => setShowInvoicePreview(false)}
                className="text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Invoice Container */}
            <div className="border border-slate-200 rounded-2xl p-6 bg-white space-y-5 text-xs text-slate-700 print:border-0 print:p-4">
              <div className="flex justify-between items-start border-b border-slate-150 pb-4">
                <div>
                  <h2 className="text-base font-black text-slate-800 tracking-tight">DIGICONNECT</h2>
                  <p className="text-[9px] text-slate-400 mt-0.5">DUKAN AGENCY PARTNER POS RECEIPT</p>
                </div>
                <div className="text-right">
                  <span className="bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded text-[9px] border border-blue-100">
                    Draft Receipt
                  </span>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">Receipt Date: {new Date().toLocaleDateString("en-IN")}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Customer Info</span>
                  <p className="font-bold text-slate-800 mt-0.5">{customerName || "Customer Name"}</p>
                  <p className="text-slate-500 font-mono mt-0.5">{customerMobile || "Mobile Number"}</p>
                  <p className="text-slate-500 truncate mt-0.5">{customerEmail || "No Email"}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Agent Attribution</span>
                  <p className="font-bold text-slate-800 mt-0.5">DigiConnect Partner</p>
                  <p className="text-slate-500 mt-0.5">Channel: Agency Partner POS</p>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-150 rounded-xl overflow-hidden">
                <div className="grid grid-cols-3 bg-slate-50 px-4 py-2 border-b border-slate-150 text-[10px] font-bold text-slate-400">
                  <span className="col-span-2">Service Description</span>
                  <span className="text-right">Amount</span>
                </div>
                <div className="grid grid-cols-3 px-4 py-3 text-slate-700 font-bold border-b border-slate-100">
                  <span className="col-span-2">{selectedService.title}</span>
                  <span className="text-right font-mono font-medium">{formatCurrency(selectedService.customer_fee)}</span>
                </div>
                <div className="grid grid-cols-3 px-4 py-2 text-slate-500">
                  <span className="col-span-2">CGST & SGST (18%)</span>
                  <span className="text-right font-mono">{formatCurrency(calculatedGST)}</span>
                </div>
              </div>

              {/* Total Breakout */}
              <div className="flex justify-between items-center border-t border-slate-150 pt-3">
                <span className="text-xs font-bold text-slate-800">Gross Payable Amount</span>
                <span className="text-base font-black text-slate-800 font-mono">{formatCurrency(grossTotal)}</span>
              </div>
            </div>

            {/* Footer buttons hidden on print */}
            <div className="flex gap-2 pt-3 border-t border-slate-100 print:hidden">
              <button
                type="button"
                onClick={() => handlePrint()}
                className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition duration-150 flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Print Invoice
              </button>
              <button
                type="button"
                onClick={() => setShowInvoicePreview(false)}
                className="px-6 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition duration-150"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Applications Drawer */}
      {showRecentDrawer && (
        <div className="fixed inset-0 bg-slate-950/40 flex justify-end z-50 animate-in fade-in duration-200">
          <div className="bg-white border-l border-slate-150 w-full max-w-md h-full p-6 shadow-2xl flex flex-col space-y-4 animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Recent Applications</h3>
                <p className="text-[10px] text-slate-400">View latest customer submissions</p>
              </div>
              <button
                type="button"
                onClick={() => setShowRecentDrawer(false)}
                className="text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List overlay */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1">
              {customers.slice(0, 10).map((c, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">{c.full_name}</h5>
                    <p className="text-[9px] text-slate-500 font-mono mt-0.5">{c.mobile} &bull; {new Date(c.created_at).toLocaleDateString("en-IN")}</p>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    Submitted
                  </span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowRecentDrawer(false)}
              className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition duration-150"
            >
              Close Panel
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
