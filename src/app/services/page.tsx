import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatCurrency, portalServices } from "@/lib/portal-data";

export const metadata = {
  title: "Services | DigiConnect Dukan",
  description: "Apply online for PAN, Aadhaar, GST, Passport, Voter ID, and other digital services across India.",
};

export default function ServicesPage() {
  return (
    <main className="min-h-screen px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--secondary)]">Digital Services Portal</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-950 md:text-5xl">Select a service and apply online</h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Google login, forms, documents, UPI payment, invoice, and status tracking are available in one simple flow.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {portalServices.map(({ title, slug, icon: Icon, description, amount }) => (
            <Link key={slug} href={`/services/${slug}`}>
              <Card className="group h-full rounded-2xl p-5 transition hover:-translate-y-1 hover:border-[var(--primary)]/30">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[var(--primary)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:text-[var(--secondary)]" />
                </div>
                <h2 className="mt-5 text-lg font-bold text-slate-950">{title}</h2>
                <p className="mt-2 min-h-14 text-sm leading-relaxed text-slate-600">{description}</p>
                <p className="mt-4 text-sm font-bold text-orange-600">Starting {formatCurrency(amount)}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
