/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, {
  useState, useEffect, useMemo, useCallback, useRef,
} from "react";
import { useSearchParams } from "next/navigation";
import Script from "next/script";
import Link from "next/link";
import {
  type LucideIcon,
  Search, Check, Shield, CreditCard, AlertTriangle,
  ArrowLeft, ArrowRight, Camera, Upload, Trash2, RefreshCw, X,
  FileText, UserCheck, Building, Briefcase, Car, FileCheck,
  HeartHandshake, Star, ShoppingCart, Plus, Minus, RotateCcw,
  SwitchCamera, Zap, ZapOff, Clock,
} from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { createClient } from "@/lib/supabase/browser";
import { normalizeAgentService, type AgentService } from "@/lib/agent-services";
import { cn } from "@/lib/utils";
import { servicesData } from "@/lib/services-data";

// ─── Category icon map ────────────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  cards: CreditCard,
  loans: HeartHandshake,
  banking: Building,
  licence: Car,
  tax: FileCheck,
  company: Briefcase,
  insurance: Shield,
};

const STEPS = [
  { id: 1, label: "Services" },
  { id: 2, label: "Customer" },
  { id: 3, label: "Documents" },
  { id: 4, label: "Review" },
  { id: 5, label: "Payment" },
  { id: 6, label: "Done" },
];

const DOC_SLOTS = [
  { id: "aadhaar", label: "Aadhaar Card",    hint: "Front + back of Aadhaar. JPG / PDF.", icon: UserCheck },
  { id: "pan",     label: "PAN Card",         hint: "Clear photo of PAN card.",             icon: CreditCard },
  { id: "other",   label: "Other Document",   hint: "Any additional supporting document.",  icon: FileText },
] as const;

type DocSlotId = "aadhaar" | "pan" | "other";

const CATEGORIES = [
  { id: "all",       name: "All" },
  { id: "tax",       name: "Tax & GST" },
  { id: "company",   name: "Company" },
  { id: "banking",   name: "Banking" },
  { id: "licence",   name: "Licences" },
  { id: "loans",     name: "Loans" },
  { id: "insurance", name: "Insurance" },
  { id: "cards",     name: "Cards" },
];

interface CustomerForm {
  name:      string;
  mobile:    string;
  altMobile: string;
  pincode:   string;
  state:     string;
  district:  string;
  address:   string;
  note:      string;
}

interface CartEntry { slug: string; quantity: number; }
interface CartItem  { service: AgentService; quantity: number; }

interface SuccessDetails {
  applicationIds: string[];
  customerName:   string;
  serviceTitle:   string;
  amountPaid:     number;
}

type PaymentStage = "ORDER_CREATE" | "RAZORPAY_OPEN" | "PAYMENT_DONE" | "VERIFY" | "FINALIZE";
function payLog(stage: PaymentStage, detail: Record<string, unknown>) {
  console.info(`[PAY:${stage}]`, detail);
}

interface UploadSlotProps {
  slot: { id: DocSlotId; label: string; hint: string; icon: LucideIcon };
  file: File | null;
  progress: number;
  error?: string | null;
  onFileSelect: (file: File) => void;
  onRemove: () => void;
  onCameraClick: () => void;
}

function DocumentUploadSlot({
  slot,
  file,
  progress,
  error,
  onFileSelect,
  onRemove,
  onCameraClick,
}: UploadSlotProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    if (!file && !progress) {
      fileInputRef.current?.click();
    }
  };

  const isUploading = progress > 0 && progress < 100;

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        "relative border rounded-2xl p-4 flex flex-col justify-between min-h-[180px] transition-all duration-300 group cursor-pointer",
        file 
          ? "bg-emerald-50/20 border-emerald-300 shadow-sm" 
          : error 
          ? "bg-red-50/20 border-red-300 shadow-xs"
          : isUploading
          ? "bg-blue-50/10 border-blue-300"
          : "bg-white border-dashed border-slate-200 hover:border-slate-350 hover:bg-slate-50/30"
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFileSelect(f);
        }}
      />

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className={cn(
            "inline-flex p-2 rounded-xl mb-1.5 transition-colors",
            file ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
          )}>
            <slot.icon className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
            {slot.label}
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{slot.hint}</p>
        </div>

        {file && (
          <button
            onClick={onRemove}
            className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-100/80 transition-colors shrink-0"
            title="Remove File"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="my-3 flex-1 flex flex-col justify-center text-left">
        {file ? (
          <div className="flex items-center gap-2 bg-white/80 border border-slate-100 rounded-xl p-2 backdrop-blur-xs">
            {previewUrl ? (
              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-100">
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-lg bg-slate-150 flex items-center justify-center shrink-0 border border-slate-100">
                <FileText className="h-5 w-5 text-slate-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-slate-700 truncate leading-snug">{file.name}</p>
              <p className="text-[9px] text-slate-400 mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>
        ) : isUploading ? (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[9px] font-bold text-blue-600">
              <span>Uploading...</span><span>{progress}%</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : error ? (
          <p className="text-[10px] font-semibold text-red-500 bg-red-50/50 p-2 rounded-lg border border-red-100">{error}</p>
        ) : null}
      </div>

      <div className="mt-1">
        {file ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-white hover:bg-slate-50 text-slate-750 text-[10px] font-bold py-2 border border-slate-200 rounded-xl flex items-center justify-center gap-1.5 transition-colors active:scale-95 shadow-xs"
          >
            <RefreshCw className="h-3 w-3" /> Replace File
          </button>
        ) : !isUploading ? (
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors active:scale-95"
            >
              <Upload className="h-3.5 w-3.5" /> Upload File
            </button>
            <button
              onClick={onCameraClick}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors active:scale-95 shadow-md shadow-blue-500/10"
            >
              <Camera className="h-3.5 w-3.5" /> Use Camera
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
export interface CustomerApplicationWizardProps {
  initialServiceSlug?:    string;
  initialProfileFields?: { mobile?: string; pincode?: string; city?: string; state?: string; };
}

export function CustomerApplicationWizard({
  initialServiceSlug,
  initialProfileFields,
}: CustomerApplicationWizardProps) {
  const searchParams = useSearchParams();
  const { success: toastSuccess, error: toastError } = useToast();

  const [dbServices,      setDbServices]      = useState<AgentService[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [currentStep, setCurrentStep] = useState<number>(() => {
    const slug = initialServiceSlug || searchParams?.get("service") || "";
    return slug ? 2 : 1;
  });
  const [cart, setCart] = useState<CartEntry[]>(() => {
    const slug = initialServiceSlug || searchParams?.get("service") || "";
    return slug ? [{ slug, quantity: 1 }] : [];
  });
  const [searchQuery,       setSearchQuery]       = useState("");
  const [selectedCategory,  setSelectedCategory]  = useState("all");
  const [recentServices,    setRecentServices]    = useState<string[]>([]);
  const [favouriteServices, setFavouriteServices] = useState<string[]>([]);

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight,    setKeyboardHeight]    = useState(0);

  const [customer, setCustomer] = useState<CustomerForm>({
    name:      "",
    mobile:    initialProfileFields?.mobile   ?? "",
    altMobile: "",
    pincode:   initialProfileFields?.pincode  ?? "",
    state:     initialProfileFields?.state    ?? "",
    district:  initialProfileFields?.city     ?? "",
    address:   "",
    note:      "",
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [pincodeLoading,   setPincodeLoading]   = useState(false);

  const [docFiles, setDocFiles] = useState<Record<DocSlotId, File | null>>({
    aadhaar: null, pan: null, other: null,
  });
  const [uploadProgress, setUploadProgress] = useState<Record<DocSlotId, number>>({
    aadhaar: 0, pan: 0, other: 0,
  });
  const [uploadErrors, setUploadErrors] = useState<Record<DocSlotId, string | null>>({
    aadhaar: null, pan: null, other: null,
  });

  // Dynamic layout heights measurement using ResizeObserver
  useEffect(() => {
    const update = () => {
      const header = document.querySelector(".site-header");
      const stepper = document.querySelector(".wizard-stepper");
      const bottomNav = document.querySelector(".bottom-nav-container");
      const stickyActions = document.querySelector(".wizard-sticky-actions");

      const root = document.documentElement;

      const headerHeight = header ? header.getBoundingClientRect().height : 0;
      const stepperHeight = stepper ? stepper.getBoundingClientRect().height : 0;
      const isBottomNavVisible = bottomNav && window.getComputedStyle(bottomNav).display !== "none";
      const bottomNavHeight = isBottomNavVisible ? bottomNav.getBoundingClientRect().height : 0;
      const stickyActionsHeight = stickyActions ? stickyActions.getBoundingClientRect().height : 0;

      root.style.setProperty("--site-header-height", `${headerHeight}px`);
      root.style.setProperty("--stepper-height", `${stepperHeight}px`);
      root.style.setProperty("--bottom-nav-height", `${bottomNavHeight}px`);
      root.style.setProperty("--sticky-action-bar-height", `${stickyActionsHeight}px`);
    };

    update();

    const observer = new ResizeObserver(() => update());
    
    const header = document.querySelector(".site-header");
    const stepper = document.querySelector(".wizard-stepper");
    const bottomNav = document.querySelector(".bottom-nav-container");
    const stickyActions = document.querySelector(".wizard-sticky-actions");

    if (header) observer.observe(header);
    if (stepper) observer.observe(stepper);
    if (bottomNav) observer.observe(bottomNav);
    if (stickyActions) observer.observe(stickyActions);

    window.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [currentStep]);

  // Visual viewport height adjusting bottom actions for soft keyboard on mobile devices
  useEffect(() => {
    if (!window.visualViewport) return;

    const handleVisualViewportResize = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      const stickyActions = document.querySelector(".wizard-sticky-actions") as HTMLElement;
      if (stickyActions) {
        const keyboardHeight = window.innerHeight - vv.height;
        if (keyboardHeight > 60) {
          stickyActions.style.bottom = `${keyboardHeight}px`;
        } else {
          stickyActions.style.bottom = "0px";
        }
      }
    };

    window.visualViewport.addEventListener("resize", handleVisualViewportResize);
    window.visualViewport.addEventListener("scroll", handleVisualViewportResize);

    return () => {
      window.visualViewport?.removeEventListener("resize", handleVisualViewportResize);
      window.visualViewport?.removeEventListener("scroll", handleVisualViewportResize);
    };
  }, []);

  // Keyboard scroll assistance: auto-scroll inputs into center of view upon focus
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) {
        setTimeout(() => {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 250);
      }
    };

    document.addEventListener("focusin", handleFocus);
    return () => document.removeEventListener("focusin", handleFocus);
  }, []);

  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const [cameraSlot,    setCameraSlot]    = useState<DocSlotId | null>(null);
  const [cameraStream,  setCameraStream]  = useState<MediaStream | null>(null);
  const [capturedFrame, setCapturedFrame] = useState<string | null>(null);

  const [isSubmitting,  setIsSubmitting]  = useState(false);
  const [isScriptReady, setIsScriptReady] = useState(false);
  const [paymentError,  setPaymentError]  = useState<string | null>(null);

  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const [flashOn,      setFlashOn]      = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const [successDetails, setSuccessDetails] = useState<SuccessDetails | null>(null);

  // Load services
  useEffect(() => {
    (async () => {
      try {
        const sb = createClient();
        if (!sb) {
          throw new Error("No client");
        }
        const { data, error } = await sb
          .from("agent_services")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("title",      { ascending: true });
        if (!error && data && data.length > 0) {
          setDbServices(data.map((r: any) => normalizeAgentService(r)));
        } else {
          throw new Error(error ? error.message : "Empty services from database");
        }
      } catch (e: any) {
        console.error("service load", e);
        if (servicesData) {
          setDbServices(servicesData.map((s: any) => ({
            id: s.slug,
            service_id: s.slug,
            slug: s.slug,
            title: s.title,
            description: s.shortDescription,
            category: s.category,
            customer_fee: s.amount,
            agent_payout: 0,
            payout_type: "fixed",
            payout_percentage: 0,
            required_documents: s.documents.join(", "),
            processing_time: "2-3 Days",
            instructions: null,
            is_active: true,
            is_featured: false,
            visibility_type: "all",
            sort_order: 0,
            government_fee_type: "not_applicable",
            government_fee_amount: 0,
            processing_fee: 0,
            eligibility: null,
            faq: [],
            terms: null,
            important_notes: null,
            popular: false,
            thumbnail: null,
            banner: null,
            supported_states: [],
            supported_districts: [],
            supported_pincodes: [],
            variants: [],
            required_documents_list: s.documents.map((d: string, i: number) => ({ id: `doc-${i}`, name: d, type: "PDF", required: true })),
          })));
        }
      }
      finally     { setLoadingServices(false); }
    })();
  }, []);

  // Verify Razorpay script is ready
  useEffect(() => {
    if (typeof window !== "undefined") {
      if ((window as any).Razorpay) {
        setIsScriptReady(true);
        payLog("ORDER_CREATE", { scriptReady: true, source: "window_detect" });
      } else {
        const interval = setInterval(() => {
          if ((window as any).Razorpay) {
            setIsScriptReady(true);
            payLog("ORDER_CREATE", { scriptReady: true, source: "interval_detect" });
            clearInterval(interval);
          }
        }, 500);
        return () => clearInterval(interval);
      }
    }
  }, []);

  // localStorage & draft restore
  useEffect(() => {
    if (typeof window === "undefined") return;
    setRecentServices(JSON.parse(localStorage.getItem("customer_recent_services")    ?? "[]"));
    setFavouriteServices(JSON.parse(localStorage.getItem("customer_favourite_services") ?? "[]"));
    if (searchParams.get("resume") === "true") {
      try {
        const d = JSON.parse(localStorage.getItem("customer_wizard_draft") ?? "null");
        if (d?.cart?.length) {
          setCart(d.cart);
          if (d.customer)    setCustomer(d.customer);
          if (d.currentStep) setCurrentStep(d.currentStep);
        }
      } catch { /* ignore */ }
    } else {
      localStorage.removeItem("customer_wizard_draft");
    }
  }, [searchParams]);

  // Pre-select from URL param / prop
  useEffect(() => {
    const slug = initialServiceSlug ?? searchParams.get("service");
    if (slug && dbServices.length > 0) {
      const found = dbServices.find(s => s.slug === slug);
      if (found) {
        setCart(prev => {
          if (prev.length === 1 && prev[0].slug === slug) return prev;
          return [{ slug, quantity: 1 }];
        });
        setCurrentStep(prev => prev === 1 ? 2 : prev);
      }
    }
  }, [initialServiceSlug, searchParams, dbServices]);

  // Detect virtual keyboard and manage layout scrolling spacing
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        setIsKeyboardVisible(true);
        setTimeout(() => {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 150);
      }
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        const active = document.activeElement;
        if (!active || (active.tagName !== "INPUT" && active.tagName !== "TEXTAREA")) {
          setIsKeyboardVisible(false);
        }
      }, 100);
    };

    const handleViewportChange = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      const isKeyboard = window.innerHeight - vv.height > 120;
      setIsKeyboardVisible(isKeyboard);
      if (isKeyboard) {
        setKeyboardHeight(window.innerHeight - vv.height);
      } else {
        setKeyboardHeight(0);
      }
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleViewportChange);
      window.visualViewport.addEventListener("scroll", handleViewportChange);
    }

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleViewportChange);
        window.visualViewport.removeEventListener("scroll", handleViewportChange);
      }
    };
  }, []);

  // Auto-save draft
  useEffect(() => {
    if (cart.length === 0) return;
    const t = setTimeout(() => {
      localStorage.setItem("customer_wizard_draft", JSON.stringify({ cart, customer, currentStep }));
      setAutoSaved(true);
      setTimeout(() => setAutoSaved(false), 2000);
    }, 1500);
    return () => clearTimeout(t);
  }, [cart, customer, currentStep]);

  // Assign stream to video element
  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraStream]);

  // Derived: cartItems
  const cartItems = useMemo<CartItem[]>(() =>
    cart.flatMap(e => {
      const svc = dbServices.find(s => s.slug === e.slug);
      return svc ? [{ service: svc, quantity: e.quantity }] : [];
    }),
  [cart, dbServices]);

  const cartTotal = useMemo(() =>
    cartItems.reduce((s, i) => s + i.service.customer_fee * i.quantity, 0),
  [cartItems]);

  const totalItemCount = useMemo(() =>
    cartItems.reduce((s, i) => s + i.quantity, 0),
  [cartItems]);

  // Derived: filtered services
  const filteredServices = useMemo(() => {
    let list = dbServices;
    if (selectedCategory !== "all") {
      list = list.filter(s => {
        const c = (s.category ?? "").toLowerCase();
        if (selectedCategory === "tax")       return c.includes("tax") || c.includes("gst");
        if (selectedCategory === "company")   return c.includes("company") || c.includes("registr");
        if (selectedCategory === "banking")   return c.includes("bank") || c.includes("financ");
        if (selectedCategory === "licence")   return c.includes("licen");
        if (selectedCategory === "loans")     return c.includes("loan") || c.includes("cibil");
        if (selectedCategory === "insurance") return c.includes("insur");
        if (selectedCategory === "cards")     return c.includes("card");
        return c === selectedCategory;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s =>
        s.title.toLowerCase().includes(q) ||
        (s.description ?? "").toLowerCase().includes(q) ||
        s.slug.includes(q)
      );
    }
    return list;
  }, [dbServices, selectedCategory, searchQuery]);

  const getCategoryIcon = (category: string | null): LucideIcon => {
    const c = (category ?? "").toLowerCase();
    if (c.includes("tax") || c.includes("gst"))     return CATEGORY_ICONS.tax;
    if (c.includes("company") || c.includes("reg")) return CATEGORY_ICONS.company;
    if (c.includes("bank") || c.includes("fin"))    return CATEGORY_ICONS.banking;
    if (c.includes("licen"))                         return CATEGORY_ICONS.licence;
    if (c.includes("loan") || c.includes("cibil"))  return CATEGORY_ICONS.loans;
    if (c.includes("insur"))                         return CATEGORY_ICONS.insurance;
    if (c.includes("card"))                          return CATEGORY_ICONS.cards;
    return CreditCard;
  };

  const addToCart = useCallback((slug: string) => {
    setCart(prev => {
      const ex = prev.find(e => e.slug === slug);
      return ex
        ? prev.map(e => e.slug === slug ? { ...e, quantity: e.quantity + 1 } : e)
        : [...prev, { slug, quantity: 1 }];
    });
    setRecentServices(prev => {
      const next = [slug, ...prev.filter(s => s !== slug)].slice(0, 5);
      localStorage.setItem("customer_recent_services", JSON.stringify(next));
      return next;
    });
  }, []);

  const removeFromCart = useCallback((slug: string) => {
    setCart(prev => prev.filter(e => e.slug !== slug));
  }, []);

  const updateQty = useCallback((slug: string, delta: number) => {
    setCart(prev =>
      prev.flatMap(e => {
        if (e.slug !== slug) return [e];
        const n = e.quantity + delta;
        return n <= 0 ? [] : [{ ...e, quantity: n }];
      })
    );
  }, []);

  const toggleFavourite = useCallback((slug: string) => {
    setFavouriteServices(prev => {
      const next = prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug];
      localStorage.setItem("customer_favourite_services", JSON.stringify(next));
      return next;
    });
  }, []);

  const handlePincodeChange = useCallback(async (pincode: string) => {
    setCustomer(p => ({ ...p, pincode }));
    if (!/^\d{6}$/.test(pincode)) return;
    setPincodeLoading(true);
    try {
      const r = await fetch(`/api/pincode?pincode=${pincode}`);
      const d = await r.json();
      if (d?.state || d?.district) {
        setCustomer(p => ({
          ...p,
          state:    d.state    ?? p.state,
          district: d.district ?? d.city ?? p.district,
        }));
      }
    } catch { /* silent */ } finally { setPincodeLoading(false); }
  }, []);

  const validateCustomer = useCallback((): boolean => {
    const e: Record<string, string> = {};
    if (!customer.name.trim())                        e.name     = "Full name is required.";
    if (!/^[6-9]\d{9}$/.test(customer.mobile))       e.mobile   = "Enter valid 10-digit mobile.";
    if (!/^\d{6}$/.test(customer.pincode))            e.pincode  = "Enter valid 6-digit pincode.";
    if (!customer.state.trim())                       e.state    = "State is required.";
    if (!customer.district.trim())                    e.district = "City / District is required.";
    if (!customer.address.trim())                     e.address  = "Address is required.";
    setValidationErrors(e);
    return Object.keys(e).length === 0;
  }, [customer]);

  const handleFileChange = useCallback((slotId: DocSlotId, file: File) => {
    // Check if file is too large (> 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadErrors(p => ({ ...p, [slotId]: "File size exceeds 5MB limit. Please upload a smaller file." }));
      setUploadProgress(p => ({ ...p, [slotId]: 0 }));
      setDocFiles(p => ({ ...p, [slotId]: null }));
      return;
    }

    setUploadErrors(p => ({ ...p, [slotId]: null }));
    setUploadProgress(p => ({ ...p, [slotId]: 0 }));
    let pct = 0;
    const iv = setInterval(() => {
      pct = Math.min(pct + 25, 100);
      setUploadProgress(p => ({ ...p, [slotId]: pct }));
      if (pct >= 100) {
        clearInterval(iv);
        setDocFiles(p => ({ ...p, [slotId]: file }));
      }
    }, 80);
  }, []);

  const openCamera = useCallback(async (slotId: DocSlotId, facing: "environment" | "user" = "environment") => {
    cameraStream?.getTracks().forEach(t => t.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      setCameraSlot(slotId);
      setCameraStream(stream);
      setCameraFacing(facing);
      setCapturedFrame(null);
    } catch {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.setAttribute("capture", facing === "user" ? "user" : "environment");
      input.onchange = (ev) => {
        const f = (ev.target as HTMLInputElement).files?.[0];
        if (f) handleFileChange(slotId, f);
      };
      input.click();
    }
  }, [handleFileChange, cameraStream]);

  const switchCamera = useCallback(() => {
    if (!cameraSlot) return;
    const newFacing = cameraFacing === "environment" ? "user" : "environment";
    openCamera(cameraSlot, newFacing);
  }, [cameraSlot, cameraFacing, openCamera]);

  const captureFrame = useCallback(() => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    c.width  = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")?.drawImage(v, 0, 0);
    setCapturedFrame(c.toDataURL("image/jpeg", 0.9));
  }, []);

  const retakeFrame = useCallback(() => setCapturedFrame(null), []);

  const saveFrame = useCallback(() => {
    const c = canvasRef.current;
    if (!capturedFrame || !cameraSlot || !c) return;
    c.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `cam-${cameraSlot}-${Date.now()}.jpg`, { type: "image/jpeg" });
      handleFileChange(cameraSlot, file);
      closeCamera();
    }, "image/jpeg", 0.9);
  }, [capturedFrame, cameraSlot, handleFileChange]); // eslint-disable-line

  const closeCamera = useCallback(() => {
    cameraStream?.getTracks().forEach(t => t.stop());
    setCameraStream(null);
    setCameraSlot(null);
    setCapturedFrame(null);
    setFlashOn(false);
  }, [cameraStream]);

  // Final submission (called after Razorpay verification)
  const handleFinalSubmit = useCallback(async (
    razorpayDetails?: Record<string, unknown> | null,
    applicationIds?:  string[],
  ) => {
    setIsSubmitting(true);
    try {
      const slugs = cartItems.flatMap(item => Array<string>(item.quantity).fill(item.service.slug));
      const payload: Record<string, unknown> = {
        serviceSlugs:    slugs,
        serviceSlug:     slugs[0],
        customer: {
          name:    customer.name,
          mobile:  customer.mobile,
          email:   "",
          city:    customer.district || customer.state,
          message: customer.note || "",
        },
        details: {
          address:      customer.address,
          pincode:      customer.pincode,
          state:        customer.state,
          district:     customer.district,
          altMobile:    customer.altMobile,
          paymentMethod: razorpayDetails ? "razorpay" : "cash",
        },
        walletUseAmount: 0,
        razorpayPayment: razorpayDetails ?? null,
        isDraft:         false,
        status:          "submitted",
      };
      if (applicationIds?.length) payload.applicationIds = applicationIds;

      const fd = new FormData();
      fd.append("payload", JSON.stringify(payload));

      const docLabels: string[] = [];
      for (const slot of DOC_SLOTS) {
        const file = docFiles[slot.id];
        if (file) {
          docLabels.push(slot.label);
          fd.append(slot.id, file, file.name);
        }
      }
      fd.append("documentTypes", JSON.stringify(docLabels));

      const res  = await fetch("/api/applications", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message ?? data.error ?? "Submission failed.");

      localStorage.removeItem("customer_wizard_draft");

      setSuccessDetails({
        applicationIds: data.applicationIds ?? (data.applicationId ? [data.applicationId] : []),
        customerName:   customer.name,
        serviceTitle:   cartItems.map(i => `${i.service.title} ×${i.quantity}`).join(", "),
        amountPaid:     cartTotal,
      });
      setCurrentStep(6);
      toastSuccess?.("Applications submitted!");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  }, [cartItems, cartTotal, customer, docFiles, toastSuccess, toastError]);

  // Razorpay checkout
  const triggerRazorpayCheckout = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
      const msg = "Razorpay key is not configured. Contact support.";
      setPaymentError(msg); toastError(msg); return;
    }
    setIsSubmitting(true);
    setPaymentError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.error("[PAY:TIMEOUT] Order creation timed out after 15 seconds.");
    }, 15000);

    try {
      const slugs = cartItems.flatMap(item => Array<string>(item.quantity).fill(item.service.slug));
      payLog("ORDER_CREATE", { slugs, customer: customer.name, mobile: customer.mobile, stage: "START" });

      payLog("ORDER_CREATE", { stage: "SEND_REQUEST" });
      const orderRes = await fetch("/api/create-order", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceSlugs: slugs,
          currency:     "INR",
          receipt:      `wiz-${Date.now()}`,
          applicationDraft: {
            customer: {
              name:   customer.name,
              mobile: customer.mobile,
              email:  customer.altMobile || "",
              city:   customer.district || customer.state,
            },
            details: {
              address:  customer.address,
              pincode:  customer.pincode,
              state:    customer.state,
              district: customer.district,
            },
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const orderData = await orderRes.json();
      payLog("ORDER_CREATE", { status: orderRes.status, orderId: orderData.order_id, amount: orderData.amount, appIds: orderData.application_ids, stage: "RESPONSE_RECEIVED" });

      if (!orderRes.ok || !orderData.order_id) {
        const errMsg = orderData.error ?? orderData.message ?? `Order creation failed (HTTP ${orderRes.status})`;
        throw new Error(errMsg);
      }

      const reviewTotal = cartTotal;
      const backendTotal = Number(orderData.servicePrice);
      const razorpayAmount = Number(orderData.amount) / 100;

      if (reviewTotal !== backendTotal || backendTotal !== razorpayAmount) {
        const mismatchMsg = "Payment amount mismatch detected. Please refresh cart.";
        console.error("[PAY:MISMATCH]", { reviewTotal, backendTotal, razorpayAmount });
        throw new Error(mismatchMsg);
      }

      payLog("RAZORPAY_OPEN", { orderId: orderData.order_id, amountPaise: orderData.amount, amountINR: orderData.amount / 100, stage: "INITIALIZE" });

      const rzpOptions = {
        key:         process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount:      orderData.amount,
        currency:    orderData.currency ?? "INR",
        name:        "DigiConnect Dukan",
        description: cartItems.map(i => i.service.title).join(", "),
        order_id:    orderData.order_id,
        prefill: { name: customer.name, contact: customer.mobile },
        theme: { color: "#2563eb" },
        handler: async (payRes: Record<string, unknown>) => {
          payLog("PAYMENT_DONE", { paymentId: payRes.razorpay_payment_id, orderId: payRes.razorpay_order_id, stage: "SUCCESS" });
          try {
            payLog("VERIFY", { applicationIds: orderData.application_ids, stage: "START" });
            const verRes  = await fetch("/api/verify-payment", {
              method:  "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...payRes,
                application_id:  orderData.application_id,
                application_ids: orderData.application_ids,
              }),
            });
            const verData = await verRes.json();
            payLog("VERIFY", { status: verRes.status, success: verData.success, cashback: verData.cashback, stage: "DONE" });

            if (!verRes.ok || !verData.success) {
              throw new Error(verData.error ?? verData.message ?? `Verification failed (HTTP ${verRes.status})`);
            }

            payLog("FINALIZE", { applicationIds: orderData.application_ids, stage: "START" });
            await handleFinalSubmit(
              { ...payRes, amount_paise: orderData.amount },
              orderData.application_ids as string[],
            );
            payLog("FINALIZE", { stage: "COMPLETED" });
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Verification failed.";
            setPaymentError(msg);
            toastError(msg);
            setIsSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => {
            payLog("RAZORPAY_OPEN", { stage: "CANCELLED" });
            toastError("Payment cancelled.");
            setIsSubmitting(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(rzpOptions);
      rzp.open();
      payLog("RAZORPAY_OPEN", { stage: "OPENED" });
    } catch (e: any) {
      clearTimeout(timeoutId);
      let errMsg = "Payment initialisation error.";
      if (e.name === "AbortError") {
        errMsg = "Order creation timed out (15s limit). Please check your internet connection and try again.";
        payLog("ORDER_CREATE", { stage: "TIMEOUT_EXCEEDED" });
      } else {
        errMsg = e instanceof Error ? e.message : String(e);
        payLog("ORDER_CREATE", { stage: "FAILED", error: errMsg });
      }
      setPaymentError(errMsg);
      toastError(errMsg);
      setIsSubmitting(false);
    }
  }, [cartItems, customer, cartTotal, handleFinalSubmit, toastError]);

  // Step navigation
  const handleNext = useCallback(() => {
    if (isSubmitting) return;
    if (currentStep === 1) {
      if (cart.length === 0) { toastError("Select at least one service."); return; }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!validateCustomer()) { toastError("Please fix the form errors."); return; }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    } else if (currentStep === 4) {
      setCurrentStep(5);
    } else if (currentStep === 5) {
      triggerRazorpayCheckout();
    }
  }, [currentStep, cart, validateCustomer, triggerRazorpayCheckout, toastError]);

  const handlePrev = useCallback(() => {
    if (currentStep > 1 && currentStep < 6) setCurrentStep(p => p - 1);
  }, [currentStep]);

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient-shift 3s ease infinite;
        }
      `}} />
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setIsScriptReady(true)}
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Viewfinder camera modal */}
      {cameraSlot && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex flex-col" style={{ touchAction: "none" }}>
          <div className="relative flex items-center justify-between px-5 pt-10 pb-4 bg-gradient-to-b from-black/80 to-transparent shrink-0">
            <button
              onClick={closeCamera}
              className="w-10 h-10 rounded-full bg-white/15 backdrop-blur flex items-center justify-center active:bg-white/30 transition"
            >
              <X className="h-5 w-5 text-white" />
            </button>
            <span className="text-white text-sm font-bold tracking-wide">
              {DOC_SLOTS.find(d => d.id === cameraSlot)?.label}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setFlashOn(f => !f)}
                className="w-10 h-10 rounded-full bg-white/15 backdrop-blur flex items-center justify-center active:bg-white/30 transition"
              >
                {flashOn
                  ? <Zap    className="h-5 w-5 text-yellow-300 fill-yellow-300" />
                  : <ZapOff className="h-5 w-5 text-white/70" />}
              </button>
              <button
                onClick={switchCamera}
                className="w-10 h-10 rounded-full bg-white/15 backdrop-blur flex items-center justify-center active:bg-white/30 transition"
              >
                <SwitchCamera className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>

          {capturedFrame ? (
            <div className="flex-1 flex flex-col items-center justify-between pb-10 px-6 gap-6">
              <p className="text-white/60 text-xs font-semibold tracking-wider uppercase">Preview</p>
              <div className="flex-1 flex items-center justify-center w-full">
                <img
                  src={capturedFrame}
                  alt="Preview"
                  className="max-h-[62vh] max-w-full rounded-2xl object-contain ring-2 ring-white/10 shadow-2xl"
                />
              </div>
              <div className="flex gap-4 w-full max-w-xs">
                <button
                  onClick={retakeFrame}
                  className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white px-5 py-4 rounded-2xl font-bold text-sm transition"
                >
                  <RotateCcw className="h-4 w-4" /> Retake
                </button>
                <button
                  onClick={saveFrame}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-5 py-4 rounded-2xl font-bold text-sm transition shadow-lg shadow-blue-900/40"
                >
                  <Check className="h-4 w-4" /> Use Photo
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-end bg-black pb-10">
              <div className="absolute inset-0 top-20 bottom-32 flex items-center justify-center overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-[14%] pointer-events-none">
                  {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map((pos, i) => (
                    <div
                      key={i}
                      className={`absolute w-7 h-7 ${pos} border-white/70`}
                      style={{
                        borderTopWidth:    i < 2 ? 3 : 0,
                        borderBottomWidth: i >= 2 ? 3 : 0,
                        borderLeftWidth:   i % 2 === 0 ? 3 : 0,
                        borderRightWidth:  i % 2 === 1 ? 3 : 0,
                        borderRadius: i === 0 ? "6px 0 0 0" : i === 1 ? "0 6px 0 0" : i === 2 ? "0 0 0 6px" : "0 0 6px 0",
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="relative z-10 flex items-center justify-center gap-10 mb-2">
                <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 overflow-hidden flex items-center justify-center">
                  {docFiles[cameraSlot!] ? (
                    <img
                      src={URL.createObjectURL(docFiles[cameraSlot!]!)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : <Camera className="h-5 w-5 text-white/40" />}
                </div>

                <button
                  onClick={captureFrame}
                  className="relative w-20 h-20 rounded-full border-4 border-white flex items-center justify-center shadow-2xl active:scale-90 transition-transform"
                >
                  <div className="w-14 h-14 rounded-full bg-white" />
                </button>
                <div className="w-12" />
              </div>
            </div>
          )}
        </div>
      )}

      {autoSaved && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900/95 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg pointer-events-none">
          <Check className="h-3 w-3 text-emerald-400" /> Draft saved
        </div>
      )}

      <div className="w-full">
        <div className="max-w-4xl mx-auto w-full px-0 sm:px-4 py-0 sm:py-4 space-y-0 sm:space-y-4">
          {currentStep < 6 && (
            <div className="wizard-stepper sticky top-[calc(var(--site-header-height,0px)+env(safe-area-inset-top))] z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/60 sm:border sm:rounded-2xl p-3 flex flex-col items-center w-full shadow-xs">
              <div className="relative flex items-center justify-between w-full max-w-md">
                {/* Connecting line */}
                <div className="absolute left-4 right-4 top-[14px] sm:top-4 h-[2px] bg-slate-100 z-0">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-blue-600 transition-all duration-500 ease-out"
                    style={{ width: `${((Math.min(currentStep, 5) - 1) / 4) * 100}%` }}
                  />
                </div>
                
                {STEPS.filter(s => s.id < 6).map((step) => {
                  const isActive = currentStep === step.id;
                  const isCompleted = currentStep > step.id;
                  return (
                    <div key={step.id} className="relative z-10 flex flex-col items-center flex-1">
                      <button
                        onClick={() => {
                          if (step.id < currentStep) {
                            setCurrentStep(step.id);
                          }
                        }}
                        disabled={step.id >= currentStep}
                        className={cn(
                          "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300",
                          isCompleted 
                            ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20 cursor-pointer" 
                            : isActive 
                            ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 animate-gradient text-white shadow-md shadow-blue-500/25 scale-110" 
                            : "bg-white text-slate-400 border-2 border-slate-200 cursor-not-allowed"
                        )}
                      >
                        {isCompleted ? (
                          <Check className="h-4 w-4 stroke-[3]" />
                        ) : (
                          <span>{step.id}</span>
                        )}
                      </button>
                      <span className={cn(
                        "text-[8px] xs:text-[9px] sm:text-[10px] font-bold mt-1.5 transition-all duration-300 text-center tracking-tight leading-tight max-w-[56px] xs:max-w-[60px] sm:max-w-[70px] break-words",
                        isActive 
                          ? "text-blue-600 font-black scale-105" 
                          : isCompleted 
                          ? "text-slate-700 font-bold" 
                          : "text-slate-450 font-medium"
                      )}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div 
            key={currentStep} 
            className={cn(
              "w-full bg-white sm:bg-white/80 sm:backdrop-blur-md border-0 sm:border border-slate-200 sm:rounded-2xl sm:shadow-xs p-0 transition-all duration-300 animate-[reveal-in_300ms_cubic-bezier(0.16,1,0.3,1)]", 
              currentStep === 1 ? "overflow-visible" : "overflow-hidden"
            )}
            style={{
              paddingBottom: keyboardHeight > 0 ? `${keyboardHeight + 48}px` : undefined
            }}
          >
            {/* Step 1: Services selection */}
            {currentStep === 1 && (
              <div>
                <div 
                  className="sticky z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/50 px-3.5 py-2 space-y-2 transition-all duration-300"
                  style={{ top: "calc(var(--site-header-height, 0px) + var(--stepper-height, 0px) + env(safe-area-inset-top))" }}
                >
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      type="search"
                      placeholder="Search services..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-4 py-1.5 bg-slate-100/60 focus:bg-white border border-slate-200/60 focus:border-blue-500 rounded-xl text-xs placeholder:text-slate-450 focus:shadow-sm focus:shadow-blue-500/5 transition-all"
                    />
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={cn(
                          "px-3 py-1 rounded-full border text-[11px] font-bold whitespace-nowrap transition-all duration-200 shrink-0",
                          selectedCategory === cat.id
                            ? "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-500/15"
                            : "bg-slate-100 border-slate-200/50 text-slate-655 hover:bg-slate-200/50"
                        )}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {favouriteServices.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">⭐ Favourites</p>
                      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {dbServices
                          .filter(s => favouriteServices.includes(s.slug))
                          .map(srv => (
                            <button
                              key={srv.slug}
                              onClick={() => addToCart(srv.slug)}
                              className="flex-shrink-0 bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-1.5 text-left hover:bg-amber-100 transition-colors"
                            >
                              <p className="text-xs font-bold text-slate-900 whitespace-nowrap">{srv.title}</p>
                              <p className="text-[10px] text-slate-505 mt-0.5">₹{srv.customer_fee}</p>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {recentServices.length > 0 && !searchQuery.trim() && (
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">🕐 Recent</p>
                      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {dbServices
                          .filter(s => recentServices.includes(s.slug))
                          .map(srv => {
                            const inCart = !!cart.find(e => e.slug === srv.slug);
                            return (
                              <button
                                key={srv.slug}
                                onClick={() => addToCart(srv.slug)}
                                className={cn(
                                  "flex-shrink-0 border rounded-xl px-2.5 py-1.5 text-left transition-colors",
                                  inCart
                                    ? "bg-blue-50 border-blue-300"
                                    : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                                )}
                              >
                                <p className="text-xs font-bold text-slate-900 whitespace-nowrap">{srv.title}</p>
                                <p className="text-[10px] text-slate-505 mt-0.5">₹{srv.customer_fee}</p>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {loadingServices ? (
                    <div className="py-16 flex flex-col items-center gap-2 text-slate-400">
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      <p className="text-xs font-semibold">Loading services...</p>
                    </div>
                  ) : filteredServices.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-sm">No services match your search.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filteredServices.map(srv => {
                        const Icon   = getCategoryIcon(srv.category);
                        const entry  = cart.find(e => e.slug === srv.slug);
                        const qty    = entry?.quantity ?? 0;
                        const isFav  = favouriteServices.includes(srv.slug);

                        return (
                          <div
                            key={srv.slug}
                            className={cn(
                              "border rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 relative overflow-hidden min-h-[155px] sm:min-h-[170px]",
                              qty > 0
                                ? "bg-gradient-to-br from-blue-50/60 to-indigo-50/40 border-blue-400 shadow-md shadow-blue-500/5 ring-1 ring-blue-400/20 scale-[1.01]"
                                : "bg-white border-slate-200/80 hover:border-slate-355 hover:shadow-sm"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300",
                                qty > 0 
                                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" 
                                  : "bg-slate-100 text-slate-500 border border-slate-200/50"
                              )}>
                                <Icon className="h-5 w-5" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-snug tracking-tight">
                                    {srv.title}
                                  </h3>
                                  <button
                                    onClick={e => { e.stopPropagation(); toggleFavourite(srv.slug); }}
                                    className="shrink-0 hover:scale-110 transition-transform p-0.5 rounded-lg hover:bg-slate-100/50"
                                    title={isFav ? "Remove from favourites" : "Add to favourites"}
                                  >
                                    <Star className={cn("h-4 w-4 transition-all duration-200", isFav ? "fill-amber-400 text-amber-400 scale-105" : "text-slate-300 hover:text-slate-455")} />
                                  </button>
                                </div>

                                <div className="flex items-baseline gap-1.5 mt-1">
                                  <span className="text-sm sm:text-base font-black text-blue-600">₹{srv.customer_fee}</span>
                                </div>

                                {srv.processing_time && (
                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-550 font-semibold mt-1">
                                    <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                                    <span>{srv.processing_time}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {qty === 0 ? (
                              <button
                                onClick={() => addToCart(srv.slug)}
                                className="w-full mt-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold rounded-xl transition-all duration-200 active:scale-[0.97] flex items-center justify-center gap-1.5 shadow-xs"
                              >
                                <Plus className="h-3.5 w-3.5" /> Add to Cart
                              </button>
                            ) : (
                              <div className="w-full mt-4 flex items-center justify-between bg-blue-100/30 border border-blue-200/50 rounded-xl p-1 gap-1.5">
                                <button
                                  onClick={() => updateQty(srv.slug, -1)}
                                  className="w-7 h-7 rounded-lg bg-white border border-blue-200/50 hover:bg-blue-50 text-blue-600 flex items-center justify-center transition-all active:scale-90"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="text-xs font-black text-blue-700 w-5 text-center">{qty}</span>
                                <button
                                  onClick={() => updateQty(srv.slug, 1)}
                                  className="w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-all active:scale-90 shadow-xs"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => removeFromCart(srv.slug)}
                                  className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-all active:scale-90 ml-auto"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Customer Details */}
            {currentStep === 2 && (
              <div className="p-4 sm:p-5 space-y-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Customer Details</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    One form — shared across all {totalItemCount} selected service{totalItemCount > 1 ? "s" : ""}.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: "name",      label: "Full Name *",         type: "text",  span: 2, placeholder: "e.g. Rahul Kumar" },
                    { key: "mobile",    label: "Mobile *",            type: "tel",   span: 1, placeholder: "10-digit mobile",   maxLen: 10, numeric: true },
                    { key: "altMobile", label: "Alternate Mobile",    type: "tel",   span: 1, placeholder: "Optional",         maxLen: 10, numeric: true },
                  ].map(({ key, label, type, span, placeholder, maxLen, numeric }) => (
                    <div key={key} className={span === 2 ? "sm:col-span-2" : ""}>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block mb-1">{label}</label>
                      <input
                        type={type}
                        inputMode={numeric ? "numeric" : undefined}
                        placeholder={placeholder}
                        value={customer[key as keyof CustomerForm]}
                        maxLength={maxLen}
                        onChange={e => setCustomer(p => ({
                          ...p,
                          [key]: numeric ? e.target.value.replace(/\D/g, "") : e.target.value
                        }))}
                        className={cn(
                          "w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-sm font-medium focus:outline-none focus:border-blue-400 focus:bg-white transition-all",
                          validationErrors[key] ? "border-red-400 bg-red-50/30" : "border-slate-200"
                        )}
                      />
                      {validationErrors[key] && (
                        <p className="text-[10px] text-red-500 mt-1 font-semibold">{validationErrors[key]}</p>
                      )}
                    </div>
                  ))}

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block mb-1">PIN Code *</label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="6-digit pincode"
                        value={customer.pincode}
                        maxLength={6}
                        onChange={e => handlePincodeChange(e.target.value.replace(/\D/g, ""))}
                        className={cn(
                          "w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-sm font-medium focus:outline-none focus:border-blue-400 focus:bg-white transition-all",
                          validationErrors.pincode ? "border-red-400 bg-red-50/30" : "border-slate-200"
                        )}
                      />
                      {pincodeLoading && (
                        <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-blue-500 animate-spin" />
                      )}
                    </div>
                    {validationErrors.pincode && <p className="text-[10px] text-red-500 mt-1 font-semibold">{validationErrors.pincode}</p>}
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block mb-1">State *</label>
                    <input
                      type="text"
                      placeholder="Auto-filled from pincode"
                      value={customer.state}
                      onChange={e => setCustomer(p => ({ ...p, state: e.target.value }))}
                      className={cn(
                        "w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-sm font-medium focus:outline-none focus:border-blue-400 focus:bg-white transition-all",
                        validationErrors.state ? "border-red-400 bg-red-50/30" : "border-slate-200"
                      )}
                    />
                    {validationErrors.state && <p className="text-[10px] text-red-500 mt-1 font-semibold">{validationErrors.state}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block mb-1">District / City *</label>
                    <input
                      type="text"
                      placeholder="Auto-filled from pincode"
                      value={customer.district}
                      onChange={e => setCustomer(p => ({ ...p, district: e.target.value }))}
                      className={cn(
                        "w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-sm font-medium focus:outline-none focus:border-blue-400 focus:bg-white transition-all",
                        validationErrors.district ? "border-red-400 bg-red-50/30" : "border-slate-200"
                      )}
                    />
                    {validationErrors.district && <p className="text-[10px] text-red-500 mt-1 font-semibold">{validationErrors.district}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block mb-1">Address *</label>
                    <textarea
                      rows={2}
                      placeholder="House / flat no., street, area..."
                      value={customer.address}
                      onChange={e => setCustomer(p => ({ ...p, address: e.target.value }))}
                      className={cn(
                        "w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-sm font-medium focus:outline-none focus:border-blue-400 focus:bg-white transition-all resize-none",
                        validationErrors.address ? "border-red-400 bg-red-50/30" : "border-slate-200"
                      )}
                    />
                    {validationErrors.address && <p className="text-[10px] text-red-500 mt-1 font-semibold">{validationErrors.address}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block mb-1">Note (Optional)</label>
                    <input
                      type="text"
                      placeholder="Any additional info..."
                      value={customer.note}
                      onChange={e => setCustomer(p => ({ ...p, note: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-400 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

             {/* Step 3: Documents */}
            {currentStep === 3 && (
              <div className="p-4 sm:p-5 space-y-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Upload Documents</h2>
                  <p className="text-xs text-slate-500 mt-0.5">All slots are optional. Upload whatever is available.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {DOC_SLOTS.map(slot => (
                    <DocumentUploadSlot
                      key={slot.id}
                      slot={slot}
                      file={docFiles[slot.id]}
                      progress={uploadProgress[slot.id]}
                      error={uploadErrors[slot.id]}
                      onFileSelect={(f) => handleFileChange(slot.id, f)}
                      onRemove={() => {
                        setDocFiles(p => ({ ...p, [slot.id]: null }));
                        setUploadProgress(p => ({ ...p, [slot.id]: 0 }));
                        setUploadErrors(p => ({ ...p, [slot.id]: null }));
                      }}
                      onCameraClick={() => openCamera(slot.id)}
                    />
                  ))}
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-750 font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-blue-500" />
                  Documents are optional for initial submission.
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {currentStep === 4 && (
              <div className="p-4 sm:p-5 space-y-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Review</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Confirm everything before payment.</p>
                </div>

                <div className="space-y-3">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Customer</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                      <div><span className="text-slate-400">Name: </span><span className="font-bold">{customer.name}</span></div>
                      <div><span className="text-slate-400">Mobile: </span><span className="font-bold">{customer.mobile}</span></div>
                      {customer.altMobile && <div><span className="text-slate-400">Alt: </span><span className="font-bold">{customer.altMobile}</span></div>}
                      <div className="col-span-2">
                        <span className="text-slate-400">Address: </span>
                        <span className="font-bold">{customer.address}, {customer.district}, {customer.state} — {customer.pincode}</span>
                      </div>
                      {customer.note && (
                        <div className="col-span-2"><span className="text-slate-400">Note: </span><span className="font-bold">{customer.note}</span></div>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Services</p>
                    <div className="space-y-1.5">
                      {cartItems.map(item => (
                        <div key={item.service.slug} className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700">
                            {item.service.title}
                            {item.quantity > 1 && <span className="text-slate-400 ml-1">×{item.quantity}</span>}
                          </span>
                          <span className="font-black text-slate-900">₹{item.service.customer_fee * item.quantity}</span>
                        </div>
                      ))}
                      <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-black">
                        <span>Total</span>
                        <span className="text-blue-700">₹{cartTotal}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Documents</p>
                    <div className="space-y-1">
                      {DOC_SLOTS.map(slot => {
                        const file = docFiles[slot.id];
                        return (
                          <div key={slot.id} className="flex items-center gap-2 text-xs">
                            {file
                              ? <Check className="h-3.5 w-3.5 text-emerald-500" />
                              : <X     className="h-3.5 w-3.5 text-slate-300" />}
                            <span className={file ? "font-semibold text-slate-700" : "text-slate-400"}>
                              {slot.label}{file && ` — ${file.name}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Payment */}
            {currentStep === 5 && (
              <div className="p-4 sm:p-5 space-y-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Payment</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Secure online payment via Razorpay gateway.</p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 space-y-2">
                  {cartItems.map(item => (
                    <div key={item.service.slug} className="flex justify-between text-xs text-slate-600">
                      <span>{item.service.title}{item.quantity > 1 && ` ×${item.quantity}`}</span>
                      <span className="font-bold">₹{item.service.customer_fee * item.quantity}</span>
                    </div>
                  ))}
                  <div className="border-t border-blue-200 pt-2 flex justify-between items-center">
                    <span className="text-sm font-black text-slate-900">Estimated Total</span>
                    <span className="text-xl font-black text-blue-700">₹{cartTotal}</span>
                  </div>
                  <p className="text-[10px] text-blue-500 font-semibold">
                    ✓ Exact payable amount confirmed by server at payment time.
                  </p>
                </div>

                <div className="flex items-center gap-3 bg-white border-2 border-blue-500 rounded-xl p-4">
                  <div className="p-2.5 bg-blue-600 rounded-xl shrink-0">
                    <CreditCard className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-extrabold text-slate-900">Razorpay Secure Checkout</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      Cards • UPI • NetBanking • Wallets
                    </p>
                  </div>
                  <Check className="h-5 w-5 text-blue-600" />
                </div>

                {!isScriptReady && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Loading payment gateway...
                  </div>
                )}
              </div>
            )}

            {/* Step 6: Done / Success */}
            {currentStep === 6 && successDetails && (
              <div className="p-6 sm:p-8 flex flex-col items-center text-center space-y-5">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Check className="h-8 w-8 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Submitted Successfully!</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {successDetails.applicationIds.length} application{successDetails.applicationIds.length > 1 ? "s" : ""} created for {successDetails.customerName}.
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 w-full text-left space-y-1.5">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wide">Application IDs</p>
                  {successDetails.applicationIds.map(id => (
                    <p key={id} className="text-xs font-mono font-bold text-slate-700">{id}</p>
                  ))}
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 w-full text-sm">
                  <span className="font-bold text-emerald-700">Services: </span>
                  <span className="text-emerald-600">{successDetails.serviceTitle}</span>
                </div>
                <div className="flex gap-4 w-full justify-center">
                  <Link
                    href="/customer/dashboard"
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl text-xs transition-colors active:scale-95 flex items-center justify-center"
                  >
                    Go to Dashboard
                  </Link>
                  <button
                    onClick={() => window.location.reload()}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl text-xs transition-colors active:scale-95 flex items-center justify-center"
                  >
                    + Apply Again
                  </button>
                </div>
              </div>
            )}
          </div>

          {currentStep === 1 && cart.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-black text-slate-900">
                    Cart — {totalItemCount} item{totalItemCount > 1 ? "s" : ""}
                  </span>
                </div>
                <span className="text-sm font-black text-blue-700">₹{cartTotal}</span>
              </div>
              <div className="space-y-1.5">
                {cartItems.map(item => (
                  <div key={item.service.slug} className="flex items-center gap-2">
                    <span className="flex-1 text-xs text-slate-600 font-semibold truncate">{item.service.title}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => updateQty(item.service.slug, -1)} className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
                        <Minus className="h-2.5 w-2.5" />
                      </button>
                      <span className="text-xs font-black text-blue-700 w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateQty(item.service.slug, 1)} className="w-5 h-5 rounded bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center">
                        <Plus className="h-2.5 w-2.5" />
                      </button>
                      <span className="text-xs font-bold text-slate-900 w-14 text-right">₹{item.service.customer_fee * item.quantity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Actions Bar */}
      {currentStep < 6 && (
        <div 
          className={cn(
            "wizard-sticky-actions fixed bottom-0 left-0 right-0 z-40 bg-white/70 backdrop-blur-xl border-t border-slate-200/50 px-4 py-3 flex items-center gap-3 transition-all duration-500 ease-in-out",
            isKeyboardVisible 
              ? "opacity-0 pointer-events-none translate-y-full sm:opacity-100 sm:pointer-events-auto sm:translate-y-0" 
              : "opacity-100 pointer-events-auto translate-y-0"
          )}
          style={{
            boxShadow: "0 -8px 30px rgba(15, 23, 42, 0.05)",
            paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
          }}
        >
          {currentStep > 1 && (
            <button
              onClick={handlePrev}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-slate-900 px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-40 shrink-0"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          )}

          <button
            onClick={handleNext}
            disabled={isSubmitting || (currentStep === 1 && totalItemCount === 0) || (currentStep === 5 && !isScriptReady)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 text-sm font-bold py-3.5 rounded-xl transition-all duration-300 active:scale-[0.98]",
              currentStep === 1 && totalItemCount === 0
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : currentStep === 5
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/10"
                : "bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-900/10"
            )}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                {currentStep === 5 ? "Processing Payment..." : "Please wait..."}
              </>
            ) : currentStep === 1 ? (
              <span className="flex items-center gap-2 transition-all duration-300">
                {totalItemCount === 0 ? (
                  "Select a service to continue"
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4 animate-pulse" />
                    Proceed ({totalItemCount} {totalItemCount === 1 ? "item" : "items"})
                    <span className="ml-1 opacity-90">— ₹{cartTotal}</span>
                  </>
                )}
              </span>
            ) : currentStep === 5 ? (
              <>
                <CreditCard className="h-4 w-4" />
                Pay with Razorpay
              </>
            ) : (
              <>Continue <ArrowRight className="h-4 w-4" /></>
            )}
          </button>
        </div>
      )}

      {paymentError && currentStep === 5 && (
        <div className="fixed bottom-20 left-4 right-4 z-50 bg-red-600 text-white rounded-2xl px-4 py-3 flex items-start gap-3 shadow-xl">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black">Payment Error</p>
            <p className="text-[11px] font-medium mt-0.5 leading-snug">{paymentError}</p>
          </div>
          <button onClick={() => setPaymentError(null)} className="shrink-0 p-1 hover:bg-white/20 rounded-lg transition">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </>
  );
}
