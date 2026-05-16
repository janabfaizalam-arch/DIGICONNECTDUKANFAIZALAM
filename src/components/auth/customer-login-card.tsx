"use client";

import { type FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, Gift, LockKeyhole, Mail, MapPin, Phone, ShieldCheck, UserRound } from "lucide-react";

import { GoogleIcon } from "@/components/auth/google-icon";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ButtonSpinner, FormSubmitButton } from "@/components/ui/loading";
import { trackLogin, trackSignup } from "@/lib/google-analytics";
import { createClient } from "@/lib/supabase/browser";

type AuthMode = "login" | "signup";
type FormMessage = { type: "success" | "error"; text: string };
type PinLookup = { ok: boolean; city?: string; state?: string; message?: string };
type AuthApiResponse = { message?: string; error?: string; hasSession?: boolean; destination?: string };

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
    value.startsWith("/staff") ||
    value.startsWith("/login") ||
    value.startsWith("/admin-login") ||
    value.startsWith("/super-admin-login")
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
  const [showPassword, setShowPassword] = useState(false);
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pinMessage, setPinMessage] = useState("");
  const [pinLookupPending, setPinLookupPending] = useState(false);
  const [manualLocation, setManualLocation] = useState(false);
  const [referralCode, setReferralCode] = useState(initialReferralCode);
  const [mobile, setMobile] = useState("");

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
      setPinMessage("Fetching city/state...");

      try {
        const response = await fetch(`/api/pincode?pincode=${encodeURIComponent(pincode)}`, { cache: "no-store" });
        const result = (await response.json()) as PinLookup;

        if (!active) return;

        if (!response.ok || !result.ok || !result.city || !result.state) {
          setManualLocation(true);
          setPinMessage(result.message ?? "Could not auto fetch city/state. Please enter them manually.");
          return;
        }

        setCity(result.city);
        setState(result.state);
        setManualLocation(false);
        setPinMessage("City and state fetched from PIN code.");
      } catch {
        if (active) {
          setManualLocation(true);
          setPinMessage("Could not auto fetch city/state. Please enter them manually.");
        }
      } finally {
        if (active) setPinLookupPending(false);
      }
    }

    void lookupPin();

    return () => {
      active = false;
    };
  }, [mode, pincode]);

  function switchMode(nextMode: AuthMode) {
    if (isPending || isGooglePending) return;
    setMode(nextMode);
    setFormMessage(null);
    setShowPassword(false);
  }

  async function handleGoogleLogin() {
    if (isPending || isGooglePending) return;
    setFormMessage(null);
    setIsGooglePending(true);

    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Supabase environment variables are missing.");

      const origin = window.location.origin;
      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(getCurrentCustomerRedirect())}${referralCode ? `&ref=${encodeURIComponent(referralCode)}` : ""}`;
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
      if (!data.url) throw new Error("Google login URL could not be generated. Please try again.");

      trackLogin("google");
      window.location.assign(data.url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Google login failed. Please try again.";
      setFormMessage({ type: "error", text: message });
      toastError(message);
      setIsGooglePending(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending || isGooglePending) return;
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

      if (!/^\d{10}$/.test(formMobile)) {
        setFormMessage({ type: "error", text: "Enter a valid 10 digit mobile number." });
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
          window.location.assign(result.destination || "/customer/dashboard");
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
    <div className="glass-panel shadow-soft relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 p-5 text-center md:p-7">
      <Image
        src="/logo-navbar.png"
        alt="DigiConnect Dukan Logo"
        width={260}
        height={111}
        priority
        className="mx-auto h-auto w-48 object-contain md:w-56"
      />
      <p className="mt-2 text-[0.68rem] font-bold uppercase leading-tight tracking-[0.14em] text-slate-500">
        Powered By RNoS India Pvt Ltd
      </p>
      <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--secondary)]">Customer Access</p>
      <h1 className="mt-2 text-3xl font-semibold leading-tight text-slate-950">
        {mode === "signup" ? "Create Your DigiConnect Account" : "Login to Your DigiConnect Dashboard"}
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-600 md:text-base md:leading-7">
        Apply services, track applications and manage your documents securely.
      </p>

      {!signupOnly ? (
        <div className="mt-6 grid grid-cols-2 rounded-2xl bg-white/35 p-1">
          {(["login", "signup"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => switchMode(item)}
              className={`h-11 rounded-xl text-sm font-bold transition ${
                mode === item ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {item === "login" ? "Login" : "Sign Up"}
            </button>
          ))}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6 grid gap-3 text-left" aria-busy={isPending || isGooglePending}>
        {mode === "signup" ? (
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">Full Name</span>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input name="name" type="text" autoComplete="name" required placeholder="Enter your full name" disabled={isPending} className="h-[3.15rem] bg-white/74 pl-11 text-base" />
            </div>
          </label>
        ) : null}

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-700">Email</span>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input name="email" type="email" autoComplete="email" required placeholder="you@example.com" disabled={isPending} className="h-[3.15rem] bg-white/74 pl-11 text-base" />
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
              className="h-[3.15rem] bg-white/74 px-11 text-base"
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
                  pattern="[0-9]{10}"
                  maxLength={10}
                  required
                  placeholder="10 digit mobile number"
                  value={mobile}
                  onChange={(event) => setMobile(normalizeMobile(event.target.value))}
                  disabled={isPending}
                  className="h-[3.15rem] bg-white/74 pl-11 text-base"
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
                    setState("");
                    setPinMessage("");
                  }}
                  disabled={isPending}
                  className="h-[3.15rem] bg-white/74 pl-11 text-base"
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
                <Input name="city" value={city} onChange={(event) => setCity(event.target.value)} readOnly={!manualLocation && Boolean(city)} required placeholder="City" disabled={isPending} className="h-[3.15rem] bg-white/74 text-base" />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">State</span>
                <Input name="state" value={state} onChange={(event) => setState(event.target.value)} readOnly={!manualLocation && Boolean(state)} required placeholder="State" disabled={isPending} className="h-[3.15rem] bg-white/74 text-base" />
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
                  className="h-[3.15rem] bg-white/74 pl-11 font-mono text-base uppercase"
                />
              </div>
              <span className="text-xs font-semibold text-slate-500">You get Rs 100 rewards if the code is valid.</span>
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
          disabled={isGooglePending}
          loadingText={mode === "signup" ? "Creating account..." : "Logging in..."}
          icon={<Mail className="h-4 w-4" />}
          className="h-[3.15rem] w-full rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 text-base font-bold shadow-lg shadow-blue-600/20 transition active:scale-[0.98]"
        >
          {mode === "signup" ? "Create Account" : "Login with Email"}
        </FormSubmitButton>
      </form>

      <Button type="button" variant="outline" disabled={isPending || isGooglePending} onClick={() => void handleGoogleLogin()} className="mt-3 h-[3.15rem] w-full rounded-2xl bg-white/70">
        {isGooglePending ? <ButtonSpinner className="text-blue-700" /> : <GoogleIcon />}
        {isGooglePending ? "Opening Google..." : "Continue with Google"}
      </Button>

      <div className="mt-6 rounded-2xl border border-white/15 bg-white/25 p-3 text-center backdrop-blur-md">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Team access</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <Link href="/login/agent" className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/15 bg-white/35 px-4 text-sm font-bold text-blue-700 transition hover:bg-white/55">
            Agent Login
          </Link>
          <Link href="/login/staff" className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/15 bg-white/35 px-4 text-sm font-bold text-blue-700 transition hover:bg-white/55">
            Staff Login
          </Link>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
        <ShieldCheck className="h-4 w-4 text-emerald-600" />
        Secure Supabase authentication
      </div>
    </div>
  );
}
