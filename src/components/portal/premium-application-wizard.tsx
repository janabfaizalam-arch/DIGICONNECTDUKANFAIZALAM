/* eslint-disable @typescript-eslint/no-explicit-any */
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
  RotateCw, ZoomIn, ZoomOut, AlertCircle, Share2, QrCode, ClipboardList, Star, ShoppingCart, Info, User
} from "lucide-react";
import { getDynamicServiceConfig, type FieldSchema } from "@/lib/services-config";
import { useToast } from "@/components/providers/toast-provider";
import Script from "next/script";
import { createClient } from "@/lib/supabase/browser";
import { normalizeAgentService, type AgentService } from "@/lib/agent-services";
import { cn } from "@/lib/utils";

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
  { id: 1, label: "Services" },
  { id: 2, label: "Customer Details" },
  { id: 3, label: "Documents" },
  { id: 4, label: "Review" },
  { id: 5, label: "Payment" },
  { id: 6, label: "Success" }
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

  // State for loaded database services
  const [dbServices, setDbServices] = useState<AgentService[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  // Step state
  const [currentStep, setCurrentStep] = useState(1);

  // Cart State: list of service slugs with quantity
  const [cart, setCart] = useState<{ slug: string; quantity: number }[]>([]);

  // Search and Category state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Recent and Favourite services
  const [recentServices, setRecentServices] = useState<string[]>([]);
  const [favouriteServices, setFavouriteServices] = useState<string[]>([]);

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

  // Dynamic Form Field details (suffixed with _index)
  const [serviceDetails, setServiceDetails] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [validatedFields, setValidatedFields] = useState<Record<string, boolean>>({});

  // Document management center states (suffixed with _index)
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

  // Wallet & Payment
  const [walletBalance, setWalletBalance] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "cash" | "upi" | "wallet">("razorpay");
  const [useWallet, setUseWallet] = useState(false);

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

  const [showAutoSaveToast, setShowAutoSaveToast] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>("");

  // Helper: Payout formula
  const getServicePayout = (srv: AgentService) => {
    if (srv.payout_type === "percentage") {
      return Math.round((Number(srv.customer_fee ?? 0) * Number(srv.payout_percentage ?? 0)) / 100);
    }
    return Number(srv.agent_payout ?? 0);
  };

  // Load Services from Supabase
  useEffect(() => {
    async function loadServices() {
      try {
        const supabase = createClient();
        if (!supabase) {
          throw new Error("Supabase client is null");
        }
        const { data, error } = await supabase
          .from("agent_services")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("title", { ascending: true });

        if (error) {
          console.error("Error loading services:", error);
          toastError("Failed to fetch database services. Using fallbacks.");
        } else if (data) {
          setDbServices(data.map((row: any) => normalizeAgentService(row)));
        }
      } catch (err) {
        console.error("Error loading services:", err);
      } finally {
        setLoadingServices(false);
      }
    }

    loadServices();
  }, []);

  // Sync profile data and wallet balance on load
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

  // Sync recent/favourites from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const recents = JSON.parse(localStorage.getItem("ap_recent_services") || "[]");
      const favourites = JSON.parse(localStorage.getItem("ap_favourite_services") || "[]");
      setRecentServices(recents);
      setFavouriteServices(favourites);
    }
  }, []);

  // Restore Draft logic (if resume=true parameter)
  useEffect(() => {
    const resume = searchParams.get("resume") === "true";
    if (!resume) {
      localStorage.removeItem("dukan_wizard_enterprise_draft");
      return;
    }
    const savedDraft = localStorage.getItem("dukan_wizard_enterprise_draft");
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed.cart && parsed.cart.length > 0) {
          setCart(parsed.cart);
          setServiceDetails(parsed.serviceDetails || {});
          setProfileData((prev) => ({ ...prev, ...parsed.profileData }));
          setCurrentStep(parsed.currentStep || 1);
          if (toastSuccess) toastSuccess("Restored your previous application draft!");
        }
      } catch (e) {
        console.error("Error restoring draft", e);
      }
    }
  }, [searchParams, toastSuccess]);

  // Handle URL Service Parameter directly
  useEffect(() => {
    const serviceSlug = initialServiceSlug || searchParams.get("service");
    if (serviceSlug && dbServices.length > 0) {
      const found = dbServices.find((s) => s.slug === serviceSlug);
      if (found) {
        setCart([{ slug: found.slug, quantity: 1 }]);
        setCurrentStep(2);
      }
    }
  }, [initialServiceSlug, searchParams, dbServices]);

  // Autosave
  useEffect(() => {
    if (cart.length === 0) return;
    const timeout = setTimeout(() => {
      const draft = {
        cart,
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
  }, [cart, serviceDetails, profileData, currentStep]);

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
            if (toastSuccess) toastSuccess("Customer record sync'd. Apply autofill in Customer Details.");
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

  // Cart operations
  const addToCart = (service: AgentService) => {
    const existing = cart.find((item) => item.slug === service.slug);
    if (existing) {
      setCart(cart.map((item) => item.slug === service.slug ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { slug: service.slug, quantity: 1 }]);
    }
    // Update recents
    const updatedRecents = [service.slug, ...recentServices.filter((s) => s !== service.slug)].slice(0, 4);
    setRecentServices(updatedRecents);
    localStorage.setItem("ap_recent_services", JSON.stringify(updatedRecents));
  };

  const removeFromCart = (slug: string) => {
    const existing = cart.find((item) => item.slug === slug);
    if (!existing) return;
    if (existing.quantity <= 1) {
      setCart(cart.filter((item) => item.slug !== slug));
    } else {
      setCart(cart.map((item) => item.slug === slug ? { ...item, quantity: item.quantity - 1 } : item));
    }
  };

  const toggleFavourite = (slug: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = favouriteServices.includes(slug)
      ? favouriteServices.filter((s) => s !== slug)
      : [...favouriteServices, slug];
    setFavouriteServices(updated);
    localStorage.setItem("ap_favourite_services", JSON.stringify(updated));
  };

  // Derive cart items
  const cartItems = useMemo(() => {
    return cart.map((item) => {
      const service = dbServices.find((s) => s.slug === item.slug);
      return {
        service,
        quantity: item.quantity,
      };
    }).filter((item): item is { service: AgentService; quantity: number } => item.service !== undefined);
  }, [cart, dbServices]);

  // Pricing calculations
  const cartTotalAmount = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const itemAmount = Number(item.service.customer_fee ?? 0);
      return sum + itemAmount * item.quantity;
    }, 0);
  }, [cartItems]);

  const totalPayout = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const payout = getServicePayout(item.service);
      return sum + payout * item.quantity;
    }, 0);
  }, [cartItems]);

  // Derived list of all service instances with their sequential indexes
  const serviceConfigsList = useMemo(() => {
    const configs: { service: AgentService; config: any; index: number }[] = [];
    let absoluteIndex = 0;
    cartItems.forEach((item) => {
      for (let q = 0; q < item.quantity; q++) {
        const config = getDynamicServiceConfig(item.service.slug, item.service.category || "");
        configs.push({
          service: item.service,
          config,
          index: absoluteIndex,
        });
        absoluteIndex++;
      }
    });
    return configs;
  }, [cartItems]);

  // Dynamic document slots mapping
  const documentSlots = useMemo(() => {
    const slots: { slotId: string; document: any; serviceTitle: string; instanceIndex: number }[] = [];
    serviceConfigsList.forEach(({ service, config, index }) => {
      if (config?.documents) {
        config.documents.forEach((doc: any) => {
          slots.push({
            slotId: `${doc.id}_${index}`,
            document: doc,
            serviceTitle: service.title,
            instanceIndex: index,
          });
        });
      }
    });
    return slots;
  }, [serviceConfigsList]);

  // Validation values
  const basePrice = cartTotalAmount;
  const totalDueBeforeOffsets = basePrice;
  const walletRedeemAmount = (paymentMethod === "wallet" || useWallet) ? Math.min(walletBalance, totalDueBeforeOffsets) : 0;
  const totalAmountPayable = Math.max(0, totalDueBeforeOffsets - walletRedeemAmount);

  // Form Progress Completion Score
  const completionScore = useMemo(() => {
    let score = 0;
    if (cart.length > 0) score += 20;

    // Details + Contacts
    let contactsCount = 0;
    if (profileData.name) contactsCount++;
    if (profileData.mobile) contactsCount++;
    if (profileData.address) contactsCount++;
    if (profileData.pincode) contactsCount++;
    if (profileData.city) contactsCount++;
    if (profileData.state) contactsCount++;
    score += Math.round((contactsCount / 6) * 30);

    // Required fields check
    let requiredFieldsTotal = 0;
    let completedFields = 0;
    serviceConfigsList.forEach(({ config, index }) => {
      config?.formSections?.flatMap((s: any) => s.fields).forEach((f: any) => {
        if (f.required) {
          requiredFieldsTotal++;
          if (serviceDetails[`${f.name}_${index}`]) completedFields++;
        }
      });
    });

    if (requiredFieldsTotal > 0) {
      score += Math.round((completedFields / requiredFieldsTotal) * 20);
    } else {
      score += 20;
    }

    // Documents
    const reqDocs = documentSlots.filter((d) => d.document.required);
    if (reqDocs.length === 0) {
      score += 30;
    } else {
      const uploadedCount = reqDocs.filter((d) => uploadedFiles[d.slotId]).length;
      score += Math.round((uploadedCount / reqDocs.length) * 30);
    }

    return Math.min(100, score);
  }, [cart, serviceConfigsList, serviceDetails, profileData, documentSlots, uploadedFiles]);

  // Live validation checks
  const handleLiveValidateInstance = (field: FieldSchema, value: string, index: number) => {
    const rule = field.validation?.ruleType;
    const fieldKey = `${field.name}_${index}`;
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
      if (err) copy[fieldKey] = err;
      else delete copy[fieldKey];
      return copy;
    });

    setValidatedFields((prev) => ({
      ...prev,
      [fieldKey]: !err && value.trim().length > 0
    }));
  };

  const validateCustomerDetails = () => {
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

  // Document management functions
  const runAiValidation = (slotId: string, file: File) => {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2) + " MB";
    const sharpness = Math.random() > 0.15 ? "High (94%)" : "Blurry (48%)";
    const dpi = Math.random() > 0.1 ? 300 : 150;
    
    const errors: string[] = [];
    if (sharpness.includes("Blurry")) {
      errors.push("Document text is blurry. Capture in brighter light.");
    }
    if (dpi < 200) {
      errors.push("Low DPI detected. Zoom closer or use scanning apps.");
    }

    setFileMetadata((prev) => ({
      ...prev,
      [slotId]: {
        size: sizeMb,
        type: file.type || "unknown",
        sharpness,
        dpi,
        validationPassed: errors.length === 0,
        errors
      }
    }));

    if (errors.length > 0) {
      toastWarning(`Document check warning: ${errors[0]}`);
    } else {
      if (toastSuccess) toastSuccess("AI document validation passed!");
    }
  };

  const handleFileChange = (slotId: string, file: File) => {
    setUploadProgress((prev) => ({ ...prev, [slotId]: 0 }));
    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      setUploadProgress((prev) => ({ ...prev, [slotId]: progress }));
      if (progress >= 100) {
        clearInterval(interval);
        setUploadedFiles((prev) => ({ ...prev, [slotId]: file }));
        runAiValidation(slotId, file);
      }
    }, 100);
  };

  const handleCameraCapture = (slotId: string) => {
    if (typeof window === "undefined") return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.setAttribute("capture", "environment");
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileChange(slotId, file);
      }
    };
    input.click();
  };

  const handleRotate = (slotId: string) => {
    setRotateAngle((prev) => ({
      ...prev,
      [slotId]: ((prev[slotId] || 0) + 90) % 360
    }));
  };

  const handleZoom = (slotId: string, direction: "in" | "out") => {
    setZoomScale((prev) => {
      const current = prev[slotId] || 1;
      const step = 0.25;
      const next = direction === "in" ? Math.min(2.5, current + step) : Math.max(0.5, current - step);
      return { ...prev, [slotId]: next };
    });
  };

  // OCR Mock
  const handleOcrExtraction = (slotId: string) => {
    const file = uploadedFiles[slotId];
    if (!file) return;

    setOcrScanningSlot(slotId);
    setTimeout(() => {
      setOcrScanningSlot(null);
      const extractedValue = "ABCDE" + Math.floor(Math.random() * 9000 + 1000) + "F";
      setOcrExtractionResult({
        slot: slotId,
        fields: [
          { fieldName: "Extracted Document ID", extractedValue, confidence: 98 }
        ]
      });
      if (toastSuccess) toastSuccess("OCR complete. Apply fields values below.");
    }, 1500);
  };

  const applyOcrValue = () => {
    if (!ocrExtractionResult) return;
    const { slot, fields } = ocrExtractionResult;
    const cleanSlotName = slot.split("_")[0];
    const index = slot.split("_")[1];

    if (cleanSlotName && index !== undefined) {
      const targetFieldName = cleanSlotName === "panCard" ? "panNumber" : "aadhaarNumber";
      const targetKey = `${targetFieldName}_${index}`;
      setServiceDetails((prev) => ({
        ...prev,
        [targetKey]: fields[0].extractedValue
      }));
      setValidatedFields((prev) => ({ ...prev, [targetKey]: true }));
    }
    setOcrExtractionResult(null);
  };

  // Autofill CRM details
  const applyCustomer360Autofill = () => {
    if (!customer360) return;
    setProfileData((prev) => ({
      ...prev,
      name: customer360.name,
      email: prev.email || `${customer360.name.toLowerCase().replace(/\s/g, "")}@example.com`,
    }));
    if (toastSuccess) toastSuccess("CRM contact details loaded!");
  };

  // Submission handler
  const handleFinalSubmit = async (razorpayDetails?: Record<string, unknown> | null) => {
    setIsSubmitting(true);
    try {
      const payload = {
        serviceSlug: cartItems[0]?.service.slug,
        serviceSlugs: cartItems.flatMap((item) => Array(item.quantity).fill(item.service.slug)),
        customer: {
          name: profileData.name,
          mobile: profileData.mobile,
          email: profileData.email,
          city: profileData.city,
          message: `Application submitted via DigiPartner Wizard. Route: ${paymentMethod}.`,
        },
        details: {
          ...serviceDetails,
          address: profileData.address,
          pincode: profileData.pincode,
          state: profileData.state,
          district: profileData.district,
          paymentMethod,
        },
        walletUseAmount: walletRedeemAmount,
        razorpayPayment: razorpayDetails || null,
        couponCode: ""
      };

      const formData = new FormData();
      formData.append("payload", JSON.stringify(payload));

      const docTypes = Object.keys(uploadedFiles);
      formData.append("documentTypes", JSON.stringify(docTypes));

      docTypes.forEach((slotId) => {
        const file = uploadedFiles[slotId];
        formData.append("documents", file, file.name);
      });

      const response = await fetch("/api/applications", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || result.error || "Submission failed.");
      }

      // Clear draft
      localStorage.removeItem("dukan_wizard_enterprise_draft");
      
      setSuccessDetails({
        applicationId: result.applicationId || "DCD-" + Math.floor(Math.random() * 90000 + 10000),
        invoiceId: result.invoiceId || "",
        customerName: profileData.name,
        serviceTitle: cartItems.map((item) => `${item.service.title} (x${item.quantity})`).join(", "),
        amountPaid: totalDueBeforeOffsets - walletRedeemAmount,
        processingTime: cartItems[0]?.service.processing_time || "3-5 Working Days",
        paymentStatus: paymentMethod === "razorpay" ? "Online Verified" : paymentMethod === "wallet" ? "Wallet Debited" : "Cash Collected"
      });

      setCurrentStep(6);
      if (toastSuccess) toastSuccess("Applications submitted successfully!");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Submission failed.";
      toastError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Razorpay Checkout
  const triggerRazorpayCheckout = async () => {
    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
      toastError("Razorpay key config details are missing.");
      return;
    }
    setIsSubmitting(true);
    try {
      const orderBody = {
        amount: Math.round(totalAmountPayable * 100),
        currency: "INR",
        receipt: `receipt-wiz-${Date.now()}`,
        serviceSlug: cartItems[0]?.service.slug,
        walletUseAmount: walletRedeemAmount,
        couponCode: "",
        applicationDraft: {
          customer: {
            name: profileData.name,
            email: profileData.email,
            mobile: profileData.mobile,
            city: profileData.city,
          },
          details: {
            ...serviceDetails,
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
        throw new Error(orderData.error || orderData.message || "Razorpay order creation failed.");
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "DigiConnect Dukan",
        description: `Apply for ${cartItems.map(item => item.service.title).join(", ")}`,
        order_id: orderData.order_id,
        prefill: {
          name: profileData.name,
          email: profileData.email,
          contact: profileData.mobile
        },
        theme: { color: "#2563eb" },
        handler: async (paymentResponse: Record<string, unknown>) => {
          try {
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
              throw new Error(verifyData.error || "Online verification check failed.");
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
            toastError("Payment window closed.");
            setIsSubmitting(false);
          }
        }
      };

      const rzpay = new (window as any).Razorpay(options);
      rzpay.open();
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Payment error.";
      toastError(errorMsg);
      setIsSubmitting(false);
    }
  };

  // Step Navigations
  const handleNextStep = () => {
    if (currentStep === 1) {
      if (cart.length === 0) {
        toastError("Please add at least one service to your cart.");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!validateCustomerDetails()) {
        toastError("Please resolve customer address and contacts errors.");
        return;
      }
      // Dynamic parameters checks
      let hasDetailsError = false;
      serviceConfigsList.forEach(({ config, index }) => {
        config?.formSections?.flatMap((s: any) => s.fields).forEach((f: any) => {
          const valKey = `${f.name}_${index}`;
          if (f.required && !serviceDetails[valKey]) {
            setValidationErrors((prev) => ({ ...prev, [valKey]: `${f.label} is required.` }));
            hasDetailsError = true;
          }
        });
      });
      if (hasDetailsError) {
        toastError("Please complete dynamic forms values.");
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      const missing = documentSlots.filter((slot) => slot.document.required && !uploadedFiles[slot.slotId]);
      if (missing.length > 0) {
        toastError(`Uploads missing: ${missing.map((m) => `${m.document.name} (Instance #${m.instanceIndex+1})`).join(", ")}`);
        return;
      }
      setCurrentStep(4);
    } else if (currentStep === 4) {
      setCurrentStep(5);
    } else if (currentStep === 5) {
      if (paymentMethod === "razorpay" && totalAmountPayable > 0) {
        void triggerRazorpayCheckout();
      } else {
        void handleFinalSubmit();
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1 && currentStep < 6) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Filter service catalog
  const categoriesList = [
    { id: "all", name: "All Categories" },
    { id: "tax", name: "Tax & GST" },
    { id: "company", name: "Company Registration" },
    { id: "banking", name: "Banking & Finance" },
    { id: "licence", name: "Licences" },
    { id: "loans", name: "Loans & CIBIL" },
    { id: "insurance", name: "Insurance" },
    { id: "cards", name: "Credit Cards" },
  ];

  const filteredServices = useMemo(() => {
    let list = dbServices;
    if (selectedCategory !== "all") {
      list = list.filter((s) => {
        if (!s.category) return false;
        const catLower = s.category.toLowerCase();
        if (catLower === selectedCategory) return true;
        const catObj = categoriesList.find((c) => c.id === selectedCategory);
        if (catObj && catLower === catObj.name.toLowerCase()) return true;

        if (selectedCategory === "tax" && (catLower.includes("tax") || catLower.includes("gst"))) return true;
        if (selectedCategory === "company" && (catLower.includes("company") || catLower.includes("registration"))) return true;
        if (selectedCategory === "banking" && (catLower.includes("bank") || catLower.includes("finance"))) return true;
        if (selectedCategory === "licence" && (catLower.includes("licence") || catLower.includes("license"))) return true;
        if (selectedCategory === "loans" && (catLower.includes("loan") || catLower.includes("cibil"))) return true;
        if (selectedCategory === "insurance" && catLower.includes("insurance")) return true;
        if (selectedCategory === "cards" && catLower.includes("card")) return true;

        return false;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          (s.description && s.description.toLowerCase().includes(q)) ||
          s.slug.toLowerCase().includes(q)
      );
    }
    return list;
  }, [dbServices, selectedCategory, searchQuery]);

  return (
    <div className="relative mx-auto w-full max-w-[1200px] px-3 py-4 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
      
      {/* Script load for Razorpay */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setIsScriptReady(true)}
      />

      {/* Auto-save Toast alert */}
      {showAutoSaveToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-slate-900/95 text-white text-xs px-3.5 py-2 rounded-full shadow-lg border border-slate-800/80 backdrop-blur-sm transition-all duration-300">
          <Sparkles className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
          <span>Draft Auto-Saved ({lastSavedTime})</span>
        </div>
      )}

      {/* Main Wizard Form Card */}
      <div className="bg-white border border-slate-200/60 rounded-[24px] shadow-sm min-h-[550px] flex flex-col justify-between overflow-hidden relative w-full">
        
        {/* Sticky Form Step Header Navigation */}
        {currentStep < 6 && (
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-slate-100 px-5 py-3 flex flex-col md:flex-row items-center justify-between gap-3">
            <span className="text-[10px] tracking-widest font-black uppercase text-slate-400">
              DigiConnect Enterprise Wizard
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full no-scrollbar pb-1 sm:pb-0">
              {STEPS.slice(0, 5).map((step, idx) => {
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;
                return (
                  <React.Fragment key={step.id}>
                    <button
                      onClick={() => isCompleted && setCurrentStep(step.id)}
                      disabled={!isCompleted}
                      className={cn(
                        "flex items-center gap-1 py-1 px-2 text-[11px] font-bold rounded-full transition-all shrink-0",
                        isActive
                          ? "bg-blue-50 text-blue-600"
                          : isCompleted
                          ? "text-slate-705 hover:bg-slate-50 cursor-pointer"
                          : "text-slate-355 cursor-not-allowed"
                      )}
                    >
                      <span className={cn(
                        "w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-extrabold",
                        isCompleted ? "bg-blue-600 text-white" : isActive ? "bg-blue-200 text-blue-700" : "bg-slate-100 text-slate-400"
                      )}>
                        {isCompleted ? "✓" : step.id}
                      </span>
                      <span>{step.label}</span>
                    </button>
                    {idx < 4 && <span className="text-slate-200 text-[9px] shrink-0">➔</span>}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* Content Body Pane */}
        <div className="flex-1 p-5 md:p-7">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full flex flex-col"
            >
              
              {/* STEP 1: MOBILE-FIRST REDESIGNED SERVICES CATALOG */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Select Government Services</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Select one or multiple services below to build your submission bundle.</p>
                  </div>

                  {/* Search input and category chip selector */}
                  <div className="space-y-3">
                    <div className="relative bg-slate-50 border border-slate-200 focus-within:border-blue-500 rounded-xl flex items-center px-3.5 py-2.5 transition-all">
                      <Search className="h-4.5 w-4.5 text-slate-400 mr-2.5" />
                      <input
                        type="text"
                        placeholder="Search service title, details, documentation..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent border-0 outline-none w-full text-xs font-semibold text-slate-800 placeholder-slate-400"
                      />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-655">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Scrolling Category Chips */}
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
                      {categoriesList.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={cn(
                            "px-3.5 py-1.5 rounded-lg border text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
                            selectedCategory === cat.id
                              ? "bg-slate-900 border-slate-950 text-white"
                              : "bg-white border-slate-200 text-slate-550 hover:bg-slate-50"
                          )}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Favourite / Recents horizontal row (if populated) */}
                  {favouriteServices.length > 0 && (
                    <div className="space-y-2.5">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Favourite Services</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {dbServices.filter((s) => favouriteServices.includes(s.slug)).map((srv) => (
                          <div
                            key={srv.slug}
                            onClick={() => addToCart(srv)}
                            className="bg-amber-50/20 border border-amber-100 hover:bg-amber-50/50 p-3.5 rounded-xl text-left cursor-pointer transition-all flex items-center justify-between"
                          >
                            <div className="overflow-hidden">
                              <h5 className="font-bold text-xs text-slate-900 truncate">{srv.title}</h5>
                              <p className="text-[10px] text-slate-400 mt-0.5">₹{srv.customer_fee}</p>
                            </div>
                            <Star className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Services Catalog grid */}
                  {loadingServices ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-6 w-6 text-blue-600 animate-spin" />
                      <p className="text-xs text-slate-500 font-bold">Synchronizing Supabase services catalog...</p>
                    </div>
                  ) : filteredServices.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 text-xs font-bold border border-dashed border-slate-200 rounded-2xl">
                      No matching catalog services found.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredServices.map((srv) => {
                        const catLower = (srv.category || "").toLowerCase();
                        let catKey = "";
                        if (catLower.includes("tax") || catLower.includes("gst")) catKey = "tax";
                        else if (catLower.includes("company") || catLower.includes("registration")) catKey = "company";
                        else if (catLower.includes("bank") || catLower.includes("finance")) catKey = "banking";
                        else if (catLower.includes("licence") || catLower.includes("license")) catKey = "licence";
                        else if (catLower.includes("loan") || catLower.includes("cibil")) catKey = "loans";
                        else if (catLower.includes("insurance")) catKey = "insurance";
                        else if (catLower.includes("card")) catKey = "cards";

                        const IconComponent = CATEGORY_ICONS[catKey] || CreditCard;
                        const cartItem = cart.find((item) => item.slug === srv.slug);
                        const qty = cartItem?.quantity || 0;
                        const isStarred = favouriteServices.includes(srv.slug);

                        return (
                          <div
                            key={srv.slug}
                            className={cn(
                              "group flex items-start gap-4.5 p-4.5 rounded-2xl border text-left transition-all",
                              qty > 0 ? "bg-blue-50/30 border-blue-500/30 shadow-xs" : "bg-white border-slate-200/70 hover:border-slate-350"
                            )}
                          >
                            <div className={cn(
                              "p-3 rounded-xl transition-colors shrink-0",
                              qty > 0 ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-400 group-hover:bg-slate-100"
                            )}>
                              <IconComponent className="h-5 w-5" />
                            </div>

                            <div className="space-y-1.5 w-full overflow-hidden">
                              <div className="flex items-start justify-between gap-1">
                                <h3 className="font-extrabold text-slate-900 text-sm leading-snug truncate">
                                  {srv.title}
                                </h3>
                                <button
                                  type="button"
                                  onClick={(e) => toggleFavourite(srv.slug, e)}
                                  className="text-slate-300 hover:text-amber-505 transition-colors p-0.5 shrink-0"
                                >
                                  <Star className={cn("h-4.5 w-4.5", isStarred && "text-amber-550 fill-amber-550")} />
                                </button>
                              </div>

                              <p className="text-[11px] text-slate-555 leading-normal line-clamp-2">
                                {srv.description || "Fully managed digital certificate and government database submission process."}
                              </p>

                              {/* Price tags & Touch target Quantities adjusters */}
                              <div className="flex items-center justify-between pt-2">
                                <div className="space-y-0.5">
                                  <span className="text-xs font-black text-slate-900 block">
                                    ₹{srv.customer_fee}
                                  </span>
                                  <span className="text-[9px] font-bold text-emerald-605 uppercase tracking-wider block">
                                    Score: +₹{getServicePayout(srv)} Payout
                                  </span>
                                </div>

                                {qty > 0 ? (
                                  <div className="flex items-center bg-slate-900 text-white rounded-lg p-0.5 shadow-sm text-xs font-bold">
                                    <button
                                      onClick={() => removeFromCart(srv.slug)}
                                      className="px-2 py-1 hover:bg-slate-800 rounded transition-colors text-white"
                                    >
                                      -
                                    </button>
                                    <span className="px-2">{qty}</span>
                                    <button
                                      onClick={() => addToCart(srv)}
                                      className="px-2 py-1 hover:bg-slate-800 rounded transition-colors text-white"
                                    >
                                      +
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => addToCart(srv)}
                                    className="bg-slate-900 hover:bg-slate-805 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                                  >
                                    Add Service
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: CUSTOMER CONTACTS & DYNAMIC INTEGRATED DETAILS */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Applicant Details & Parameters</h2>
                    <p className="text-xs text-slate-550 mt-0.5">Provide customer CRM contact details and service-specific parameters.</p>
                  </div>

                  {/* Customer 360 Record Card */}
                  {customer360 && (
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3.5">
                      <div className="flex items-center justify-between border-b border-slate-200/50 pb-2">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-blue-600 animate-pulse" />
                          <h4 className="text-xs font-extrabold text-slate-808">
                            CRM Record Found: {customer360.name}
                          </h4>
                        </div>
                        <button
                          onClick={applyCustomer360Autofill}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-3.5 py-1.5 rounded-lg flex items-center gap-1 shadow-xs transition-colors cursor-pointer text-center"
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>Autofill Profile</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold text-slate-555">
                        <div className="p-2 bg-white rounded-lg border border-slate-100">
                          <p className="text-slate-400">Total Cases</p>
                          <p className="font-extrabold text-slate-800 text-sm mt-0.5">{customer360.totalApplications}</p>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-slate-100">
                          <p className="text-slate-400">Wallet Credits</p>
                          <p className="font-extrabold text-blue-600 text-sm mt-0.5">₹{customer360.walletBalance}</p>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-slate-100">
                          <p className="text-slate-400">Join Date</p>
                          <p className="font-extrabold text-slate-855 text-sm mt-0.5">{customer360.customerSince}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Customer fields */}
                  <div className="bg-white border border-slate-200/60 rounded-2xl p-5 space-y-4">
                    <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                      Customer Contact Details
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-700">Mobile Number *</label>
                        <input
                          type="tel"
                          maxLength={10}
                          value={profileData.mobile}
                          onChange={(e) => setProfileData({ ...profileData, mobile: e.target.value.replace(/\D/g, "") })}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                          placeholder="Enter 10-digit mobile"
                        />
                        {validationErrors.mobile && <span className="text-[10px] text-red-500 font-semibold">{validationErrors.mobile}</span>}
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-700">Full Name *</label>
                        <input
                          type="text"
                          value={profileData.name}
                          onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                          placeholder="Client's legal name"
                        />
                        {validationErrors.name && <span className="text-[10px] text-red-500 font-semibold">{validationErrors.name}</span>}
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-700">Email Address</label>
                        <input
                          type="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                          placeholder="client@domain.com"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-700">Pincode *</label>
                        <input
                          type="text"
                          maxLength={6}
                          value={profileData.pincode}
                          onChange={(e) => setProfileData({ ...profileData, pincode: e.target.value.replace(/\D/g, "") })}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-blue-555 focus:outline-none transition-colors"
                          placeholder="6-digit Pincode"
                        />
                        {validationErrors.pincode && <span className="text-[10px] text-red-500 font-semibold">{validationErrors.pincode}</span>}
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-700">City *</label>
                        <input
                          type="text"
                          value={profileData.city}
                          onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                          placeholder="City name"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-700">State *</label>
                        <input
                          type="text"
                          value={profileData.state}
                          onChange={(e) => setProfileData({ ...profileData, state: e.target.value })}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                          placeholder="State name"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-700">Full Address *</label>
                      <textarea
                        value={profileData.address}
                        onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                        rows={2}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                        placeholder="Complete street address details"
                      />
                    </div>
                  </div>

                  {/* Dynamic Parameter Forms for Cart items */}
                  <div className="space-y-4">
                    <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                      Service Specific Details
                    </h3>
                    
                    {serviceConfigsList.map(({ service, config, index }) => (
                      <div key={index} className="space-y-4 border border-slate-150 p-4.5 rounded-2xl bg-slate-50/20">
                        <h4 className="text-xs font-extrabold text-slate-900 flex items-center justify-between border-b border-slate-200 pb-1.5">
                          <span>{service.title} (Instance #{index + 1})</span>
                          <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-bold">
                            ₹{service.customer_fee}
                          </span>
                        </h4>

                        {/* Plan selection within service configs */}
                        {config?.plans && config.plans.length > 0 && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Available Plan</label>
                            <div className="flex flex-wrap gap-2">
                              {config.plans.map((p: any) => {
                                const planKey = `selectedPlan_${index}`;
                                const isSelected = serviceDetails[planKey] === p.id || (!serviceDetails[planKey] && p.id === config.plans[0].id);
                                return (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => setServiceDetails({ ...serviceDetails, [planKey]: p.id })}
                                    className={cn(
                                      "px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer",
                                      isSelected ? "bg-slate-900 border-slate-950 text-white shadow-xs" : "bg-white border-slate-200 text-slate-655 hover:bg-slate-50"
                                    )}
                                  >
                                    {p.name} (₹{p.price})
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Dynamic fields */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {config?.formSections?.flatMap((sec: any) => sec.fields).map((f: FieldSchema) => {
                            const fieldKey = `${f.name}_${index}`;
                            const hasError = validationErrors[fieldKey];
                            const isVal = validatedFields[fieldKey];

                            return (
                              <div key={f.name} className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-slate-700">
                                  {f.label} {f.required && <span className="text-red-500">*</span>}
                                </label>
                                <div className="relative">
                                  {f.type === "select" ? (
                                    <select
                                      value={serviceDetails[fieldKey] || ""}
                                      onChange={(e) => {
                                        setServiceDetails({ ...serviceDetails, [fieldKey]: e.target.value });
                                        handleLiveValidateInstance(f, e.target.value, index);
                                      }}
                                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs w-full focus:border-blue-555 focus:outline-none transition-colors"
                                    >
                                      <option value="">Select option...</option>
                                      {f.options?.map((o) => (
                                        <option key={o} value={o}>{o}</option>
                                      ))}
                                    </select>
                                  ) : f.type === "textarea" ? (
                                    <textarea
                                      value={serviceDetails[fieldKey] || ""}
                                      onChange={(e) => {
                                        setServiceDetails({ ...serviceDetails, [fieldKey]: e.target.value });
                                        handleLiveValidateInstance(f, e.target.value, index);
                                      }}
                                      rows={2}
                                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs w-full focus:border-blue-500 focus:outline-none transition-colors"
                                      placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}...`}
                                    />
                                  ) : (
                                    <input
                                      type={f.type}
                                      value={serviceDetails[fieldKey] || ""}
                                      onChange={(e) => {
                                        setServiceDetails({ ...serviceDetails, [fieldKey]: e.target.value });
                                        handleLiveValidateInstance(f, e.target.value, index);
                                      }}
                                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs w-full focus:border-blue-500 focus:outline-none transition-colors"
                                      placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}...`}
                                    />
                                  )}
                                  {isVal && !hasError && (
                                    <Check className="h-4 w-4 text-emerald-505 absolute right-3 top-3" />
                                  )}
                                  {hasError && (
                                    <AlertTriangle className="h-4 w-4 text-red-500 absolute right-3 top-3" />
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
                </div>
              )}

              {/* STEP 3: DOCUMENT UPLOAD CENTER WITH AI SCAN & DIRECT CAMERA Capture */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Upload Required Documents</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Attach documents for each instance. Cameras capture directly to speed verification.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {documentSlots.map(({ slotId, document: doc, serviceTitle, instanceIndex }) => {
                      const file = uploadedFiles[slotId];
                      const progress = uploadProgress[slotId] || 0;
                      const isScanning = ocrScanningSlot === slotId;
                      const meta = fileMetadata[slotId];

                      return (
                        <div
                          key={slotId}
                          className={cn(
                            "border rounded-2xl p-4.5 flex flex-col justify-between min-h-[190px] relative transition-all",
                            file ? "bg-slate-50/30 border-slate-200" : "bg-white border-dashed border-slate-200 hover:border-slate-350"
                          )}
                        >
                          <div className="space-y-1">
                            <div className="flex items-start justify-between gap-2.5">
                              <div>
                                <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold uppercase">
                                  Instance #{instanceIndex + 1} ({serviceTitle})
                                </span>
                                <h3 className="font-extrabold text-xs text-slate-900 mt-1 flex items-center gap-1">
                                  <span>{doc.name}</span>
                                  {doc.required && <span className="text-red-500 text-xs">*</span>}
                                </h3>
                              </div>
                              {file && meta && (
                                <span className={cn(
                                  "text-[9px] font-black uppercase px-2 py-0.5 rounded-full",
                                  meta.validationPassed ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                                )}>
                                  {meta.validationPassed ? "AI Clean" : "AI Quality Alert"}
                                </span>
                              )}
                              {!file && doc.required && (
                                <span className="text-[9px] font-black text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" /> Required
                                </span>
                              )}
                            </div>
                            {doc.helpHint && <p className="text-[10px] text-slate-455 leading-normal font-semibold">{doc.helpHint}</p>}
                          </div>

                          {/* Upload Actions trigger elements */}
                          <div className="mt-4">
                            {file ? (
                              <div className="space-y-2">
                                {meta && (
                                  <div className="bg-white border border-slate-105 rounded-xl p-2.5 space-y-1 text-[9px] font-semibold text-slate-500 shadow-xs">
                                    <div className="flex justify-between">
                                      <span>Quality Resolution:</span>
                                      <span className={meta.dpi >= 200 ? "text-emerald-600" : "text-amber-500"}>
                                        {meta.dpi} DPI ({meta.dpi >= 200 ? "Pass" : "Low"})
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Blur Check:</span>
                                      <span className={meta.sharpness.includes("High") ? "text-emerald-600" : "text-amber-500"}>
                                        {meta.sharpness}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Details:</span>
                                      <span>{meta.size} • {meta.type.split("/")[1]?.toUpperCase() || "PDF"}</span>
                                    </div>
                                  </div>
                                )}

                                <div className="flex items-center justify-between bg-white border border-slate-150 rounded-xl p-1.5 shadow-xs">
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleRotate(slotId)}
                                      className="p-1 text-slate-500 hover:bg-slate-50 rounded cursor-pointer"
                                      title="Rotate document image"
                                    >
                                      <RotateCw className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleZoom(slotId, "in")}
                                      className="p-1 text-slate-550 hover:bg-slate-50 rounded cursor-pointer border-none"
                                    >
                                      <ZoomIn className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {doc.ocrType && (
                                      <button
                                        onClick={() => handleOcrExtraction(slotId)}
                                        className="p-1 text-blue-600 hover:bg-blue-50 rounded cursor-pointer flex items-center gap-0.5 text-[10px] font-bold"
                                      >
                                        <Sparkles className="h-3 w-3" /> Scan OCR
                                      </button>
                                    )}
                                    <button
                                      onClick={() => {
                                        setUploadedFiles((prev) => {
                                          const copy = { ...prev };
                                          delete copy[slotId];
                                          return copy;
                                        });
                                      }}
                                      className="p-1 text-red-500 hover:bg-rose-50 rounded cursor-pointer"
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
                                    <div className="flex justify-between text-[9px] text-slate-400 font-extrabold uppercase">
                                      <span>Attaching File...</span>
                                      <span>{progress}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                                      <div className="bg-blue-600 h-full" style={{ width: `${progress}%` }}></div>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const input = document.createElement("input");
                                        input.type = "file";
                                        input.accept = "image/*,application/pdf";
                                        input.onchange = (e) => {
                                          const f = (e.target as HTMLInputElement).files?.[0];
                                          if (f) handleFileChange(slotId, f);
                                        };
                                        input.click();
                                      }}
                                      className="bg-slate-900 hover:bg-slate-805 text-white text-[10px] font-extrabold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                                    >
                                      <Upload className="h-3.5 w-3.5" />
                                      <span>Upload File</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleCameraCapture(slotId)}
                                      className="bg-slate-105 hover:bg-slate-205 text-slate-705 text-[10px] font-extrabold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                      <Camera className="h-3.5 w-3.5" />
                                      <span>Direct Camera</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Scanning Loader Overlay */}
                          {isScanning && (
                            <div className="absolute inset-0 bg-white/95 rounded-2xl flex flex-col items-center justify-center gap-2 z-10 border border-blue-200">
                              <Sparkles className="h-5 w-5 text-blue-500 animate-spin" />
                              <p className="text-[10px] font-black text-blue-900 uppercase">OCR Extraction scanning...</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* OCR extracted fields popup */}
                  {ocrExtractionResult && (
                    <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
                      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-2xl max-w-sm w-full space-y-4">
                        <div className="flex items-center gap-2 text-blue-600">
                          <Sparkles className="h-5 w-5" />
                          <h4 className="font-extrabold text-sm text-slate-905">OCR Scanner Results</h4>
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5">
                          <span className="text-[9px] text-slate-400 font-bold uppercase">{ocrExtractionResult.fields[0].fieldName}</span>
                          <p className="font-mono text-xs font-black text-slate-808">{ocrExtractionResult.fields[0].extractedValue}</p>
                          <span className="text-[8px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-black">
                            {ocrExtractionResult.fields[0].confidence}% Confidence Match
                          </span>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setOcrExtractionResult(null)}
                            className="text-xs font-bold text-slate-500 hover:text-slate-700 px-3 py-2 cursor-pointer border-none"
                          >
                            Discard
                          </button>
                          <button
                            onClick={applyOcrValue}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer border-none"
                          >
                            Apply Autofill
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4: REVIEW APPLICATIONS DATA & DOCK CHECKLIST */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Review Application Bundle</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Please review the customer contacts and parameters details before submitting.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Contacts summary */}
                    <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4.5 space-y-3.5">
                      <h4 className="font-black text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-200 pb-1.5">
                        CRM Customer Profile
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                        <div>
                          <span className="text-slate-400 font-semibold block">Full Name:</span>
                          <span className="font-bold text-slate-805">{profileData.name}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-semibold block">Mobile Number:</span>
                          <span className="font-bold text-slate-805">{profileData.mobile}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400 font-semibold block">Email Address:</span>
                          <span className="font-bold text-slate-805">{profileData.email || "N/A"}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400 font-semibold block">Pincode & Address:</span>
                          <span className="font-bold text-slate-805 leading-normal">{profileData.address}, {profileData.city} - {profileData.pincode}</span>
                        </div>
                      </div>
                    </div>

                    {/* Cart details and fields */}
                    <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4.5 space-y-3">
                      <h4 className="font-black text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-200 pb-1.5">
                        Selected Services & Forms Details
                      </h4>
                      <div className="max-h-[220px] overflow-y-auto space-y-3 pr-1 text-xs font-semibold">
                        {serviceConfigsList.map(({ service, config, index }) => (
                          <div key={index} className="space-y-1.5 border-b border-slate-200/50 pb-2 last:border-0 last:pb-0">
                            <p className="font-bold text-slate-900">{service.title} (#{index + 1})</p>
                            {config?.formSections?.flatMap((s: any) => s.fields).map((f: any) => {
                              const valKey = `${f.name}_${index}`;
                              return (
                                <div key={f.name} className="flex justify-between pl-2.5 text-[11px]">
                                  <span className="text-slate-400">{f.label}:</span>
                                  <span className="font-semibold text-slate-705">{serviceDetails[valKey] || "N/A"}</span>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Upload docs preview */}
                    <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4.5 space-y-3 md:col-span-2">
                      <h4 className="font-black text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-200 pb-1.5">
                        Attached Documents
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold">
                        {documentSlots.map(({ slotId, document: d, serviceTitle, instanceIndex }) => {
                          const file = uploadedFiles[slotId];
                          return (
                            <div key={slotId} className="bg-white border border-slate-150 p-2.5 rounded-xl flex items-center justify-between shadow-xs">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <FileText className="h-4 w-4 text-blue-555 shrink-0 animate-none" />
                                <div className="overflow-hidden">
                                  <span className="text-[9px] text-slate-400 block font-bold truncate">
                                    {d.name} (Instance #{instanceIndex+1})
                                  </span>
                                  <p className="font-bold text-slate-808 truncate">{file?.name || "Missing Upload"}</p>
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

              {/* STEP 5: SIMPLIFIED GATEWAY CHECKOUT SCREEN */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Ecosystem Gateway Checkout</h2>
                    <p className="text-xs text-slate-550 mt-0.5">Choose checkout route: Wallet, Cash collection, UPI QR, or Razorpay card methods.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-6 items-start">
                    {/* Method Radio items */}
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Select Payment Channel</label>
                      <div className="space-y-3">
                        {/* Razorpay Online */}
                        <div
                          onClick={() => {
                            setPaymentMethod("razorpay");
                            setUseWallet(false);
                          }}
                          className={cn(
                            "border p-4 rounded-xl flex items-center gap-3.5 cursor-pointer transition-all",
                            paymentMethod === "razorpay" ? "bg-blue-50/20 border-blue-500/80 shadow-xs" : "bg-white border-slate-200"
                          )}
                        >
                          <span className={cn(
                            "p-2 rounded-lg shrink-0 border",
                            paymentMethod === "razorpay" ? "bg-blue-600 border-transparent text-white" : "bg-slate-50 text-slate-400"
                          )}>
                            <CreditCard className="h-4.5 w-4.5" />
                          </span>
                          <div>
                            <p className="text-xs font-extrabold text-slate-905">Razorpay / NetBanking / Cards</p>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Pay online securely via Razorpay gateway.</p>
                          </div>
                        </div>

                        {/* Direct Wallet Balance payment (if balance exists) */}
                        {walletBalance > 0 && (
                          <div
                            onClick={() => {
                              setPaymentMethod("wallet");
                              setUseWallet(true);
                            }}
                            className={cn(
                              "border p-4 rounded-xl flex items-center gap-3.5 cursor-pointer transition-all",
                              paymentMethod === "wallet" ? "bg-blue-50/20 border-blue-500/80 shadow-xs" : "bg-white border-slate-200"
                            )}
                          >
                            <span className={cn(
                              "p-2 rounded-lg shrink-0 border",
                              paymentMethod === "wallet" ? "bg-blue-600 border-transparent text-white" : "bg-slate-50 text-slate-400"
                            )}>
                              <Wallet className="h-4.5 w-4.5" />
                            </span>
                            <div className="overflow-hidden">
                              <p className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                                <span>Pay using Wallet Credit</span>
                                <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-black">
                                  ₹{walletBalance} Balance
                                </span>
                              </p>
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Deduct amount directly from your wallet balance.</p>
                            </div>
                          </div>
                        )}

                        {/* Direct Cash collection */}
                        <div
                          onClick={() => {
                            setPaymentMethod("cash");
                            setUseWallet(false);
                          }}
                          className={cn(
                            "border p-4 rounded-xl flex items-center gap-3.5 cursor-pointer transition-all",
                            paymentMethod === "cash" ? "bg-blue-50/20 border-blue-500/80 shadow-xs" : "bg-white border-slate-200"
                          )}
                        >
                          <span className={cn(
                            "p-2 rounded-lg shrink-0 border",
                            paymentMethod === "cash" ? "bg-blue-600 border-transparent text-white" : "bg-slate-50 text-slate-400"
                          )}>
                            <Briefcase className="h-4.5 w-4.5" />
                          </span>
                          <div>
                            <p className="text-xs font-extrabold text-slate-905">Direct Cash Collection</p>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Agent collects physical cash from client.</p>
                          </div>
                        </div>

                        {/* Direct UPI Scan */}
                        <div
                          onClick={() => {
                            setPaymentMethod("upi");
                            setUseWallet(false);
                          }}
                          className={cn(
                            "border p-4 rounded-xl flex items-center gap-3.5 cursor-pointer transition-all",
                            paymentMethod === "upi" ? "bg-blue-50/20 border-blue-500/80 shadow-xs" : "bg-white border-slate-200"
                          )}
                        >
                          <span className={cn(
                            "p-2 rounded-lg shrink-0 border",
                            paymentMethod === "upi" ? "bg-blue-600 border-transparent text-white" : "bg-slate-50 text-slate-400"
                          )}>
                            <QrCode className="h-4.5 w-4.5" />
                          </span>
                          <div>
                            <p className="text-xs font-extrabold text-slate-900">UPI (GPay / PhonePe / QR)</p>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Show UPI QR code to customer for instant transfer.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Receipt breakdown summary */}
                    <div className="bg-slate-50 border border-slate-205 rounded-2xl p-5 space-y-4">
                      <h3 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-200/50 pb-2">
                        Invoice Receipt Summary
                      </h3>
                      <div className="space-y-2.5 text-xs font-semibold text-slate-655">
                        <div className="flex justify-between">
                          <span>Government Base Amount:</span>
                          <span className="font-bold text-slate-805">₹{basePrice}</span>
                        </div>
                        <div className="flex justify-between text-[11px] opacity-80 pl-2">
                          <span>GST (18% Included):</span>
                          <span>₹{Math.round((basePrice * 0.18) / 1.18)}</span>
                        </div>
                        {walletRedeemAmount > 0 && (
                          <div className="flex justify-between text-blue-605 font-bold">
                            <span>Wallet Credit Applied:</span>
                            <span>-₹{walletRedeemAmount}</span>
                          </div>
                        )}
                        <div className="border-t border-slate-200 pt-3 flex justify-between text-sm font-black text-slate-900">
                          <span>Total Payable Due:</span>
                          <span>₹{totalAmountPayable}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 6: SUBMISSION SUCCESS SCREEN */}
              {currentStep === 6 && successDetails && (
                <div className="text-center py-6 space-y-6 max-w-xl mx-auto">
                  <div className="flex flex-col items-center">
                    <div className="h-14 w-14 bg-emerald-50 rounded-full border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm mb-3">
                      <Check className="h-7 w-7" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Applications Created Successfully</h2>
                    <p className="text-xs text-slate-555 mt-0.5">Bundle is registered under workflow scheduler. Expected delivery in {successDetails.processingTime}.</p>
                  </div>

                  {/* Details card */}
                  <div className="bg-slate-55 border border-slate-200/60 rounded-2xl p-4.5 text-left grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-705">
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Bundle Primary ID</p>
                      <p className="font-mono font-extrabold text-slate-905 text-sm mt-0.5 select-all">{successDetails.applicationId}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Services Submitted</p>
                      <p className="font-bold text-slate-905 text-xs mt-0.5 leading-normal">{successDetails.serviceTitle}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Paid Amount</p>
                      <p className="font-bold text-slate-905 text-sm mt-0.5">₹{successDetails.amountPaid}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Payment Channel</p>
                      <p className="font-bold text-slate-905 text-sm mt-0.5">{successDetails.paymentStatus}</p>
                    </div>
                  </div>

                  {/* Flow chart timeline */}
                  <div className="bg-white border border-slate-150 rounded-2xl p-4.5 text-left space-y-3.5">
                    <h3 className="font-black text-slate-805 text-[10px] uppercase border-b border-slate-50 pb-1.5">
                      Process Workflow Pipeline
                    </h3>
                    <div className="relative border-l border-slate-100 ml-3 pl-6 space-y-4 text-xs font-semibold">
                      <div className="relative">
                        <div className="absolute -left-[30px] top-1.5 bg-blue-600 rounded-full h-2 w-2 ring-4 ring-blue-50"></div>
                        <p className="font-extrabold text-slate-900 text-xs">Bundle Submitted</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">{new Date().toLocaleString("en-IN")}</p>
                      </div>
                      <div className="relative opacity-65">
                        <div className="absolute -left-[30px] top-1.5 bg-slate-300 rounded-full h-2 w-2"></div>
                        <p className="text-slate-600">Verification check constraints passing</p>
                      </div>
                      <div className="relative opacity-65">
                        <div className="absolute -left-[30px] top-1.5 bg-slate-300 rounded-full h-2 w-2"></div>
                        <p className="text-slate-600">Processing & Delivery files compilation</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex flex-wrap gap-2.5 justify-center pt-2 text-xs font-semibold animate-none">
                    {successDetails.invoiceId && (
                      <a
                        href={`/invoice/${successDetails.invoiceId}`}
                        className="bg-slate-900 hover:bg-slate-805 text-white font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs"
                      >
                        <Download className="h-4 w-4" /> Print Invoice
                      </a>
                    )}
                    <button
                      onClick={() => router.push("/ap/dashboard")}
                      className="bg-slate-105 hover:bg-slate-205 text-slate-705 font-bold px-4 py-2.5 rounded-xl cursor-pointer border-none"
                    >
                      Return to Dashboard
                    </button>
                    <button
                      onClick={() => {
                        setCart([]);
                        setServiceDetails({});
                        setUploadedFiles({});
                        setFileMetadata({});
                        setUseWallet(false);
                        setCurrentStep(1);
                      }}
                      className="bg-blue-55 text-blue-605 hover:bg-blue-105 font-bold px-4 py-2.5 rounded-xl cursor-pointer border-none"
                    >
                      Create Another Application
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

        {/* Action Button Navigation Strip */}
        {currentStep < 6 && (
          <div className="sticky bottom-0 bg-white border-t border-slate-100 px-5 py-3.5 flex justify-between items-center z-10 font-semibold">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={isSubmitting}
                className="flex items-center gap-1 text-xs font-black text-slate-660 bg-slate-50 hover:bg-slate-100 px-4 py-2.5 rounded-xl border border-slate-100 transition-colors disabled:opacity-50 cursor-pointer border-none"
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
                (currentStep === 1 && cart.length === 0) ||
                (currentStep === 5 && paymentMethod === "razorpay" && totalAmountPayable > 0 && !isScriptReady)
              }
              onClick={handleNextStep}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer border-none"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Submitting Bundle...</span>
                </>
              ) : currentStep === 5 ? (
                <>
                  <CreditCard className="h-4 w-4" />
                  <span>{totalAmountPayable === 0 ? "Submit Bundle" : "Pay & Submit"}</span>
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

      {/* Right Desktop Floating Widget Cart Summary */}
      <div className="w-full lg:sticky lg:top-20 space-y-6">
        {cartItems.length > 0 && currentStep < 6 && (
          <div className="bg-white border border-slate-200/60 rounded-3xl p-5 shadow-xs space-y-4">
            <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center justify-between">
              <span>Applications Cart</span>
              <ShoppingCart className="h-4 w-4 text-slate-400" />
            </h3>

            {/* List cart items */}
            <div className="space-y-3 max-h-[220px] overflow-y-auto no-scrollbar border-b border-slate-100 pb-3 pr-1 text-xs font-semibold">
              {cartItems.map((item) => (
                <div key={item.service.slug} className="flex justify-between items-start gap-2">
                  <div className="overflow-hidden">
                    <p className="font-extrabold text-slate-805 leading-tight truncate">{item.service.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">₹{item.service.customer_fee} × {item.quantity}</p>
                  </div>
                  <span className="font-black text-slate-900 shrink-0">₹{item.service.customer_fee * item.quantity}</span>
                </div>
              ))}
            </div>

            {/* Overall stats */}
            <div className="space-y-3.5 text-xs font-semibold">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Government Fees:</span>
                <span className="font-black text-slate-808">₹{cartTotalAmount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Total Commission:</span>
                <span className="font-black text-emerald-600">+₹{totalPayout} Score</span>
              </div>
              <div>
                <p className="text-slate-400 font-bold text-[9px] uppercase">Bundle Progress Score</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full transition-all" style={{ width: `${completionScore}%` }}></div>
                  </div>
                  <span className="font-extrabold text-[10px] text-blue-600 shrink-0">{completionScore}%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CRM Customer History Dossier drawer */}
      {showHistoryDrawer && customer360 && (
        <div className="fixed inset-0 bg-slate-955/40 backdrop-blur-xs z-50 flex justify-end font-semibold">
          <div className="bg-white border-l border-slate-205 w-full max-w-md h-full flex flex-col justify-between p-6 shadow-xl">
            <div className="space-y-6 flex-1 overflow-y-auto no-scrollbar font-semibold">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-955 text-base flex items-center gap-1.5 font-bold">
                  <ClipboardList className="h-5 w-5 text-blue-600" />
                  <span>Applicant Dossier History</span>
                </h3>
                <button
                  onClick={() => setShowHistoryDrawer(false)}
                  className="text-slate-400 hover:text-slate-655 p-1 bg-slate-50 rounded-lg cursor-pointer border-none"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <div className="space-y-3 font-semibold">
                {customer360.recentApplications.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center font-bold">No previous submissions records.</p>
                ) : (
                  customer360.recentApplications.map((app) => (
                    <div key={app.id} className="bg-slate-50 border border-slate-205/60 rounded-xl p-3.5 space-y-2">
                      <div className="flex justify-between items-center animate-none">
                        <span className="text-[9px] font-black text-slate-400 select-all">ID: {app.id.slice(0, 8)}</span>
                        <span className="text-[9px] bg-blue-50 text-blue-600 font-extrabold px-1.5 py-0.5 rounded">
                          {app.status}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-808 text-xs">{app.serviceName}</h4>
                        <p className="text-[9px] text-slate-455 mt-0.5">{new Date(app.createdAt).toLocaleDateString("en-IN")}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
