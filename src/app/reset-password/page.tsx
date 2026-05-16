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
    <main className="relative isolate min-h-screen overflow-hidden px-4 py-8 md:px-8 md:py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_10%,rgba(37,99,235,0.18),transparent_30%),radial-gradient(circle_at_86%_18%,rgba(249,115,22,0.12),transparent_26%),linear-gradient(180deg,#fbfdff_0%,#eef6ff_52%,#f8fbff_100%)]" />

      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center">
        <section className="glass-panel shadow-soft relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 p-5 text-center md:p-7">
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
          <div className="mx-auto mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--secondary)]">Secure Reset</p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight text-slate-950">Create new password</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 md:text-base md:leading-7">
            Choose a strong password for your DigiConnect customer account.
          </p>

          {isSessionPending ? (
            <div className="mt-7 flex items-center justify-center gap-2 rounded-2xl bg-white/45 px-4 py-4 text-sm font-bold text-slate-600">
              <ButtonSpinner className="text-blue-700" />
              Verifying reset link...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-7 grid gap-3 text-left" aria-busy={isPending}>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">New Password</span>
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
                    className="h-[3.15rem] bg-white/74 px-11 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    disabled={isPending || !isSessionReady}
                    className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/70 hover:text-slate-800 disabled:opacity-50"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Confirm Password</span>
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
                    className="h-[3.15rem] bg-white/74 px-11 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((current) => !current)}
                    disabled={isPending || !isSessionReady}
                    className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/70 hover:text-slate-800 disabled:opacity-50"
                    aria-label={showConfirmPassword ? "Hide password confirmation" : "Show password confirmation"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              <div className="grid gap-2 rounded-2xl border border-white/15 bg-white/35 p-3">
                {passwordRules.map((rule) => (
                  <div key={rule.label} className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <CheckCircle2 className={`h-4 w-4 ${rule.valid ? "text-emerald-600" : "text-slate-300"}`} />
                    <span>{rule.label}</span>
                  </div>
                ))}
              </div>

              {message ? (
                <p
                  className={`rounded-2xl px-4 py-3 text-sm font-medium ${
                    message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"
                  }`}
                >
                  {message.text}
                </p>
              ) : null}

              <FormSubmitButton
                disabled={isPending || !isSessionReady}
                loading={isPending}
                loadingText="Updating password..."
                icon={<LockKeyhole className="h-4 w-4" />}
                className="h-[3.15rem] w-full rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 text-base font-bold shadow-lg shadow-blue-600/20 transition active:scale-[0.98]"
              >
                Update password
              </FormSubmitButton>
            </form>
          )}

          <Link
            href="/login/customer"
            className="mt-5 inline-flex items-center justify-center text-sm font-bold text-[var(--primary)] transition hover:text-blue-800"
          >
            Back to customer login
          </Link>
        </section>
      </div>
    </main>
  );
}
