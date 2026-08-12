"use client";

import { AtSign } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AuthButton, AuthHeading, GlassCard, TextField } from "@/components/auth/ui";
import { messageFor, postJson } from "@/components/auth/ui/request";

export function CustomerForgotPasswordFlow() {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  async function submit() {
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      const result = await postJson<{ error?: string; message?: string }>(
        "/api/auth/customer/forgot-password",
        { identifier },
      );

      if (!result.ok) {
        const message = messageFor(result, "Could not send the reset link.");
        setError(message);
        return;
      }

      setSent(result.data.message ?? "If that account exists, a reset link is on its way.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <GlassCard>
        <AuthHeading title="Check your email" subtitle={sent} />
        <Link
          href="/customer/login"
          className="inline-flex h-[52px] w-full items-center justify-center rounded-2xl bg-blue-600 text-[15px] font-bold text-white transition hover:bg-blue-700"
        >
          Back to sign in
        </Link>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <AuthHeading
        title="Reset your password"
        subtitle="Enter your registered email or mobile number and we'll send a reset link."
      />

      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <TextField
          label="Email or mobile number"
          icon={<AtSign className="h-4 w-4" />}
          value={identifier}
          autoComplete="username"
          disabled={loading}
          error={error}
          onChange={(event) => setIdentifier(event.target.value)}
        />

        <AuthButton type="submit" loading={loading} loadingText="Sending…" disabled={!identifier.trim()}>
          Send reset link
        </AuthButton>
      </form>

      <p className="text-center text-sm text-slate-500">
        Remembered it?{" "}
        <Link href="/customer/login" className="font-semibold text-blue-600 hover:underline">
          Sign in
        </Link>
      </p>
    </GlassCard>
  );
}
