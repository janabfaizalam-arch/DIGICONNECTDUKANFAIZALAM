"use client";

import { type FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, Gift, LockKeyhole, Mail, MapPin, Phone, UserRound } from "lucide-react";

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

type AuthMode = "login" | "signup";
type FormMessage = { type: "success" | "error"; text: string };
type PinLookup = { ok?: boolean; success?: boolean; pincode?: string; city?: string; district?: string; state?: string; message?: string };
type AuthApiResponse = { message?: string; error?: string; hasSession?: boolean; destination?: string };
type OAuthPreflightResponse = PinLookup & { ok: boolean };

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function normalizeMobile(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

function normalizePincode(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

function getSafeCustomerRedirect(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/customer/dashboard";

  if (
    value.startsWith("/admin") ||
    value.startsWith("/agent") ||
    value.startsWith("/login") ||
    value.startsWith("/admin-login")
  ) {
    return "/customer/dashboard";
  }

  return value;
}

function getCurrentCustomerRedirect() {
  if (typeof window === "undefined") return "/customer/dashboard";
  const params = new URLSearchParams(window.location.search);
  return getSafeCustomerRedirect(params.get("redirect") ?? params.get("next"));
}

function getOAuthCallbackUrl() {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const origin = configuredSiteUrl || (typeof window === "undefined" ? "" : window.location.origin);
  return `${origin}/auth/callback`;
}

async function readAuthApiResponse(response: Response): Promise<AuthApiResponse> {
  const fallback = response.ok ? "Request completed." : `Request failed with status ${response.status}.`;

  try {
    const result = (await response.json()) as AuthApiResponse;
    return {
      ...result,
      error: result.error || result.message || (response.ok ? undefined : fallback),
      message: result.message || result.error || fallback,
    };
  } catch {
    return response.ok ? { message: fallback } : { error: fallback, message: fallback };
  }
}

export function CustomerLoginCard({ initialMessage }: { initialMessage?: string }) {
  return <CustomerLoginCardInner initialMessage={initialMessage} />;
}

export function CustomerSignupCard({ referralCode = "" }: { referralCode?: string }) {
  return <CustomerLoginCardInner initialMode="signup" initialReferralCode={referralCode} signupOnly />;
}

function CustomerLoginCardInner({
  initialMode = "login",
  initialReferralCode = "",
  signupOnly = false,
  initialMessage,
}: {
  initialMode?: AuthMode;
  initialReferralCode?: string;
  signupOnly?: boolean;
  initialMessage?: string;
}) {
  const { error: toastError } = useToast();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [formMessage, setFormMessage] = useState<FormMessage | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isGooglePending, setIsGooglePending] = useState(false);
  const [isFacebookPending, setIsFacebookPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("");
  const [pinMessage, setPinMessage] = useState("");
  const [pinLookupPending, setPinLookupPending] = useState(false);
  const [manualLocation, setManualLocation] = useState(false);
  const [referralCode, setReferralCode] = useState(initialReferralCode);
  const [mobile, setMobile] = useState("");
  const [oauthProvider, setOAuthProvider] = useState<CustomerOAuthProvider | null>(null);

  useEffect(() => {
    if (initialMessage) setFormMessage({ type: "success", text: initialMessage });
  }, [initialMessage]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const urlReferralCode = String(params.get("ref") ?? "").trim().toUpperCase();
    const storedReferralCode = String(window.localStorage.getItem("digiconnect_referral_code") ?? "").trim().toUpperCase();
    const nextReferralCode = initialReferralCode || urlReferralCode || storedReferralCode;

    if (urlReferralCode) {
      window.localStorage.setItem("digiconnect_referral_code", urlReferralCode);
      window.sessionStorage.setItem("digiconnect_referral_code", urlReferralCode);
    }

    setReferralCode(nextReferralCode);
  }, [initialReferralCode]);

  useEffect(() => {
    if (mode !== "signup" || pincode.length !== 6) return;

    let active = true;

    async function lookupPin() {
      setPinLookupPending(true);
      setPinMessage("Fetching city, district and state...");

      try {
        const response = await fetch(`/api/pincode?pincode=${encodeURIComponent(pincode)}`, { cache: "no-store" });
        const result = (await response.json()) as PinLookup;

        if (!active) return;

        if (!response.ok || !(result.success ?? result.ok) || !result.city || !result.district || !result.state) {
          setManualLocation(true);
          setPinMessage(result.message ?? "Could not auto fetch location. Enter city, district and state manually.");
          return;
        }

        setCity(result.city);
        setDistrict(result.district);
        setState(result.state);
        setManualLocation(false);
        setPinMessage("City, district and state fetched from PIN code.");
      } catch {
        if (active) {
          setManualLocation(true);
          setPinMessage("Could not auto fetch location. Enter city, district and state manually.");
        }
      } finally {
        if (active) setPinLookupPending(false);
      }
    }

    void lookupPin();

    return () => {
      active = false;
    };
  }, [mode, oauthProvider, pincode]);

  function switchMode(nextMode: AuthMode) {
    if (isPending || isGooglePending || isFacebookPending) return;
    setMode(nextMode);
    setFormMessage(null);
    setShowPassword(false);
  }

  async function openOAuthProvider(provider: CustomerOAuthProvider) {
    const supabase = createClient();
    if (!supabase) throw new Error("Supabase environment variables are missing.");

    const redirectTo = `${getOAuthCallbackUrl()}?next=${encodeURIComponent(getCurrentCustomerRedirect())}${referralCode ? `&ref=${encodeURIComponent(referralCode)}` : ""}`;
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
    const providerName = provider === "facebook" ? "Facebook" : "Google";
    if (!data.url) throw new Error(`${providerName} login URL could not be generated. Please try again.`);

    trackLogin(provider);
    window.location.assign(data.url);
  }

  async function handleOAuthLogin(provider: CustomerOAuthProvider, requiresSignupDetails = false) {
    if (isPending || isGooglePending || isFacebookPending) return;
    setFormMessage(null);
    const formMobile = normalizeMobile(mobile);
    const formPincode = normalizePincode(pincode);

    if (requiresSignupDetails && (
      !indianMobilePattern.test(formMobile) ||
      !indianPincodePattern.test(formPincode) ||
      !city.trim() ||
      !district.trim() ||
      !state.trim()
    )) {
      setFormMessage({ type: "error", text: "Add a valid mobile number, PIN code, city, district and state before social signup." });
      return;
    }

    if (provider === "google") setIsGooglePending(true);
    if (provider === "facebook") setIsFacebookPending(true);

    try {
      if (requiresSignupDetails) {
        const preflightResponse = await fetch("/api/auth/oauth/customer", {
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
        const preflight = (await preflightResponse.json()) as OAuthPreflightResponse;

        if (!preflightResponse.ok || !preflight.ok || !preflight.city || !preflight.district || !preflight.state) {
          throw new Error(preflight.message || "Social signup details could not be validated.");
        }

        setCity(preflight.city);
        setDistrict(preflight.district);
        setState(preflight.state);
      }

      await openOAuthProvider(provider);
    } catch (error) {
      const providerName = provider === "facebook" ? "Facebook" : "Google";
      const message = error instanceof Error ? error.message : `${providerName} login failed. Please try again.`;
      setFormMessage({ type: "error", text: message });
      toastError(message);
      setIsGooglePending(false);
      setIsFacebookPending(false);
    }
  }

  const hasVerifiedOAuthDetails =
    indianMobilePattern.test(normalizeMobile(mobile)) &&
    indianPincodePattern.test(normalizePincode(pincode)) &&
    Boolean(city.trim() && district.trim() && state.trim()) &&
    !pinLookupPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending || isGooglePending || isFacebookPending) return;
    setFormMessage(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    if (!isValidEmail(email)) {
      setFormMessage({ type: "error", text: "Please enter a valid email address." });
      return;
    }

    if (password.length < 6) {
      setFormMessage({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }

    if (mode === "signup") {
      const fullName = String(formData.get("name") ?? "").trim();
      const formMobile = normalizeMobile(String(formData.get("mobile") ?? ""));
      const formPincode = normalizePincode(String(formData.get("pincode") ?? ""));
      const formCity = String(formData.get("city") ?? city).trim();
      const formState = String(formData.get("state") ?? state).trim();

      if (!fullName) {
        setFormMessage({ type: "error", text: "Full name is required." });
        return;
      }

      if (!indianMobilePattern.test(formMobile)) {
        setFormMessage({ type: "error", text: "Enter a valid Indian 10 digit mobile number." });
        return;
      }

      if (!/^\d{6}$/.test(formPincode)) {
        setFormMessage({ type: "error", text: "A valid 6 digit PIN code is required." });
        return;
      }

      if (!formCity || !formState) {
        setFormMessage({ type: "error", text: "City and state are required. Enter them manually if PIN lookup failed." });
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
        const result = await readAuthApiResponse(response);

        if (!response.ok) throw new Error(result.error || `Signup failed with status ${response.status}.`);

        trackSignup();
        if (referralCode && typeof window !== "undefined") {
          window.localStorage.removeItem("digiconnect_referral_code");
          window.sessionStorage.removeItem("digiconnect_referral_code");
        }
        setFormMessage({ type: "success", text: result.message || "Account created successfully." });

        if (result.hasSession) {
          window.location.assign(getCurrentCustomerRedirect() || result.destination || "/customer/dashboard");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Signup failed. Please try again.";
        setFormMessage({ type: "error", text: message });
        toastError(message);
      } finally {
        setIsPending(false);
      }

      return;
    }

    setIsPending(true);

    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Supabase environment variables are missing.");

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error("Login succeeded but user details could not be loaded.");

      trackLogin("email");
      window.location.assign(getCurrentCustomerRedirect());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed. Please try again.";
      setFormMessage({ type: "error", text: message });
      toastError(message);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-6">
      <Image
        src="/logo-navbar.png"
        alt="DigiConnect Dukan Logo"
        width={260}
        height={111}
        priority
        className="mx-auto h-auto w-44 object-contain"
      />
      <h1 className="mt-5 text-2xl font-semibold leading-tight text-slate-950">Welcome back</h1>
      <p className="mt-1 text-sm text-slate-500">Sign in to continue</p>

      {!signupOnly ? (
        <div className="mt-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
          {(["login", "signup"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => switchMode(item)}
              className={`h-10 rounded-lg text-sm font-semibold transition ${
                mode === item ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {item === "login" ? "Login" : "Sign Up"}
            </button>
          ))}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-5 grid gap-3 text-left" aria-busy={isPending || isGooglePending || isFacebookPending}>
        {mode === "signup" ? (
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">Full Name</span>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input name="name" type="text" autoComplete="name" required placeholder="Enter your full name" disabled={isPending} className="h-12 bg-white pl-11 text-base" />
            </div>
          </label>
        ) : null}

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-700">Email</span>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input name="email" type="email" autoComplete="email" required placeholder="you@example.com" disabled={isPending} className="h-12 bg-white pl-11 text-base" />
          </div>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-700">Password</span>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              minLength={6}
              placeholder="Minimum 6 characters"
              disabled={isPending}
              className="h-12 bg-white px-11 text-base"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              disabled={isPending}
              className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/70 hover:text-slate-800 disabled:opacity-50"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>

        {mode === "signup" ? (
          <>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Mobile Number</span>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  name="mobile"
                  type="tel"
                  inputMode="numeric"
                  pattern="[6-9][0-9]{9}"
                  maxLength={10}
                  required
                  placeholder="10 digit mobile number"
                  value={mobile}
                  onChange={(event) => setMobile(normalizeMobile(event.target.value))}
                  disabled={isPending}
                  className="h-12 bg-white pl-11 text-base"
                />
              </div>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Pin Code</span>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  name="pincode"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  placeholder="Enter 6 digit PIN code"
                  value={pincode}
                  onChange={(event) => {
                    setPincode(normalizePincode(event.target.value));
                    setCity("");
                    setDistrict("");
                    setState("");
                    setPinMessage("");
                  }}
                  disabled={isPending}
                  className="h-12 bg-white pl-11 text-base"
                />
              </div>
              {pinMessage ? (
                <span className={`text-xs font-bold ${manualLocation ? "text-orange-700" : "text-emerald-700"}`}>
                  {pinLookupPending ? "Fetching city/state..." : pinMessage}
                </span>
              ) : null}
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">City</span>
                <Input name="city" value={city} onChange={(event) => setCity(event.target.value)} readOnly={!manualLocation && Boolean(city)} required placeholder="City" disabled={isPending} className="h-12 bg-white text-base" />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">District</span>
                <Input name="district" value={district} onChange={(event) => setDistrict(event.target.value)} readOnly={!manualLocation && Boolean(district)} required placeholder="District" disabled={isPending} className="h-12 bg-white text-base" />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">State</span>
                <Input name="state" value={state} onChange={(event) => setState(event.target.value)} readOnly={!manualLocation && Boolean(state)} required placeholder="State" disabled={isPending} className="h-12 bg-white text-base" />
              </label>
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Referral Code (optional)</span>
              <div className="relative">
                <Gift className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  name="referralCode"
                  value={referralCode}
                  onChange={(event) => setReferralCode(event.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10))}
                  placeholder="Invite code"
                  disabled={isPending}
                  className="h-12 bg-white pl-11 font-mono text-base uppercase"
                />
              </div>
            </label>
          </>
        ) : null}

        {mode === "login" ? (
          <div className="-mt-1 flex justify-end">
            <Link href="/forgot-password" className="text-sm font-bold text-[var(--primary)] transition hover:text-blue-800">
              Forgot Password?
            </Link>
          </div>
        ) : null}

        {formMessage ? (
          <p className={`rounded-2xl px-4 py-3 text-sm font-medium ${formMessage.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"}`}>
            {formMessage.text}
          </p>
        ) : null}

        <FormSubmitButton
          loading={isPending}
          disabled={isGooglePending || isFacebookPending}
          loadingText={mode === "signup" ? "Creating account..." : "Logging in..."}
          icon={<Mail className="h-4 w-4" />}
          className="h-12 w-full rounded-xl bg-blue-700 text-base font-semibold shadow-sm transition hover:bg-blue-800 active:scale-[0.99]"
        >
          {mode === "signup" ? "Create Account" : "Login with Email"}
        </FormSubmitButton>
      </form>

      {oauthProvider ? (
        <section className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/55 p-4 text-left">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-blue-700">Social Login Details</p>
              <p className="mt-1 text-sm text-slate-600">Required for new {oauthProvider === "facebook" ? "Facebook" : "Google"} customer signup.</p>
            </div>
            <button
              type="button"
              onClick={() => setOAuthProvider(null)}
              disabled={isGooglePending || isFacebookPending}
              className="text-sm font-semibold text-slate-500 transition hover:text-slate-900 disabled:opacity-50"
            >
              Close
            </button>
          </div>

          <div className="mt-4 grid gap-3">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Mobile Number</span>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  pattern="[6-9][0-9]{9}"
                  value={mobile}
                  onChange={(event) => setMobile(normalizeMobile(event.target.value))}
                  placeholder="Indian 10 digit mobile number"
                  disabled={isGooglePending || isFacebookPending}
                  className="h-12 bg-white pl-11 text-base"
                />
              </div>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">PIN Code</span>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  value={pincode}
                  onChange={(event) => {
                    setPincode(normalizePincode(event.target.value));
                    setCity("");
                    setDistrict("");
                    setState("");
                    setPinMessage("");
                  }}
                  placeholder="Enter 6 digit PIN code"
                  disabled={isGooglePending || isFacebookPending}
                  className="h-12 bg-white pl-11 text-base"
                />
              </div>
              {pinMessage ? (
                <span className={`text-xs font-bold ${city && district && state ? "text-emerald-700" : "text-orange-700"}`}>
                  {pinLookupPending ? "Fetching city, district and state..." : pinMessage}
                </span>
              ) : null}
            </label>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">City</span>
                <Input value={city} onChange={(event) => setCity(event.target.value)} readOnly={!manualLocation && Boolean(city)} placeholder={manualLocation ? "Enter city" : "Auto-filled"} className="h-12 bg-white text-base" />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">District</span>
                <Input value={district} onChange={(event) => setDistrict(event.target.value)} readOnly={!manualLocation && Boolean(district)} placeholder={manualLocation ? "Enter district" : "Auto-filled"} className="h-12 bg-white text-base" />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">State</span>
                <Input value={state} onChange={(event) => setState(event.target.value)} readOnly={!manualLocation && Boolean(state)} placeholder={manualLocation ? "Enter state" : "Auto-filled"} className="h-12 bg-white text-base" />
              </label>
            </div>
          </div>

          <Button
            type="button"
            disabled={!hasVerifiedOAuthDetails || isPending || isGooglePending || isFacebookPending}
            onClick={() => void handleOAuthLogin(oauthProvider, true)}
            className="mt-4 h-12 w-full rounded-xl bg-blue-700 text-base font-semibold text-white hover:bg-blue-800"
          >
            {oauthProvider === "google" && isGooglePending ? <ButtonSpinner /> : null}
            {oauthProvider === "facebook" && isFacebookPending ? <ButtonSpinner /> : null}
            {oauthProvider === "google" ? <GoogleIcon /> : <FacebookIcon />}
            {isGooglePending || isFacebookPending
              ? `Opening ${oauthProvider === "facebook" ? "Facebook" : "Google"}...`
              : `Continue with ${oauthProvider === "facebook" ? "Facebook" : "Google"}`}
          </Button>
        </section>
      ) : null}

      {!oauthProvider ? (
        <>
          <Button type="button" variant="outline" disabled={isPending || isGooglePending || isFacebookPending} onClick={() => mode === "signup" ? setOAuthProvider("google") : void handleOAuthLogin("google")} className="mt-3 h-12 w-full rounded-xl bg-white">
            {isGooglePending ? <ButtonSpinner className="text-blue-700" /> : <GoogleIcon />}
            {isGooglePending ? "Opening Google..." : "Continue with Google"}
          </Button>
          <Button type="button" variant="outline" disabled={isPending || isGooglePending || isFacebookPending} onClick={() => mode === "signup" ? setOAuthProvider("facebook") : void handleOAuthLogin("facebook")} className="mt-3 h-12 w-full rounded-xl bg-white">
            {isFacebookPending ? <ButtonSpinner className="text-blue-700" /> : <FacebookIcon />}
            {isFacebookPending ? "Opening Facebook..." : "Continue with Facebook"}
          </Button>
        </>
      ) : null}
    </div>
  );
}
