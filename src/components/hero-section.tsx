import { ArrowRight, BadgeCheck, MapPin, PhoneCall, Shield } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { generateWhatsAppLink } from "@/lib/whatsapp";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="overflow-hidden pb-8 pt-4 md:pb-20 md:pt-14">
      <div className="container-shell grid items-center gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4 md:space-y-5">
          <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-white/85 px-3 py-1.5 text-xs font-medium text-[var(--primary)] shadow-soft sm:px-4 sm:text-sm">
            <MapPin className="h-4 w-4" />
            <span className="truncate">Available across India through online digital services</span>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--secondary)] sm:text-sm">
              Same Day Service Available
            </p>
            <h1 className="max-w-3xl text-3xl font-bold leading-tight text-slate-950 sm:text-4xl md:text-5xl">
              All Digital &amp; Government Services Across India
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base md:text-lg md:leading-relaxed">
              Apply online for PAN, Aadhaar, GST, Passport and more through a professional service platform.
            </p>
            <p className="max-w-2xl text-sm font-medium text-gray-600 md:text-lg">
              Connecting People, Empowering Digital India
            </p>
          </div>
          <div className="grid gap-3 min-[420px]:grid-cols-2 sm:flex sm:flex-row">
            <Link href="/services" className={buttonVariants({ size: "lg", className: "w-full sm:w-auto" })}>
              Apply Now
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a href={generateWhatsAppLink()} target="_blank" rel="noreferrer" className={buttonVariants({ size: "lg", variant: "secondary", className: "w-full sm:w-auto" })}>
              Contact Now
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
            <div className="rounded-2xl border bg-white/85 p-3 shadow-soft md:p-4">
              <BadgeCheck className="mb-3 h-5 w-5 text-[var(--secondary)]" />
              <p className="font-medium text-slate-900">Same Day Service Available</p>
              <p className="mt-1 text-xs leading-5">Quick start for urgent services.</p>
            </div>
            <div className="rounded-2xl border bg-white/85 p-3 shadow-soft md:p-4">
              <Shield className="mb-3 h-5 w-5 text-[var(--primary)]" />
              <p className="font-medium text-slate-900">Secure Handling</p>
              <p className="mt-1 text-xs leading-5">Documents handled carefully.</p>
            </div>
            <div className="rounded-2xl border bg-white/85 p-3 shadow-soft md:p-4">
              <PhoneCall className="mb-3 h-5 w-5 text-[var(--secondary)]" />
              <p className="font-medium text-slate-900">Online Support</p>
              <p className="mt-1 text-xs leading-5">Help before and after applying.</p>
            </div>
          </div>
        </div>
        <div className="relative hidden lg:block">
          <div className="absolute -left-10 top-12 h-44 w-44 rounded-full bg-[var(--secondary)]/15 blur-3xl" />
          <div className="absolute -right-8 bottom-8 h-52 w-52 rounded-full bg-[var(--primary)]/15 blur-3xl" />
          <div className="glass-panel shadow-soft relative rounded-3xl border p-6 md:p-8">
            <div className="rounded-[1.75rem] bg-slate-950 p-6 text-white">
              <p className="text-sm font-medium text-white/70">DigiConnect Dukan</p>
              <h2 className="mt-3 text-2xl font-bold">Trusted digital service platform for customers across India</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/75">
                From Aadhaar to GST, get professional support for documents, forms, and registrations.
              </p>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-[var(--accent)] p-5">
                <p className="text-sm font-medium text-[var(--accent-foreground)]">Coverage</p>
                <p className="mt-2 text-lg font-bold text-slate-950">Available across India</p>
              </div>
              <div className="rounded-3xl bg-[var(--muted)] p-5">
                <p className="text-sm font-medium text-slate-600">Support</p>
                <p className="mt-2 text-lg font-bold text-slate-950">Call or WhatsApp anytime</p>
              </div>
            </div>
            <div className="mt-6 rounded-3xl border border-dashed border-[var(--secondary)]/40 bg-white p-5">
              <p className="text-sm font-medium text-slate-900">Need document guidance?</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Our team shares the correct document checklist so your application can move smoothly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
