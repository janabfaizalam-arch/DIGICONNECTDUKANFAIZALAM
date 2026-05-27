"use client";

import { type FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, Eye, EyeOff, ArrowRight } from "lucide-react";

import { createClient } from "@/lib/supabase/browser";

export default function APLoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    setError("");
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }

    startTransition(async () => {
      try {
        const supabase = createClient();
        if (!supabase) throw new Error("Missing Supabase configuration");
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

        if (authError) {
          setError(authError.message === "Invalid login credentials"
            ? "Invalid email or password. Please check your credentials."
            : authError.message);
          return;
        }

        router.push("/ap/dashboard");
        router.refresh();
      } catch {
        setError("Login failed. Please try again.");
      }
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 px-4 py-10">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-violet-500/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo / Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl shadow-blue-500/25">
            <KeyRound className="h-8 w-8 text-white" />
          </div>
          <h1 className="mt-5 text-3xl font-bold text-white">Agency Partner Login</h1>
          <p className="mt-2 text-sm text-slate-400">
            DigiConnect Dukan — Partner Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl md:p-8">
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="ap-email" className="block text-sm font-semibold text-slate-300">
                Email Address
              </label>
              <input
                id="ap-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="partner@example.com"
                required
                className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="ap-password" className="block text-sm font-semibold text-slate-300">
                Password
              </label>
              <div className="relative">
                <input
                  id="ap-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 pr-12 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error ? (
              <p className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm font-medium text-red-400" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isPending}
              className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30 disabled:opacity-50"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign In
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              )}
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link
              href="/ap/forgot-password"
              className="text-sm font-medium text-blue-400 hover:text-blue-300 transition"
            >
              Forgot your password?
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Not a partner?{" "}
          <Link href="/" className="font-medium text-slate-400 hover:text-white transition">
            Visit DigiConnect Dukan
          </Link>
        </p>
      </div>
    </main>
  );
}
