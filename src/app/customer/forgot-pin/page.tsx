import type { Metadata } from "next";
import Link from "next/link";

import { CustomerForgotPinFlow } from "@/components/auth/customer-forgot-pin-flow";

export const metadata: Metadata = { title: "Forgot PIN" };

export default function CustomerForgotPinPage() {
  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-12">
      <Link href="/" className="mb-8 text-center text-xl font-semibold tracking-tight">
        DigiConnect Dukan
      </Link>
      <h1 className="text-center text-2xl font-semibold">Forgot PIN</h1>
      <p className="mt-2 text-center text-sm text-slate-600">WhatsApp OTP se naya PIN set karein.</p>
      <div className="mt-8">
        <CustomerForgotPinFlow />
      </div>
    </div>
  );
}
