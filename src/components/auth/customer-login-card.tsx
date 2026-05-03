"use client";

import { type FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
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
      <h1 className="mt-2 text-3xl font-semibold leading-tight text-slate-950">Login to DigiConnect Dukan</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600 md:text-base md:leading-7">
        Access your applications, upload documents and track your service status.
      </p>

      {!otpSent ? (
        <form onSubmit={handleSendOtp} className="mt-6 grid gap-3 text-left">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">Mobile number</span>
            <Input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              type="tel"
              required
              placeholder="+91 98765 43210"
              disabled={isOtpPending}
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
              onChange={(event) => setOtp(event.target.value)}
              inputMode="numeric"
              required
              placeholder="Enter OTP"
              disabled={isOtpPending}
              className="h-[3.25rem] rounded-2xl bg-white/70 px-4 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
            />
          </label>
          <Button type="submit" disabled={isOtpPending} className="h-[3.25rem] w-full rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 text-base font-bold shadow-lg shadow-blue-600/20 transition active:scale-[0.98]">
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
