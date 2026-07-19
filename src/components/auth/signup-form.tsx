"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PIN_REGEX = /^\d{6}$/;

export function SignupForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (!PIN_REGEX.test(pin)) {
      setError("PIN exactly 6 digits hona chahiye.");
      setLoading(false);
      return;
    }

    if (pin !== confirmPin) {
      setError("PIN aur Confirm PIN match nahi karte.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, mobile, pin }),
    });

    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(data.error ?? "Signup failed");
      setLoading(false);
      return;
    }

    router.push("/customer/login");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm">
        Full name
        <input
          required
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Email
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2"
          autoComplete="email"
        />
      </label>
      <label className="block text-sm">
        Mobile
        <input
          required
          value={mobile}
          onChange={(event) => setMobile(event.target.value.replace(/\D/g, "").slice(0, 10))}
          className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2"
          inputMode="numeric"
          placeholder="9876543210"
          autoComplete="tel"
        />
      </label>
      <label className="block text-sm">
        Create 6-digit PIN
        <input
          type="password"
          required
          inputMode="numeric"
          pattern="[0-9]{6}"
          minLength={6}
          maxLength={6}
          autoComplete="new-password"
          placeholder="Enter 6-digit PIN"
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
          className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Confirm PIN
        <input
          type="password"
          required
          inputMode="numeric"
          pattern="[0-9]{6}"
          minLength={6}
          maxLength={6}
          autoComplete="new-password"
          placeholder="Re-enter 6-digit PIN"
          value={confirmPin}
          onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
          className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2"
        />
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button type="submit" className="btn btn-primary w-full" disabled={loading || pin.length !== 6 || confirmPin.length !== 6}>
        {loading ? "Creating…" : "Sign up"}
      </button>
      <p className="text-center text-xs text-[var(--muted)]">
        Prefer WhatsApp OTP signup?{" "}
        <a href="/customer/signup" className="underline">
          /customer/signup
        </a>
      </p>
    </form>
  );
}
