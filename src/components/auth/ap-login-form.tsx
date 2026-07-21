"use client";

import Link from "next/link";
import { Lock, UserRound, ArrowUpRight } from "lucide-react";
import { useRef, useState } from "react";

import { useToast } from "@/components/providers/toast-provider";
import { AuthButton, AuthHeading, GlassCard, TextField } from "@/components/auth/ui";
import { postJson } from "@/components/auth/ui/request";
import { trackLogin } from "@/lib/google-analytics";
import { createClient } from "@/lib/supabase/browser";

/**
 * Agency Partner / Agent login. Preserves the existing two-stage backend flow:
 *   1) POST /api/auth/agent-login  (agent credentials)
 *   2) fallback to Supabase password auth for agency partners
 * Only the presentation is redesigned; the API contract is unchanged.
 */
export function ApLoginForm() {
  const { error: toastError, success: toastSuccess } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const submittingRef = useRef(false);

  function fail(message: string) {
    setError(message);
    toastError(message);
  }

  async function submit() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError(null);

    const identifier = username.trim();
    try {
      if (!identifier || password.length < 6) {
        setError("Enter your username and password.");
        return;
      }

      // Stage 1 — agent login
      const agent = await postJson<{ message?: string; destination?: string }>("/api/auth/agent-login", {
        identifier,
        password,
      });

      if (agent.ok) {
        trackLogin("agent_email");
        toastSuccess("Agent workspace ready!");
        setDone(true);
        window.location.assign(agent.data.destination || "/ap/dashboard");
        return;
      }

      // Explicit denial → do not fall back
      if (agent.status === 403) {
        fail(agent.data?.message || "Access denied. Please contact admin.");
        return;
      }

      if (agent.timedOut) {
        fail("Request timed out. Please try again.");
        return;
      }

      // Stage 2 — Supabase agency-partner auth fallback
      const supabase = createClient();
      if (!supabase) {
        fail("Authentication service is unavailable. Please try again later.");
        return;
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: identifier.toLowerCase(),
        password,
      });

      if (authError) {
        fail(
          authError.message === "Invalid login credentials"
            ? "Invalid username or password. Please verify your credentials."
            : authError.message,
        );
        return;
      }

      toastSuccess("Partner workspace logged in!");
      setDone(true);
      window.location.assign("/ap/dashboard");
    } catch {
      fail("Login failed. Please try again.");
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  return (
    <GlassCard>
      <AuthHeading title="Partner Login" subtitle="Access your DigiConnect Partner dashboard." />

      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <TextField
          label="Username"
          icon={<UserRound className="h-4 w-4" />}
          value={username}
          disabled={loading}
          autoComplete="username"
          onChange={(e) => setUsername(e.target.value)}
        />
        <TextField
          label="Password"
          secure
          icon={<Lock className="h-4 w-4" />}
          value={password}
          disabled={loading}
          autoComplete="current-password"
          error={error}
          onChange={(e) => setPassword(e.target.value)}
        />

        <AuthButton type="submit" loading={loading} loadingText="Accessing workspace…" status={done ? "success" : "idle"}>
          Sign In
        </AuthButton>
      </form>

      <div className="flex flex-col items-center gap-3 border-t border-slate-100 pt-4 text-center">
        <div className="flex items-center gap-4 text-sm font-semibold text-slate-500">
          <Link href="/ap/forgot-password" className="hover:text-slate-900 hover:underline">
            Forgot password?
          </Link>
          <span className="text-slate-200">|</span>
          <Link href="/ap/support" className="hover:text-slate-900 hover:underline">
            Partner support
          </Link>
        </div>
        <Link href="/services" className="inline-flex items-center gap-1 text-sm font-semibold text-orange-600 hover:underline">
          Become a DigiConnect Partner <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </GlassCard>
  );
}
