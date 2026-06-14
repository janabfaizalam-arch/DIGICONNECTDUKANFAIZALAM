"use client";

import { type FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { KeyRound, Mail, ArrowRight } from "lucide-react";

import { createClient } from "@/lib/supabase/browser";
import { useToast } from "@/components/providers/toast-provider";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormSubmitButton } from "@/components/ui/loading";

export default function APForgotPasswordPage() {
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    startTransition(async () => {
      try {
        const supabase = createClient();
        if (!supabase) {
          throw new Error("Could not initialize authentication client.");
        }

        const redirectTo = `${window.location.origin}/ap/reset-password`;

        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo,
        });

        if (error) {
          throw error;
        }

        success("Password recovery email has been sent successfully.");
        setSubmitted(true);
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Request failed.");
      }
    });
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-100 overflow-hidden">
      {/* Decorative gradients */}
      <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-blue-500/10 blur-[120px]" />
      <div className="absolute -left-32 -bottom-32 h-96 w-96 rounded-full bg-indigo-500/10 blur-[120px]" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/20">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white mt-4">
            Recovery Password
          </h1>
          <p className="text-slate-400 text-sm">
            Enter your DigiPartner registered email to request a reset link.
          </p>
        </div>

        <Card className="border border-white/5 bg-slate-900/40 p-6 md:p-8 rounded-3xl backdrop-blur-xl shadow-2xl">
          {submitted ? (
            <div className="text-center space-y-4 py-4">
              <p className="text-sm leading-relaxed text-slate-300">
                A password reset instructions link was dispatched to <strong className="text-white font-extrabold">{email}</strong>.
              </p>
              <p className="text-xs text-slate-500">
                Please check your inbox (and spam folder) to reset your credentials.
              </p>
              <Link
                href="/ap/login"
                className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-blue-400 hover:underline"
              >
                Return to Login
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">Registered Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    type="email"
                    placeholder="name@business.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="border-white/5 bg-slate-950 text-white rounded-xl h-11 pl-10 pr-4"
                  />
                </div>
              </div>

              <FormSubmitButton
                loading={isPending}
                loadingText="Sending request..."
                icon={<ArrowRight className="h-4 w-4" />}
                className="w-full h-11 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-indigo-600 shadow-lg shadow-blue-500/10"
              >
                Send Recovery Instructions
              </FormSubmitButton>

              <div className="text-center mt-3">
                <Link href="/ap/login" className="text-xs text-slate-500 hover:text-white transition-colors">
                  Remember password? Sign In
                </Link>
              </div>
            </form>
          )}
        </Card>
      </div>
    </main>
  );
}
