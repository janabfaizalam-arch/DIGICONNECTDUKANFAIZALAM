"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function CustomerPinLoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pinCreated = searchParams.get("pinCreated") === "1";
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/auth/customer/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, pin }),
    });
    const data = (await response.json()) as { error?: string; redirectTo?: string };
    if (!response.ok) {
      setError(data.error ?? "Login failed");
      setLoading(false);
      return;
    }

    router.refresh();
    router.push(data.redirectTo || "/customer/dashboard");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {pinCreated ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          PIN successfully created. Login with mobile and PIN.
        </p>
      ) : null}

      <label className="block text-sm">
        WhatsApp Mobile Number
        <div className="mt-1 flex overflow-hidden rounded-xl border border-slate-300 bg-white">
          <span className="flex items-center bg-slate-50 px-3 text-sm text-slate-600">+91</span>
          <input
            inputMode="numeric"
            required
            value={phone}
            onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="9876543210"
            className="w-full px-3 py-2 outline-none"
          />
        </div>
      </label>

      <label className="block text-sm">
        6-Digit PIN
        <div className="mt-1 flex overflow-hidden rounded-xl border border-slate-300 bg-white">
          <input
            type={showPin ? "text" : "password"}
            inputMode="numeric"
            required
            pattern="\d{6}"
            maxLength={6}
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
            className="w-full px-3 py-2 outline-none tracking-widest"
          />
          <button type="button" className="px-3 text-sm text-slate-600" onClick={() => setShowPin((v) => !v)}>
            {showPin ? "Hide" : "Show"}
          </button>
        </div>
      </label>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={loading || pin.length !== 6}
        className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {loading ? "Logging in…" : "Login"}
      </button>

      <div className="space-y-2 text-sm text-slate-600">
        <div className="flex justify-between">
          <Link href="/customer/forgot-pin" className="underline">
            Forgot / Create PIN
          </Link>
          <Link href="/customer/signup" className="underline">
            New Customer Signup
          </Link>
        </div>
        <p className="text-xs text-slate-500">Existing customers can create their PIN using WhatsApp OTP.</p>
      </div>
    </form>
  );
}

export function CustomerPinLoginForm() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Loading…</div>}>
      <CustomerPinLoginFormInner />
    </Suspense>
  );
}
