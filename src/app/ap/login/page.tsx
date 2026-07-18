import type { Metadata } from "next";
import Link from "next/link";

import { ApLoginForm } from "@/components/auth/ap-login-form";

export const metadata: Metadata = { title: "Agency Partner Login" };

export default function ApLoginPage() {
  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-12">
      <Link href="/" className="mb-8 text-center text-xl font-semibold tracking-tight">
        DigiConnect Dukan
      </Link>
      <h1 className="text-center text-2xl font-semibold">Agency Partner Login</h1>
      <p className="mt-2 text-center text-sm text-slate-600">Username aur password se login karein. Self-signup nahi hai.</p>
      <div className="mt-8">
        <ApLoginForm />
      </div>
    </div>
  );
}
