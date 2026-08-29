"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { CreditCard, type LucideIcon } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { createClient } from "@/lib/supabase/browser";
import { normalizeAgentService, type AgentService } from "@/lib/agent-services";
import {
  CATEGORY_ICONS,
  DOC_SLOTS,
  payLog,
  type CartEntry,
  type CartItem,
  type CustomerForm,
  type DocSlotId,
  type SuccessDetails,
} from "@/components/apply/shared";

/**
 * Everything the apply flow does, separated from everything it looks like.
 *
 * The flow used to be one 1,781-line client component: six steps of markup
 * wrapped around the cart, the service catalogue, form validation, a pincode
 * lookup, a camera viewfinder, uploads and the Razorpay handshake, all in the
 * same file. Redesigning it meant replacing every line of markup, and doing
 * that in place would have meant editing around payment code — the one part
 * of the app where a careless change costs a customer money.
 *
 * So the behaviour moved here first, unchanged, and the screens were rebuilt
 * against it. This hook is a transcription: same state, same effects, same
 * dependency arrays, same order. Anything that reads differently from the old
 * file is a bug, not an improvement.
 */
export interface ApplyFlowOptions {
  initialServiceSlug?: string;
  initialProfileFields?: {
    mobile: string;
    pincode: string;
    city: string;
    state: string;
  };
}

export function useApplyFlow({
  initialServiceSlug,
  initialProfileFields,
}: ApplyFlowOptions) {
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

  /*
    The action bar is no longer moved by hand when the keyboard opens.

    This used to set `style.bottom` to `window.innerHeight - visualViewport.height`,
    which is not the keyboard's height on iOS: it also counts the accessory
    strip above it — the "AutoFill Contact" row — and the bar carries its own
    bottom padding on top of that. The three added up and the Continue button
    ended up floating in the middle of the form, over the fields it was meant
    to sit below.

    The bar steps out of the way while somebody is typing instead. See
    `keyboardHeight` below, which the shell uses to decide that: it is derived
    from an actual viewport shrink, so it stays zero on a desktop where
    focusing a field opens nothing.
  */

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
        console.error("service load error:", e);
        setPaymentError("Failed to load available services. Please try refreshing the page.");
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

  /**
   * Clear a slot.
   *
   * The old screen wrote this inline at the call site, three `setState` calls
   * deep in the markup. It belongs with the rest of the file handling: a slot
   * is not empty until its file, its progress and its error are all cleared,
   * and forgetting the third leaves a red message under an empty box.
   */
  const removeFile = useCallback((slotId: DocSlotId) => {
    setDocFiles((previous) => ({ ...previous, [slotId]: null }));
    setUploadProgress((previous) => ({ ...previous, [slotId]: 0 }));
    setUploadErrors((previous) => ({ ...previous, [slotId]: null }));
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
      if (!validateCustomer()) {
        /*
          No toast here.

          Every invalid field already says what is wrong directly underneath
          it. A toast repeating "please fix the form errors" adds nothing, and
          it lands over the top of the form — so the one message a customer
          needs to read is covered by a message telling them to read it. Take
          them to the first problem instead.
        */
        requestAnimationFrame(() => {
          const firstInvalid = document.querySelector<HTMLElement>("[aria-invalid='true']");
          firstInvalid?.scrollIntoView({ behavior: "smooth", block: "center" });
          firstInvalid?.focus({ preventScroll: true });
        });
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    } else if (currentStep === 4) {
      setCurrentStep(5);
    } else if (currentStep === 5) {
      triggerRazorpayCheckout();
    }
  }, [currentStep, cart, validateCustomer, triggerRazorpayCheckout, toastError, isSubmitting]);

  const handlePrev = useCallback(() => {
    if (currentStep > 1 && currentStep < 6) setCurrentStep(p => p - 1);
  }, [currentStep]);

  return {
    // catalogue
    dbServices,
    loadingServices,
    filteredServices,
    getCategoryIcon,
    // step
    currentStep,
    setCurrentStep,
    handleNext,
    handlePrev,
    // browsing
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    recentServices,
    favouriteServices,
    toggleFavourite,
    // cart
    cart,
    cartItems,
    cartTotal,
    totalItemCount,
    addToCart,
    removeFromCart,
    updateQty,
    // customer
    customer,
    setCustomer,
    validationErrors,
    pincodeLoading,
    handlePincodeChange,
    // documents
    docFiles,
    uploadProgress,
    uploadErrors,
    handleFileChange,
    removeFile,
    // camera
    videoRef,
    canvasRef,
    cameraSlot,
    capturedFrame,
    cameraFacing,
    flashOn,
    setFlashOn,
    openCamera,
    switchCamera,
    captureFrame,
    retakeFrame,
    saveFrame,
    closeCamera,
    // submission
    isSubmitting,
    isScriptReady,
    setIsScriptReady,
    paymentError,
    autoSaved,
    successDetails,
    isKeyboardVisible,
    keyboardHeight,
  };
}
