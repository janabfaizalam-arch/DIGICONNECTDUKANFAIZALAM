"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";

import { Input } from "@/components/ui/input";
import { ButtonSpinner, FormSubmitButton } from "@/components/ui/loading";
import { trackPasswordReset } from "@/lib/google-analytics";
import { createClient } from "@/lib/supabase/browser";

type PasswordRule = {
  label: string;
  valid: boolean;
};

function getPasswordRules(password: string): PasswordRule[] {
  return [
    { label: "Minimum 8 characters", valid: password.length >= 8 },
    { label: "Uppercase letter", valid: /[A-Z]/.test(password) },
    { label: "Lowercase letter", valid: /[a-z]/.test(password) },
    { label: "Number", valid: /[0-9]/.test(password) },
    { label: "Special character", valid: /[^a-zA-Z0-9]/.test(password) },
  ];
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [isSessionPending, setIsSessionPending] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const passwordRules = useMemo(() => getPasswordRules(password), [password]);
  const isPasswordStrong = passwordRules.every((rule) => rule.valid);

  useEffect(() => {
    let active = true;

    async function prepareRecoverySession() {
      const supabase = createClient();

      if (!supabase) {
        if (active) {
          setMessage({ type: "error", text: "Password reset is not configured on this device." });
          setIsSessionPending(false);
        }
        return;
      }

      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const tokenHash = url.searchParams.get("token_hash");
        const type = url.searchParams.get("type");
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const hashError = hashParams.get("error_description") || hashParams.get("error");

        if (hashError) {
          throw new Error(hashError);
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            throw error;
          }

          url.searchParams.delete("code");
          window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
        } else if (tokenHash && type === "recovery") {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery",
          });

          if (error) {
            throw error;
          }

          url.searchParams.delete("token_hash");
          url.searchParams.delete("type");
          window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            throw error;
          }

          window.history.replaceState({}, document.title, window.location.pathname);
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!active) {
          return;
        }

        if (!session) {
          setMessage({ type: "error", text: "Reset link is invalid or expired. Please request a new password reset link." });
          setIsSessionReady(false);
          return;
        }

        setIsSessionReady(true);
      } catch {
        if (active) {
          setMessage({ type: "error", text: "Reset link is invalid or expired. Please request a new password reset link." });
          setIsSessionReady(false);
        }
      } finally {
        if (active) {
          setIsSessionPending(false);
        }
      }
    }

    void prepareRecoverySession();

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    setMessage(null);

    if (!isSessionReady) {
      setMessage({ type: "error", text: "Reset link is invalid or expired. Please request a new password reset link." });
      return;
    }

    if (!isPasswordStrong) {
      setMessage({ type: "error", text: "Password must meet all strength requirements." });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    setIsPending(true);

    try {
      const supabase = createClient();

      if (!supabase) {
        throw new Error("Password reset is not configured on this device.");
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setIsSessionReady(false);
        throw new Error("Reset link is invalid or expired. Please request a new password reset link.");
      }

      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        throw new Error(error.message || "Password could not be updated. Please try again.");
      }

      setMessage({ type: "success", text: "Password updated successfully" });
      trackPasswordReset();
      setPassword("");
      setConfirmPassword("");

      await supabase.auth.signOut();

      window.setTimeout(() => {
        window.location.assign("/login/customer?reset=success");
      }, 2000);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Password could not be updated. Please try again.",
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="relative isolate min-h-[100dvh] overflow-hidden px-4 py-8 md:px-8 md:py-12 flex items-center justify-center"
      style={{
        background: "radial-gradient(circle at top center, rgba(37,99,235,0.08), transparent 50%), #F8FAFC"
      }}
    >
      {/* Decorative gradients */}
      <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-blue-500/5 blur-[120px]" />
      <div className="absolute -left-32 -bottom-32 h-96 w-96 rounded-full bg-indigo-500/5 blur-[120px]" />

      <div className="mx-auto flex w-full max-w-md items-center justify-center z-10">
        <section 
          className="relative w-full overflow-hidden rounded-[32px] p-6 text-center md:p-8 flex flex-col gap-5"
          style={{
            backdropFilter: "blur(30px)",
            WebkitBackdropFilter: "blur(30px)",
            background: "rgba(255, 255, 255, 0.72)",
            border: "1px solid rgba(255, 255, 255, 0.8)",
            boxShadow: "0 20px 60px rgba(15, 23, 42, 0.08)"
          }}
        >
          <div className="flex justify-center mb-1">
            <Image
              src="/logo-navbar.png"
              alt="DigiConnect Dukan Logo"
              width={120}
              height={36}
              priority
              className="h-[30px] w-auto object-contain"
            />
          </div>
          <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#64748B]">
            Powered By RNoS India Pvt Ltd
          </p>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--secondary)]">Secure Reset</p>
          <h1 className="text-3xl sm:text-[34px] font-extrabold tracking-tight text-[#0F172A] leading-[1.1] max-w-[320px] mx-auto">
            Create new password
          </h1>
          <p className="text-xs text-[#64748B] font-semibold leading-relaxed max-w-[300px] mx-auto">
            Choose a strong password for your DigiConnect customer account.
          </p>

          {isSessionPending ? (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-[20px] bg-white/40 px-4 py-4 text-xs font-bold text-slate-600 border border-slate-200/50">
              <ButtonSpinner className="text-blue-750" />
              Verifying reset link...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-4 text-left" aria-busy={isPending}>
              <label className="grid gap-1.5">
                <span className="text-xs font-bold text-[#64748B] ml-1">New Password</span>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Uppercase, lowercase, number, symbol"
                    disabled={isPending || !isSessionReady}
                    className="h-[58px] rounded-[20px] bg-white border border-slate-200/80 px-11 text-base text-[#0F172A] shadow-none outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_4px_rgba(37,99,235,0.10)] focus:ring-0 transition-all duration-200 ease-in-out"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    disabled={isPending || !isSessionReady}
                    className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/70 hover:text-slate-800 disabled:opacity-50 outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              <label className="grid gap-1.5">
                <span className="text-xs font-bold text-[#64748B] ml-1">Confirm Password</span>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Re-enter new password"
                    disabled={isPending || !isSessionReady}
                    className="h-[58px] rounded-[20px] bg-white border border-slate-200/80 px-11 text-base text-[#0F172A] shadow-none outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_4px_rgba(37,99,235,0.10)] focus:ring-0 transition-all duration-200 ease-in-out"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((current) => !current)}
                    disabled={isPending || !isSessionReady}
                    className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/70 hover:text-slate-800 disabled:opacity-50 outline-none"
                    aria-label={showConfirmPassword ? "Hide password confirmation" : "Show password confirmation"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              <div className="grid gap-2 rounded-2xl border border-slate-100 bg-slate-50/50 p-3">
                {passwordRules.map((rule) => (
                  <div key={rule.label} className="flex items-center gap-2 text-xs font-bold text-slate-600">
                    <CheckCircle2 className={`h-4 w-4 ${rule.valid ? "text-emerald-600" : "text-slate-300"}`} />
                    <span>{rule.label}</span>
                  </div>
                ))}
              </div>

              {message ? (
                <p
                  className={`rounded-2xl px-4 py-3 text-xs font-bold leading-normal ${
                    message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50/50 text-rose-700"
                  }`}
                >
                  {message.text}
                </p>
              ) : null}

              <FormSubmitButton
                disabled={isPending || !isSessionReady}
                loading={isPending}
                loadingText="Updating password..."
                className="w-full h-[58px] rounded-[20px] bg-gradient-to-br from-[#2563EB] to-[#4F46E5] text-white font-bold text-xs tracking-wide shadow-md shadow-blue-500/10 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 flex items-center justify-center gap-2"
              >
                Update password
              </FormSubmitButton>
            </form>
          )}

          <div className="text-center pt-2">
            <Link
              href="/login/customer"
              className="inline-flex items-center justify-center text-xs font-bold text-[#2563EB] transition hover:underline"
            >
              Back to customer login
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
