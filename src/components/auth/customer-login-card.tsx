"use client";

import { type FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, MapPin, UserRound } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/browser";

type EmailMode = "login" | "signup";
type FormMessage = { type: "success" | "error"; text: string };
type PinLookup = { ok: boolean; city?: string; state?: string; message?: string };
type AuthApiResponse = { message?: string; error?: string; hasSession?: boolean };

async function readAuthApiResponse(response: Response): Promise<AuthApiResponse> {
  const fallback = response.ok ? "Request completed." : `Signup request failed with status ${response.status}.`;

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

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function getSafeCustomerRedirect(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  if (
    value.startsWith("/admin") ||
    value.startsWith("/agent") ||
    value.startsWith("/staff") ||
    value.startsWith("/login") ||
    value.startsWith("/admin-login") ||
    value.startsWith("/super-admin-login")
  ) {
    return "/";
  }

  return value;
}

function getCurrentCustomerRedirect() {
  if (typeof window === "undefined") {
    return "/";
  }

  const params = new URLSearchParams(window.location.search);

  return getSafeCustomerRedirect(params.get("redirect") ?? params.get("next"));
}

export function CustomerLoginCard() {
  return <CustomerLoginCardInner />;
}

export function CustomerSignupCard({ referralCode = "" }: { referralCode?: string }) {
  return <CustomerLoginCardInner initialMode="signup" initialReferralCode={referralCode} signupOnly />;
}

function CustomerLoginCardInner({
  initialMode = "login",
  initialReferralCode = "",
  signupOnly = false,
}: {
  initialMode?: EmailMode;
  initialReferralCode?: string;
  signupOnly?: boolean;
}) {
  const { error: toastError } = useToast();
  const [isGooglePending] = useState(false);
  const [isEmailPending, setIsEmailPending] = useState(false);
  const [isResendPending, setIsResendPending] = useState(false);
  const [emailMode, setEmailMode] = useState<EmailMode>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [formMessage, setFormMessage] = useState<FormMessage | null>(null);
  const [lastSignupEmail, setLastSignupEmail] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pinMessage, setPinMessage] = useState("");
  const [pinLookupPending, setPinLookupPending] = useState(false);
  const [manualLocation, setManualLocation] = useState(false);
  const [referralCode, setReferralCode] = useState(initialReferralCode);

  useEffect(() => {
    if (typeof window === "undefined" || initialReferralCode) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setReferralCode(String(params.get("ref") ?? "").trim().toUpperCase());
  }, [initialReferralCode]);

  useEffect(() => {
    if (emailMode !== "signup" || pincode.length !== 6) {
      return;
    }

    let active = true;

    async function lookupPin() {
      setPinLookupPending(true);
      setPinMessage("");

      try {
        const response = await fetch(`/api/pincode?pincode=${encodeURIComponent(pincode)}`, { cache: "no-store" });
        const result = (await response.json()) as PinLookup;

        if (!active) {
          return;
        }

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
        if (active) {
          setPinLookupPending(false);
        }
      }
    }

    lookupPin();

    return () => {
      active = false;
    };
  }, [emailMode, pincode]);

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormMessage(null);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const formPincode = String(formData.get("pincode") ?? "").trim();
    const formCity = String(formData.get("city") ?? city).trim();
    const formState = String(formData.get("state") ?? state).trim();

    if (emailMode === "signup" && !name) {
      setFormMessage({ type: "error", text: "Full name is required." });
      return;
    }

    if (emailMode === "signup" && !/^\d{6}$/.test(formPincode)) {
      setFormMessage({ type: "error", text: "A valid 6 digit PIN code is required." });
      return;
    }

    if (emailMode === "signup" && (!formCity || !formState)) {
      setFormMessage({ type: "error", text: "City and state are required. Enter them manually if PIN lookup failed." });
      return;
    }

    if (!isValidEmail(email)) {
      setFormMessage({ type: "error", text: "Please enter a valid email address." });
      return;
    }

    if (password.length < 6) {
      setFormMessage({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }

    setIsEmailPending(true);

    try {
      if (emailMode === "login") {
        const supabase = createClient();

        if (!supabase) {
          throw new Error("Supabase environment variables are missing.");
        }

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          throw error;
        }

        if (!data.user) {
          throw new Error("Login succeeded but user details could not be loaded.");
        }

        window.location.assign(getCurrentCustomerRedirect());
        return;
      }

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: name,
          email,
          password,
          pincode: formPincode,
          city: formCity,
          state: formState,
          referred_by: referralCode || undefined,
        }),
      });
      const result = await readAuthApiResponse(response);

      if (!response.ok) {
        throw new Error(result.error || `Signup request failed with status ${response.status}.`);
      }

      setLastSignupEmail(email);
      setFormMessage({ type: "success", text: result.message || "Verification email sent. Please check Inbox, Spam, and Promotions folder." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Email access failed. Please try again.";
      setFormMessage({ type: "error", text: message });
      toastError(message);
    } finally {
      setIsEmailPending(false);
    }
  }

  async function handleResendVerification() {
    const email = lastSignupEmail.trim().toLowerCase();

    if (!email) {
      setFormMessage({ type: "error", text: "Enter your email and create the account first, then resend verification." });
      return;
    }

    setFormMessage(null);
    setIsResendPending(true);

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
      const result = await readAuthApiResponse(response);

      if (!response.ok) {
        throw new Error(result.error || `Verification resend failed with status ${response.status}.`);
      }

      setFormMessage({ type: "success", text: result.message || "Verification email sent. Please check Inbox, Spam, and Promotions folder." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Verification email could not be resent. Please try again.";
      setFormMessage({ type: "error", text: message });
      toastError(message);
    } finally {
      setIsResendPending(false);
    }
  }

  function toggleEmailMode() {
    if (signupOnly) {
      return;
    }

    setEmailMode((current) => (current === "login" ? "signup" : "login"));
    setFormMessage(null);
    setShowPassword(false);
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
      <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--secondary)]">Customer Login</p>
      <h1 className="mt-2 text-3xl font-semibold leading-tight text-slate-950">Login to Your DigiConnect Dashboard</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600 md:text-base md:leading-7">
        Apply services, track applications and manage your documents securely.
      </p>

      <form onSubmit={handleEmailSubmit} className="mt-7 grid gap-3 text-left">
        {emailMode === "signup" ? (
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">Full Name</span>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                name="name"
                type="text"
                autoComplete="name"
                required
                placeholder="Enter your full name"
                disabled={isEmailPending}
                className="h-[3.15rem] bg-white/74 pl-11 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
              />
            </div>
          </label>
        ) : null}

        {emailMode === "signup" ? (
          <>
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
                    setPincode(event.target.value.replace(/\D/g, "").slice(0, 6));
                    setCity("");
                    setState("");
                  }}
                  disabled={isEmailPending}
                  className="h-[3.15rem] bg-white/74 pl-11 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
                />
              </div>
              {pinMessage ? (
                <span className={`text-xs font-bold ${manualLocation ? "text-orange-700" : "text-emerald-700"}`}>
                  {pinLookupPending ? "Checking PIN code..." : pinMessage}
                </span>
              ) : null}
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">City</span>
                <Input
                  name="city"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  readOnly={!manualLocation && Boolean(city)}
                  required
                  placeholder="City"
                  disabled={isEmailPending}
                  className="h-[3.15rem] bg-white/74 text-base"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">State</span>
                <Input
                  name="state"
                  value={state}
                  onChange={(event) => setState(event.target.value)}
                  readOnly={!manualLocation && Boolean(state)}
                  required
                  placeholder="State"
                  disabled={isEmailPending}
                  className="h-[3.15rem] bg-white/74 text-base"
                />
              </label>
            </div>

            {referralCode ? (
              <input type="hidden" name="referralCode" value={referralCode} />
            ) : null}
          </>
        ) : null}

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-700">Email</span>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              disabled={isEmailPending}
              onChange={(event) => {
                if (emailMode === "signup") {
                  setLastSignupEmail(event.target.value.trim().toLowerCase());
                }
              }}
              className="h-[3.15rem] bg-white/74 pl-11 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
            />
          </div>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-700">Password</span>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={emailMode === "signup" ? "new-password" : "current-password"}
              required
              minLength={6}
              placeholder="Minimum 6 characters"
              disabled={isEmailPending}
              className="h-[3.15rem] bg-white/74 px-11 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              disabled={isEmailPending}
              className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/70 hover:text-slate-800 disabled:opacity-50"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>

        {formMessage ? (
          <p
            className={`rounded-2xl px-4 py-3 text-sm font-medium ${
              formMessage.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"
            }`}
          >
            {formMessage.text}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={isEmailPending || isGooglePending}
          className="h-[3.15rem] w-full rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 text-base font-bold shadow-lg shadow-blue-600/20 transition active:scale-[0.98]"
        >
          {isEmailPending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Mail className="h-4 w-4" />}
          {isEmailPending ? (emailMode === "signup" ? "Sending verification..." : "Logging in...") : emailMode === "signup" ? "Create Account" : "Login with Email"}
        </Button>

        {emailMode === "signup" ? (
          <Button
            type="button"
            variant="outline"
            disabled={isEmailPending || isResendPending || !lastSignupEmail}
            onClick={() => {
              void handleResendVerification();
            }}
            className="h-[3.15rem] w-full rounded-2xl"
          >
            {isResendPending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Mail className="h-4 w-4" />}
            {isResendPending ? "Resending..." : "Resend verification email"}
          </Button>
        ) : null}
      </form>

      {!signupOnly ? <button
        type="button"
        onClick={toggleEmailMode}
        className="mt-4 text-sm font-bold text-[var(--primary)] transition hover:text-blue-800"
      >
        {emailMode === "signup" ? "Already have an account? Login" : "New customer? Create account"}
      </button> : null}

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
    </div>
  );
}
