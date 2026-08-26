"use client";

import React from "react";
import Link from "next/link";
import { Phone, MessageCircle, Mail, MapPin, ShieldCheck, Clock, Ticket, ArrowRight } from "lucide-react";
import { contactDetails } from "@/lib/constants";
import { buildSupportWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { BrandIcon, HomepageSection, HomepageSectionHeader } from "@/components/homepage/ui";

export function SupportCenter() {
  const whatsappUrl = buildWhatsAppUrl(
    buildSupportWhatsAppMessage({ page: "contact", topic: "General customer support enquiry" }),
  );

  return (
    <HomepageSection id="support" surface="sky" wash="dual">
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
          className="group relative overflow-hidden rounded-[1.75rem] bg-[var(--dc-teal)] p-6 text-white shadow-[0_20px_44px_-18px_rgba(7,139,117,0.6)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_56px_-20px_rgba(7,139,117,0.7)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dc-teal)] md:p-8"
        >
          <span className="lg-pill-dark flex h-14 w-14 items-center justify-center rounded-2xl">
            <MessageCircle className="h-7 w-7" aria-hidden="true" />
          </span>
          <h3 className="mt-5 text-2xl font-extrabold tracking-[-0.025em] md:text-[1.75rem]">WhatsApp support</h3>
          <p className="mt-2 max-w-md text-[15px] font-semibold leading-relaxed text-white/92 sm:text-base">
            Fastest channel for screenshots, document questions and application updates.
          </p>
          <span className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-white px-5 text-[15px] font-extrabold text-[var(--dc-teal)]">
            Chat now
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </a>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <a
            id="btn-support-call"
            href={`tel:+91${contactDetails.primaryPhone}`}
            className="lg-card lg-raise flex min-h-[5.5rem] items-center gap-3 rounded-[1.25rem] p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dc-blue-bright)]"
          >
            <BrandIcon>
              <Phone className="h-5 w-5" aria-hidden="true" />
            </BrandIcon>
            <span>
              <span className="block text-[15px] font-extrabold text-[var(--dc-ink)]">Call helpline</span>
              <span className="mt-0.5 block text-sm font-semibold text-[var(--dc-body)]">+91 {contactDetails.primaryPhone}</span>
            </span>
          </a>
          <a
            id="btn-support-email-now"
            href={`mailto:${contactDetails.email}`}
            className="lg-card lg-raise flex min-h-[5.5rem] items-center gap-3 rounded-[1.25rem] p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dc-blue-bright)]"
          >
            <BrandIcon>
              <Mail className="h-5 w-5" aria-hidden="true" />
            </BrandIcon>
            <span className="min-w-0">
              <span className="block text-[15px] font-extrabold text-[var(--dc-ink)]">Email</span>
              <span className="mt-0.5 block truncate text-sm font-semibold text-[var(--dc-body)]">{contactDetails.email}</span>
            </span>
          </a>
          <Link
            id="btn-support-ticket"
            href="/customer/dashboard?tab=applications"
            className="lg-card lg-raise flex min-h-[5.5rem] items-center gap-3 rounded-[1.25rem] p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dc-blue-bright)] sm:col-span-2 lg:col-span-1"
          >
            <BrandIcon tone="flame">
              <Ticket className="h-5 w-5" aria-hidden="true" />
            </BrandIcon>
            <span>
              <span className="block text-[15px] font-extrabold text-[var(--dc-ink)]">Ticket / dashboard</span>
              <span className="mt-0.5 block text-sm font-semibold text-[var(--dc-body)]">Track applications after login</span>
            </span>
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-[1.25rem] p-5 text-white" style={{ background: "var(--dc-grad-blue)" }}>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--dc-amber)]">More lines</p>
          <ul className="mt-3 space-y-2.5 text-[15px] font-medium text-white/85">
            <li className="flex justify-between gap-3">
              <span>Office support</span>
              <a
                id="link-support-office-phone"
                href={`tel:+91${contactDetails.officeSupportPhone}`}
                className="font-extrabold text-white hover:underline"
              >
                +91 {contactDetails.officeSupportPhone}
              </a>
            </li>
            <li className="flex justify-between gap-3">
              <span>CIBIL expert</span>
              <a
                id="btn-support-cibil"
                href={`tel:+91${contactDetails.cibilExpertPhone}`}
                className="font-extrabold text-white hover:underline"
              >
                +91 {contactDetails.cibilExpertPhone}
              </a>
            </li>
          </ul>
        </div>
        <div className="lg-card rounded-[1.25rem] p-5">
          <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--dc-flame)]">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> Coverage & hours
          </p>
          <p className="mt-3 text-[15px] font-medium text-[var(--dc-body)]">{contactDetails.availability}</p>
          <p className="mt-2 flex items-center gap-1.5 text-[15px] font-bold text-[var(--dc-ink)]">
            <Clock className="h-4 w-4 text-[var(--dc-blue-bright)]" aria-hidden="true" />
            Mon–Sat: 10:00 AM – 6:00 PM IST
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-[var(--dc-teal)]">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Secure Razorpay checkout when enabled
          </p>
        </div>
      </div>
    </HomepageSection>
  );
}
