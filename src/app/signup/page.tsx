import Link from "next/link";
import type { Metadata } from "next";

import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <div className="container-narrow py-16">
      <div className="mx-auto max-w-md">
        <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight">Create account</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Create account with email, mobile, and a 6-digit login PIN. Prefer WhatsApp OTP? Use{" "}
          <Link href="/customer/signup" className="underline">
            customer signup
          </Link>
          .
        </p>
        <div className="mt-8">
          <SignupForm />
        </div>
        <p className="mt-6 text-sm text-[var(--muted)]">
          Already registered? <Link href="/login" className="underline">Login</Link>
        </p>
      </div>
    </div>
  );
}
