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
  Lock,
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

// Apple Premium Floating Label Input (h-58px, rounded-20px)
interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  touched?: boolean;
  isValid?: boolean;
}

const FloatingInput = forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ label, icon, rightElement, touched, isValid, className, id, placeholder = " ", ...props }, ref) => {
    const statusClass = touched
      ? isValid
        ? "border-emerald-200 focus:border-emerald-500 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.10)] bg-emerald-50/5"
        : "border-red-200 focus:border-red-500 focus:shadow-[0_0_0_4px_rgba(239,68,68,0.10)] bg-red-50/5"
      : "border-slate-200/80 focus:border-[#2563EB] focus:shadow-[0_0_0_4px_rgba(37,99,235,0.10)] bg-white";

    return (
      <div className="relative w-full">
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-4.5 text-slate-400 pointer-events-none transition-colors duration-150 peer-focus-within:text-blue-500">
              {icon}
            </div>
          )}
          
          <input
            ref={ref}
            id={id}
            placeholder={placeholder}
            className={`peer w-full rounded-[20px] border text-base text-[#0F172A] outline-none transition-all duration-200 ease-in-out h-[58px] pt-[22px] pb-[6px] ${
              icon ? "pl-12" : "pl-4.5"
            } ${rightElement ? "pr-12" : "pr-4.5"} ${statusClass} ${className || ""}`}
            style={{ textTransform: props.type === "email" || id?.includes("email") ? "none" : undefined, ...props.style }}
            {...props}
          />
          
          <label
            htmlFor={id}
            className={`absolute pointer-events-none transition-all duration-150 origin-left select-none text-[#64748B] top-[8px] text-[10px] ${
              icon ? "left-12" : "left-4.5"
            } peer-placeholder-shown:top-[18px] peer-placeholder-shown:text-base peer-placeholder-shown:text-[#64748B] peer-focus:top-[8px] peer-focus:text-[10px] ${
              touched && isValid
                ? "peer-focus:text-emerald-500 text-emerald-600/85"
                : touched && !isValid
                ? "peer-focus:text-red-500 text-red-500/85"
                : "peer-focus:text-[#2563EB]"
            }`}
          >
            {label}
          </label>
          
          {rightElement && (
            <div className="absolute right-4 flex items-center justify-center">
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
  
  // Tab states and form configuration states
  const [activeTab, setActiveTab] = useState<AuthTab>(initialTab);
  const [userMode, setUserMode] = useState<AuthMode>(initialMode);

  // Loading states
  const [isPending, setIsPending] = useState(false);
  const [isGooglePending, setIsGooglePending] = useState(false);
  const [apTransitionPending, startAPTransition] = useTransition();

  // Inputs and validations
  const [showPassword, setShowPassword] = useState(false);
  const [formMessage, setFormMessage] = useState<FormMessage | null>(null);

  // Form value states for real-time validation (Customer)
  const [emailVal, setEmailVal] = useState("");
  const [touchedEmail, setTouchedEmail] = useState(false);
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal);

  const [passwordVal, setPasswordVal] = useState("");
  const [touchedPassword, setTouchedPassword] = useState(false);
  const isPasswordValid = passwordVal.length >= 6;

  const [nameVal, setNameVal] = useState("");
  const [touchedName, setTouchedName] = useState(false);
  const isNameValid = nameVal.trim().length > 0;

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

  useEffect(() => {
    if (initialMessage) {
      setFormMessage({ type: "success", text: initialMessage });
    }
  }, [initialMessage]);

  // Sync Referral Code params from URL
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

  // PIN code location sync
  useEffect(() => {
    if (userMode !== "signup" || pincode.length !== 6) return;

    let active = true;

    async function lookupPin() {
      setPinLookupPending(true);
      setPinMessage("Resolving location...");

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

  // Google OAuth flow
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

  // Submit flow (Customer User)
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

    // Sign in flow
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

  // Form value states for real-time validation (Partner Workspace)
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

    const identifier = partnerIdentifier.trim();
    const password = partnerPassword;

    // Try Agent Login first
    try {
      const response = await fetch("/api/auth/agent-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ identifier, password }),
      });
      const result = await response.json().catch(() => ({}));

      if (response.ok) {
        trackLogin("agent_email");
        toastSuccess("Agent workspace ready!");
        window.location.assign(result.destination || "/agent/dashboard");
        return;
      }
      
      // If agent login is explicitly unauthorized or blocked (403), do not fall back.
      if (response.status === 403) {
        throw new Error(result.message || "Access denied. Please contact admin.");
      }
    } catch (agentErr: unknown) {
      const msg = agentErr instanceof Error ? agentErr.message : "";
      if (msg.includes("Access denied")) {
        setFormMessage({ type: "error", text: msg });
        toastError(msg);
        setIsPending(false);
        return;
      }
    }

    // Fall back to Agency Partner login (Supabase authentication)
    startAPTransition(async () => {
      try {
        const supabase = createClient();
        if (!supabase) throw new Error("Supabase database not linked.");

        const { error: authError } = await supabase.auth.signInWithPassword({
          email: identifier.toLowerCase(),
          password: password,
        });

        if (authError) {
          throw new Error(
            authError.message === "Invalid login credentials"
              ? "Invalid username or password. Verify credentials."
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
  };

  // Form value states for real-time validation (Operations Admin Console)
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
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="min-h-[100dvh] w-full bg-[#F8FAFC] flex flex-col justify-start relative overflow-y-auto select-none pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]"
      style={{
        background: "radial-gradient(circle at top center, rgba(37,99,235,0.08), transparent 50%), #F8FAFC"
      }}
    >
      
      {/* Background blobs (opacity below 5%) */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-5%] left-[20%] w-[480px] h-[480px] rounded-full bg-blue-500/2 blur-3xl animate-pulse" style={{ animationDuration: "14s" }} />
        <div className="absolute bottom-[-10%] right-[20%] w-[520px] h-[520px] rounded-full bg-indigo-500/1.5 blur-3xl animate-pulse" style={{ animationDuration: "18s" }} />
      </div>

      {/* STICKY GLASS NAVBAR WITH SEGMENTED SWITCH */}
      <header 
        className="sticky top-0 z-[100] w-full border-b border-slate-200/40 bg-white/40 backdrop-blur-[20px] px-4 sm:px-6 flex items-center justify-between"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          height: "calc(54px + env(safe-area-inset-top))"
        }}
      >
        
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-85 shrink-0">
          <Image
            src="/logo-navbar.png"
            alt="RNOS Logo"
            width={110}
            height={36}
            priority
            className="h-[22px] w-auto object-contain shrink-0"
          />
        </Link>
        
        {/* Right: Elegant Segmented Switch (Hidden if activeTab is Admin "ops") */}
        {activeTab !== "ops" && (
          <div className="flex rounded-full bg-slate-200/40 p-0.5 relative z-0 shrink-0 border border-slate-100" role="tablist">
            {[
              { id: "user", label: "User Login" },
              { id: "partner", label: "Partner Workspace" },
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
                  className="relative px-3 py-1 text-[9.5px] sm:text-xs font-bold transition-colors duration-150 rounded-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] whitespace-nowrap shrink-0"
                  style={{ color: isActive ? "#2563EB" : "#64748b" }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeHeaderTab"
                      className="absolute inset-0 bg-white rounded-full shadow-sm border border-slate-200/30 -z-10"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

      </header>

      {/* CENTERED LIQUID GLASS AUTHENTICATION CARD */}
      <main className="flex-1 flex items-start md:items-center justify-center p-4 z-10 pt-1 min-[375px]:pt-2 md:pt-6 pb-10">
        
        <div 
          className="w-full max-w-[440px] rounded-[32px] p-4 min-[375px]:p-5 md:p-8 flex flex-col gap-5 mt-1 min-[375px]:mt-2 md:mt-0"
          style={{
            backdropFilter: "blur(30px)",
            WebkitBackdropFilter: "blur(30px)",
            background: "rgba(255, 255, 255, 0.72)",
            border: "1px solid rgba(255, 255, 255, 0.8)",
            boxShadow: "0 20px 60px rgba(15, 23, 42, 0.08)"
          }}
        >
          
          <AnimatePresence mode="wait">
            
            {/* 1. USER LOGIN FORM */}
            {activeTab === "user" && (
              <motion.div
                key={`user-${userMode}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* Header (Inside Card) */}
                <div className="text-center space-y-1.5">
                  <div className="flex justify-center mb-1">
                    <Image
                      src="/logo-navbar.png"
                      alt="RNOS Logo"
                      width={120}
                      height={36}
                      priority
                      className="h-[30px] w-auto object-contain"
                    />
                  </div>
                  <h2 className="text-3xl sm:text-[34px] font-extrabold tracking-tight text-[#0F172A] leading-[1.1] max-w-[290px] mx-auto">
                    {userMode === "login" ? "Welcome Back" : "Create Account"}
                  </h2>
                  <p className="text-xs text-[#64748B] font-semibold leading-relaxed max-w-[280px] mx-auto mt-1">
                    {userMode === "login"
                      ? "Access your digital services securely"
                      : "Get started with your digital operating system"}
                  </p>
                </div>

                <form onSubmit={handleCustomerSubmit} className="space-y-3.5">
                  
                  {userMode === "signup" && (
                    <FloatingInput
                      label="Full Name"
                      id="customer-name"
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
                      icon={<UserRound className="h-4 w-4 text-[#64748B]" />}
                    />
                  )}

                  <FloatingInput
                    label="Email Address"
                    id="customer-email"
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
                    icon={<Mail className="h-4 w-4 text-[#64748B]" />}
                  />

                  <FloatingInput
                    label="Password"
                    id="customer-password"
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
                    icon={<Lock className="h-4 w-4 text-[#64748B]" />}
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[#64748B] hover:text-[#0F172A] p-1.5 outline-none cursor-pointer"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                  />

                  {userMode === "login" && (
                    <div className="flex justify-end pr-1.5">
                      <Link href="/forgot-password" className="text-[10px] font-bold text-[#2563EB] hover:underline outline-none">
                        Forgot Password?
                      </Link>
                    </div>
                  )}

                  {userMode === "signup" && (
                    <div className="space-y-3.5">
                      <div className="grid grid-cols-2 gap-3">
                        <FloatingInput
                          label="Mobile"
                          id="customer-mobile"
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
                          icon={<Phone className="h-4 w-4 text-[#64748B]" />}
                        />

                        <FloatingInput
                          label="PIN Code"
                          id="customer-pincode"
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
                          icon={<MapPin className="h-4 w-4 text-[#64748B]" />}
                          rightElement={
                            pinLookupPending ? (
                              <ButtonSpinner className="h-3.5 w-3.5 text-[#2563EB]" />
                            ) : null
                          }
                        />
                      </div>

                      {pinMessage && (
                        <p className={`text-[10px] font-bold ${
                          manualLocation ? "text-[#F97316]" : "text-emerald-600"
                        } px-1.5`}>
                          {pinMessage}
                        </p>
                      )}

                      <div className="grid grid-cols-3 gap-2">
                        <input
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          readOnly={!manualLocation && Boolean(city)}
                          required
                          placeholder="City"
                          className="w-full text-base md:text-xs rounded-xl border border-slate-200/80 h-10 px-3 outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_4px_rgba(37,99,235,0.10)] font-medium transition-all duration-200 ease-in-out bg-white"
                        />
                        <input
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                          readOnly={!manualLocation && Boolean(district)}
                          required
                          placeholder="District"
                          className="w-full text-base md:text-xs rounded-xl border border-slate-200/80 h-10 px-3 outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_4px_rgba(37,99,235,0.10)] font-medium transition-all duration-200 ease-in-out bg-white"
                        />
                        <input
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          readOnly={!manualLocation && Boolean(state)}
                          required
                          placeholder="State"
                          className="w-full text-base md:text-xs rounded-xl border border-slate-200/80 h-10 px-3 outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_4px_rgba(37,99,235,0.10)] font-medium transition-all duration-200 ease-in-out bg-white"
                        />
                      </div>

                      <FloatingInput
                        label="Referral Code (Optional)"
                        id="customer-referral"
                        type="text"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value.toUpperCase().slice(0, 10))}
                        icon={<Gift className="h-4 w-4 text-[#64748B]" />}
                        className="font-mono uppercase text-xs"
                      />
                    </div>
                  )}

                  {formMessage && (
                    <div className={`p-3 rounded-2xl text-[10px] font-bold leading-normal ${
                      formMessage.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50/50 text-rose-700"
                    }`}>
                      {formMessage.text}
                    </div>
                  )}

                  <FormSubmitButton
                    loading={isPending}
                    loadingText={userMode === "signup" ? "Creating Account..." : "Signing in..."}
                    className="w-full h-[58px] rounded-[20px] bg-gradient-to-br from-[#2563EB] to-[#4F46E5] text-white font-bold text-xs tracking-wide shadow-md shadow-blue-500/10 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 flex items-center justify-center gap-2"
                  >
                    {userMode === "signup" ? "Create Free Account" : "Sign In"}
                  </FormSubmitButton>

                  <div className="text-center pt-1.5">
                    <span className="text-[9px] font-semibold text-[#64748B] tracking-tight flex items-center justify-center gap-1 select-none">
                      <span>🔒</span> Protected by RNOS Secure Authentication
                    </span>
                  </div>
                </form>

                {/* Google Sign In Only */}
                {!oauthProvider && (
                  <div className="space-y-3 pt-3 border-t border-slate-100/80">
                    <Button
                      type="button"
                      disabled={isPending || isGooglePending}
                      onClick={() => userMode === "signup" ? setOAuthProvider("google") : void handleOAuthLogin()}
                      className="w-full h-[58px] rounded-[20px] border border-slate-200/80 bg-white/60 hover:bg-white/90 active:scale-[0.98] active:bg-slate-50/50 backdrop-blur-md text-[#0F172A] font-bold transition-all duration-200 flex items-center justify-center gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer hover:shadow-sm hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none"
                    >
                      <div className="flex items-center justify-center shrink-0">
                        {isGooglePending ? <ButtonSpinner className="h-4.5 w-4.5 text-[#2563EB]" /> : <GoogleIcon />}
                      </div>
                      <span className="text-xs font-semibold tracking-tight">Continue with Google</span>
                    </Button>
                  </div>
                )}

                {/* Preflight signup details for google */}
                {oauthProvider && (
                  <motion.section
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-blue-100 bg-blue-50/20 p-4 rounded-2xl space-y-3"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black uppercase text-[#2563EB] tracking-wider">Social Registration</span>
                      <button
                        type="button"
                        onClick={() => setOAuthProvider(null)}
                        className="text-[10px] font-bold text-slate-400 hover:text-[#0F172A]"
                      >
                        Cancel
                      </button>
                    </div>
                    <p className="text-[10px] text-[#64748B] font-medium leading-tight">We require a mobile number and PIN code to allocate your secure wallet node.</p>

                    <div className="grid grid-cols-2 gap-3">
                      <FloatingInput
                        label="Mobile"
                        id="oauth-mobile-user"
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
                      />
                      <FloatingInput
                        label="PIN Code"
                        id="oauth-pincode-user"
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
                        rightElement={
                          pinLookupPending ? (
                            <ButtonSpinner className="h-3.5 w-3.5 text-[#2563EB]" />
                          ) : null
                        }
                      />
                    </div>

                    <Button
                      type="button"
                      disabled={!hasVerifiedOAuthDetails || isPending || isGooglePending}
                      onClick={() => void handleOAuthLogin(true)}
                      className="w-full h-[58px] bg-gradient-to-br from-[#2563EB] to-[#4F46E5] text-white rounded-[20px] font-bold flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.98] cursor-pointer border-none transition-all duration-200"
                    >
                      {isGooglePending ? <ButtonSpinner className="h-4.5 w-4.5 text-white" /> : null}
                      Continue with Google
                    </Button>
                  </motion.section>
                )}

                {/* Account mode toggle link */}
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUserMode(userMode === "login" ? "signup" : "login");
                      setFormMessage(null);
                    }}
                    className="text-xs text-[#64748B] transition-colors outline-none cursor-pointer hover:text-[#0F172A] font-medium"
                  >
                    {userMode === "login" ? (
                      <>
                        New to RNOS?{" "}
                        <span className="font-bold text-[#2563EB] hover:underline">
                          Create your account
                        </span>
                      </>
                    ) : (
                      <>
                        Already have an account?{" "}
                        <span className="font-bold text-[#2563EB] hover:underline">
                          Sign In
                        </span>
                      </>
                    )}
                  </button>
                </div>

              </motion.div>
            )}

            {/* 2. PARTNER WORKSPACE LOGIN FORM */}
            {activeTab === "partner" && (
              <motion.div
                key="partner-view"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Header (Inside Card) */}
                <div className="text-center space-y-1.5">
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#64748B]">
                    RNOS Partner Network
                  </p>
                  <h2 className="text-3xl sm:text-[34px] font-extrabold tracking-tight text-[#0F172A] leading-[1.1] max-w-[320px] mx-auto">
                    Partner Workspace Login
                  </h2>
                  <p className="text-xs text-[#64748B] font-semibold leading-relaxed max-w-[300px] mx-auto mt-1">
                    Access your DigiConnect Partner Dashboard
                  </p>
                </div>

                <form onSubmit={handlePartnerSubmit} className="space-y-3">
                  
                  <FloatingInput
                    label="Username"
                    id="partner-username"
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
                    icon={<UserRound className="h-4 w-4 text-[#64748B]" />}
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
                    icon={<Lock className="h-4 w-4 text-[#64748B]" />}
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[#64748B] hover:text-[#0F172A] p-1.5 outline-none cursor-pointer"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                  />

                  {formMessage && (
                    <div className={`p-3 rounded-2xl text-[10px] font-bold leading-normal ${
                      formMessage.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50/50 text-rose-700"
                    }`}>
                      {formMessage.text}
                    </div>
                  )}

                  <FormSubmitButton
                    loading={isPending || apTransitionPending}
                    loadingText="Accessing Workspace..."
                    className="w-full h-[58px] rounded-[20px] bg-gradient-to-br from-[#2563EB] to-[#4F46E5] text-white font-bold text-xs tracking-wide shadow-md shadow-blue-500/10 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 flex items-center justify-center gap-2"
                  >
                    Sign In
                  </FormSubmitButton>

                  <div className="text-center pt-1.5">
                    <span className="text-[9px] font-semibold text-[#64748B] tracking-tight flex items-center justify-center gap-1 select-none">
                      <span>🔒</span> Protected by RNOS Secure Authentication
                    </span>
                  </div>
                </form>

                {/* Footer links: Forgot Password, Partner Support, Apply for Partnership */}
                <div className="flex flex-col gap-2 items-center pt-2.5 border-t border-slate-100/80 text-center">
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs font-semibold text-[#64748B]">
                    <Link href="/forgot-password" className="hover:text-[#0F172A] hover:underline outline-none">
                      Forgot Password?
                    </Link>
                    <span className="hidden sm:inline text-slate-200">|</span>
                    <Link href="/ap/support" className="hover:text-[#0F172A] hover:underline outline-none">
                      Partner Support
                    </Link>
                  </div>
                  
                  <Link href="/services" className="text-[11px] font-semibold text-[#64748B] hover:text-[#0F172A] hover:underline mt-1 outline-none">
                    Apply for Partnership
                  </Link>
                </div>

              </motion.div>
            )}

            {/* 3. OPERATIONS VIEW (Bypass for admin-login direct link) */}
            {activeTab === "ops" && (
              <motion.div
                key="ops-view"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                <div className="rounded-2xl border border-amber-200 bg-amber-50/10 p-4 text-left">
                  <div className="flex gap-2.5">
                    <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black text-amber-800 uppercase tracking-wide">Operations Console</p>
                      <p className="text-[10px] font-semibold text-slate-400 mt-1 leading-tight">Access restricted to authorized server staff and administrators.</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleAdminSubmit} className="space-y-3.5">
                  <FloatingInput
                    label="Administrative Email"
                    id="admin-email"
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
                    icon={<Mail className="h-4 w-4 text-[#64748B]" />}
                  />

                  <FloatingInput
                    label="Security Key"
                    id="admin-password"
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
                    icon={<Lock className="h-4 w-4 text-[#64748B]" />}
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[#64748B] hover:text-[#0F172A] p-1.5 outline-none cursor-pointer"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                  />

                  {formMessage && (
                    <div className={`p-3 rounded-2xl text-[10px] font-bold leading-normal ${
                      formMessage.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50/50 text-rose-700"
                    }`}>
                      {formMessage.text}
                    </div>
                  )}

                  <FormSubmitButton
                    loading={isPending}
                    loadingText="Accessing Console..."
                    className="w-full h-[58px] rounded-[20px] bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs tracking-wide shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                  >
                    Open Console
                  </FormSubmitButton>

                  <div className="text-center pt-1.5">
                    <span className="text-[9px] font-semibold text-[#64748B] tracking-tight flex items-center justify-center gap-1 select-none">
                      <span>🔒</span> Protected by RNOS Secure Authentication
                    </span>
                  </div>
                </form>

                <div className="space-y-3 pt-3 border-t border-slate-100/80">
                  <Button
                    type="button"
                    disabled={isPending}
                    onClick={handleAdminGoogleLogin}
                    className="w-full h-[58px] rounded-[20px] border border-slate-200/80 bg-white/60 hover:bg-white/90 active:scale-[0.98] active:bg-slate-50/50 backdrop-blur-md text-[#0F172A] font-bold transition-all duration-200 flex items-center justify-center gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer hover:shadow-sm hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none"
                  >
                    <div className="flex items-center justify-center shrink-0">
                      <GoogleIcon />
                    </div>
                    <span className="text-xs font-semibold tracking-tight">Staff Sign In with Google</span>
                  </Button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

        </div>

      </main>

    </motion.div>
  );
}
