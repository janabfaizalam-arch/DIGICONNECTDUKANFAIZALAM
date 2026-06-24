"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Eye, EyeOff, ShieldCheck } from "lucide-react";

import { createClient } from "@/lib/supabase/browser";
import { useToast } from "@/components/providers/toast-provider";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormSubmitButton } from "@/components/ui/loading";

export default function APResetPasswordPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    if (password.length < 6) {
      toastError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      toastError("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      try {
        const supabase = createClient();
        if (!supabase) {
          throw new Error("Could not initialize authentication client.");
        }

        const { error } = await supabase.auth.updateUser({
          password: password,
        });

        if (error) {
          throw error;
        }

        success("Password updated successfully. Please sign in.");
        router.push("/ap/login");
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Password reset failed.");
      }
    });
  }

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center bg-[#090D16] px-4 py-12 text-slate-100 overflow-hidden">
      {/* Decorative gradients */}
      <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-blue-500/10 blur-[120px]" />
      <div className="absolute -left-32 -bottom-32 h-96 w-96 rounded-full bg-indigo-500/10 blur-[120px]" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        <div className="text-center space-y-1.5">
          <div className="flex justify-center mb-1">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </div>
          <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#64748B]">
            RNOS Partner Network
          </p>
          <h1 className="text-3xl sm:text-[34px] font-extrabold tracking-tight text-white leading-[1.1] max-w-[320px] mx-auto">
            Reset Password
          </h1>
          <p className="text-xs text-slate-400 font-semibold leading-relaxed max-w-[300px] mx-auto">
            Enter your new DigiPartner password below.
          </p>
        </div>

        <Card 
          className="w-full border border-white/10 p-6 md:p-8 rounded-[32px] shadow-2xl flex flex-col gap-5 text-left"
          style={{
            backdropFilter: "blur(30px)",
            WebkitBackdropFilter: "blur(30px)",
            background: "rgba(15, 23, 42, 0.45)",
          }}
        >
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 ml-1">New Password</label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-4.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-[58px] w-full rounded-[20px] border border-white/10 bg-slate-950/60 pl-12 pr-11 text-base text-white shadow-none outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_4px_rgba(37,99,235,0.15)] focus:ring-0 transition-all duration-200 ease-in-out"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 ml-1">Confirm Password</label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-4.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="h-[58px] w-full rounded-[20px] border border-white/10 bg-slate-950/60 pl-12 pr-4.5 text-base text-white shadow-none outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_4px_rgba(37,99,235,0.15)] focus:ring-0 transition-all duration-200 ease-in-out"
                />
              </div>
            </div>

            <FormSubmitButton
              loading={isPending}
              loadingText="Updating password..."
              className="w-full h-[58px] rounded-[20px] bg-gradient-to-br from-[#2563EB] to-[#4F46E5] text-white font-bold text-xs tracking-wide shadow-md shadow-blue-500/10 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 flex items-center justify-center gap-2"
            >
              Update Password
            </FormSubmitButton>
          </form>
        </Card>
      </div>
    </main>
  );
}
