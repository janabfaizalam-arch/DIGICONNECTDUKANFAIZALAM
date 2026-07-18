"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { OtpInput } from "@/components/auth/otp-input";

type Step = "phone" | "otp" | "pin";

export function CustomerForgotPinFlow() {
  const router = useRouter();
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

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function sendOtp() {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/auth/customer/forgot-pin/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = (await response.json()) as { error?: string; message?: string };
    setLoading(false);
    if (!response.ok) {
      setError(data.error ?? "Request failed");
      return;
    }
    setMessage(data.message ?? "Agar is number se account registered hai, to WhatsApp par OTP bhej diya gaya hai.");
    setCooldown(60);
    setStep("otp");
  }

  async function verifyOtp() {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/auth/customer/forgot-pin/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, otp }),
    });
    const data = (await response.json()) as { error?: string; verificationToken?: string };
    setLoading(false);
    if (!response.ok) {
      setError(data.error ?? "OTP verify failed");
      return;
    }
    setVerificationToken(data.verificationToken ?? "");
    setStep("pin");
  }

  async function resetPin() {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/auth/customer/forgot-pin/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, verificationToken, pin, confirmPin }),
    });
    const data = (await response.json()) as { error?: string; redirectTo?: string };
    setLoading(false);
    if (!response.ok) {
      setError(data.error ?? "PIN reset failed");
      return;
    }
    router.push(data.redirectTo || "/customer/login");
  }

  return (
    <div className="space-y-4">
      {step === "phone" ? (
        <>
          <label className="block text-sm">
            WhatsApp Mobile Number
            <div className="mt-1 flex overflow-hidden rounded-xl border border-slate-300 bg-white">
              <span className="bg-slate-50 px-3 py-2 text-sm">+91</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="w-full px-3 py-2 outline-none"
              />
            </div>
          </label>
          <button
            type="button"
            disabled={loading || phone.length !== 10}
            onClick={sendOtp}
            className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Sending…" : "Send OTP"}
          </button>
        </>
      ) : null}

      {step === "otp" ? (
        <>
          {message ? <p className="text-sm text-slate-600">{message}</p> : null}
          <OtpInput value={otp} onChange={setOtp} disabled={loading} />
          <button
            type="button"
            disabled={loading || otp.length !== 6}
            onClick={verifyOtp}
            className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            Verify OTP
          </button>
          <button type="button" disabled={cooldown > 0} onClick={sendOtp} className="w-full text-sm underline disabled:opacity-50">
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
          </button>
        </>
      ) : null}

      {step === "pin" ? (
        <>
          <label className="block text-sm">
            New 6-Digit PIN
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Confirm PIN
            <input
              type="password"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </label>
          <button
            type="button"
            disabled={loading || pin.length !== 6}
            onClick={resetPin}
            className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            Reset PIN
          </button>
        </>
      ) : null}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <p className="text-center text-sm">
        <Link href="/customer/login" className="underline">
          Back to login
        </Link>
      </p>
    </div>
  );
}
