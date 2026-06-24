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
    <main className="relative flex min-h-[100dvh] items-center justify-center bg-slate-950 px-4 py-12 text-slate-100 overflow-hidden">
      {/* Decorative gradients */}
      <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-blue-500/10 blur-[120px]" />
      <div className="absolute -left-32 -bottom-32 h-96 w-96 rounded-full bg-indigo-500/10 blur-[120px]" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/20">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white mt-4">
            Reset Password
          </h1>
          <p className="text-slate-400 text-sm">
            Enter your new DigiPartner password below.
          </p>
        </div>

        <Card className="border border-white/5 bg-slate-900/40 p-6 md:p-8 rounded-3xl backdrop-blur-xl shadow-2xl">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400">New Password</label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-white/5 bg-slate-950 text-white rounded-xl h-11 pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400">Confirm Password</label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="border-white/5 bg-slate-950 text-white rounded-xl h-11 pl-10 pr-10"
                />
              </div>
            </div>

            <FormSubmitButton
              loading={isPending}
              loadingText="Updating password..."
              icon={<ShieldCheck className="h-4 w-4" />}
              className="w-full h-11 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-indigo-600 shadow-lg shadow-blue-500/10"
            >
              Update Password
            </FormSubmitButton>
          </form>
        </Card>
      </div>
    </main>
  );
}
