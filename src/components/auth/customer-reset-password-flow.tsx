"use client";

import { KeyRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { AuthButton, AuthHeading, GlassCard, TextField } from "@/components/auth/ui";
import { createClient } from "@/lib/supabase/browser";

/**
 * Set a new password.
 *
 * Reached only from the emailed reset link, which /auth/callback has already
 * exchanged for a short-lived session — so the recovery session itself is the
 * proof of ownership and no old password is asked for.
 */
export function CustomerResetPasswordFlow() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const supabase = createClient();
      if (!supabase) {
        if (!cancelled) {
          setChecking(false);
          setError("Password reset is unavailable right now.");
        }
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setHasSession(Boolean(data.session));
      setChecking(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function submit() {
    if (loading) return;
    setError(null);

    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      setError("Password must be at least 8 characters and include letters and numbers.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) {
        setError("Password reset is unavailable right now.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        console.error("[reset-password] update_failed", { message: updateError.message });
        setError("Could not update your password. The link may have expired — request a new one.");
        return;
      }

      setDone(true);
      window.setTimeout(() => window.location.replace("/customer/dashboard"), 1200);
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <GlassCard>
        <AuthHeading title="Checking your link" subtitle="One moment…" />
      </GlassCard>
    );
  }

  if (!hasSession) {
    return (
      <GlassCard>
        <AuthHeading
          title="This link is no longer valid"
          subtitle="Reset links expire after a short time and can only be used once."
        />
        <Link
          href="/customer/forgot-password"
          className="inline-flex h-[52px] w-full items-center justify-center rounded-2xl bg-blue-600 text-[15px] font-bold text-white transition hover:bg-blue-700"
        >
          Request a new link
        </Link>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <AuthHeading
        title={done ? "Password updated" : "Set a new password"}
        subtitle={done ? "Taking you to your dashboard." : "Choose something you haven't used before."}
      />

      {done ? null : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <TextField
            label="New password"
            icon={<KeyRound className="h-4 w-4" />}
            secure
            value={password}
            autoComplete="new-password"
            hint="At least 8 characters, with letters and numbers."
            disabled={loading}
            onChange={(event) => setPassword(event.target.value)}
          />
          <TextField
            label="Confirm new password"
            icon={<KeyRound className="h-4 w-4" />}
            secure
            value={confirmPassword}
            autoComplete="new-password"
            disabled={loading}
            error={error}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />

          <AuthButton
            type="submit"
            loading={loading}
            loadingText="Updating…"
            disabled={!password || !confirmPassword}
          >
            Update password
          </AuthButton>
        </form>
      )}
    </GlassCard>
  );
}
