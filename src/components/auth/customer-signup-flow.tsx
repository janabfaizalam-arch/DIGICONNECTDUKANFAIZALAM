"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { MapPin, Smartphone, UserRound, Home, Building2, Map as MapIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { useToast } from "@/components/providers/toast-provider";
import {
  AuthButton,
  AuthHeading,
  AuthSuccess,
  CountdownRing,
  GlassCard,
  OtpField,
  PhoneField,
  PinField,
  TextField,
} from "@/components/auth/ui";
import { messageFor, postJson } from "@/components/auth/ui/request";
import { stepTransition } from "@/components/auth/ui/motion";

type Step = "details" | "otp" | "pin";
const STEPS: Step[] = ["details", "otp", "pin"];
const STEP_LABELS: Record<Step, string> = { details: "Details", otp: "Verify", pin: "Set PIN" };
const SIGNUP_OTP_ROUTE = "/api/auth/customer/send-signup-otp";

function maskLocalPhone(local: string): string {
  if (local.length !== 10) return "+91 XXXXXX****";
  return `+91 ${local.slice(0, 2)}XXXXXX${local.slice(-2)}`;
}

function logSignupOtp(event: string, payload: Record<string, unknown>) {
  // Safe client diagnostics only — never log OTP, tokens, or full numbers.
  console.info(`[signup-otp-client] ${event}`, payload);
}

export function CustomerSignupFlow() {
  const reduceMotion = useReducedMotion();
  const { error: toastError, success: toastSuccess } = useToast();

  const [step, setStep] = useState<Step>("details");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [district, setDistrict] = useState("");
  const [stateName, setStateName] = useState("");
  const [otp, setOtp] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [verificationToken, setVerificationToken] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function sendOtp() {
    if (loading) return;
    setError(null);
    const masked = maskLocalPhone(phone);
    logSignupOtp("signup_otp_button_clicked", {
      route: SIGNUP_OTP_ROUTE,
      purpose: "customer_signup",
      maskedPhone: masked,
    });

    if (!fullName.trim() || phone.length !== 10 || !address.trim() || pincode.length !== 6 || !district.trim() || !stateName.trim()) {
      setError("Please complete all details.");
      return;
    }
    if (!acceptedTerms) {
      setError("Please accept the Terms and Privacy Policy.");
      return;
    }

    logSignupOtp("signup_otp_validation_passed", {
      route: SIGNUP_OTP_ROUTE,
      purpose: "customer_signup",
      maskedPhone: masked,
    });

    setLoading(true);
    logSignupOtp("signup_otp_request_started", {
      route: SIGNUP_OTP_ROUTE,
      purpose: "customer_signup",
      maskedPhone: masked,
    });

    try {
      const result = await postJson<{
        ok?: boolean;
        success?: boolean;
        error?: string;
        code?: string;
        maskedPhone?: string;
        requestId?: string;
      }>(SIGNUP_OTP_ROUTE, {
        fullName,
        phone,
        address,
        pincode,
        district,
        state: stateName,
      });

      logSignupOtp("signup_otp_response_received", {
        route: SIGNUP_OTP_ROUTE,
        purpose: "customer_signup",
        maskedPhone: masked,
        status: result.status,
        requestId: result.data?.requestId,
        code: result.data?.code,
        ok: result.ok,
      });

      if (!result.ok) {
        const msg = messageFor(result, "OTP send failed. WhatsApp OTP was not sent.");
        logSignupOtp("signup_otp_request_failed", {
          route: SIGNUP_OTP_ROUTE,
          purpose: "customer_signup",
          maskedPhone: masked,
          status: result.status,
          requestId: result.data?.requestId,
          code: result.data?.code,
        });
        setError(msg);
        toastError(msg);
        return;
      }

      // OTP step only after explicit provider-accepted success (postJson requires ok/success).
      setMaskedPhone(result.data.maskedPhone ?? masked);
      setCooldown(60);
      setOtp("");
      setStep("otp");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const result = await postJson<{ error?: string; verificationToken?: string }>("/api/auth/customer/verify-signup-otp", {
        phone,
        otp,
      });
      if (!result.ok) {
        const msg = messageFor(result, "OTP verification failed.");
        setError(msg);
        toastError(msg);
        return;
      }
      setVerificationToken(result.data.verificationToken ?? "");
      setStep("pin");
    } finally {
      setLoading(false);
    }
  }

  async function completeSignup() {
    if (loading) return;
    setError(null);
    if (pin.length !== 6 || confirmPin.length !== 6) {
      setError("PIN must be exactly 6 digits.");
      return;
    }
    if (pin !== confirmPin) {
      setError("PIN and Confirm PIN do not match.");
      return;
    }
    setLoading(true);
    try {
      const result = await postJson<{ error?: string; redirectTo?: string }>("/api/auth/customer/complete-signup", {
        phone,
        verificationToken,
        pin,
        confirmPin,
        acceptedTerms: true,
      });
      if (!result.ok) {
        const msg = messageFor(result, "Signup failed.");
        setError(msg);
        toastError(msg);
        return;
      }
      toastSuccess("Account created successfully!");
      setDone(true);
      window.setTimeout(() => window.location.replace(result.data.redirectTo || "/customer/dashboard"), 900);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <GlassCard>
        <AuthSuccess title="Account created" message="Taking you to your dashboard." redirectSeconds={2} />
      </GlassCard>
    );
  }

  const activeIndex = STEPS.indexOf(step);

  return (
    <GlassCard>
      <AuthHeading title="Create your account" subtitle="Verify your WhatsApp number, then set a 6-digit PIN." />

      {/* Step indicator */}
      <div className="flex items-center gap-2" aria-hidden>
        {STEPS.map((s, i) => (
          <div key={s} className="flex flex-1 flex-col gap-1.5">
            <div className={`h-1 rounded-full transition-colors duration-300 ${i <= activeIndex ? "bg-blue-500" : "bg-slate-200"}`} />
            <span className={`text-[10px] font-semibold ${i <= activeIndex ? "text-blue-600" : "text-slate-400"}`}>
              {STEP_LABELS[s]}
            </span>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          variants={reduceMotion ? undefined : stepTransition}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="flex flex-col gap-4"
        >
          {step === "details" ? (
            <>
              <TextField label="Full name" icon={<UserRound className="h-4 w-4" />} value={fullName} disabled={loading} onChange={(e) => setFullName(e.target.value)} />
              <PhoneField label="WhatsApp mobile number" icon={<Smartphone className="h-4 w-4" />} value={phone} disabled={loading} success={phone.length === 10} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} />
              <TextField label="Full address" icon={<Home className="h-4 w-4" />} value={address} disabled={loading} onChange={(e) => setAddress(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Pincode" icon={<MapPin className="h-4 w-4" />} inputMode="numeric" value={pincode} disabled={loading} success={pincode.length === 6} onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))} />
                <TextField label="District" icon={<Building2 className="h-4 w-4" />} value={district} disabled={loading} onChange={(e) => setDistrict(e.target.value)} />
              </div>
              <TextField label="State" icon={<MapIcon className="h-4 w-4" />} value={stateName} disabled={loading} onChange={(e) => setStateName(e.target.value)} />

              <label className="flex items-start gap-2.5 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  disabled={loading}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>
                  I agree to the <Link href="/terms-and-conditions" className="font-semibold text-blue-600 hover:underline">Terms</Link> and{" "}
                  <Link href="/privacy-policy" className="font-semibold text-blue-600 hover:underline">Privacy Policy</Link>.
                </span>
              </label>

              {error ? <p className="pl-1 text-xs font-semibold text-rose-600">{error}</p> : null}

              <AuthButton loading={loading} loadingText="Sending OTP…" onClick={() => void sendOtp()} disabled={!acceptedTerms || phone.length !== 10}>
                Send WhatsApp OTP
              </AuthButton>
            </>
          ) : null}

          {step === "otp" ? (
            <>
              <p className="text-center text-sm text-slate-500">
                OTP sent to <span className="font-semibold text-slate-700">{maskedPhone || "your WhatsApp"}</span>
              </p>
              <OtpField value={otp} onChange={setOtp} disabled={loading} error={error} onComplete={() => void verifyOtp()} />

              <AuthButton loading={loading} loadingText="Verifying…" onClick={() => void verifyOtp()} disabled={otp.length !== 6}>
                Verify OTP
              </AuthButton>

              <button
                type="button"
                disabled={cooldown > 0 || loading}
                onClick={() => void sendOtp()}
                className="mx-auto inline-flex items-center gap-2 text-sm font-semibold text-blue-600 outline-none disabled:text-slate-400"
              >
                {cooldown > 0 ? <CountdownRing seconds={cooldown} total={60} /> : null}
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
              </button>
            </>
          ) : null}

          {step === "pin" ? (
            <>
              <p className="text-sm text-slate-500">Set a 6-digit login PIN. You won&apos;t need OTP for future logins.</p>
              <PinField label="Create PIN" value={pin} onChange={setPin} disabled={loading} autoFocus />
              <PinField label="Confirm PIN" value={confirmPin} onChange={setConfirmPin} disabled={loading} error={error} />

              <AuthButton loading={loading} loadingText="Creating account…" status={done ? "success" : "idle"} onClick={() => void completeSignup()} disabled={pin.length !== 6 || confirmPin.length !== 6}>
                Create account &amp; login
              </AuthButton>
            </>
          ) : null}
        </motion.div>
      </AnimatePresence>

      <p className="text-center text-sm text-slate-500">
        Already registered?{" "}
        <Link href="/customer/login" className="font-semibold text-blue-600 hover:underline">
          Login
        </Link>
      </p>
    </GlassCard>
  );
}
