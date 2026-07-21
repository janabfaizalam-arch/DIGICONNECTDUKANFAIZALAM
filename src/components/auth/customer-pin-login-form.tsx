"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Smartphone, CheckCircle2 } from "lucide-react";
import { Suspense, useState } from "react";

import { useToast } from "@/components/providers/toast-provider";
import { AuthButton, AuthHeading, GlassCard, PhoneField, PinField } from "@/components/auth/ui";
import { messageFor, postJson } from "@/components/auth/ui/request";

function CustomerPinLoginFormInner() {
  const searchParams = useSearchParams();
  const pinCreated = searchParams.get("pinCreated") === "1";
  const { error: toastError } = useToast();

  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (loading) return;
    setError(null);

    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    if (!/^\d{6}$/.test(pin)) {
      setError("PIN must be exactly 6 digits.");
      return;
    }

    setLoading(true);
    try {
      const result = await postJson<{ error?: string; redirectTo?: string }>("/api/auth/customer/login", {
        phone,
        pin,
      });

      if (!result.ok) {
        const msg = messageFor(result, "Login failed. Please try again.");
        setError(msg);
        toastError(msg);
        return;
      }

      setDone(true);
      window.location.replace(result.data.redirectTo || "/customer/dashboard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlassCard>
      <AuthHeading
        title="Welcome back"
        subtitle="Login with your WhatsApp number and 6-digit PIN."
      />

      {pinCreated ? (
        <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>PIN created successfully. Login with your mobile and PIN.</span>
        </div>
      ) : null}

      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <PhoneField
          label="WhatsApp mobile number"
          icon={<Smartphone className="h-4 w-4" />}
          value={phone}
          disabled={loading}
          autoComplete="tel"
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
          success={/^[6-9]\d{9}$/.test(phone)}
        />

        <PinField value={pin} onChange={setPin} disabled={loading} error={error} onComplete={() => void submit()} />

        <AuthButton type="submit" loading={loading} loadingText="Signing in…" status={done ? "success" : "idle"} disabled={pin.length !== 6}>
          Login
        </AuthButton>
      </form>

      <div className="flex items-center justify-between text-sm">
        <Link href="/customer/forgot-pin" className="font-semibold text-blue-600 hover:underline">
          Forgot / Create PIN
        </Link>
        <Link href="/customer/signup" className="font-semibold text-slate-600 hover:text-slate-900 hover:underline">
          New signup
        </Link>
      </div>
      <p className="text-center text-xs font-medium text-slate-400">
        Existing customers can create their PIN using WhatsApp OTP.
      </p>
    </GlassCard>
  );
}

export function CustomerPinLoginForm() {
  return (
    <Suspense fallback={<GlassCard><p className="text-sm text-slate-500">Loading…</p></GlassCard>}>
      <CustomerPinLoginFormInner />
    </Suspense>
  );
}
