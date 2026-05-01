"use client";

import { type FormEvent, useState } from "react";
import Image from "next/image";
import { LoaderCircle, MessageSquareText, ShieldCheck } from "lucide-react";

import { GoogleIcon } from "@/components/auth/google-icon";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/browser";

function normalizePhone(phone: string) {
  const trimmed = phone.trim();

  if (trimmed.startsWith("+")) {
    return trimmed;
  }

  const digits = trimmed.replace(/\D/g, "");
  return digits.length === 10 ? `+91${digits}` : `+${digits}`;
}

export function CustomerLoginCard() {
  const { error: toastError, success } = useToast();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isOtpPending, setIsOtpPending] = useState(false);
  const [isGooglePending, setIsGooglePending] = useState(false);
  const [phoneFallbackMessage, setPhoneFallbackMessage] = useState("");

  async function handleSendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPhoneFallbackMessage("");
    setIsOtpPending(true);

    try {
      const supabase = createClient();

      if (!supabase) {
        throw new Error("Supabase environment variables are missing.");
      }

      const normalizedPhone = normalizePhone(phone);
      const { error } = await supabase.auth.signInWithOtp({
        phone: normalizedPhone,
      });

      if (error) {
        setPhoneFallbackMessage("Mobile OTP is not available right now. Please continue with Google login.");
        throw error;
      }

      setPhone(normalizedPhone);
      setOtpSent(true);
      success("OTP sent. Please enter the verification code.");
    } catch (error) {
      toastError(error instanceof Error ? error.message : "OTP login failed. Please use Google login.");
    } finally {
      setIsOtpPending(false);
    }
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsOtpPending(true);

    try {
      const supabase = createClient();

      if (!supabase) {
        throw new Error("Supabase environment variables are missing.");
      }

      const { error } = await supabase.auth.verifyOtp({
        phone: normalizePhone(phone),
        token: otp.trim(),
        type: "sms",
      });

      if (error) {
        throw error;
      }

      window.location.assign("/customer/dashboard");
    } catch (error) {
      toastError(error instanceof Error ? error.message : "OTP verification failed. Please try again.");
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
    <div className="glass-panel shadow-soft w-full max-w-md rounded-[2rem] border p-6 text-center md:p-8">
      <Image
        src="/logo-navbar.png"
        alt="DigiConnect Dukan Logo"
        width={260}
        height={111}
        priority
        className="mx-auto h-auto w-56 object-contain md:w-64"
      />
      <p className="mt-6 text-sm font-medium uppercase tracking-[0.18em] text-[var(--secondary)]">Customer Login</p>
      <h1 className="mt-3 text-3xl font-bold text-slate-950">Track Your Applications</h1>
      <p className="mt-4 text-base leading-relaxed text-slate-600">
        Login with mobile OTP to view applications, payment status, invoices, documents, and support updates.
      </p>

      {!otpSent ? (
        <form onSubmit={handleSendOtp} className="mt-6 grid gap-3 text-left">
          <label className="grid gap-2">
            <span className="text-sm font-bold text-slate-700">Mobile number</span>
            <Input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              type="tel"
              required
              placeholder="+91 98765 43210"
              disabled={isOtpPending}
            />
          </label>
          <Button type="submit" disabled={isOtpPending} className="h-12 w-full rounded-2xl">
            {isOtpPending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <MessageSquareText className="h-4 w-4" />}
            Send OTP
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="mt-6 grid gap-3 text-left">
          <label className="grid gap-2">
            <span className="text-sm font-bold text-slate-700">OTP sent to {phone}</span>
            <Input
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              inputMode="numeric"
              required
              placeholder="Enter OTP"
              disabled={isOtpPending}
            />
          </label>
          <Button type="submit" disabled={isOtpPending} className="h-12 w-full rounded-2xl">
            {isOtpPending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Verify & Continue
          </Button>
          <button
            type="button"
            onClick={() => {
              setOtpSent(false);
              setOtp("");
            }}
            className="text-center text-sm font-bold text-[var(--primary)]"
          >
            Change mobile number
          </button>
        </form>
      )}

      {phoneFallbackMessage ? (
        <p className="mt-4 rounded-2xl bg-orange-50 px-4 py-3 text-left text-sm font-medium text-orange-700">
          {phoneFallbackMessage}
        </p>
      ) : null}

      <div className="my-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        Google fallback
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <Button
        type="button"
        size="lg"
        onClick={handleGoogleLogin}
        disabled={isGooglePending}
        className="h-14 w-full rounded-2xl bg-white text-slate-900 shadow-[0_20px_50px_rgba(15,23,42,0.12)] hover:bg-slate-50"
      >
        {isGooglePending ? <LoaderCircle className="h-5 w-5 animate-spin text-[var(--primary)]" /> : <GoogleIcon />}
        Continue with Google
      </Button>
    </div>
  );
}
