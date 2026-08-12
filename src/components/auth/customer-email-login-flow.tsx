"use client";

import { AtSign, KeyRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AuthButton, AuthHeading, GlassCard, TextField } from "@/components/auth/ui";
import { messageFor, postJson } from "@/components/auth/ui/request";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { useToast } from "@/components/providers/toast-provider";

const CALLBACK_ERRORS: Record<string, string> = {
  oauth: "That sign-in did not complete. Please try again.",
  link_expired: "That link has expired. Please request a new one.",
  missing_code: "That link is incomplete. Please request a new one.",
  unavailable: "Sign-in is unavailable right now. Please try again shortly.",
};

export function CustomerEmailLoginFlow({ initialError }: { initialError?: string }) {
  const { error: toastError } = useToast();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    initialError ? (CALLBACK_ERRORS[initialError] ?? initialError) : null,
  );
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  async function submit() {
    if (loading) return;
    setError(null);
    setNeedsConfirmation(false);

    if (!identifier.trim() || !password) {
      setError("Enter your email or mobile number and password.");
      return;
    }

    setLoading(true);
    try {
      const result = await postJson<{ error?: string; redirectTo?: string; needsConfirmation?: boolean }>(
        "/api/auth/customer/signin",
        { identifier, password },
      );

      if (!result.ok) {
        const message = messageFor(result, "Sign in failed.");
        setNeedsConfirmation(Boolean(result.data?.needsConfirmation));
        setError(message);
        toastError(message);
        return;
      }

      // Full navigation so the new session cookie is picked up server-side.
      window.location.replace(result.data.redirectTo || "/customer/dashboard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlassCard>
      <AuthHeading title="Welcome back" subtitle="Sign in with your email or mobile number." />

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
          onChange={(event) => setIdentifier(event.target.value)}
        />

        <TextField
          label="Password"
          icon={<KeyRound className="h-4 w-4" />}
          secure
          value={password}
          autoComplete="current-password"
          disabled={loading}
          error={error}
          onChange={(event) => setPassword(event.target.value)}
        />

        {needsConfirmation ? (
          <p className="rounded-xl bg-amber-50 p-3 text-xs font-semibold leading-relaxed text-amber-800">
            Your email is not confirmed yet. Open the confirmation link we sent you, then sign in again.
          </p>
        ) : null}

        <div className="flex justify-end">
          <Link
            href="/customer/forgot-password"
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <AuthButton type="submit" loading={loading} loadingText="Signing in…" disabled={!identifier.trim() || !password}>
          Sign in
        </AuthButton>
      </form>

      <SocialAuthButtons disabled={loading} onError={(message) => setError(message)} />

      <p className="text-center text-sm text-slate-500">
        New here?{" "}
        <Link href="/customer/signup" className="font-semibold text-blue-600 hover:underline">
          Create an account
        </Link>
      </p>
    </GlassCard>
  );
}
