"use client";

import { type FormEvent, useState } from "react";
import Image from "next/image";
import { LoaderCircle, LockKeyhole } from "lucide-react";

import { GoogleIcon } from "@/components/auth/google-icon";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type LoginCardProps = {
  title?: string;
  eyebrow?: string;
  description?: string;
};

export function LoginCard({
  title = "Customer Login",
  eyebrow = "Secure Login",
  description = "Sign in and continue to your secure DigiConnect Dukan workspace.",
}: LoginCardProps) {
  const { showToast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const [isPasswordPending, setIsPasswordPending] = useState(false);

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
        if (typeof window === "undefined") {
          return;
        }

        window.location.assign(data.url);
        return;
      }

      throw new Error("Google login URL could not be generated. Please try again.");
    } catch (error) {
      setIsPending(false);
      showToast(error instanceof Error ? error.message : "Network issue. Please try again.", "error");
    }
  };

  const handlePasswordLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsPasswordPending(true);

    try {
      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        throw new Error("Supabase environment variables are missing.");
      }

      const formData = new FormData(event.currentTarget);
      const email = String(formData.get("email") ?? "").trim();
      const password = String(formData.get("password") ?? "");
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        throw error;
      }

      if (typeof window === "undefined") {
        return;
      }

      window.location.assign("/login");
    } catch (error) {
      setIsPasswordPending(false);
      showToast(error instanceof Error ? error.message : "Login failed. Please try again.", "error");
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
      <p className="mt-6 text-sm font-medium uppercase tracking-[0.18em] text-[var(--secondary)]">{eyebrow}</p>
      <h1 className="mt-3 text-3xl font-bold text-slate-950">{title}</h1>
      <p className="mt-4 text-base leading-relaxed text-slate-600">{description}</p>
      <p className="mt-1 text-sm text-slate-500">Fast, secure, and role-based access</p>

      <form onSubmit={handlePasswordLogin} className="mt-6 grid gap-3 text-left">
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="h-12 rounded-2xl border bg-white px-4 text-sm text-slate-900 outline-none"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="Password"
          className="h-12 rounded-2xl border bg-white px-4 text-sm text-slate-900 outline-none"
        />
        <Button type="submit" disabled={isPasswordPending} className="h-12 w-full rounded-2xl">
          {isPasswordPending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
          Login
        </Button>
      </form>

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
        Your session will be created automatically and redirected according to your account role.
      </div>
    </div>
  );
}
