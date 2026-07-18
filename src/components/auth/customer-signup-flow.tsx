"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { OtpInput } from "@/components/auth/otp-input";

type Step = "details" | "otp" | "pin";

export function CustomerSignupFlow() {
  const router = useRouter();
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

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function sendOtp() {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/auth/customer/send-signup-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        phone,
        address,
        pincode,
        district,
        state: stateName,
      }),
    });
    const data = (await response.json()) as { error?: string; maskedPhone?: string };
    setLoading(false);
    if (!response.ok) {
      setError(data.error ?? "OTP send failed");
      return;
    }
    setMaskedPhone(data.maskedPhone ?? "");
    setCooldown(60);
    setStep("otp");
  }

  async function verifyOtp() {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/auth/customer/verify-signup-otp", {
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

  async function completeSignup() {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/auth/customer/complete-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone,
        verificationToken,
        pin,
        confirmPin,
        acceptedTerms: true,
      }),
    });
    const data = (await response.json()) as { error?: string; redirectTo?: string };
    setLoading(false);
    if (!response.ok && response.status !== 201) {
      setError(data.error ?? "Signup failed");
      return;
    }
    router.refresh();
    router.push(data.redirectTo || "/customer/dashboard");
  }

  return (
    <div className="space-y-4">
      {step === "details" ? (
        <>
          <Field label="Full Name" value={fullName} onChange={setFullName} />
          <label className="block text-sm">
            WhatsApp Mobile Number
            <div className="mt-1 flex overflow-hidden rounded-xl border border-slate-300 bg-white">
              <span className="bg-slate-50 px-3 py-2 text-sm text-slate-600">+91</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="w-full px-3 py-2 outline-none"
                placeholder="9876543210"
                required
              />
            </div>
          </label>
          <Field label="Full Address" value={address} onChange={setAddress} />
          <Field label="Pincode" value={pincode} onChange={(v) => setPincode(v.replace(/\D/g, "").slice(0, 6))} />
          <Field label="District" value={district} onChange={setDistrict} />
          <Field label="State" value={stateName} onChange={setStateName} />
          <label className="flex items-start gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} />
            <span>
              I agree to the <Link href="/terms-and-conditions" className="underline">Terms</Link> and{" "}
              <Link href="/privacy-policy" className="underline">Privacy Policy</Link>.
            </span>
          </label>
          <button
            type="button"
            disabled={loading || !acceptedTerms || phone.length !== 10}
            onClick={sendOtp}
            className="w-full rounded-full bg-teal-800 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Sending…" : "Send WhatsApp OTP"}
          </button>
        </>
      ) : null}

      {step === "otp" ? (
        <>
          <p className="text-center text-sm text-slate-600">OTP bheja gaya: {maskedPhone}</p>
          <OtpInput value={otp} onChange={setOtp} disabled={loading} />
          <button
            type="button"
            disabled={loading || otp.length !== 6}
            onClick={verifyOtp}
            className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Verifying…" : "Verify OTP"}
          </button>
          <button
            type="button"
            disabled={cooldown > 0 || loading}
            onClick={sendOtp}
            className="w-full text-sm text-slate-600 underline disabled:no-underline disabled:opacity-50"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
          </button>
        </>
      ) : null}

      {step === "pin" ? (
        <>
          <p className="text-sm text-slate-600">6-digit login PIN set karein (OTP ke baad har baar OTP nahi chahiye).</p>
          <Field label="6-Digit PIN" value={pin} onChange={(v) => setPin(v.replace(/\D/g, "").slice(0, 6))} type="password" />
          <Field
            label="Confirm PIN"
            value={confirmPin}
            onChange={(v) => setConfirmPin(v.replace(/\D/g, "").slice(0, 6))}
            type="password"
          />
          <button
            type="button"
            disabled={loading || pin.length !== 6 || confirmPin.length !== 6}
            onClick={completeSignup}
            className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Create account & login"}
          </button>
        </>
      ) : null}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <p className="text-center text-sm text-slate-600">
        Already registered? <Link href="/customer/login" className="underline">Login</Link>
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none"
      />
    </label>
  );
}
