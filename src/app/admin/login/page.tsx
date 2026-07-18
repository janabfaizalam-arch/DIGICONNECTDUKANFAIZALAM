import type { Metadata } from "next";
import Link from "next/link";

import { AdminLoginForm } from "@/components/auth/admin-login-form";

export const metadata: Metadata = { title: "Admin Login" };

export default function AdminLoginPage() {
  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-12">
      <Link href="/" className="mb-8 text-center text-xl font-semibold tracking-tight">
        DigiConnect Dukan
      </Link>
      <h1 className="text-center text-2xl font-semibold">Admin Login</h1>
      <p className="mt-2 text-center text-sm text-slate-600">Admin email aur password se login karein.</p>
      <div className="mt-8">
        <AdminLoginForm />
      </div>
    </div>
  );
}
