import Link from "next/link";
import type { Metadata } from "next";

import { ApLoginForm } from "@/components/auth/ap-login-form";

export const metadata: Metadata = { title: "AP Login" };

export default function ApLoginPage() {
  return (
    <div className="container-narrow py-16">
      <div className="mx-auto max-w-md">
        <Link href="/" className="text-sm text-[var(--muted)] underline">
          DigiConnect Dukan
        </Link>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl tracking-tight">Agency Partner login</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Username aur password se login karein. Self-signup nahi hai.</p>
        <div className="mt-8">
          <ApLoginForm />
        </div>
        <p className="mt-6 text-sm text-[var(--muted)]">
          Customers: <Link href="/customer/login" className="underline">WhatsApp + PIN login</Link>
        </p>
      </div>
    </div>
  );
}
