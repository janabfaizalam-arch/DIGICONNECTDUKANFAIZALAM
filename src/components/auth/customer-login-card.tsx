"use client";

import { type FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, UserRound } from "lucide-react";

import { GoogleIcon } from "@/components/auth/google-icon";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isCustomerProfileComplete, type CustomerProfile } from "@/lib/customer-profile-shared";
import { createClient } from "@/lib/supabase/browser";

type EmailMode = "login" | "signup";
type FormMessage = { type: "success" | "error"; text: string };

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

async function getEmailCustomerDestination(supabase: NonNullable<ReturnType<typeof createClient>>, userId: string) {
  const { data, error } = await supabase
    .from("customer_profiles")
    .select("full_name, mobile, email, address, city, state, pincode, profile_completed")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return "/customer/profile";
  }

  const profile = data as Partial<CustomerProfile> | null;

  return profile?.profile_completed === true || isCustomerProfileComplete(profile)
    ? "/customer/dashboard"
    : "/customer/profile";
}

export function CustomerLoginCard() {
  const { error: toastError } = useToast();
  const [isGooglePending, setIsGooglePending] = useState(false);
  const [isEmailPending, setIsEmailPending] = useState(false);
  const [emailMode, setEmailMode] = useState<EmailMode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [formMessage, setFormMessage] = useState<FormMessage | null>(null);

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

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormMessage(null);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    if (emailMode === "signup" && !name) {
      setFormMessage({ type: "error", text: "Full name is required." });
      return;
    }

    if (!isValidEmail(email)) {
      setFormMessage({ type: "error", text: "Please enter a valid email address." });
      return;
    }

    if (password.length < 6) {
      setFormMessage({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }

    setIsEmailPending(true);

    try {
      const supabase = createClient();

      if (!supabase) {
        throw new Error("Supabase environment variables are missing.");
      }

      if (emailMode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          throw error;
        }

        if (!data.user) {
          throw new Error("Login succeeded but user details could not be loaded.");
        }

        window.location.assign(await getEmailCustomerDestination(supabase, data.user.id));
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
        },
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        window.location.assign("/customer/profile");
        return;
      }

      setFormMessage({ type: "success", text: "Please check your email to confirm your account." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Email access failed. Please try again.";
      setFormMessage({ type: "error", text: message });
      toastError(message);
    } finally {
      setIsEmailPending(false);
    }
  }

  function toggleEmailMode() {
    setEmailMode((current) => (current === "login" ? "signup" : "login"));
    setFormMessage(null);
    setShowPassword(false);
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
        Access your applications, upload documents and track your service status.
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

      <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        or continue with email
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <form onSubmit={handleEmailSubmit} className="grid gap-3 text-left">
        {emailMode === "signup" ? (
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">Full Name</span>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                name="name"
                type="text"
                autoComplete="name"
                required
                placeholder="Enter your full name"
                disabled={isEmailPending}
                className="h-[3.15rem] bg-white/74 pl-11 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
              />
            </div>
          </label>
        ) : null}

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-700">Email</span>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              disabled={isEmailPending}
              className="h-[3.15rem] bg-white/74 pl-11 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
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
              autoComplete={emailMode === "signup" ? "new-password" : "current-password"}
              required
              minLength={6}
              placeholder="Minimum 6 characters"
              disabled={isEmailPending}
              className="h-[3.15rem] bg-white/74 px-11 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              disabled={isEmailPending}
              className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/70 hover:text-slate-800 disabled:opacity-50"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>

        {formMessage ? (
          <p
            className={`rounded-2xl px-4 py-3 text-sm font-medium ${
              formMessage.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"
            }`}
          >
            {formMessage.text}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={isEmailPending || isGooglePending}
          className="h-[3.15rem] w-full rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 text-base font-bold shadow-lg shadow-blue-600/20 transition active:scale-[0.98]"
        >
          {isEmailPending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Mail className="h-4 w-4" />}
          {emailMode === "signup" ? "Create Account" : "Login with Email"}
        </Button>
      </form>

      <button
        type="button"
        onClick={toggleEmailMode}
        className="mt-4 text-sm font-bold text-[var(--primary)] transition hover:text-blue-800"
      >
        {emailMode === "signup" ? "Already have an account? Login" : "New customer? Create account"}
      </button>

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
