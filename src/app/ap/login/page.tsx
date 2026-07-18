import Link from "next/link";
import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "AP Login" };

export default function ApLoginPage() {
  return (
    <div className="container-narrow py-16">
      <div className="mx-auto max-w-md">
        <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight">Agency Partner login</h1>
        <div className="mt-8">
          <LoginForm />
        </div>
        <p className="mt-6 text-sm text-[var(--muted)]">
          Customers should use <Link href="/login" className="underline">the main login</Link>.
        </p>
      </div>
    </div>
  );
}
