"use client";

import { type FormEvent, useState } from "react";
import Image from "next/image";
import { LoaderCircle, LockKeyhole } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/browser";

export function AgentLoginCard() {
  const { error: toastError } = useToast();
  const [isPending, setIsPending] = useState(false);

  async function handleAgentLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);

    try {
      const supabase = createClient();

      if (!supabase) {
        throw new Error("Supabase environment variables are missing.");
      }

      const formData = new FormData(event.currentTarget);
      const email = String(formData.get("email") ?? "").trim();
      const password = String(formData.get("password") ?? "");
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        throw error;
      }

      const user = data.user;
      let role = String(user?.user_metadata.role ?? "").toLowerCase();
      let active = true;

      if (user && role !== "agent") {
        const { data: profile } = await supabase.from("profiles").select("role, active, is_active").eq("id", user.id).maybeSingle();
        role = String(profile?.role ?? "").toLowerCase();
        active = profile?.active !== false && profile?.is_active !== false;
      }

      if (user && role !== "agent") {
        const { data: portalUser } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
        role = String(portalUser?.role ?? "").toLowerCase();
      }

      if (role !== "agent" || !active) {
        await supabase.auth.signOut();
        window.location.assign("/unauthorized");
        return;
      }

      window.location.assign("/agent/dashboard");
    } catch (error) {
      setIsPending(false);
      toastError(error instanceof Error ? error.message : "Agent login failed. Please try again.");
    }
  }

  return (
    <div className="glass-panel shadow-soft w-full max-w-md rounded-[2rem] border p-6 text-center md:p-8">
      <Image
        src="/logo-navbar.png"
        alt="DigiConnect Dukan Logo"
        width={260}
        height={111}
        priority
        className="mx-auto h-auto w-56 object-contain md:w-64"
      />
      <p className="mt-6 text-sm font-medium uppercase tracking-[0.18em] text-[var(--secondary)]">Agent Login</p>
      <h1 className="mt-3 text-3xl font-bold text-slate-950">Agent Dashboard Access</h1>
      <p className="mt-4 text-base leading-relaxed text-slate-600">
        Sign in with your agent email and password to track your leads, customers, applications, and commission.
      </p>

      <form onSubmit={handleAgentLogin} className="mt-6 grid gap-3 text-left">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">Email</span>
          <Input name="email" type="email" required placeholder="agent@example.com" disabled={isPending} />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">Password</span>
          <Input name="password" type="password" required placeholder="Password" disabled={isPending} />
        </label>
        <Button type="submit" disabled={isPending} className="h-12 w-full rounded-2xl">
          {isPending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
          Login to Agent Panel
        </Button>
      </form>

      <div className="mt-6 rounded-2xl bg-[var(--muted)] px-4 py-3 text-left text-sm text-slate-600">
        Google login and OTP are not enabled for agent accounts.
      </div>
    </div>
  );
}
