"use client";

import { type FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LoaderCircle, MessageSquareText, ShieldCheck } from "lucide-react";

import { GoogleIcon } from "@/components/auth/google-icon";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/browser";

const resendDelaySeconds = 60;

function getIndianMobileDigits(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }

  return digits;
}

function formatIndianPhone(value: string) {
  const digits = getIndianMobileDigits(value);
  return digits.length === 10 ? `+91${digits}` : null;
}

function isSixDigitOtp(value: string) {
  return /^\d{6}$/.test(value.trim());
}

export function CustomerLoginCard() {
  const { error: toastError, success } = useToast();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isOtpPending, setIsOtpPending] = useState(false);
  const [isGooglePending, setIsGooglePending] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!otpSent || resendSeconds <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [otpSent, resendSeconds]);

  async function sendOtp() {
    setStatusMessage(null);

    const normalizedPhone = formatIndianPhone(phone);

    if (!normalizedPhone) {
      const message = "Please enter a valid 10 digit mobile number.";
      setStatusMessage({ type: "error", text: message });
      toastError(message);
      return;
    }

    setIsOtpPending(true);

    try {
      const supabase = createClient();

      if (!supabase) {
        throw new Error("Supabase environment variables are missing.");
      }

      const { error } = await supabase.auth.signInWithOtp({
        phone: normalizedPhone,
      });

      if (error) {
        throw error;
      }

      setPhone(normalizedPhone);
      setOtp("");
      setOtpSent(true);
      setResendSeconds(resendDelaySeconds);
      setStatusMessage({ type: "success", text: "OTP sent successfully. Please enter the 6 digit code." });
      success("OTP sent. Please enter the verification code.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "OTP login failed. Please use Google login.";
      setStatusMessage({ type: "error", text: message });
      toastError(message);
    } finally {
      setIsOtpPending(false);
    }
  }

  async function handleSendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendOtp();
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage(null);

    const normalizedPhone = formatIndianPhone(phone);

    if (!normalizedPhone) {
      const message = "Please enter a valid 10 digit mobile number.";
      setStatusMessage({ type: "error", text: message });
      toastError(message);
      return;
    }

    if (!isSixDigitOtp(otp)) {
      const message = "Please enter a valid 6 digit OTP.";
      setStatusMessage({ type: "error", text: message });
      toastError(message);
      return;
    }

    setIsOtpPending(true);

    try {
      const supabase = createClient();

      if (!supabase) {
        throw new Error("Supabase environment variables are missing.");
      }

      const { error } = await supabase.auth.verifyOtp({
        phone: normalizedPhone,
        token: otp.trim(),
        type: "sms",
      });

      if (error) {
        throw error;
      }

      window.location.assign("/customer/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "OTP verification failed. Please try again.";
      setStatusMessage({ type: "error", text: message });
      toastError(message);
      setIsOtpPending(false);
    }
  }

  async function handleGoogleLogin() {
    setIsGooglePending(true);

    try {
      const supabase = createClient();

      if (!supabase) {
        throw new Error("Supabase environment variables are missing.");
      }

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
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

      if (error) {
        throw error;
      }

      if (data.url) {
        window.location.assign(data.url);
        return;
      }

      throw new Error("Google login URL could not be generated. Please try again.");
    } catch (error) {
      toastError(error instanceof Error ? error.message : "Google login failed. Please try again.");
      setIsGooglePending(false);
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
      <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--secondary)]">Customer Login</p>
      <h1 className="mt-2 text-3xl font-semibold leading-tight text-slate-950">Login with Mobile OTP</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600 md:text-base md:leading-7">
        Enter your mobile number to securely access your applications.
      </p>

      {!otpSent ? (
        <form onSubmit={handleSendOtp} className="mt-6 grid gap-3 text-left">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">Mobile number</span>
            <Input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              type="tel"
              inputMode="numeric"
              required
              placeholder="Enter 10 digit mobile number"
              disabled={isOtpPending}
              maxLength={18}
              className="h-[3.25rem] rounded-2xl bg-white/70 px-4 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
            />
          </label>
          <Button type="submit" disabled={isOtpPending} className="h-[3.25rem] w-full rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 text-base font-bold shadow-lg shadow-blue-600/20 transition active:scale-[0.98]">
            {isOtpPending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <MessageSquareText className="h-4 w-4" />}
            Send OTP
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="mt-6 grid gap-3 text-left">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">OTP sent to {phone}</span>
            <Input
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              required
              placeholder="Enter 6 digit OTP"
              disabled={isOtpPending}
              maxLength={6}
              className="h-[3.25rem] rounded-2xl bg-white/70 px-4 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
            />
          </label>
          <Button type="submit" disabled={isOtpPending} className="h-[3.25rem] w-full rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 text-base font-bold shadow-lg shadow-blue-600/20 transition active:scale-[0.98]">
            {isOtpPending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Verify & Login
          </Button>
          <div className="grid gap-2 text-center text-sm">
            {resendSeconds > 0 ? (
              <p className="font-semibold text-slate-500">Resend OTP in {resendSeconds}s</p>
            ) : (
              <button
                type="button"
                onClick={() => void sendOtp()}
                disabled={isOtpPending}
                className="font-bold text-[var(--primary)] disabled:opacity-50"
              >
                Resend OTP
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setOtpSent(false);
                setOtp("");
                setResendSeconds(0);
                setStatusMessage(null);
              }}
              className="font-bold text-slate-500"
            >
              Change mobile number
            </button>
          </div>
        </form>
      )}

      {statusMessage ? (
        <p
          className={`mt-4 rounded-2xl px-4 py-3 text-left text-sm font-medium ${
            statusMessage.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"
          }`}
        >
          {statusMessage.text}
        </p>
      ) : null}

      <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        Google fallback
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <Button
        type="button"
        size="lg"
        onClick={handleGoogleLogin}
        disabled={isGooglePending}
        className="h-[3.25rem] w-full rounded-2xl bg-white/82 text-slate-900 shadow-[0_18px_42px_rgba(15,23,42,0.1)] transition hover:bg-white active:scale-[0.98]"
      >
        {isGooglePending ? <LoaderCircle className="h-5 w-5 animate-spin text-[var(--primary)]" /> : <GoogleIcon />}
        Continue with Google
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
    </div>
  );
}
