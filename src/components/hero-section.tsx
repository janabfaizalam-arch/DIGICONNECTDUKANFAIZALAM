import { ArrowRight, BadgeCheck, MapPin, PhoneCall, Shield } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { createWhatsappLink } from "@/lib/constants";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="section-pad overflow-hidden pt-10 md:pt-16">
      <div className="container-shell grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-4 py-2 text-sm font-medium text-[var(--primary)] shadow-soft">
            <MapPin className="h-4 w-4" />
            Orai, Jalaun aur nearby areas ke liye trusted local service center
          </div>
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--secondary)]">
              Same Day Service Available
            </p>
            <h1 className="max-w-3xl text-4xl font-black leading-tight text-slate-950 md:text-6xl">
              All Digital &amp; Government Services in Orai &amp; Jalaun
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-600">
              PAN Card, Aadhaar Update, Voter ID, Passport, GST - Sab kuch ek hi jagah
            </p>
            <p className="max-w-2xl text-base font-medium text-gray-600 md:text-lg">
              Connecting People, Empowering Digital India
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="#lead-form" className={buttonVariants({ size: "lg" })}>
              Apply Now
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a href={createWhatsappLink("Hero CTA")} target="_blank" rel="noreferrer" className={buttonVariants({ size: "lg", variant: "secondary" })}>
              WhatsApp Now
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
            <div className="rounded-3xl border bg-white/85 p-4 shadow-soft">
              <BadgeCheck className="mb-3 h-5 w-5 text-[var(--secondary)]" />
              <p className="font-semibold text-slate-900">Same Day Service Available</p>
              <p>Quick start for urgent digital services.</p>
            </div>
            <div className="rounded-3xl border bg-white/85 p-4 shadow-soft">
              <Shield className="mb-3 h-5 w-5 text-[var(--primary)]" />
              <p className="font-semibold text-slate-900">Fast service - same day process</p>
              <p>Local expert team for fast document handling.</p>
            </div>
            <div className="rounded-3xl border bg-white/85 p-4 shadow-soft">
              <PhoneCall className="mb-3 h-5 w-5 text-[var(--secondary)]" />
              <p className="font-semibold text-slate-900">Call karein ya WhatsApp par message bhejein</p>
              <p>Support available before and after application.</p>
            </div>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -left-10 top-12 h-44 w-44 rounded-full bg-[var(--secondary)]/15 blur-3xl" />
          <div className="absolute -right-8 bottom-8 h-52 w-52 rounded-full bg-[var(--primary)]/15 blur-3xl" />
          <div className="glass-panel shadow-soft relative rounded-[2rem] border p-6 md:p-8">
            <div className="rounded-[1.75rem] bg-slate-950 p-6 text-white">
              <p className="text-sm font-medium text-white/70">DigiConnect Dukan</p>
              <h2 className="mt-3 text-2xl font-bold">Trusted digital seva portal for local customers</h2>
              <p className="mt-3 text-sm leading-7 text-white/75">
                Aadhaar se GST tak, documents, forms aur registrations ke liye ek professional support desk.
              </p>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-[var(--accent)] p-5">
                <p className="text-sm font-semibold text-[var(--accent-foreground)]">Coverage Area</p>
                <p className="mt-2 text-lg font-bold text-slate-950">Orai, Jalaun & nearby towns</p>
              </div>
              <div className="rounded-3xl bg-[var(--muted)] p-5">
                <p className="text-sm font-semibold text-slate-600">Support Window</p>
                <p className="mt-2 text-lg font-bold text-slate-950">Call, visit, or WhatsApp anytime</p>
              </div>
            </div>
            <div className="mt-6 rounded-3xl border border-dashed border-[var(--secondary)]/40 bg-white p-5">
              <p className="text-sm font-semibold text-slate-900">Documents ready nahi hain?</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Team aapko exact document guidance degi, taaki form reject na ho aur process smoothly complete ho.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
