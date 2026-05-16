"use client";

import { type FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";

import { Input } from "@/components/ui/input";
import { FormSubmitButton } from "@/components/ui/loading";

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
          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--secondary)]">Password Help</p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight text-slate-950">Reset your password</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 md:text-base md:leading-7">
            Enter your registered email and we will send a secure reset link.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 grid gap-3 text-left" aria-busy={isPending}>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Email</span>
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
                  className="h-[3.15rem] bg-white/74 pl-11 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
                />
              </div>
            </label>

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
              loading={isPending}
              loadingText="Sending reset link..."
              icon={<Mail className="h-4 w-4" />}
              className="h-[3.15rem] w-full rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 text-base font-bold shadow-lg shadow-blue-600/20 transition active:scale-[0.98]"
            >
              Send reset link
            </FormSubmitButton>
          </form>

          <Link
            href="/login/customer"
            className="mt-5 inline-flex items-center justify-center gap-2 text-sm font-bold text-[var(--primary)] transition hover:text-blue-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to customer login
          </Link>
        </section>
      </div>
    </main>
  );
}
