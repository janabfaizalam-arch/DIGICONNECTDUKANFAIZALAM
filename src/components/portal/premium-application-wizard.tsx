/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, {
  useState, useEffect, useMemo, useCallback, useRef,
} from "react";
import { useSearchParams } from "next/navigation";
import Script from "next/script";
import {
  type LucideIcon,
  Search, Check, Shield, CreditCard, AlertTriangle,
  ArrowLeft, ArrowRight, Camera, Upload, Trash2, RefreshCw, X,
  FileText, UserCheck, Building, Briefcase, Car, FileCheck,
  HeartHandshake, Star, ShoppingCart, Plus, Minus, RotateCcw,
} from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { createClient } from "@/lib/supabase/browser";
import { normalizeAgentService, type AgentService } from "@/lib/agent-services";
import { cn } from "@/lib/utils";

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

// ─── 3 fixed document slots — all optional ────────────────────────────────────
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

// ─── Types ────────────────────────────────────────────────────────────────────
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

export interface PremiumApplicationWizardProps {
  initialServiceSlug?:    string;
  initialProfileFields?: { mobile?: string; pincode?: string; city?: string; state?: string; };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export function PremiumApplicationWizard({
  initialServiceSlug,
  initialProfileFields,
}: PremiumApplicationWizardProps) {
  const searchParams = useSearchParams();
  const { success: toastSuccess, error: toastError } = useToast();

  // Services from Supabase
  const [dbServices,      setDbServices]      = useState<AgentService[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  // Wizard step
  const [currentStep, setCurrentStep] = useState(1);

  // Cart
  const [cart, setCart] = useState<CartEntry[]>([]);

  // Search + filter
  const [searchQuery,       setSearchQuery]       = useState("");
  const [selectedCategory,  setSelectedCategory]  = useState("all");

  // localStorage lists
  const [recentServices,    setRecentServices]    = useState<string[]>([]);
  const [favouriteServices, setFavouriteServices] = useState<string[]>([]);

  // Customer form (ONE form for ALL services)
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

  // Documents — 3 fixed optional slots
  const [docFiles, setDocFiles] = useState<Record<DocSlotId, File | null>>({
    aadhaar: null, pan: null, other: null,
  });
  const [uploadProgress, setUploadProgress] = useState<Record<DocSlotId, number>>({
    aadhaar: 0, pan: 0, other: 0,
  });

  // Inline camera
  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const [cameraSlot,    setCameraSlot]    = useState<DocSlotId | null>(null);
  const [cameraStream,  setCameraStream]  = useState<MediaStream | null>(null);
  const [capturedFrame, setCapturedFrame] = useState<string | null>(null);

  // Payment
  const [isSubmitting,  setIsSubmitting]  = useState(false);
  const [isScriptReady, setIsScriptReady] = useState(false);

  // Auto-save toast
  const [autoSaved, setAutoSaved] = useState(false);

  // Success screen
  const [successDetails, setSuccessDetails] = useState<SuccessDetails | null>(null);

  // ── Load services ────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const sb = createClient();
        if (!sb) throw new Error("No client");
        const { data, error } = await sb
          .from("agent_services")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("title",      { ascending: true });
        if (!error && data) setDbServices(data.map((r: any) => normalizeAgentService(r)));
      } catch (e) { console.error("service load", e); }
      finally     { setLoadingServices(false); }
    })();
  }, []);

  // ── localStorage & draft restore ─────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    setRecentServices(JSON.parse(localStorage.getItem("ap_recent_services")    ?? "[]"));
    setFavouriteServices(JSON.parse(localStorage.getItem("ap_favourite_services") ?? "[]"));
    if (searchParams.get("resume") === "true") {
      try {
        const d = JSON.parse(localStorage.getItem("ap_wizard_draft") ?? "null");
        if (d?.cart?.length) {
          setCart(d.cart);
          if (d.customer)    setCustomer(d.customer);
          if (d.currentStep) setCurrentStep(d.currentStep);
        }
      } catch { /* ignore */ }
    } else {
      localStorage.removeItem("ap_wizard_draft");
    }
  }, [searchParams]);

  // ── Pre-select from URL param / prop ──────────────────────────────────────
  useEffect(() => {
    const slug = initialServiceSlug ?? searchParams.get("service");
    if (slug && dbServices.length > 0) {
      const found = dbServices.find(s => s.slug === slug);
      if (found) { setCart([{ slug, quantity: 1 }]); setCurrentStep(2); }
    }
  }, [initialServiceSlug, searchParams, dbServices]);

  // ── Auto-save draft ────────────────────────────────────────────────────────
  useEffect(() => {
    if (cart.length === 0) return;
    const t = setTimeout(() => {
      localStorage.setItem("ap_wizard_draft", JSON.stringify({ cart, customer, currentStep }));
      setAutoSaved(true);
      setTimeout(() => setAutoSaved(false), 2000);
    }, 1500);
    return () => clearTimeout(t);
  }, [cart, customer, currentStep]);

  // ── Assign stream to video element ────────────────────────────────────────
  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraStream]);

  // ── Derived: cartItems ────────────────────────────────────────────────────
  const cartItems = useMemo<CartItem[]>(() =>
    cart.flatMap(e => {
      const svc = dbServices.find(s => s.slug === e.slug);
      return svc ? [{ service: svc, quantity: e.quantity }] : [];
    }),
  [cart, dbServices]);

  const cartTotal = useMemo(() =>
    cartItems.reduce((s, i) => s + i.service.customer_fee * i.quantity, 0),
  [cartItems]);

  const cartEarnings = useMemo(() =>
    cartItems.reduce((s, i) => {
      const p = i.service.payout_type === "percentage"
        ? Math.round((i.service.customer_fee * i.service.payout_percentage) / 100)
        : i.service.agent_payout;
      return s + p * i.quantity;
    }, 0),
  [cartItems]);

  const totalItemCount = useMemo(() =>
    cartItems.reduce((s, i) => s + i.quantity, 0),
  [cartItems]);

  // ── Derived: filtered services ────────────────────────────────────────────
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

  // ── Category icon helper ──────────────────────────────────────────────────
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

  // ── Cart handlers ─────────────────────────────────────────────────────────
  const addToCart = useCallback((slug: string) => {
    setCart(prev => {
      const ex = prev.find(e => e.slug === slug);
      return ex
        ? prev.map(e => e.slug === slug ? { ...e, quantity: e.quantity + 1 } : e)
        : [...prev, { slug, quantity: 1 }];
    });
    setRecentServices(prev => {
      const next = [slug, ...prev.filter(s => s !== slug)].slice(0, 5);
      localStorage.setItem("ap_recent_services", JSON.stringify(next));
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
      localStorage.setItem("ap_favourite_services", JSON.stringify(next));
      return next;
    });
  }, []);

  // ── Pincode auto-fill ─────────────────────────────────────────────────────
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

  // ── Customer validation ───────────────────────────────────────────────────
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

  // ── File handler ──────────────────────────────────────────────────────────
  const handleFileChange = useCallback((slotId: DocSlotId, file: File) => {
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

  // ── Inline camera ─────────────────────────────────────────────────────────
  const openCamera = useCallback(async (slotId: DocSlotId) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setCameraSlot(slotId);
      setCameraStream(stream);
      setCapturedFrame(null);
    } catch {
      // Fallback to input[capture] on devices without getUserMedia
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.setAttribute("capture", "environment");
      input.onchange = (ev) => {
        const f = (ev.target as HTMLInputElement).files?.[0];
        if (f) handleFileChange(slotId, f);
      };
      input.click();
    }
  }, [handleFileChange]);

  const captureFrame = useCallback(() => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    c.width  = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")?.drawImage(v, 0, 0);
    setCapturedFrame(c.toDataURL("image/jpeg", 0.85));
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
    }, "image/jpeg", 0.85);
  }, [capturedFrame, cameraSlot, handleFileChange]); // eslint-disable-line

  const closeCamera = useCallback(() => {
    cameraStream?.getTracks().forEach(t => t.stop());
    setCameraStream(null);
    setCameraSlot(null);
    setCapturedFrame(null);
  }, [cameraStream]);

  // ── Final submission (called after Razorpay verification) ─────────────────
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
          email:   "",                                          // optional — agent flow
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

      localStorage.removeItem("ap_wizard_draft");

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

  // ── Razorpay checkout ─────────────────────────────────────────────────────
  // PAYMENT FIX: frontend sends NO amount — server calculates authoritative total.
  // We use orderData.amount (from server) for Razorpay, never a client calculation.
  const triggerRazorpayCheckout = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
      toastError("Razorpay not configured.");
      return;
    }
    setIsSubmitting(true);
    try {
      const slugs = cartItems.flatMap(item => Array<string>(item.quantity).fill(item.service.slug));

      // ↓ KEY FIX: No "amount" field — let server compute authoritative amount
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
      });
      const orderData = await orderRes.json();

      if (!orderRes.ok || !orderData.order_id) {
        throw new Error(orderData.error ?? orderData.message ?? "Order creation failed.");
      }

      // ↓ Use server-returned amount — never frontend cartTotal
      const rzpOptions = {
        key:         process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount:      orderData.amount,         // ← AUTHORITATIVE: from server
        currency:    orderData.currency ?? "INR",
        name:        "DigiConnect Dukan",
        description: cartItems.map(i => i.service.title).join(", "),
        order_id:    orderData.order_id,
        prefill: {
          name:    customer.name,
          contact: customer.mobile,
        },
        theme: { color: "#2563eb" },
        handler: async (payRes: Record<string, unknown>) => {
          try {
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
            if (!verRes.ok || !verData.success) {
              throw new Error(verData.error ?? "Payment verification failed.");
            }
            await handleFinalSubmit(
              { ...payRes, amount_paise: orderData.amount },
              orderData.application_ids as string[],
            );
          } catch (e) {
            toastError(e instanceof Error ? e.message : "Verification failed.");
            setIsSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => {
            toastError("Payment cancelled.");
            setIsSubmitting(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(rzpOptions);
      rzp.open();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Payment error.");
      setIsSubmitting(false);
    }
  }, [cartItems, customer, handleFinalSubmit, toastError]);

  // ── Step navigation ───────────────────────────────────────────────────────
  const handleNext = useCallback(() => {
    if (currentStep === 1) {
      if (cart.length === 0) { toastError("Select at least one service."); return; }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!validateCustomer()) { toastError("Please fix the form errors."); return; }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);            // all docs are optional
    } else if (currentStep === 4) {
      setCurrentStep(5);
    } else if (currentStep === 5) {
      triggerRazorpayCheckout();
    }
  }, [currentStep, cart, validateCustomer, triggerRazorpayCheckout, toastError]);

  const handlePrev = useCallback(() => {
    if (currentStep > 1 && currentStep < 6) setCurrentStep(p => p - 1);
  }, [currentStep]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setIsScriptReady(true)}
      />
      {/* Hidden canvas for camera capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ── INLINE CAMERA MODAL ──────────────────────────────────────────── */}
      {cameraSlot && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col">
          <div className="flex items-center justify-between p-4 bg-black/80 shrink-0">
            <span className="text-white text-sm font-bold">
              Capture: {DOC_SLOTS.find(d => d.id === cameraSlot)?.label}
            </span>
            <button onClick={closeCamera} className="text-white/80 hover:text-white p-2 rounded-full">
              <X className="h-5 w-5" />
            </button>
          </div>

          {capturedFrame ? (
            <div className="flex-1 flex flex-col items-center justify-center p-4 gap-5 bg-black">
              <img
                src={capturedFrame}
                alt="Preview"
                className="max-h-[60vh] max-w-full rounded-xl object-contain border border-white/10"
              />
              <div className="flex gap-3">
                <button
                  onClick={retakeFrame}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-bold text-sm transition-colors"
                >
                  <RotateCcw className="h-4 w-4" /> Retake
                </button>
                <button
                  onClick={saveFrame}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-colors"
                >
                  <Check className="h-4 w-4" /> Use Photo
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-black gap-5">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full max-h-[72vh] object-cover"
              />
              <button
                onClick={captureFrame}
                className="w-18 h-18 rounded-full bg-white border-4 border-blue-600 flex items-center justify-center shadow-2xl active:scale-90 transition-transform"
                style={{ width: 72, height: 72 }}
              >
                <Camera className="h-8 w-8 text-blue-700" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Auto-save indicator */}
      {autoSaved && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900/95 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg pointer-events-none">
          <Check className="h-3 w-3 text-emerald-400" /> Draft saved
        </div>
      )}

      {/* ── MAIN LAYOUT ──────────────────────────────────────────────────── */}
      <div className="min-h-screen bg-slate-50/40 pb-24">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 space-y-3">

          {/* Step progress bar */}
          {currentStep < 6 && (
            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 flex items-center gap-1 overflow-x-auto no-scrollbar">
              {STEPS.filter(s => s.id < 6).map((step, i) => (
                <React.Fragment key={step.id}>
                  <div className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all shrink-0",
                    currentStep === step.id
                      ? "bg-blue-600 text-white"
                      : currentStep > step.id
                        ? "text-emerald-600"
                        : "text-slate-400"
                  )}>
                    {currentStep > step.id
                      ? <Check className="h-3 w-3" />
                      : <span className="text-[9px] font-black opacity-70">{step.id}</span>
                    }
                    {step.label}
                  </div>
                  {i < 4 && (
                    <div className={cn(
                      "flex-1 h-0.5 min-w-[6px] rounded-full",
                      currentStep > step.id ? "bg-emerald-300" : "bg-slate-200"
                    )} />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Content card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">

            {/* ══ STEP 1: SERVICE SELECTION ════════════════════════════════ */}
            {currentStep === 1 && (
              <div>
                {/* Sticky header */}
                <div className="sticky top-0 bg-white z-10 border-b border-slate-100 p-4 space-y-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      type="search"
                      placeholder="Search services..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-all"
                    />
                  </div>
                  {/* Category chips */}
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg border text-xs font-bold whitespace-nowrap transition-all shrink-0",
                          selectedCategory === cat.id
                            ? "bg-slate-900 border-slate-900 text-white"
                            : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                        )}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {/* Favourites row */}
                  {favouriteServices.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-wider">⭐ Favourites</p>
                      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {dbServices
                          .filter(s => favouriteServices.includes(s.slug))
                          .map(srv => (
                            <button
                              key={srv.slug}
                              onClick={() => addToCart(srv.slug)}
                              className="flex-shrink-0 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-left hover:bg-amber-100 transition-colors"
                            >
                              <p className="text-xs font-bold text-slate-900 whitespace-nowrap">{srv.title}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">₹{srv.customer_fee}</p>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Recents row */}
                  {recentServices.length > 0 && !searchQuery.trim() && (
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-wider">🕐 Recent</p>
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
                                  "flex-shrink-0 border rounded-xl px-3 py-2 text-left transition-colors",
                                  inCart
                                    ? "bg-blue-50 border-blue-300"
                                    : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                                )}
                              >
                                <p className="text-xs font-bold text-slate-900 whitespace-nowrap">{srv.title}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">₹{srv.customer_fee}</p>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Services grid */}
                  {loadingServices ? (
                    <div className="py-16 flex flex-col items-center gap-2 text-slate-400">
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      <p className="text-xs font-semibold">Loading services...</p>
                    </div>
                  ) : filteredServices.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-sm">No services match your search.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredServices.map(srv => {
                        const Icon   = getCategoryIcon(srv.category);
                        const entry  = cart.find(e => e.slug === srv.slug);
                        const qty    = entry?.quantity ?? 0;
                        const isFav  = favouriteServices.includes(srv.slug);
                        const payout = srv.payout_type === "percentage"
                          ? Math.round((srv.customer_fee * srv.payout_percentage) / 100)
                          : srv.agent_payout;

                        return (
                          <div
                            key={srv.slug}
                            className={cn(
                              "border rounded-xl p-3.5 flex items-start gap-3 transition-all",
                              qty > 0
                                ? "bg-blue-50/50 border-blue-300"
                                : "bg-white border-slate-200 hover:border-slate-300"
                            )}
                          >
                            <div className={cn(
                              "p-2.5 rounded-xl shrink-0 mt-0.5",
                              qty > 0 ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                            )}>
                              <Icon className="h-4 w-4" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-1 mb-1">
                                <p className="text-xs font-bold text-slate-900 leading-tight">{srv.title}</p>
                                <button
                                  onClick={e => { e.stopPropagation(); toggleFavourite(srv.slug); }}
                                  className="shrink-0 hover:scale-110 transition-transform"
                                >
                                  <Star className={cn("h-3.5 w-3.5", isFav ? "fill-amber-400 text-amber-400" : "text-slate-300")} />
                                </button>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-900">₹{srv.customer_fee}</span>
                                <span className="text-[10px] text-emerald-600 font-bold">+₹{payout} earn</span>
                                {srv.processing_time && (
                                  <span className="text-[10px] text-slate-400">{srv.processing_time}</span>
                                )}
                              </div>

                              {qty === 0 ? (
                                <button
                                  onClick={() => addToCart(srv.slug)}
                                  className="mt-2 text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg transition-colors active:scale-95"
                                >
                                  + Add to Cart
                                </button>
                              ) : (
                                <div className="mt-2 flex items-center gap-2">
                                  <button
                                    onClick={() => updateQty(srv.slug, -1)}
                                    className="w-6 h-6 rounded-lg bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <span className="text-xs font-black text-blue-700 w-5 text-center">{qty}</span>
                                  <button
                                    onClick={() => updateQty(srv.slug, 1)}
                                    className="w-6 h-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => removeFromCart(srv.slug)}
                                    className="ml-1 text-red-400 hover:text-red-600 transition-colors"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══ STEP 2: CUSTOMER DETAILS ══════════════════════════════════ */}
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

                  {/* Pincode with auto-fill */}
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

                  {/* State */}
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

                  {/* District */}
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

                  {/* Address */}
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

                  {/* Note */}
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

            {/* ══ STEP 3: DOCUMENTS ════════════════════════════════════════ */}
            {currentStep === 3 && (
              <div className="p-4 sm:p-5 space-y-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Upload Documents</h2>
                  <p className="text-xs text-slate-500 mt-0.5">All slots are optional. Upload whatever is available.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {DOC_SLOTS.map(slot => {
                    const file    = docFiles[slot.id];
                    const prog    = uploadProgress[slot.id];
                    const loading = prog > 0 && prog < 100;
                    const Icon    = slot.icon;

                    return (
                      <div
                        key={slot.id}
                        className={cn(
                          "border rounded-2xl p-4 flex flex-col gap-3 min-h-[168px] transition-all",
                          file ? "bg-emerald-50/40 border-emerald-200" : "bg-white border-dashed border-slate-200"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className={cn(
                              "inline-flex p-2 rounded-xl mb-1.5",
                              file ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                            )}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <h3 className="text-xs font-extrabold text-slate-900">{slot.label}</h3>
                            <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{slot.hint}</p>
                          </div>
                          {file && (
                            <button
                              onClick={() => setDocFiles(p => ({ ...p, [slot.id]: null }))}
                              className="text-red-400 hover:text-red-600 p-1 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        <div className="mt-auto">
                          {file ? (
                            <div className="flex items-center gap-1.5 bg-white border border-emerald-100 rounded-xl p-2">
                              <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                              <span className="text-[10px] font-bold text-slate-700 truncate">{file.name}</span>
                            </div>
                          ) : loading ? (
                            <div className="space-y-1">
                              <div className="flex justify-between text-[9px] font-bold text-slate-400">
                                <span>Attaching...</span><span>{prog}%</span>
                              </div>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-blue-600 h-full transition-all duration-150" style={{ width: `${prog}%` }} />
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  const i = document.createElement("input");
                                  i.type = "file";
                                  i.accept = "image/*,application/pdf";
                                  i.onchange = (e) => {
                                    const f = (e.target as HTMLInputElement).files?.[0];
                                    if (f) handleFileChange(slot.id, f);
                                  };
                                  i.click();
                                }}
                                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors active:scale-95"
                              >
                                <Upload className="h-3.5 w-3.5" /> Upload
                              </button>
                              <button
                                onClick={() => openCamera(slot.id)}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors active:scale-95"
                              >
                                <Camera className="h-3.5 w-3.5" /> Camera
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-blue-500" />
                  Documents are optional here. Per-service requirements are managed from Admin Panel.
                </div>
              </div>
            )}

            {/* ══ STEP 4: REVIEW ═══════════════════════════════════════════ */}
            {currentStep === 4 && (
              <div className="p-4 sm:p-5 space-y-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Review</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Confirm everything before payment.</p>
                </div>

                <div className="space-y-3">
                  {/* Customer */}
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

                  {/* Services */}
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
                      <div className="flex justify-between text-xs text-emerald-600 font-bold">
                        <span>Your earnings</span><span>+₹{cartEarnings}</span>
                      </div>
                    </div>
                  </div>

                  {/* Documents */}
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

            {/* ══ STEP 5: PAYMENT ══════════════════════════════════════════ */}
            {currentStep === 5 && (
              <div className="p-4 sm:p-5 space-y-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Payment</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Secure online payment via Razorpay gateway.</p>
                </div>

                {/* Amount summary */}
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

                {/* Razorpay method card */}
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

            {/* ══ STEP 6: SUCCESS ══════════════════════════════════════════ */}
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
                <button
                  onClick={() => window.location.reload()}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-xl text-sm transition-colors active:scale-95"
                >
                  + New Application
                </button>
              </div>
            )}
          </div>

          {/* ── Cart summary bar (visible in step 1 when cart has items) ── */}
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
              <div className="text-xs text-emerald-600 font-bold text-right">
                Your earnings: +₹{cartEarnings}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── STICKY BOTTOM ACTION BAR ────────────────────────────────────────── */}
      {currentStep < 6 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-slate-200 px-4 py-3 flex items-center gap-3">
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
            disabled={isSubmitting || (currentStep === 5 && !isScriptReady)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 text-sm font-black text-white py-3.5 rounded-xl transition-all active:scale-[0.98] disabled:opacity-60",
              currentStep === 5
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-slate-900 hover:bg-slate-800"
            )}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                {currentStep === 5 ? "Processing Payment..." : "Please wait..."}
              </>
            ) : currentStep === 1 ? (
              <>
                <ShoppingCart className="h-4 w-4" />
                Proceed with {totalItemCount} item{totalItemCount !== 1 ? "s" : ""}
                {totalItemCount > 0 && <span className="ml-1 opacity-80">— ₹{cartTotal}</span>}
              </>
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
    </>
  );
}
