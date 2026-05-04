"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";

import { GoogleIcon } from "@/components/auth/google-icon";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/browser";

export function CustomerLoginCard() {
  const { error: toastError } = useToast();
  const [isGooglePending, setIsGooglePending] = useState(false);

  async function handleGoogleLogin() {
    setIsGooglePending(true);

    try {
      const supabase = createClient();

      if (!supabase) {
        throw new Error("Supabase environment variables are missing.");
      }

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${siteUrl}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data.url) {
        window.location.assign(data.url);
        return;
      }

      throw new Error("Google login URL could not be generated. Please try again.");
    } catch (error) {
      toastError(error instanceof Error ? error.message : "Google login failed. Please try again.");
      setIsGooglePending(false);
    }
  }

  return (
    <div className="glass-panel shadow-soft relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 p-5 text-center md:p-7">
      <Image
        src="/logo-navbar.png"
        alt="DigiConnect Dukan Logo"
        width={260}
        height={111}
        priority
        className="mx-auto h-auto w-48 object-contain md:w-56"
      />
      <p className="mt-2 text-[0.68rem] font-bold uppercase leading-tight tracking-[0.14em] text-slate-500">
        Powered By RNoS India Pvt Ltd
      </p>
      <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--secondary)]">Customer Login</p>
      <h1 className="mt-2 text-3xl font-semibold leading-tight text-slate-950">Login to DigiConnect Dukan</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600 md:text-base md:leading-7">
        Continue securely to track applications, upload documents and manage your services.
      </p>

      <Button
        type="button"
        size="lg"
        onClick={handleGoogleLogin}
        disabled={isGooglePending}
        className="mt-7 h-[3.25rem] w-full rounded-2xl bg-white/88 text-base font-bold text-slate-900 shadow-[0_18px_42px_rgba(15,23,42,0.12)] ring-1 ring-white/45 transition hover:bg-white active:scale-[0.98]"
      >
        {isGooglePending ? <LoaderCircle className="h-5 w-5 animate-spin text-[var(--primary)]" /> : <GoogleIcon />}
        Continue with Google
      </Button>

      <div className="mt-6 rounded-2xl border border-white/15 bg-white/25 p-3 text-center backdrop-blur-md">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Team access</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <Link href="/login/agent" className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/15 bg-white/35 px-4 text-sm font-bold text-blue-700 transition hover:bg-white/55">
            Agent Login
          </Link>
          <Link href="/login/staff" className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/15 bg-white/35 px-4 text-sm font-bold text-blue-700 transition hover:bg-white/55">
            Staff Login
          </Link>
        </div>
      </div>
    </div>
  );
}
