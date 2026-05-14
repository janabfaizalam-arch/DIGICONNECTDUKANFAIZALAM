"use client";

import { type FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LoaderCircle, Phone, ShieldCheck } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trackLogin, trackSignup } from "@/lib/google-analytics";

type EmailMode = "login" | "signup";
type FormMessage = { type: "success" | "error"; text: string };
type Msg91Config = { configured: boolean; widgetId: string; tokenAuth: string };
type Msg91VerifyResponse = { message?: string; destination?: string; isNew?: boolean };

declare global {
  interface Window {
    initSendOTP?: (configuration: Record<string, unknown>) => void;
    sendOtp?: (identifier: string, success?: (data: unknown) => void, failure?: (error: unknown) => void) => void;
    retryOtp?: (channel: string | null, success?: (data: unknown) => void, failure?: (error: unknown) => void) => void;
    verifyOtp?: (otp: string, success?: (data: unknown) => void, failure?: (error: unknown) => void) => void;
    __DCD_MSG91_CONFIG__?: Record<string, unknown>;
  }
}

function normalizeMobile(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

function extractMsg91AccessToken(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const data = value as Record<string, unknown>;
  const nested = typeof data.data === "object" && data.data ? data.data as Record<string, unknown> : null;
  const candidates = [
    data.token,
    data.accessToken,
    data.access_token,
    data["access-token"],
    nested?.token,
    nested?.accessToken,
    nested?.access_token,
    nested?.["access-token"],
  ];

  return candidates.map((candidate) => String(candidate ?? "").trim()).find(Boolean) ?? "";
}

export function CustomerLoginCard({ initialMessage }: { initialMessage?: string }) {
  return <CustomerLoginCardInner initialMessage={initialMessage} />;
}

export function CustomerSignupCard({ referralCode = "" }: { referralCode?: string }) {
  return <CustomerLoginCardInner initialMode="signup" initialReferralCode={referralCode} signupOnly />;
}

function CustomerLoginCardInner({
  initialMessage,
}: {
  initialMode?: EmailMode;
  initialReferralCode?: string;
  signupOnly?: boolean;
  initialMessage?: string;
}) {
  const { error: toastError } = useToast();
  const [formMessage, setFormMessage] = useState<FormMessage | null>(null);
  const [otpMobile, setOtpMobile] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpPhase, setOtpPhase] = useState<"idle" | "loading" | "sent" | "verifying" | "resending">("idle");
  const [msg91Config, setMsg91Config] = useState<Msg91Config | null>(null);
  const [msg91Ready, setMsg91Ready] = useState(false);
  const [fullNameForOtp, setFullNameForOtp] = useState("");
  const [emailForOtp, setEmailForOtp] = useState("");

  useEffect(() => {
    if (initialMessage) {
      setFormMessage({ type: "success", text: initialMessage });
    }
  }, [initialMessage]);

  useEffect(() => {
    let active = true;

    async function loadMsg91Config() {
      try {
        const response = await fetch("/api/auth/msg91/config", { cache: "no-store" });
        const config = (await response.json()) as Msg91Config;
        if (!active) return;
        setMsg91Config(config);

        if (!config.configured) {
          setFormMessage({ type: "error", text: "OTP login is not configured. Please contact support." });
          return;
        }

        window.__DCD_MSG91_CONFIG__ = {
          widgetId: config.widgetId,
          tokenAuth: config.tokenAuth,
          exposeMethods: true,
          success: () => undefined,
          failure: () => undefined,
        } as Record<string, unknown>;

        if (window.initSendOTP) {
          window.initSendOTP(window.__DCD_MSG91_CONFIG__);
          setMsg91Ready(true);
          return;
        }

        const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://verify.msg91.com/otp-provider.js"]');
        if (existingScript) {
          existingScript.addEventListener("load", () => {
            window.initSendOTP?.(window.__DCD_MSG91_CONFIG__ ?? {});
            setMsg91Ready(true);
          }, { once: true });
          return;
        }

        const script = document.createElement("script");
        script.src = "https://verify.msg91.com/otp-provider.js";
        script.async = true;
        script.onload = () => {
          window.initSendOTP?.(window.__DCD_MSG91_CONFIG__ ?? {});
          setMsg91Ready(true);
        };
        script.onerror = () => {
          if (active) setFormMessage({ type: "error", text: "OTP service could not be loaded. Please refresh and try again." });
        };
        document.body.appendChild(script);
      } catch {
        if (active) setFormMessage({ type: "error", text: "OTP login is temporarily unavailable. Please try again." });
      }
    }

    void loadMsg91Config();

    return () => {
      active = false;
    };
  }, []);

  async function handleSendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormMessage(null);

    const mobile = normalizeMobile(otpMobile);

    if (!mobile) {
      setFormMessage({ type: "error", text: "Mobile number is required" });
      return;
    }

    if (!/^\d{10}$/.test(mobile)) {
      setFormMessage({ type: "error", text: "Enter a valid 10 digit mobile number." });
      return;
    }

    if (!msg91Config?.configured || !msg91Ready || !window.sendOtp) {
      setFormMessage({ type: "error", text: "OTP service is still loading. Please try again in a moment." });
      return;
    }

    setOtpPhase("loading");
    setOtpMobile(mobile);

    window.sendOtp(
      `91${mobile}`,
      () => {
        setOtpPhase("sent");
        setOtpModalOpen(true);
        setFormMessage({ type: "success", text: "OTP sent to your mobile number." });
      },
      (error) => {
        console.error("[msg91] send otp failed", error);
        setOtpPhase("idle");
        setFormMessage({ type: "error", text: "OTP could not be sent. Please try again." });
      },
    );
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const mobile = normalizeMobile(otpMobile);
    const otp = otpValue.replace(/\D/g, "");

    if (!/^\d{10}$/.test(mobile)) {
      setFormMessage({ type: "error", text: "Enter a valid 10 digit mobile number." });
      return;
    }

    if (otp.length < 4) {
      setFormMessage({ type: "error", text: "Enter the OTP received on your mobile." });
      return;
    }

    if (!window.verifyOtp) {
      setFormMessage({ type: "error", text: "OTP service is still loading. Please try again." });
      return;
    }

    setOtpPhase("verifying");

    window.verifyOtp(
      otp,
      async (data) => {
        const accessToken = extractMsg91AccessToken(data);

        if (!accessToken) {
          setOtpPhase("sent");
          setFormMessage({ type: "error", text: "OTP verified, but MSG91 did not return a secure token." });
          return;
        }

        try {
          const response = await fetch("/api/auth/msg91/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mobile,
              accessToken,
              fullName: fullNameForOtp.trim() || undefined,
              email: emailForOtp.trim().toLowerCase() || undefined,
            }),
          });
          const result = (await response.json()) as Msg91VerifyResponse;

          if (!response.ok) {
            throw new Error(result.message || "OTP login failed.");
          }

          trackLogin("msg91_otp");
          if (result.isNew) trackSignup();
          setFormMessage({ type: "success", text: result.message || "Mobile verified successfully." });
          window.location.assign(result.destination || "/customer/dashboard");
        } catch (error) {
          const message = error instanceof Error ? error.message : "OTP login failed. Please try again.";
          setOtpPhase("sent");
          setFormMessage({ type: "error", text: message });
          toastError(message);
        }
      },
      (error) => {
        console.error("[msg91] verify otp failed", error);
        setOtpPhase("sent");
        setFormMessage({ type: "error", text: "Incorrect or expired OTP. Please try again." });
      },
    );
  }

  function handleResendOtp() {
    if (!window.retryOtp) return;
    setOtpPhase("resending");
    window.retryOtp(
      null,
      () => {
        setOtpPhase("sent");
        setFormMessage({ type: "success", text: "OTP resent successfully." });
      },
      () => {
        setOtpPhase("sent");
        setFormMessage({ type: "error", text: "OTP could not be resent. Please try again." });
      },
    );
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
      <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--secondary)]">Mobile OTP Login</p>
      <h1 className="mt-2 text-3xl font-semibold leading-tight text-slate-950">Login to Your DigiConnect Dashboard</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600 md:text-base md:leading-7">
        Verify your mobile number with OTP. Existing customers are logged in, and new customers are created automatically.
      </p>

      <form onSubmit={handleSendOtp} className="mt-7 grid gap-3 text-left">
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
              value={otpMobile}
              onChange={(event) => setOtpMobile(normalizeMobile(event.target.value))}
              disabled={otpPhase === "loading" || otpPhase === "verifying"}
              className="h-[3.15rem] bg-white/74 pl-11 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
            />
          </div>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">Full Name optional</span>
            <Input value={fullNameForOtp} onChange={(event) => setFullNameForOtp(event.target.value)} placeholder="Your name" className="h-[3.15rem] bg-white/74 text-base" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">Email optional</span>
            <Input value={emailForOtp} onChange={(event) => setEmailForOtp(event.target.value)} placeholder="you@example.com" type="email" className="h-[3.15rem] bg-white/74 text-base" />
          </label>
        </div>

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
          disabled={otpPhase === "loading" || otpPhase === "verifying" || !msg91Config?.configured}
          className="h-[3.15rem] w-full rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 text-base font-bold shadow-lg shadow-blue-600/20 transition active:scale-[0.98]"
        >
          {otpPhase === "loading" ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Phone className="h-4 w-4" />}
          {otpPhase === "loading" ? "Sending OTP..." : "Continue with Mobile OTP"}
        </Button>
      </form>

      {otpModalOpen ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 p-4 backdrop-blur-sm sm:items-center">
          <form onSubmit={handleVerifyOtp} className="w-full max-w-md rounded-[1.75rem] border border-white/20 bg-white p-5 text-left shadow-2xl md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Secure Verification</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950">Enter OTP</h2>
                <p className="mt-1 text-sm text-slate-600">Sent to +91 {otpMobile}</p>
              </div>
              <button type="button" onClick={() => setOtpModalOpen(false)} className="rounded-full border border-slate-200 px-3 py-1 text-sm font-bold text-slate-600">
                Close
              </button>
            </div>

            <Input
              value={otpValue}
              onChange={(event) => setOtpValue(event.target.value.replace(/\D/g, "").slice(0, 8))}
              inputMode="numeric"
              autoFocus
              placeholder="Enter OTP"
              className="mt-5 h-14 rounded-2xl text-center text-2xl font-bold tracking-[0.35em]"
            />

            <Button type="submit" disabled={otpPhase === "verifying"} className="mt-5 h-12 w-full rounded-2xl bg-slate-950 text-base font-bold text-white">
              {otpPhase === "verifying" ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {otpPhase === "verifying" ? "Verifying..." : "Verify and Login"}
            </Button>
            <button type="button" onClick={handleResendOtp} disabled={otpPhase === "resending" || otpPhase === "verifying"} className="mt-3 h-11 w-full rounded-2xl text-sm font-bold text-blue-700 disabled:opacity-50">
              {otpPhase === "resending" ? "Resending..." : "Resend OTP"}
            </button>
          </form>
        </div>
      ) : null}

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
