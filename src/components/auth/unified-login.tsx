"use client";

import { type FormEvent, useEffect, useState, useTransition, forwardRef } from "react";
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
  Activity,
  Fingerprint,
  Cpu,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { GoogleIcon } from "@/components/auth/google-icon";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { ButtonSpinner, FormSubmitButton } from "@/components/ui/loading";
import {
  indianMobilePattern,
  indianPincodePattern,
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

// 1. Premium Custom Floating Label Input with Validation States
interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  touched?: boolean;
  isValid?: boolean;
}

const FloatingInput = forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ label, icon, rightElement, touched, isValid, className, id, placeholder = " ", ...props }, ref) => {
    // Determine validation color style classes
    const statusClass = touched
      ? isValid
        ? "border-emerald-200 focus:border-emerald-500 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.06)] bg-emerald-50/5"
        : "border-red-200 focus:border-red-500 focus:shadow-[0_0_0_4px_rgba(239,68,68,0.06)] bg-red-50/5"
      : "border-slate-200 focus:border-blue-500 focus:shadow-[0_0_0_4px_rgba(37,99,235,0.06)] bg-white";

    return (
      <div className="relative w-full">
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-4 text-slate-400 pointer-events-none transition-colors duration-150 peer-focus-within:text-blue-500">
              {icon}
            </div>
          )}
          
          <input
            ref={ref}
            id={id}
            placeholder={placeholder}
            className={`peer w-full rounded-2xl border text-sm text-slate-900 outline-none transition-all h-12 pt-5 pb-1 ${
              icon ? "pl-11" : "pl-4"
            } ${rightElement ? "pr-11" : "pr-4"} ${statusClass} ${className || ""}`}
            {...props}
          />
          
          <label
            htmlFor={id}
            className={`absolute left-4 text-slate-400 pointer-events-none transition-all duration-150 origin-left select-none top-1.5 text-[10px] ${
              icon ? "left-11" : "left-4"
            } peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-slate-400 peer-focus:top-1.5 peer-focus:text-[10px] ${
              touched && isValid
                ? "peer-focus:text-emerald-500 text-emerald-600/80"
                : touched && !isValid
                ? "peer-focus:text-red-500 text-red-500/80"
                : "peer-focus:text-blue-500"
            }`}
          >
            {label}
          </label>
          
          {rightElement && (
            <div className="absolute right-3.5 flex items-center justify-center">
              {rightElement}
            </div>
          )}
        </div>
      </div>
    );
  }
);
FloatingInput.displayName = "FloatingInput";

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
  const [apTransitionPending, startAPTransition] = useTransition();

  // Inputs & Validation
  const [showPassword, setShowPassword] = useState(false);
  const [formMessage, setFormMessage] = useState<FormMessage | null>(null);

  // Form value states for real-time validation
  const [emailVal, setEmailVal] = useState("");
  const [touchedEmail, setTouchedEmail] = useState(false);
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal);

  const [passwordVal, setPasswordVal] = useState("");
  const [touchedPassword, setTouchedPassword] = useState(false);
  const isPasswordValid = passwordVal.length >= 6;

  const [nameVal, setNameVal] = useState("");
  const [touchedName, setTouchedName] = useState(false);
  const isNameValid = nameVal.trim().length > 0;

  // Customer Signup Location Fields
  const [pincode, setPincode] = useState("");
  const [touchedPincode, setTouchedPincode] = useState(false);
  const isPinValid = indianPincodePattern.test(pincode);

  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("");
  const [pinMessage, setPinMessage] = useState("");
  const [pinLookupPending, setPinLookupPending] = useState(false);
  const [manualLocation, setManualLocation] = useState(false);
  const [referralCode, setReferralCode] = useState(propsReferralCode);
  
  const [mobile, setMobile] = useState("");
  const [touchedMobile, setTouchedMobile] = useState(false);
  const isMobileValid = indianMobilePattern.test(mobile);

  const [oauthProvider, setOAuthProvider] = useState<"google" | null>(null);

  // Network node coordinate definitions for left visual container
  const nodes = [
    { id: 1, cx: "25%", cy: "25%", label: "Identity Hub", icon: <Fingerprint className="h-3 w-3 text-blue-500" /> },
    { id: 2, cx: "75%", cy: "20%", label: "API Gateway", icon: <Cpu className="h-3 w-3 text-indigo-500" /> },
    { id: 3, cx: "50%", cy: "45%", label: "Direct Ledger DB", icon: <Database className="h-3 w-3 text-emerald-500" /> },
    { id: 4, cx: "20%", cy: "70%", label: "Compliance Engine", icon: <Globe className="h-3 w-3 text-cyan-500" /> },
    { id: 5, cx: "80%", cy: "65%", label: "Wallet Router", icon: <Zap className="h-3 w-3 text-orange-500" /> },
    { id: 6, cx: "45%", cy: "80%", label: "Security Vault", icon: <Lock className="h-3 w-3 text-rose-500" /> },
  ];

  const nodeLinks = [
    { from: 1, to: 3 },
    { from: 2, to: 3 },
    { from: 1, to: 2 },
    { from: 3, to: 4 },
    { from: 3, to: 5 },
    { from: 4, to: 6 },
    { from: 5, to: 6 },
  ];

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

  // Sync PIN code automatically to resolve location lookup
  useEffect(() => {
    if (userMode !== "signup" || pincode.length !== 6) return;

    let active = true;

    async function lookupPin() {
      setPinLookupPending(true);
      setPinMessage("Resolving city and state...");

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
              "Could not resolve PIN. Enter details manually."
          );
          return;
        }

        setCity(result.city);
        setDistrict(result.district);
        setState(result.state);
        setManualLocation(false);
        setPinMessage("Resolved successfully!");
      } catch {
        if (active) {
          setManualLocation(true);
          setPinMessage("Lookup failed. Please fill location details.");
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

  // Google OAuth Launch
  const openOAuthProvider = async () => {
    const supabase = createClient();
    if (!supabase) throw new Error("Supabase is not configured.");

    const redirectTo = `${getOAuthCallbackUrl()}?next=${encodeURIComponent(
      getSafeRedirect()
    )}${referralCode ? `&ref=${encodeURIComponent(referralCode)}` : ""}`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
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

    trackLogin("google");
    window.location.assign(data.url);
  };

  const handleOAuthLogin = async (requiresSignupDetails = false) => {
    if (isPending || isGooglePending) return;
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

    setIsGooglePending(true);

    try {
      if (requiresSignupDetails) {
        const preflightRes = await fetch("/api/auth/oauth/customer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: "google",
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

      await openOAuthProvider();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "OAuth authentication failed.";
      setFormMessage({ type: "error", text: errMsg });
      toastError(errMsg);
      setIsGooglePending(false);
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
    if (isPending || isGooglePending) return;
    setFormMessage(null);

    if (!isEmailValid) {
      setFormMessage({ type: "error", text: "Please enter a valid email address." });
      return;
    }

    if (!isPasswordValid) {
      setFormMessage({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }

    if (userMode === "signup") {
      const formMobile = normalizeMobile(mobile);
      const formPincode = normalizePincode(pincode);

      if (!isNameValid) {
        setFormMessage({ type: "error", text: "Name is required." });
        return;
      }
      if (!isMobileValid) {
        setFormMessage({ type: "error", text: "Enter a valid 10-digit mobile number." });
        return;
      }
      if (!isPinValid) {
        setFormMessage({ type: "error", text: "Enter a valid 6-digit PIN code." });
        return;
      }
      if (!city.trim() || !state.trim()) {
        setFormMessage({ type: "error", text: "City and State details are required." });
        return;
      }

      setIsPending(true);
      try {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: nameVal,
            mobile: formMobile,
            email: emailVal,
            password: passwordVal,
            pincode: formPincode,
            city: city.trim(),
            state: state.trim(),
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

      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailVal,
        password: passwordVal,
      });
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
  const [partnerIdentifier, setPartnerIdentifier] = useState("");
  const [touchedPartnerId, setTouchedPartnerId] = useState(false);
  const isPartnerIdValid = partnerIdentifier.trim().length > 0;

  const [partnerPassword, setPartnerPassword] = useState("");
  const [touchedPartnerPassword, setTouchedPartnerPassword] = useState(false);
  const isPartnerPasswordValid = partnerPassword.length >= 6;

  const handlePartnerSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending || apTransitionPending) return;
    setFormMessage(null);
    setIsPending(true);

    if (!isPartnerIdValid || !isPartnerPasswordValid) {
      setFormMessage({ type: "error", text: "Please fill credentials." });
      setIsPending(false);
      return;
    }

    if (partnerType === "agent") {
      try {
        const response = await fetch("/api/auth/agent-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: partnerIdentifier, password: partnerPassword }),
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
      startAPTransition(async () => {
        try {
          const supabase = createClient();
          if (!supabase) throw new Error("Supabase database not linked.");

          const { error: authError } = await supabase.auth.signInWithPassword({
            email: partnerIdentifier.toLowerCase(),
            password: partnerPassword,
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
  const [opsEmail, setOpsEmail] = useState("");
  const [touchedOpsEmail, setTouchedOpsEmail] = useState(false);
  const isOpsEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(opsEmail);

  const [opsPassword, setOpsPassword] = useState("");
  const [touchedOpsPassword, setTouchedOpsPassword] = useState(false);
  const isOpsPasswordValid = opsPassword.length >= 6;

  const handleAdminSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) return;
    setFormMessage(null);
    setIsPending(true);

    if (!isOpsEmailValid || !isOpsPasswordValid) {
      setFormMessage({ type: "error", text: "Please enter valid administrative credentials." });
      setIsPending(false);
      return;
    }

    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Supabase client failed initialization.");

      const { error } = await supabase.auth.signInWithPassword({
        email: opsEmail,
        password: opsPassword,
      });
      if (error) throw error;

      trackLogin("admin_email");
      toastSuccess("Operations console authenticated.");
      window.location.assign("/login");
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
    <div className="grid min-h-screen bg-white lg:grid-cols-5 overflow-hidden select-none">
      
      {/* LEFT COLUMN: 60% Width, BRAND SHOWCASE (Desktop Only) */}
      <section className="col-span-3 relative hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-blue-50/40 via-slate-50/10 to-indigo-50/20 border-r border-slate-100/80 overflow-hidden">
        
        {/* Subtle grid backdrop */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.25]">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="mesh-pattern"
                width="32"
                height="32"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 32 0 L 0 0 0 32"
                  fill="none"
                  stroke="rgba(30,58,138,0.06)"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#mesh-pattern)" />
          </svg>
        </div>

        {/* Logo at the top */}
        <div className="relative z-10 flex items-center">
          <Image
            src="/logo-navbar.png"
            alt="RNOS Logo"
            width={160}
            height={55}
            priority
            className="h-10 w-auto object-contain"
          />
        </div>

        {/* Animated Service Connection Graph centerpiece */}
        <div className="relative z-10 my-auto flex flex-col items-center">
          
          <div className="w-full max-w-lg aspect-[5/4] relative bg-white/45 border border-white/80 backdrop-blur-xl rounded-3xl shadow-[0_12px_40px_rgba(8,112,184,0.03)] p-6 flex flex-col justify-between">
            
            {/* Header info inside visualization */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-100/50">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-blue-600 bg-blue-50/50 border border-blue-100/40">
                  <Activity className="h-3 w-3 animate-pulse" /> SYSTEM READY
                </span>
                <h3 className="text-sm font-bold text-slate-800 mt-1">Service Node Map</h3>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-slate-400">LATENCY &lt; 8ms</span>
              </div>
            </div>

            {/* SVG Network Map */}
            <div className="flex-1 relative my-4">
              <svg className="w-full h-full absolute inset-0 pointer-events-none" viewBox="0 0 500 400">
                {/* Node connection lines */}
                {nodeLinks.map((link, idx) => {
                  const fromNode = nodes.find(n => n.id === link.from);
                  const toNode = nodes.find(n => n.id === link.to);
                  if (!fromNode || !toNode) return null;
                  return (
                    <g key={idx}>
                      <line
                        x1={fromNode.cx}
                        y1={fromNode.cy}
                        x2={toNode.cx}
                        y2={toNode.cy}
                        stroke="rgba(99,102,241,0.08)"
                        strokeWidth="1.5"
                      />
                      <motion.line
                        x1={fromNode.cx}
                        y1={fromNode.cy}
                        x2={toNode.cx}
                        y2={toNode.cy}
                        stroke="rgba(37,99,235,0.2)"
                        strokeWidth="1.5"
                        strokeDasharray="8 12"
                        animate={{ strokeDashoffset: [0, -40] }}
                        transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
                      />
                    </g>
                  );
                })}

                {/* Floating active particles */}
                {[...Array(6)].map((_, i) => (
                  <motion.circle
                    key={i}
                    r={2.5}
                    fill="#3b82f6"
                    initial={{
                      cx: `${20 + Math.random() * 60}%`,
                      cy: `${20 + Math.random() * 60}%`,
                      opacity: 0,
                    }}
                    animate={{
                      cx: [`${20 + Math.random() * 60}%`, `${30 + Math.random() * 40}%`],
                      cy: [`${20 + Math.random() * 60}%`, `${30 + Math.random() * 40}%`],
                      opacity: [0, 0.7, 0],
                    }}
                    transition={{
                      duration: 8 + i * 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </svg>

              {/* Node Overlay badges */}
              {nodes.map(node => (
                <motion.div
                  key={node.id}
                  style={{ left: node.cx, top: node.cy }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-white/95 shadow-sm border border-slate-100 py-1.5 px-2.5 rounded-full select-none"
                  whileHover={{ scale: 1.05, borderColor: "rgba(37,99,235,0.3)" }}
                  animate={{ y: [0, -3, 3, 0] }}
                  transition={{
                    repeat: Infinity,
                    duration: 4 + node.id,
                    ease: "easeInOut",
                  }}
                >
                  {node.icon}
                  <span className="text-[9px] font-bold text-slate-700 whitespace-nowrap">{node.label}</span>
                </motion.div>
              ))}
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100/50">
              <div className="text-center p-2 rounded-xl bg-slate-50/40 border border-slate-100/20">
                <span className="block text-xs font-black text-slate-800">99.99%</span>
                <span className="text-[9px] font-semibold text-slate-400">Core SLA</span>
              </div>
              <div className="text-center p-2 rounded-xl bg-slate-50/40 border border-slate-100/20">
                <span className="block text-xs font-black text-slate-800">1.5M+</span>
                <span className="text-[9px] font-semibold text-slate-400">Daily Trans</span>
              </div>
              <div className="text-center p-2 rounded-xl bg-slate-50/40 border border-slate-100/20">
                <span className="block text-xs font-black text-slate-800">12+</span>
                <span className="text-[9px] font-semibold text-slate-400">Compliance Nodes</span>
              </div>
            </div>

          </div>

          <div className="mt-8 text-center max-w-sm">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
              Welcome to RNOS
            </h1>
            <p className="mt-2 text-xs font-semibold text-slate-400">
              India&apos;s Digital Service Operating System
            </p>
          </div>
        </div>

        {/* Bottom trust section */}
        <div className="relative z-10 border-t border-slate-200/40 pt-6 grid grid-cols-4 gap-4">
          {[
            { label: "Secure Auth", desc: "Access tokens" },
            { label: "ISO Certified", desc: "IEC 27001 standard" },
            { label: "E2E Encryption", desc: "Data protection" },
            { label: "Real-Time Processing", desc: "Instant ledgers" },
          ].map((badge) => (
            <div key={badge.label} className="text-left">
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-slate-800">
                <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                {badge.label}
              </span>
              <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">{badge.desc}</p>
            </div>
          ))}
        </div>

      </section>

      {/* RIGHT COLUMN: 40% Width, AUTHENTICATION PANEL (Centered Vertically) */}
      <section className="col-span-1 lg:col-span-2 min-h-[100dvh] flex flex-col justify-between py-6 px-4 md:px-12 bg-white relative z-10">
        
        {/* Mobile Header (Hidden on Desktop) */}
        <div className="lg:hidden text-center py-2">
          <Image
            src="/logo-navbar.png"
            alt="RNOS Logo"
            width={120}
            height={40}
            priority
            className="h-8 w-auto object-contain mx-auto"
          />
          <h2 className="mt-2 text-base font-black text-slate-900">Welcome to RNOS</h2>
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">India&apos;s Digital Service Operating System</p>
        </div>

        {/* Center Auth Card */}
        <div className="my-auto w-full max-w-[480px] mx-auto space-y-6">
          
          {/* Headline (Compact layout) */}
          <div className="hidden lg:block text-left">
            <h2 className="text-xl font-black tracking-tight text-slate-950">
              System Gateway
            </h2>
            <p className="text-xs text-slate-400 font-bold mt-1">
              Select console tab to log into your work node
            </p>
          </div>

          {/* Premium Tab Bar Indicator */}
          <div className="flex rounded-xl bg-slate-100/80 p-1 relative z-0" role="tablist">
            {[
              { id: "user", label: "User Login" },
              { id: "partner", label: "Partner Workspace" },
              { id: "ops", label: "Operations Console" },
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
                  className={`relative flex-1 py-2 text-[10px] md:text-xs font-black tracking-tight transition-colors duration-150 rounded-lg cursor-pointer ${
                    isActive ? "text-blue-700" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeRoleTab"
                      className="absolute inset-0 bg-white rounded-lg shadow-sm border border-slate-200/50 -z-10"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Form glass container card */}
          <div className="bg-white/80 border border-slate-100/60 backdrop-blur-xl shadow-[0_20px_50px_rgba(8,112,184,0.04)] rounded-[24px] p-6 md:p-8 space-y-5">
            
            <AnimatePresence mode="wait">
              {activeTab === "user" && (
                <motion.div
                  key="user-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4"
                >
                  
                  {/* Mode Toggles: Sign In vs Register */}
                  <div className="flex border-b border-slate-100 pb-1.5 gap-4">
                    {(["login", "signup"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          setUserMode(mode);
                          setFormMessage(null);
                        }}
                        className={`pb-1.5 text-xs font-extrabold tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
                          userMode === mode
                            ? "border-blue-600 text-blue-700"
                            : "border-transparent text-slate-400 hover:text-slate-700"
                        }`}
                      >
                        {mode === "login" ? "Sign In" : "Register"}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleCustomerSubmit} className="space-y-3">
                    
                    <AnimatePresence initial={false} mode="popLayout">
                      {userMode === "signup" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden"
                        >
                          <FloatingInput
                            label="Full Name"
                            id="signup-name"
                            type="text"
                            required
                            value={nameVal}
                            onChange={(e) => {
                              setNameVal(e.target.value);
                              setTouchedName(true);
                            }}
                            onBlur={() => setTouchedName(true)}
                            touched={touchedName}
                            isValid={isNameValid}
                            icon={<UserRound className="h-4 w-4 text-slate-400" />}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <FloatingInput
                      label="Email Address"
                      id="user-email"
                      type="email"
                      required
                      value={emailVal}
                      onChange={(e) => {
                        setEmailVal(e.target.value);
                        setTouchedEmail(true);
                      }}
                      onBlur={() => setTouchedEmail(true)}
                      touched={touchedEmail}
                      isValid={isEmailValid}
                      icon={<Mail className="h-4 w-4 text-slate-400" />}
                    />

                    <FloatingInput
                      label="Password"
                      id="user-password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={passwordVal}
                      onChange={(e) => {
                        setPasswordVal(e.target.value);
                        setTouchedPassword(true);
                      }}
                      onBlur={() => setTouchedPassword(true)}
                      touched={touchedPassword}
                      isValid={isPasswordValid}
                      icon={<Lock className="h-4 w-4 text-slate-400" />}
                      rightElement={
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-slate-400 hover:text-slate-700 p-1"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      }
                    />

                    {userMode === "login" && (
                      <div className="flex justify-end pt-0.5">
                        <Link href="/forgot-password" className="text-[10px] font-extrabold text-blue-600 hover:underline">
                          Forgot Password?
                        </Link>
                      </div>
                    )}

                    <AnimatePresence initial={false} mode="popLayout">
                      {userMode === "signup" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden space-y-3"
                        >
                          <div className="grid grid-cols-2 gap-3">
                            <FloatingInput
                              label="Mobile Number"
                              id="signup-mobile"
                              type="tel"
                              maxLength={10}
                              value={mobile}
                              onChange={(e) => {
                                setMobile(normalizeMobile(e.target.value));
                                setTouchedMobile(true);
                              }}
                              onBlur={() => setTouchedMobile(true)}
                              touched={touchedMobile}
                              isValid={isMobileValid}
                              icon={<Phone className="h-4 w-4 text-slate-400" />}
                            />

                            <FloatingInput
                              label="PIN Code"
                              id="signup-pincode"
                              type="text"
                              maxLength={6}
                              value={pincode}
                              onChange={(e) => {
                                setPincode(normalizePincode(e.target.value));
                                setTouchedPincode(true);
                                setCity("");
                                setDistrict("");
                                setState("");
                                setPinMessage("");
                              }}
                              onBlur={() => setTouchedPincode(true)}
                              touched={touchedPincode}
                              isValid={isPinValid}
                              icon={<MapPin className="h-4 w-4 text-slate-400" />}
                              rightElement={
                                pinLookupPending ? (
                                  <ButtonSpinner className="h-3.5 w-3.5 text-blue-600" />
                                ) : null
                              }
                            />
                          </div>

                          {pinMessage && (
                            <div className={`text-[10px] font-black tracking-tight ${
                              manualLocation ? "text-amber-600" : "text-emerald-600"
                            }`}>
                              {pinMessage}
                            </div>
                          )}

                          <div className="grid grid-cols-3 gap-2">
                            <div className="relative">
                              <input
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                readOnly={!manualLocation && Boolean(city)}
                                required
                                placeholder="City"
                                className="w-full text-xs rounded-xl border border-slate-200 h-10 px-3 bg-slate-50/50 outline-none focus:border-blue-500 font-semibold"
                              />
                            </div>
                            <div className="relative">
                              <input
                                value={district}
                                onChange={(e) => setDistrict(e.target.value)}
                                readOnly={!manualLocation && Boolean(district)}
                                required
                                placeholder="District"
                                className="w-full text-xs rounded-xl border border-slate-200 h-10 px-3 bg-slate-50/50 outline-none focus:border-blue-500 font-semibold"
                              />
                            </div>
                            <div className="relative">
                              <input
                                value={state}
                                onChange={(e) => setState(e.target.value)}
                                readOnly={!manualLocation && Boolean(state)}
                                required
                                placeholder="State"
                                className="w-full text-xs rounded-xl border border-slate-200 h-10 px-3 bg-slate-50/50 outline-none focus:border-blue-500 font-semibold"
                              />
                            </div>
                          </div>

                          <FloatingInput
                            label="Referral Code (Optional)"
                            id="signup-referral"
                            type="text"
                            value={referralCode}
                            onChange={(e) => setReferralCode(e.target.value.toUpperCase().slice(0, 10))}
                            icon={<Gift className="h-4 w-4 text-slate-400" />}
                            className="font-mono uppercase"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {formMessage && (
                      <div className={`p-3 rounded-2xl text-[11px] font-black tracking-tight leading-tight ${
                        formMessage.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50/50 text-rose-700"
                      }`}>
                        {formMessage.text}
                      </div>
                    )}

                    <FormSubmitButton
                      loading={isPending}
                      loadingText={userMode === "signup" ? "Securing node access..." : "Opening console..."}
                      className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-[0_4px_12px_rgba(37,99,235,0.15)] mt-2"
                    >
                      {userMode === "signup" ? "Create Free Account" : "Sign In with Email"}
                    </FormSubmitButton>
                  </form>

                  {/* Google OAuth Login Section */}
                  {!oauthProvider && (
                    <div className="space-y-3 pt-3 border-t border-slate-100">
                      <p className="text-[9px] text-center font-black text-slate-400 uppercase tracking-widest">
                        Or continue with
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isPending || isGooglePending}
                        onClick={() => userMode === "signup" ? setOAuthProvider("google") : void handleOAuthLogin()}
                        className="w-full h-11 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                      >
                        {isGooglePending ? <ButtonSpinner className="h-4 w-4 text-blue-600" /> : <GoogleIcon />}
                        <span className="text-xs">Google</span>
                      </Button>
                    </div>
                  )}

                  {/* OAuth Details Verification Screen (Signup Details pre-check) */}
                  {oauthProvider && (
                    <motion.section
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="border border-blue-100/50 bg-blue-50/20 p-4 rounded-2xl space-y-3"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black uppercase text-blue-700 tracking-wider">Social Signup Info</span>
                        <button
                          type="button"
                          onClick={() => setOAuthProvider(null)}
                          className="text-[10px] font-black text-slate-400 hover:text-slate-600"
                        >
                          Cancel
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 font-semibold leading-tight">We need a mobile number and PIN to allocate your ledger wallet.</p>

                      <div className="grid grid-cols-2 gap-3">
                        <FloatingInput
                          label="Mobile"
                          id="oauth-mobile"
                          type="tel"
                          maxLength={10}
                          value={mobile}
                          onChange={(e) => {
                            setMobile(normalizeMobile(e.target.value));
                            setTouchedMobile(true);
                          }}
                          onBlur={() => setTouchedMobile(true)}
                          touched={touchedMobile}
                          isValid={isMobileValid}
                          className="text-xs"
                        />
                        <FloatingInput
                          label="PIN Code"
                          id="oauth-pincode"
                          type="text"
                          maxLength={6}
                          value={pincode}
                          onChange={(e) => {
                            setPincode(normalizePincode(e.target.value));
                            setTouchedPincode(true);
                            setCity("");
                            setDistrict("");
                            setState("");
                            setPinMessage("");
                          }}
                          onBlur={() => setTouchedPincode(true)}
                          touched={touchedPincode}
                          isValid={isPinValid}
                          className="text-xs"
                          rightElement={
                            pinLookupPending ? (
                              <ButtonSpinner className="h-3.5 w-3.5 text-blue-600" />
                            ) : null
                          }
                        />
                      </div>

                      <Button
                        type="button"
                        disabled={!hasVerifiedOAuthDetails || isPending || isGooglePending}
                        onClick={() => void handleOAuthLogin(true)}
                        className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                      >
                        {isGooglePending ? <ButtonSpinner className="h-4 w-4" /> : null}
                        Continue with Google
                      </Button>
                    </motion.section>
                  )}

                </motion.div>
              )}

              {activeTab === "partner" && (
                <motion.div
                  key="partner-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4"
                >
                  
                  {/* Partner subtoggle: AP / Agent */}
                  <div className="flex border-b border-slate-100 pb-1.5 gap-4">
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
                        className={`pb-1.5 text-xs font-extrabold tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
                          partnerType === p.id
                            ? "border-blue-600 text-blue-700"
                            : "border-transparent text-slate-400 hover:text-slate-700"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handlePartnerSubmit} className="space-y-3">
                    
                    <FloatingInput
                      label={partnerType === "ap" ? "Email Address" : "Agent Code / Email"}
                      id="partner-id"
                      type="text"
                      required
                      value={partnerIdentifier}
                      onChange={(e) => {
                        setPartnerIdentifier(e.target.value);
                        setTouchedPartnerId(true);
                      }}
                      onBlur={() => setTouchedPartnerId(true)}
                      touched={touchedPartnerId}
                      isValid={isPartnerIdValid}
                      icon={partnerType === "ap" ? (
                        <Mail className="h-4 w-4 text-slate-400" />
                      ) : (
                        <UserRound className="h-4 w-4 text-slate-400" />
                      )}
                    />

                    <FloatingInput
                      label="Password"
                      id="partner-password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={partnerPassword}
                      onChange={(e) => {
                        setPartnerPassword(e.target.value);
                        setTouchedPartnerPassword(true);
                      }}
                      onBlur={() => setTouchedPartnerPassword(true)}
                      touched={touchedPartnerPassword}
                      isValid={isPartnerPasswordValid}
                      icon={<Lock className="h-4 w-4 text-slate-400" />}
                      rightElement={
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-slate-400 hover:text-slate-700 p-1"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      }
                    />

                    {formMessage && (
                      <div className={`p-3 rounded-2xl text-[11px] font-black tracking-tight leading-tight ${
                        formMessage.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50/50 text-rose-700"
                      }`}>
                        {formMessage.text}
                      </div>
                    )}

                    <FormSubmitButton
                      loading={isPending || apTransitionPending}
                      loadingText="Securing workspace connection..."
                      className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-[0_4px_12px_rgba(37,99,235,0.15)]"
                    >
                      Open Partner Dashboard
                    </FormSubmitButton>
                  </form>

                  <div className="pt-2 border-t border-slate-100 text-center">
                    <span className="text-[10px] font-bold text-slate-400">
                      Partner accounts are configured by server administrators only.
                    </span>
                  </div>

                </motion.div>
              )}

              {activeTab === "ops" && (
                <motion.div
                  key="ops-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4"
                >
                  
                  <div className="rounded-2xl border border-amber-200/50 bg-amber-50/20 p-4">
                    <div className="flex gap-2">
                      <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-black text-amber-800 uppercase tracking-wide">Secure Operations Console</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 leading-tight">Access restricted to authorized server staff and administrators.</p>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleAdminSubmit} className="space-y-3">
                    
                    <FloatingInput
                      label="Administrative Email"
                      id="ops-email"
                      type="email"
                      required
                      value={opsEmail}
                      onChange={(e) => {
                        setOpsEmail(e.target.value);
                        setTouchedOpsEmail(true);
                      }}
                      onBlur={() => setTouchedOpsEmail(true)}
                      touched={touchedOpsEmail}
                      isValid={isOpsEmailValid}
                      icon={<Mail className="h-4 w-4 text-slate-400" />}
                    />

                    <FloatingInput
                      label="Security Key"
                      id="ops-password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={opsPassword}
                      onChange={(e) => {
                        setOpsPassword(e.target.value);
                        setTouchedOpsPassword(true);
                      }}
                      onBlur={() => setTouchedOpsPassword(true)}
                      touched={touchedOpsPassword}
                      isValid={isOpsPasswordValid}
                      icon={<Lock className="h-4 w-4 text-slate-400" />}
                      rightElement={
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-slate-400 hover:text-slate-700 p-1"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      }
                    />

                    {formMessage && (
                      <div className={`p-3 rounded-2xl text-[11px] font-black tracking-tight leading-tight ${
                        formMessage.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50/50 text-rose-700"
                      }`}>
                        {formMessage.text}
                      </div>
                    )}

                    <FormSubmitButton
                      loading={isPending}
                      loadingText="Unlocking console access..."
                      className="w-full h-11 bg-slate-900 hover:bg-slate-950 text-white rounded-xl text-xs font-black shadow-md mt-1"
                    >
                      Open Administrative Console
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

          </div>

          {/* Secure Trust Footer indicator */}
          <p className="text-[10px] text-center text-slate-400 font-bold flex items-center justify-center gap-1.5 pt-2">
            <Lock className="h-3.5 w-3.5 text-slate-350" />
            ISO 27001 Infrastructure &bull; Direct Secure Gateway
          </p>

        </div>

        {/* Outer Footer copyright */}
        <div className="text-center py-2">
          <p className="text-[10px] font-bold text-slate-400">
            &copy; {new Date().getFullYear()} RNOS Service Operating System. All rights reserved.
          </p>
        </div>

      </section>

    </div>
  );
}
