"use client";

import { type FormEvent, useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  Mail,
  MapPin,
  Phone,
  UserRound,
  Gift,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Globe,
  Database,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { FacebookIcon } from "@/components/auth/facebook-icon";
import { GoogleIcon } from "@/components/auth/google-icon";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ButtonSpinner, FormSubmitButton } from "@/components/ui/loading";
import {
  indianMobilePattern,
  indianPincodePattern,
  type CustomerOAuthProvider,
} from "@/lib/customer-oauth";
import { trackLogin, trackSignup } from "@/lib/google-analytics";
import { createClient } from "@/lib/supabase/browser";

type AuthTab = "user" | "partner" | "ops";
type AuthMode = "login" | "signup";
type PartnerType = "ap" | "agent";
type FormMessage = { type: "success" | "error"; text: string };

type PinLookup = {
  ok?: boolean;
  success?: boolean;
  pincode?: string;
  city?: string;
  district?: string;
  state?: string;
  message?: string;
};

interface UnifiedLoginProps {
  initialTab?: AuthTab;
  initialMode?: AuthMode;
  initialMessage?: string;
  referralCode?: string;
}

export function UnifiedLoginExperience({
  initialTab = "user",
  initialMode = "login",
  initialMessage = "",
  referralCode: propsReferralCode = "",
}: UnifiedLoginProps) {
  const { error: toastError, success: toastSuccess } = useToast();
  
  // Tab and sub-mode states
  const [activeTab, setActiveTab] = useState<AuthTab>(initialTab);
  const [userMode, setUserMode] = useState<AuthMode>(initialMode);
  const [partnerType, setPartnerType] = useState<PartnerType>("ap");

  // Loading/Progress states
  const [isPending, setIsPending] = useState(false);
  const [isGooglePending, setIsGooglePending] = useState(false);
  const [isFacebookPending, setIsFacebookPending] = useState(false);
  const [apTransitionPending, startAPTransition] = useTransition();

  // Inputs & Validation
  const [showPassword, setShowPassword] = useState(false);
  const [formMessage, setFormMessage] = useState<FormMessage | null>(null);

  // Customer Signup Location Fields
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("");
  const [pinMessage, setPinMessage] = useState("");
  const [pinLookupPending, setPinLookupPending] = useState(false);
  const [manualLocation, setManualLocation] = useState(false);
  const [referralCode, setReferralCode] = useState(propsReferralCode);
  const [mobile, setMobile] = useState("");
  const [oauthProvider, setOAuthProvider] = useState<CustomerOAuthProvider | null>(null);

  // Mouse hover state for 3D parallax elements
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (initialMessage) {
      setFormMessage({ type: "success", text: initialMessage });
    }
  }, [initialMessage]);

  // Handle URL Referral Code syncing
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const urlReferral = String(params.get("ref") ?? "").trim().toUpperCase();
    const storedReferral = String(
      window.localStorage.getItem("digiconnect_referral_code") ?? ""
    ).trim().toUpperCase();
    const nextReferral = propsReferralCode || urlReferral || storedReferral;

    if (urlReferral) {
      window.localStorage.setItem("digiconnect_referral_code", urlReferral);
      window.sessionStorage.setItem("digiconnect_referral_code", urlReferral);
    }
    if (nextReferral) {
      setReferralCode(nextReferral);
    }
  }, [propsReferralCode]);

  // Track cursor position on Left Side brand card for 3D spring hover effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX - window.innerWidth / 4) / 45;
      const y = (e.clientY - window.innerHeight / 2) / 45;
      setMousePos({ x, y });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Sync PIN code automatically to resolve location lookup
  useEffect(() => {
    if (userMode !== "signup" || pincode.length !== 6) return;

    let active = true;

    async function lookupPin() {
      setPinLookupPending(true);
      setPinMessage("Fetching city, district and state...");

      try {
        const response = await fetch(
          `/api/pincode?pincode=${encodeURIComponent(pincode)}`,
          { cache: "no-store" }
        );
        const result = (await response.json()) as PinLookup;

        if (!active) return;

        if (
          !response.ok ||
          !(result.success ?? result.ok) ||
          !result.city ||
          !result.district ||
          !result.state
        ) {
          setManualLocation(true);
          setPinMessage(
            result.message ??
              "Could not auto fetch location. Enter details manually."
          );
          return;
        }

        setCity(result.city);
        setDistrict(result.district);
        setState(result.state);
        setManualLocation(false);
        setPinMessage("PIN code resolved successfully!");
      } catch {
        if (active) {
          setManualLocation(true);
          setPinMessage("Lookup failed. Please fill city and state manually.");
        }
      } finally {
        if (active) setPinLookupPending(false);
      }
    }

    void lookupPin();

    return () => {
      active = false;
    };
  }, [userMode, pincode]);

  // Helper patterns
  const normalizeMobile = (val: string) => val.replace(/\D/g, "").slice(0, 10);
  const normalizePincode = (val: string) => val.replace(/\D/g, "").slice(0, 6);

  const getSafeRedirect = () => {
    if (typeof window === "undefined") return "/customer/dashboard";
    const params = new URLSearchParams(window.location.search);
    const value = params.get("redirect") ?? params.get("next");
    if (!value || !value.startsWith("/") || value.startsWith("//")) {
      return "/customer/dashboard";
    }
    if (
      value.startsWith("/admin") ||
      value.startsWith("/agent") ||
      value.startsWith("/login") ||
      value.startsWith("/admin-login")
    ) {
      return "/customer/dashboard";
    }
    return value;
  };

  const getOAuthCallbackUrl = () => {
    const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
    const origin =
      configuredSiteUrl ||
      (typeof window === "undefined" ? "" : window.location.origin);
    return `${origin}/auth/callback`;
  };

  // Google / Facebook OAuth Launch
  const openOAuthProvider = async (provider: CustomerOAuthProvider) => {
    const supabase = createClient();
    if (!supabase) throw new Error("Supabase is not configured.");

    const redirectTo = `${getOAuthCallbackUrl()}?next=${encodeURIComponent(
      getSafeRedirect()
    )}${referralCode ? `&ref=${encodeURIComponent(referralCode)}` : ""}`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) throw error;
    if (!data.url) throw new Error("OAuth sign-in URL not generated.");

    trackLogin(provider);
    window.location.assign(data.url);
  };

  const handleOAuthLogin = async (
    provider: CustomerOAuthProvider,
    requiresSignupDetails = false
  ) => {
    if (isPending || isGooglePending || isFacebookPending) return;
    setFormMessage(null);

    const formMobile = normalizeMobile(mobile);
    const formPincode = normalizePincode(pincode);

    if (
      requiresSignupDetails &&
      (!indianMobilePattern.test(formMobile) ||
        !indianPincodePattern.test(formPincode) ||
        !city.trim() ||
        !district.trim() ||
        !state.trim())
    ) {
      setFormMessage({
        type: "error",
        text: "Please fill all mobile, PIN, and location details before social sign-in.",
      });
      return;
    }

    if (provider === "google") setIsGooglePending(true);
    if (provider === "facebook") setIsFacebookPending(true);

    try {
      if (requiresSignupDetails) {
        const preflightRes = await fetch("/api/auth/oauth/customer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider,
            mobile: formMobile,
            pincode: formPincode,
            city,
            district,
            state,
          }),
        });

        const preflight = (await preflightRes.json()) as {
          ok: boolean;
          city?: string;
          district?: string;
          state?: string;
          message?: string;
        };

        if (
          !preflightRes.ok ||
          !preflight.ok ||
          !preflight.city ||
          !preflight.district ||
          !preflight.state
        ) {
          throw new Error(preflight.message || "OAuth preflight details rejected.");
        }

        setCity(preflight.city);
        setDistrict(preflight.district);
        setState(preflight.state);
      }

      await openOAuthProvider(provider);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "OAuth authentication failed.";
      setFormMessage({ type: "error", text: errMsg });
      toastError(errMsg);
      setIsGooglePending(false);
      setIsFacebookPending(false);
    }
  };

  const hasVerifiedOAuthDetails =
    indianMobilePattern.test(normalizeMobile(mobile)) &&
    indianPincodePattern.test(normalizePincode(pincode)) &&
    Boolean(city.trim() && district.trim() && state.trim()) &&
    !pinLookupPending;

  // Handle Form Submission for Customer (Login/Signup)
  const handleCustomerSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending || isGooglePending || isFacebookPending) return;
    setFormMessage(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormMessage({ type: "error", text: "Please enter a valid email address." });
      return;
    }

    if (password.length < 6) {
      setFormMessage({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }

    if (userMode === "signup") {
      const fullName = String(formData.get("name") ?? "").trim();
      const formMobile = normalizeMobile(String(formData.get("mobile") ?? ""));
      const formPincode = normalizePincode(String(formData.get("pincode") ?? ""));
      const formCity = String(formData.get("city") ?? city).trim();
      const formState = String(formData.get("state") ?? state).trim();

      if (!fullName) {
        setFormMessage({ type: "error", text: "Name is required." });
        return;
      }
      if (!indianMobilePattern.test(formMobile)) {
        setFormMessage({ type: "error", text: "Enter a valid 10-digit mobile number." });
        return;
      }
      if (!indianPincodePattern.test(formPincode)) {
        setFormMessage({ type: "error", text: "Enter a valid 6-digit PIN code." });
        return;
      }
      if (!formCity || !formState) {
        setFormMessage({ type: "error", text: "City and State details are required." });
        return;
      }

      setIsPending(true);
      try {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName,
            mobile: formMobile,
            email,
            password,
            pincode: formPincode,
            city: formCity,
            state: formState,
            referred_by: referralCode || undefined,
          }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || result.message || "Signup failed.");

        trackSignup();
        if (referralCode && typeof window !== "undefined") {
          window.localStorage.removeItem("digiconnect_referral_code");
          window.sessionStorage.removeItem("digiconnect_referral_code");
        }
        
        toastSuccess("Account created successfully!");
        setFormMessage({
          type: "success",
          text: result.message || "Account created. Please confirm your session.",
        });

        if (result.hasSession) {
          window.location.assign(getSafeRedirect() || result.destination || "/customer/dashboard");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Signup registration failed.";
        setFormMessage({ type: "error", text: msg });
        toastError(msg);
      } finally {
        setIsPending(false);
      }
      return;
    }

    // Login flow
    setIsPending(true);
    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Supabase connection is missing.");

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error("User record not returned.");

      trackLogin("email");
      toastSuccess("Welcome back!");
      window.location.assign(getSafeRedirect());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication login failed.";
      setFormMessage({ type: "error", text: msg });
      toastError(msg);
    } finally {
      setIsPending(false);
    }
  };

  // Handle Partner Workspace Login (AP / Agent)
  const handlePartnerSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending || apTransitionPending) return;
    setFormMessage(null);
    setIsPending(true);

    const formData = new FormData(event.currentTarget);
    const identifier = String(formData.get("identifier") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!identifier || !password) {
      setFormMessage({ type: "error", text: "Please fill credentials." });
      setIsPending(false);
      return;
    }

    if (partnerType === "agent") {
      // Agent code/email login route
      try {
        const response = await fetch("/api/auth/agent-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier, password }),
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Agent login failed. Verify credentials.");
        }

        trackLogin("agent_email");
        toastSuccess("Agent workspace ready!");
        window.location.assign(result.destination || "/agent/dashboard");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Agent login failed.";
        setFormMessage({ type: "error", text: msg });
        toastError(msg);
      } finally {
        setIsPending(false);
      }
    } else {
      // Agency Partner email login
      startAPTransition(async () => {
        try {
          const supabase = createClient();
          if (!supabase) throw new Error("Supabase database not linked.");

          const { error: authError } = await supabase.auth.signInWithPassword({
            email: identifier.toLowerCase(),
            password,
          });

          if (authError) {
            throw new Error(
              authError.message === "Invalid login credentials"
                ? "Invalid email or password. Verify credentials."
                : authError.message
            );
          }

          toastSuccess("Partner workspace logged in!");
          window.location.assign("/ap/dashboard");
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Partner login failed.";
          setFormMessage({ type: "error", text: msg });
          toastError(msg);
          setIsPending(false);
        }
      });
    }
  };

  // Handle Operations Console (Admin) Login
  const handleAdminSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) return;
    setFormMessage(null);
    setIsPending(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Supabase client failed initialization.");

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      trackLogin("admin_email");
      toastSuccess("Operations console authenticated.");
      window.location.assign("/login"); // will redirect according to auth role
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Operations login credentials failed.";
      setFormMessage({ type: "error", text: msg });
      toastError(msg);
    } finally {
      setIsPending(false);
    }
  };

  const handleAdminGoogleLogin = async () => {
    if (isPending) return;
    setIsPending(true);

    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Missing Supabase configuration.");

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
      if (!siteUrl) throw new Error("Site URL is missing.");

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${siteUrl}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });

      if (error) throw error;
      if (data.url) {
        trackLogin("google_admin");
        window.location.assign(data.url);
        return;
      }
      throw new Error("Could not construct redirect OAuth URL.");
    } catch (err: unknown) {
      setIsPending(false);
      const msg = err instanceof Error ? err.message : "Admin social auth failed.";
      toastError(msg);
    }
  };

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1.1fr_0.9fr] overflow-x-hidden">
      
      {/* LEFT COLUMN: BRAND SHOWCASE & GRAPHICS */}
      <section className="relative hidden lg:flex flex-col justify-between p-12 bg-slate-50 border-r border-slate-100 overflow-hidden select-none">
        
        {/* Animated Network Node Mesh */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="rgba(30,58,138,0.04)"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            <motion.path
              d="M 100 200 Q 300 150 400 350 T 700 500"
              fill="none"
              stroke="rgba(30,58,138,0.12)"
              strokeWidth="2"
              strokeDasharray="6 6"
              animate={{ strokeDashoffset: [0, -40] }}
              transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
            />
            <motion.path
              d="M 50 450 T 250 550 T 550 350"
              fill="none"
              stroke="rgba(249,115,22,0.08)"
              strokeWidth="2"
              strokeDasharray="5 5"
              animate={{ strokeDashoffset: [0, 30] }}
              transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
            />
          </svg>
        </div>

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <Image
            src="/logo-navbar.png"
            alt="RNOS Logo"
            width={160}
            height={55}
            priority
            className="h-10 w-auto object-contain"
          />
        </div>

        {/* 3D Glass Interactive Showcase Elements */}
        <div className="relative z-10 my-auto flex flex-col items-center justify-center">
          <motion.div
            className="relative w-full max-w-lg p-8 rounded-3xl border border-white bg-white/45 backdrop-blur-xl shadow-[0_32px_64px_rgba(30,58,138,0.06)]"
            style={{
              x: mousePos.x,
              y: mousePos.y,
              transformStyle: "preserve-3d",
              rotateX: -mousePos.y * 0.2,
              rotateY: mousePos.x * 0.2,
            }}
          >
            {/* Visual Header */}
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase text-blue-600 bg-blue-50 border border-blue-100">
                <Zap className="h-3.5 w-3.5 animate-pulse text-blue-600" /> Powered by RNOS
              </span>
              <h1 className="mt-4 text-4xl font-black text-slate-900 tracking-tight leading-none">
                Welcome to RNOS
              </h1>
              <p className="mt-2 text-md font-bold text-slate-500">
                India&apos;s Digital Service Operating System
              </p>
              <p className="mt-4 text-sm text-slate-500 font-medium leading-relaxed max-w-sm">
                A secure, real-time operating framework managing digital service filings, compliance databases, and referral reward ledgers.
              </p>
            </div>

            {/* Interactive Cards Overlay (Sinusoidal Drift) */}
            <div className="mt-10 grid grid-cols-2 gap-4">
              <motion.div
                className="bg-white/80 border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
              >
                <div className="h-8 w-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center mb-3">
                  <Globe className="h-4.5 w-4.5 text-blue-600" />
                </div>
                <h3 className="text-xs font-black text-slate-800">Connected Nodes</h3>
                <p className="text-[10px] text-slate-400 font-medium mt-1">24+ Digital Government & Compliance channels live.</p>
              </motion.div>

              <motion.div
                className="bg-white/80 border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
                animate={{ y: [0, 10, 0] }}
                transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
              >
                <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-3">
                  <Database className="h-4.5 w-4.5 text-emerald-600" />
                </div>
                <h3 className="text-xs font-black text-slate-800">Direct Ledger</h3>
                <p className="text-[10px] text-slate-400 font-medium mt-1">Recalculated reward wallet balances synced instantly.</p>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Footer Trust Badges */}
        <div className="relative z-10 border-t border-slate-200/50 pt-8 grid grid-cols-2 gap-y-4 gap-x-6">
          {[
            { label: "Secure Authentication", desc: "Enterprise RLS controls" },
            { label: "Real-Time Tracking", desc: "Cron worker updates" },
            { label: "Digital Service Network", desc: "Seamless compliance filing" },
            { label: "Enterprise Security", desc: "Encrypted direct sessions" },
          ].map((badge) => (
            <div key={badge.label} className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4.5 w-4.5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-extrabold text-slate-800 leading-tight">{badge.label}</h4>
                <p className="text-[10px] font-semibold text-slate-400 leading-tight mt-0.5">{badge.desc}</p>
              </div>
            </div>
          ))}
        </div>

      </section>

      {/* RIGHT COLUMN: LOGIN TABS & FORMS */}
      <section className="flex flex-col justify-center px-6 py-12 sm:px-16 lg:px-20 bg-white min-h-screen relative z-10">
        
        {/* Mobile Header Branding */}
        <div className="lg:hidden text-center mb-10">
          <Image
            src="/logo-navbar.png"
            alt="RNOS Logo"
            width={180}
            height={60}
            priority
            className="h-10 w-auto object-contain mx-auto"
          />
          <h2 className="mt-4 text-xl font-bold text-slate-900">Welcome to RNOS</h2>
          <p className="text-xs text-slate-500 mt-1">India&apos;s Digital Service Operating System</p>
        </div>

        <div className="w-full max-w-[430px] mx-auto space-y-8">
          
          {/* Headline for form screen */}
          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-black tracking-tight text-slate-950">
              Access the System
            </h2>
            <p className="text-sm text-slate-500 font-medium mt-1.5">
              Select your workspace role to log in
            </p>
          </div>

          {/* Premium Tab Bar redone with Framer Motion active highlight */}
          <div className="flex rounded-xl bg-slate-100 p-1 relative z-0" role="tablist">
            {[
              { id: "user", label: "User Login" },
              { id: "partner", label: "Partner Workspace" },
              { id: "ops", label: "Operations" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    setActiveTab(tab.id as AuthTab);
                    setFormMessage(null);
                  }}
                  className={`relative flex-1 py-2 text-xs font-bold transition-colors duration-150 rounded-lg cursor-pointer ${
                    isActive ? "text-blue-700 font-extrabold" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeRoleTab"
                      className="absolute inset-0 bg-white rounded-lg shadow-sm border border-slate-200/50 -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* FORM CARD TRANSITIONS */}
          <AnimatePresence mode="wait">
            {activeTab === "user" && (
              <motion.div
                key="user-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                
                {/* Form Mode Selector: Login vs Sign Up */}
                <div className="flex border-b border-slate-100 pb-1 gap-5">
                  {(["login", "signup"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setUserMode(mode);
                        setFormMessage(null);
                      }}
                      className={`pb-2 text-xs font-extrabold tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
                        userMode === mode
                          ? "border-blue-600 text-blue-700"
                          : "border-transparent text-slate-400 hover:text-slate-700"
                      }`}
                    >
                      {mode === "login" ? "Sign In" : "Register"}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleCustomerSubmit} className="space-y-4">
                  <AnimatePresence initial={false}>
                    {userMode === "signup" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden space-y-4"
                      >
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-600">Full Name</label>
                          <div className="relative">
                            <UserRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            <Input
                              name="name"
                              type="text"
                              required
                              placeholder="Enter your name"
                              className="h-11 bg-white pl-10 rounded-xl"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      <Input
                        name="email"
                        type="email"
                        required
                        placeholder="yourname@gmail.com"
                        className="h-11 bg-white pl-10 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-600">Password</label>
                      {userMode === "login" && (
                        <Link href="/forgot-password" className="text-[11px] font-bold text-blue-600 hover:underline">
                          Forgot Password?
                        </Link>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      <Input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="Minimum 6 characters"
                        className="h-11 bg-white pl-10 pr-10 rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <AnimatePresence initial={false}>
                    {userMode === "signup" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden space-y-4"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-600">Mobile</label>
                            <div className="relative">
                              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                              <Input
                                name="mobile"
                                type="tel"
                                maxLength={10}
                                value={mobile}
                                onChange={(e) => setMobile(normalizeMobile(e.target.value))}
                                required
                                placeholder="10 digit number"
                                className="h-11 bg-white pl-10 rounded-xl"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-600">PIN Code</label>
                            <div className="relative">
                              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                              <Input
                                name="pincode"
                                type="text"
                                maxLength={6}
                                value={pincode}
                                onChange={(e) => {
                                  setPincode(normalizePincode(e.target.value));
                                  setCity("");
                                  setDistrict("");
                                  setState("");
                                  setPinMessage("");
                                }}
                                required
                                placeholder="6 digit code"
                                className="h-11 bg-white pl-10 pr-10 rounded-xl"
                              />
                              {pinLookupPending && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                  <ButtonSpinner className="h-3.5 w-3.5 text-blue-700" />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {pinMessage && (
                          <div className={`text-[10px] font-bold ${manualLocation ? "text-orange-600" : "text-emerald-600"}`}>
                            {pinMessage}
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-600">City</label>
                            <Input
                              name="city"
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                              readOnly={!manualLocation && Boolean(city)}
                              required
                              placeholder="City"
                              className="h-11 bg-white rounded-xl text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-600">District</label>
                            <Input
                              name="district"
                              value={district}
                              onChange={(e) => setDistrict(e.target.value)}
                              readOnly={!manualLocation && Boolean(district)}
                              required
                              placeholder="District"
                              className="h-11 bg-white rounded-xl text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-600">State</label>
                            <Input
                              name="state"
                              value={state}
                              onChange={(e) => setState(e.target.value)}
                              readOnly={!manualLocation && Boolean(state)}
                              required
                              placeholder="State"
                              className="h-11 bg-white rounded-xl text-xs"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-600">Referral Code (Optional)</label>
                          <div className="relative">
                            <Gift className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            <Input
                              name="referralCode"
                              value={referralCode}
                              onChange={(e) => setReferralCode(e.target.value.toUpperCase().slice(0, 10))}
                              placeholder="REFERRALCODE"
                              className="h-11 bg-white pl-10 font-mono uppercase rounded-xl"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {formMessage && (
                    <div className={`p-3 rounded-2xl text-xs font-bold ${
                      formMessage.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"
                    }`}>
                      {formMessage.text}
                    </div>
                  )}

                  <FormSubmitButton
                    loading={isPending}
                    loadingText={userMode === "signup" ? "Signing up..." : "Signing in..."}
                    className="w-full h-11 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold mt-2 shadow-sm"
                  >
                    {userMode === "signup" ? "Create Free Account" : "Sign In with Email"}
                  </FormSubmitButton>
                </form>

                {/* Social Login Section */}
                {!oauthProvider && (
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <p className="text-[10px] text-center font-bold text-slate-400 uppercase tracking-widest">
                      Or continue with
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => userMode === "signup" ? setOAuthProvider("google") : void handleOAuthLogin("google")}
                        className="h-11 rounded-xl border border-slate-200 bg-white text-slate-800 font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                      >
                        {isGooglePending ? <ButtonSpinner className="h-4 w-4 text-blue-700" /> : <GoogleIcon />}
                        <span className="text-xs">Google</span>
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => userMode === "signup" ? setOAuthProvider("facebook") : void handleOAuthLogin("facebook")}
                        className="h-11 rounded-xl border border-slate-200 bg-white text-slate-800 font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                      >
                        {isFacebookPending ? <ButtonSpinner className="h-4 w-4 text-blue-700" /> : <FacebookIcon />}
                        <span className="text-xs">Facebook</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* OAuth Registration Panel details */}
                {oauthProvider && (
                  <motion.section
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-blue-100 bg-blue-50/50 p-5 rounded-2xl space-y-4"
                  >
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase text-blue-700 tracking-wider">Social Signup Info</span>
                        <button
                          type="button"
                          onClick={() => setOAuthProvider(null)}
                          className="text-[10px] font-bold text-slate-500 hover:text-slate-850"
                        >
                          Cancel
                        </button>
                      </div>
                      <p className="text-xs text-slate-550 mt-1 leading-tight">We need a mobile and pincode to prepare your reward wallet.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-650">Mobile</label>
                        <Input
                          type="tel"
                          maxLength={10}
                          value={mobile}
                          onChange={(e) => setMobile(normalizeMobile(e.target.value))}
                          placeholder="Mobile number"
                          className="h-11 bg-white rounded-xl text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-650">PIN Code</label>
                        <Input
                          type="text"
                          maxLength={6}
                          value={pincode}
                          onChange={(e) => {
                            setPincode(normalizePincode(e.target.value));
                            setCity("");
                            setDistrict("");
                            setState("");
                            setPinMessage("");
                          }}
                          placeholder="6 digits"
                          className="h-11 bg-white rounded-xl text-xs"
                        />
                      </div>
                    </div>

                    <Button
                      type="button"
                      disabled={!hasVerifiedOAuthDetails || isPending || isGooglePending || isFacebookPending}
                      onClick={() => void handleOAuthLogin(oauthProvider, true)}
                      className="w-full h-11 bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-800"
                    >
                      {isGooglePending || isFacebookPending ? <ButtonSpinner className="h-4 w-4" /> : null}
                      Continue with {oauthProvider === "google" ? "Google" : "Facebook"}
                    </Button>
                  </motion.section>
                )}

              </motion.div>
            )}

            {activeTab === "partner" && (
              <motion.div
                key="partner-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                
                {/* Sub toggle for Agency Partner / Agent */}
                <div className="flex border-b border-slate-100 pb-1 gap-5">
                  {[
                    { id: "ap", label: "Agency Partner" },
                    { id: "agent", label: "Agent Console" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPartnerType(p.id as PartnerType);
                        setFormMessage(null);
                      }}
                      className={`pb-2 text-xs font-extrabold tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
                        partnerType === p.id
                          ? "border-blue-600 text-blue-700"
                          : "border-transparent text-slate-400 hover:text-slate-700"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <form onSubmit={handlePartnerSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600">
                      {partnerType === "ap" ? "Email Address" : "Agent Code / Email"}
                    </label>
                    <div className="relative">
                      {partnerType === "ap" ? (
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      ) : (
                        <UserRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      )}
                      <Input
                        name="identifier"
                        type="text"
                        required
                        placeholder={partnerType === "ap" ? "partner@rnos.in" : "AGNT1024 or agent@rnos.in"}
                        className="h-11 bg-white pl-10 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      <Input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="Enter password"
                        className="h-11 bg-white pl-10 pr-10 rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {formMessage && (
                    <div className={`p-3 rounded-2xl text-xs font-bold ${
                      formMessage.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"
                    }`}>
                      {formMessage.text}
                    </div>
                  )}

                  <FormSubmitButton
                    loading={isPending || apTransitionPending}
                    loadingText="Signing in to Workspace..."
                    className="w-full h-11 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    Open Partner Dashboard
                  </FormSubmitButton>
                </form>

                <div className="flex flex-col gap-2 pt-3 border-t border-slate-100 text-center">
                  <span className="text-[11px] font-semibold text-slate-400">
                    Agent credentials are assigned by administration only.
                  </span>
                  <Link href="/services" className="text-[11px] font-black text-blue-600 hover:underline">
                    Request Partner Access
                  </Link>
                </div>

              </motion.div>
            )}

            {activeTab === "ops" && (
              <motion.div
                key="ops-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                
                <div className="rounded-2xl border border-orange-200/50 bg-orange-50/50 p-4">
                  <div className="flex gap-2">
                    <ShieldCheck className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black text-orange-800 uppercase tracking-wide">Operations Console</p>
                      <p className="text-[11px] font-medium text-slate-500 mt-1 leading-tight">Restricted to RNOS administrative staff and executive officers.</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleAdminSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600">Administrative Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      <Input
                        name="email"
                        type="email"
                        required
                        placeholder="admin@rnos.in"
                        className="h-11 bg-white pl-10 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600">Security Key / Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      <Input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="Enter master password"
                        className="h-11 bg-white pl-10 pr-10 rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {formMessage && (
                    <div className={`p-3 rounded-2xl text-xs font-bold ${
                      formMessage.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"
                    }`}>
                      {formMessage.text}
                    </div>
                  )}

                  <FormSubmitButton
                    loading={isPending}
                    loadingText="Opening Console..."
                    className="w-full h-11 bg-slate-900 hover:bg-slate-950 text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    Open Console
                  </FormSubmitButton>
                </form>

                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending}
                    onClick={handleAdminGoogleLogin}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white text-slate-800 font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <GoogleIcon />
                    <span className="text-xs">Staff Sign In with Google</span>
                  </Button>
                </div>

              </motion.div>
            )}
          </AnimatePresence>

          {/* Trust Footnote */}
          <p className="text-[10px] text-center text-slate-400 font-semibold flex items-center justify-center gap-1.5 pt-4">
            <Lock className="h-3.5 w-3.5 text-slate-400" />
            Direct secure session &bull; ISO 27001 Certified &bull; Encrypted RLS
          </p>

        </div>

      </section>

    </div>
  );
}
