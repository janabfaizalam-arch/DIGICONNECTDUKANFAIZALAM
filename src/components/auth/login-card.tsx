"use client";

import { useState } from "react";
import Image from "next/image";
import { LoaderCircle } from "lucide-react";

import { GoogleIcon } from "@/components/auth/google-icon";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LoginCard() {
  const { showToast } = useToast();
  const [isPending, setIsPending] = useState(false);

  const handleGoogleLogin = async () => {
    setIsPending(true);

    try {
      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        throw new Error("Supabase environment variables are missing.");
      }

      if (!process.env.NEXT_PUBLIC_SITE_URL) {
        throw new Error("Site URL environment variable is missing.");
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
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
      setIsPending(false);
      showToast(error instanceof Error ? error.message : "Network issue. Please try again.", "error");
    }
  };

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
      <p className="mt-6 text-sm font-medium uppercase tracking-[0.18em] text-[var(--secondary)]">Secure Login</p>
      <h1 className="mt-3 text-3xl font-bold text-slate-950">Continue with Google</h1>
      <p className="mt-4 text-base leading-relaxed text-slate-600">Sign in with Google and track your services securely.</p>
      <p className="mt-1 text-sm text-slate-500">Fast, secure, and easy login</p>

      <Button
        type="button"
        size="lg"
        onClick={handleGoogleLogin}
        disabled={isPending}
        className="mt-8 h-14 w-full rounded-2xl bg-white text-slate-900 shadow-[0_20px_50px_rgba(15,23,42,0.12)] hover:bg-slate-50"
      >
        {isPending ? <LoaderCircle className="h-5 w-5 animate-spin text-[var(--primary)]" /> : <GoogleIcon />}
        Continue with Google
      </Button>

      <div className="mt-6 rounded-2xl bg-[var(--muted)] px-4 py-3 text-left text-sm text-slate-600">
        Your session will be created automatically and you will be redirected to the secure dashboard.
      </div>
    </div>
  );
}
