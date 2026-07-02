"use client";

import { type FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";

import { Input } from "@/components/ui/input";
import { FormSubmitButton } from "@/components/ui/loading";
import { WhatsappAuthFlow } from "@/components/auth/whatsapp-auth-flow";

type AuthApiResponse = {
  message?: string;
  error?: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

async function readAuthApiResponse(response: Response): Promise<AuthApiResponse> {
  try {
    const result = (await response.json()) as AuthApiResponse;
    return {
      ...result,
      message: result.message || result.error,
      error: result.error || (response.ok ? undefined : result.message),
    };
  } catch {
    return response.ok ? { message: "Request completed." } : { error: "Request failed. Please try again." };
  }
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    setMessage(null);

    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      setMessage({ type: "error", text: "Please enter a valid email address." });
      return;
    }

    setIsPending(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const result = await readAuthApiResponse(response);

      if (!response.ok) {
        throw new Error(result.error || "Password reset request failed. Please try again.");
      }

      setMessage({
        type: "success",
        text: result.message || "Password reset link sent. Check Inbox, Spam, Promotions.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Password reset request failed. Please try again.",
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
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--secondary)]">Password Help</p>
          <h1 className="text-3xl sm:text-[34px] font-extrabold tracking-tight text-[#0F172A] leading-[1.1] max-w-[320px] mx-auto">
            Reset your password
          </h1>
          <p className="text-xs text-[#64748B] font-semibold leading-relaxed max-w-[300px] mx-auto">
            Enter your WhatsApp number to securely login without a password.
          </p>

          <div className="text-left w-full">
            <WhatsappAuthFlow purpose="password_reset" onSuccess={(dest) => window.location.assign(dest)} />
          </div>

          <div className="relative my-2 w-full">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-[#F8FAFC] px-2 text-slate-500" style={{ background: "rgba(255, 255, 255, 1)" }}>Or via email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 text-left" aria-busy={isPending}>
            <label className="grid gap-1.5">
              <span className="text-xs font-bold text-[#64748B] ml-1">Email Address</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  disabled={isPending}
                  style={{ textTransform: "none" }}
                  className="h-[58px] rounded-[20px] bg-white border border-slate-200/80 pl-11 text-base text-[#0F172A] shadow-none outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_4px_rgba(37,99,235,0.10)] focus:ring-0 transition-all duration-200 ease-in-out"
                />
              </div>
            </label>

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
              loading={isPending}
              loadingText="Sending reset link..."
              className="w-full h-[58px] rounded-[20px] bg-gradient-to-br from-[#2563EB] to-[#4F46E5] text-white font-bold text-xs tracking-wide shadow-md shadow-blue-500/10 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 flex items-center justify-center gap-2"
            >
              Send reset link
            </FormSubmitButton>
          </form>

          <div className="text-center pt-2">
            <Link
              href="/login/customer"
              className="inline-flex items-center justify-center gap-2 text-xs font-bold text-[#2563EB] transition hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to customer login
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
