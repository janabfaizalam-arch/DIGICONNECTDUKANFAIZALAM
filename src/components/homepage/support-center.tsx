"use client";

import React from "react";
import Link from "next/link";
import { Phone, MessageCircle, Mail, MapPin, ShieldCheck, Clock, Ticket, ArrowRight } from "lucide-react";
import { contactDetails } from "@/lib/constants";
import { buildSupportWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { HomepageSection, HomepageSectionHeader } from "@/components/homepage/ui";

export function SupportCenter() {
  const whatsappUrl = buildWhatsAppUrl(
    buildSupportWhatsAppMessage({ page: "contact", topic: "General customer support enquiry" }),
  );

  return (
    <HomepageSection id="support" surface="aqua">
      <HomepageSectionHeader
        eyebrow="Support hub"
        title="Need help? Contact DigiConnect"
        description="Start with WhatsApp for the fastest response. Phone, email and tickets remain available."
      />

      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <a
          id="btn-support-whatsapp"
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative overflow-hidden rounded-[1.75rem] bg-[var(--dc-teal)] p-6 text-white shadow-[0_16px_40px_rgba(7,139,117,0.28)] transition hover:-translate-y-0.5 md:p-8"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
            <MessageCircle className="h-7 w-7" aria-hidden="true" />
          </span>
          <h3 className="mt-5 text-2xl font-black tracking-tight md:text-[1.75rem]">WhatsApp support</h3>
          <p className="mt-2 max-w-md text-[15px] font-semibold leading-relaxed text-white/92 sm:text-base">
            Fastest channel for screenshots, document questions and application updates.
          </p>
          <span className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-white px-5 text-[15px] font-black text-[var(--dc-teal)]">
            Chat now
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </a>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <a
            id="btn-support-call"
            href={`tel:+91${contactDetails.primaryPhone}`}
            className="flex min-h-[5.5rem] items-center gap-3 rounded-[1.25rem] border border-[var(--dc-blue-500)]/15 bg-white/80 p-4 transition hover:bg-white"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--dc-blue-soft)] text-[var(--dc-blue-700)]">
              <Phone className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-[15px] font-extrabold text-[var(--dc-ink)]">Call helpline</span>
              <span className="mt-0.5 block text-sm font-semibold text-[var(--dc-body)]">+91 {contactDetails.primaryPhone}</span>
            </span>
          </a>
          <a
            id="btn-support-email-now"
            href={`mailto:${contactDetails.email}`}
            className="flex min-h-[5.5rem] items-center gap-3 rounded-[1.25rem] border border-[var(--dc-violet)]/15 bg-white/80 p-4 transition hover:bg-white"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--dc-violet-soft)] text-[var(--dc-violet)]">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-extrabold text-[var(--dc-ink)]">Email</span>
              <span className="mt-0.5 block truncate text-sm font-semibold text-[var(--dc-body)]">{contactDetails.email}</span>
            </span>
          </a>
          <Link
            id="btn-support-ticket"
            href="/customer/dashboard?tab=applications"
            className="flex min-h-[5.5rem] items-center gap-3 rounded-[1.25rem] border border-[var(--dc-orange-500)]/20 bg-white/80 p-4 transition hover:bg-white sm:col-span-2 lg:col-span-1"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--dc-orange-soft)] text-[var(--dc-orange-600)]">
              <Ticket className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-[15px] font-extrabold text-[var(--dc-ink)]">Ticket / dashboard</span>
              <span className="mt-0.5 block text-sm font-semibold text-[var(--dc-body)]">Track applications after login</span>
            </span>
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-[1.25rem] border border-[var(--dc-navy-950)]/10 bg-[var(--dc-navy-950)] p-5 text-white">
          <p className="text-xs font-black uppercase tracking-wider text-[var(--dc-orange-400)]">More lines</p>
          <ul className="mt-3 space-y-2.5 text-[15px] font-semibold text-white/88">
            <li className="flex justify-between gap-3">
              <span>Office support</span>
              <a
                id="link-support-office-phone"
                href={`tel:+91${contactDetails.officeSupportPhone}`}
                className="font-black text-white hover:underline"
              >
                +91 {contactDetails.officeSupportPhone}
              </a>
            </li>
            <li className="flex justify-between gap-3">
              <span>CIBIL expert</span>
              <a
                id="btn-support-cibil"
                href={`tel:+91${contactDetails.cibilExpertPhone}`}
                className="font-black text-white hover:underline"
              >
                +91 {contactDetails.cibilExpertPhone}
              </a>
            </li>
          </ul>
        </div>
        <div className="rounded-[1.25rem] border border-[var(--dc-cyan)]/20 bg-[var(--dc-cream)] p-5">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[var(--dc-blue-600)]">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> Coverage & hours
          </p>
          <p className="mt-3 text-[15px] font-semibold text-[var(--dc-body)]">{contactDetails.availability}</p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-[15px] font-bold text-[var(--dc-ink)]">
            <Clock className="h-4 w-4 text-[var(--dc-blue-600)]" aria-hidden="true" />
            Mon–Sat: 10:00 AM – 6:00 PM IST
          </p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--dc-teal)]">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Secure Razorpay checkout when enabled
          </p>
        </div>
      </div>
    </HomepageSection>
  );
}
