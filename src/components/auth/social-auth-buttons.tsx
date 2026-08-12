"use client";

import { useState } from "react";

import { FacebookIcon } from "@/components/auth/facebook-icon";
import { GoogleIcon } from "@/components/auth/google-icon";
import { createClient } from "@/lib/supabase/browser";

type Provider = "google" | "facebook";

const LABELS: Record<Provider, string> = {
  google: "Continue with Google",
  facebook: "Continue with Facebook",
};

/**
 * Google / Facebook sign-in.
 *
 * Both land on /auth/callback, which exchanges the code for a session and
 * creates the customer record — so social sign-in and sign-up are the same
 * button, exactly as customers expect.
 */
export function SocialAuthButtons({
  next = "/customer/dashboard",
  disabled,
  onError,
}: {
  next?: string;
  disabled?: boolean;
  onError?: (message: string) => void;
}) {
  const [busy, setBusy] = useState<Provider | null>(null);

  async function signIn(provider: Provider) {
    if (busy || disabled) return;
    setBusy(provider);

    try {
      const supabase = createClient();
      if (!supabase) {
        onError?.("Sign-in is unavailable right now. Please try again shortly.");
        return;
      }

      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });

      if (error) {
        // Most common cause is the provider not being enabled in Supabase yet.
        console.error("[social-auth] start_failed", { provider, message: error.message });
        onError?.(`${LABELS[provider]} is not available yet. Please use email instead.`);
      }
      // On success the browser navigates away; no state to reset.
    } catch {
      onError?.("Could not start sign-in. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">or</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      {(["google", "facebook"] as Provider[]).map((provider) => (
        <button
          key={provider}
          type="button"
          disabled={disabled || busy !== null}
          onClick={() => void signIn(provider)}
          className="inline-flex h-[52px] w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-[15px] font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.99] disabled:opacity-50"
        >
          {provider === "google" ? <GoogleIcon /> : <FacebookIcon />}
          {busy === provider ? "Redirecting…" : LABELS[provider]}
        </button>
      ))}
    </div>
  );
}
