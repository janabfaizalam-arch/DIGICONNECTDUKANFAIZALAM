"use client";

import { type FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { Input } from "@/components/ui/input";
import { FormSubmitButton } from "@/components/ui/loading";
import { trackLogin } from "@/lib/google-analytics";
import { createClient } from "@/lib/supabase/browser";

const agentAccessError = "Your agent access is not active. Please contact admin.";

export function AgentLoginCard() {
  const { error: toastError } = useToast();
  const [isPending, setIsPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");

  async function handleAgentLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    setFormError("");
    setIsPending(true);

    try {
      const supabase = createClient();

      if (!supabase) {
        throw new Error("Supabase environment variables are missing.");
      }

      const formData = new FormData(event.currentTarget);
      const email = String(formData.get("email") ?? "").trim().toLowerCase();
      const password = String(formData.get("password") ?? "");

      if (!email || !password) {
        throw new Error("Please enter your email and password.");
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        throw error;
      }

      const accessResponse = await fetch("/api/auth/agent-access", {
        method: "GET",
        cache: "no-store",
      });
      const access = (await accessResponse.json()) as {
        ok?: boolean;
        reason?: string;
        role?: string | null;
        message?: string;
      };

      if (!accessResponse.ok || !access.ok) {
        console.error("[agent-login] Agent access denied.", {
          userId: data.user?.id,
          reason: access.reason,
          role: access.role,
          message: access.message,
        });
        await supabase.auth.signOut();
        throw new Error(agentAccessError);
      }

      trackLogin("agent_email");
      window.location.assign("/agent/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Agent login failed. Please try again.";
      setFormError(message);
      toastError(message);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="glass-panel shadow-soft w-full max-w-md rounded-[1.5rem] border border-white/20 p-5 text-center md:p-7">
      <Image
        src="/logo-navbar.png"
        alt="DigiConnect Dukan Logo"
        width={260}
        height={111}
        priority
        className="mx-auto h-auto w-48 object-contain md:w-56"
      />
      <p className="mt-2 text-[0.68rem] font-bold uppercase leading-tight tracking-[0.14em] text-slate-500">
        DigiConnect Dukan
      </p>
      <h1 className="mt-6 text-3xl font-semibold leading-tight text-slate-950">Agent Login</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600 md:text-base">
        Login to manage your leads, applications and commissions.
      </p>

      <form onSubmit={handleAgentLogin} className="mt-6 grid gap-3 text-left" aria-busy={isPending}>
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-700">Email</span>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="agent@example.com"
              disabled={isPending}
              className="h-[3.15rem] bg-white/75 pl-11 text-base"
            />
          </div>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-700">Password</span>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="Password"
              disabled={isPending}
              className="h-[3.15rem] bg-white/75 px-11 text-base"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              disabled={isPending}
              className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/70 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>

        {formError ? (
          <p className="rounded-2xl bg-orange-50 px-4 py-3 text-sm font-medium text-orange-700" role="alert">
            {formError}
          </p>
        ) : null}

        <FormSubmitButton
          loading={isPending}
          loadingText="Signing in..."
          icon={<LockKeyhole className="h-4 w-4" />}
          className="h-[3.15rem] w-full rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-orange-500 text-base font-bold shadow-lg shadow-blue-600/20"
        >
          Agent Login
        </FormSubmitButton>
      </form>

      <div className="mt-5 flex items-center justify-between gap-3 text-sm">
        <Link href="/login/customer" className="font-bold text-blue-700 transition hover:text-blue-900">
          Customer Login
        </Link>
        <span className="text-right text-xs font-semibold text-slate-500">Agent access is provided by admin only.</span>
      </div>

      <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
        <ShieldCheck className="h-4 w-4 text-emerald-600" />
        Secure Supabase authentication
      </div>
    </div>
  );
}
