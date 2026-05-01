import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { Card } from "@/components/ui/card";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md rounded-[2rem] p-6 text-center shadow-soft md:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-3xl font-bold text-slate-950">Unauthorized Access</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Your account does not have permission to open this area of DigiConnect Dukan.
        </p>
        <Link href="/login" className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[var(--primary)] px-5 text-sm font-bold text-white">
          Back to Login
        </Link>
      </Card>
    </main>
  );
}
