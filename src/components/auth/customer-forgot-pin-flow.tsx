"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { Smartphone } from "lucide-react";
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
} from "@/components/auth/ui";
import { messageFor, postJson } from "@/components/auth/ui/request";
import { stepTransition } from "@/components/auth/ui/motion";

type Step = "phone" | "otp" | "pin";

export function CustomerForgotPinFlow() {
  const reduceMotion = useReducedMotion();
  const { error: toastError } = useToast();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function sendOtp() {
    if (loading) return;
    setError(null);
    if (phone.length !== 10) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    setLoading(true);
    try {
      const result = await postJson<{ error?: string; message?: string }>("/api/auth/customer/forgot-pin/send-otp", { phone });
      if (!result.ok) {
        const msg = messageFor(result, "Request failed.");
        setError(msg);
        toastError(msg);
        return;
      }
      setMessage(result.data.message ?? "If this number is registered, an OTP has been sent on WhatsApp.");
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
      const result = await postJson<{ error?: string; verificationToken?: string }>("/api/auth/customer/forgot-pin/verify-otp", {
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

  async function resetPin() {
    if (loading) return;
    setError(null);
    if (!/^\d{6}$/.test(pin) || !/^\d{6}$/.test(confirmPin)) {
      setError("PIN must be exactly 6 digits.");
      return;
    }
    if (pin !== confirmPin) {
      setError("PIN and Confirm PIN do not match.");
      return;
    }
    setLoading(true);
    try {
      const result = await postJson<{ error?: string; redirectTo?: string }>("/api/auth/customer/forgot-pin/reset", {
        phone,
        verificationToken,
        pin,
        confirmPin,
      });
      if (!result.ok) {
        const msg = messageFor(result, "PIN reset failed.");
        setError(msg);
        toastError(msg);
        return;
      }
      setDone(true);
      window.setTimeout(() => window.location.replace(result.data.redirectTo || "/customer/login?pinCreated=1"), 900);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <GlassCard>
        <AuthSuccess title="PIN updated" message="You can now login with your new PIN." redirectSeconds={2} />
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <AuthHeading title="Forgot / Create PIN" subtitle="Verify your registered WhatsApp number to set a new PIN." />

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          variants={reduceMotion ? undefined : stepTransition}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="flex flex-col gap-4"
        >
          {step === "phone" ? (
            <>
              <PhoneField
                label="Registered mobile number"
                icon={<Smartphone className="h-4 w-4" />}
                value={phone}
                disabled={loading}
                success={phone.length === 10}
                error={error}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              />
              <AuthButton loading={loading} loadingText="Sending OTP…" onClick={() => void sendOtp()} disabled={phone.length !== 10}>
                Send WhatsApp OTP
              </AuthButton>
            </>
          ) : null}

          {step === "otp" ? (
            <>
              {message ? <p className="text-center text-sm text-slate-500">{message}</p> : null}
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
              <PinField label="Create new PIN" value={pin} onChange={setPin} disabled={loading} autoFocus />
              <PinField label="Confirm new PIN" value={confirmPin} onChange={setConfirmPin} disabled={loading} error={error} />
              <AuthButton loading={loading} loadingText="Saving…" onClick={() => void resetPin()} disabled={pin.length !== 6 || confirmPin.length !== 6}>
                Create PIN
              </AuthButton>
            </>
          ) : null}
        </motion.div>
      </AnimatePresence>

      <p className="text-center text-sm">
        <Link href="/customer/login" className="font-semibold text-blue-600 hover:underline">
          Back to login
        </Link>
      </p>
    </GlassCard>
  );
}
