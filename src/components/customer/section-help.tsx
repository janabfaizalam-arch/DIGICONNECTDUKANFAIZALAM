"use client";

import { useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  Gauge,
  Mail,
  MessageCircle,
  Phone,
  Shield,
  type LucideIcon,
} from "lucide-react";

import { Reveal } from "@/components/homepage/motion";
import { contactDetails } from "@/lib/constants";
import { buildSupportWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import {
  FIRST_SERVICE_CASHBACK_PERCENT,
  MAX_WALLET_REDEEM_PERCENT,
  REPEAT_CASHBACK_PERCENT,
} from "@/lib/reward-rules";
import { cn } from "@/lib/utils";

import type { CustomerPortalData } from "@/components/customer/types";
import { PortalButton, PortalCard, PortalHeading, PortalIcon } from "@/components/customer/ui";

/**
 * Help.
 *
 * Two fixes beyond the styling.
 *
 * **The phone numbers are not typed in here.** The old support tab had
 * "+91 7007595931" and two others written into the JSX, in three places, next
 * to a `contactDetails` module that already held all three. A number changing
 * meant finding every copy; this reads the one source.
 *
 * **Credit reports are reachable.** `/customer/credit-reports` has existed the
 * whole time, fully built, with nothing anywhere linking to it — a customer
 * could only find it by typing the URL. It is a card in this section now.
 */

type SupportLine = {
  role: string;
  covers: string;
  phone: string;
  icon: LucideIcon;
};

const SUPPORT_LINES: SupportLine[] = [
  {
    role: "General support",
    covers: "Application status, uploads, and anything you are unsure about.",
    phone: contactDetails.primaryPhone,
    icon: Phone,
  },
  {
    role: "Office & compliance",
    covers: "Company registration, GST and corporate filings.",
    phone: contactDetails.officeSupportPhone,
    icon: Shield,
  },
  {
    role: "CIBIL & finance",
    covers: "Credit score, loans and banking applications.",
    phone: contactDetails.cibilExpertPhone,
    icon: Gauge,
  },
];

const FAQS = [
  {
    question: "How do I know what is happening with my application?",
    answer:
      "Every application has its own page with a timeline of what our team has done and what is next. Anything waiting on you also appears at the top of your Home screen.",
  },
  {
    question: "What documents do I need to send?",
    answer:
      "The list depends on the service, and it is shown on the application itself. If something extra is needed once our team reviews your file, we will alert you and the application will move to 'Documents due'.",
  },
  {
    question: "How does the wallet work?",
    answer: `Your first service earns ${FIRST_SERVICE_CASHBACK_PERCENT}% of the fee back as wallet balance, and every service after that earns ${REPEAT_CASHBACK_PERCENT}%. You can pay up to ${MAX_WALLET_REDEEM_PERCENT}% of any future fee from that balance.`,
  },
  {
    question: "Is DigiConnect Dukan a government portal?",
    answer:
      "No. DigiConnect Dukan is a private service by RNOS India Private Limited. We help you prepare and submit applications correctly; the decision always rests with the relevant department.",
  },
  {
    question: "How do I get a receipt?",
    answer:
      "An invoice is generated once a payment is confirmed, and it is linked from that application's page.",
  },
];

export function HelpSection({ profileStatus, user }: CustomerPortalData) {
  const [open, setOpen] = useState<number | null>(0);

  const whatsappUrl = buildWhatsAppUrl(
    buildSupportWhatsAppMessage({
      page: "customer_dashboard",
      customerName: profileStatus?.profile?.full_name ?? null,
      mobile: profileStatus?.profile?.mobile ?? user.phone ?? null,
      topic: "Customer portal support",
    }),
  );

  return (
    <div className="space-y-6">
      {/* ── Talk to someone ──────────────────────────────────────────── */}
      <section aria-labelledby="support-heading">
        <PortalHeading
          eyebrow="Support"
          title="Talk to our team"
          description="WhatsApp is fastest. Phone lines are open during business hours."
          action={
            <PortalButton href={whatsappUrl} tone="flame">
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              WhatsApp us
            </PortalButton>
          }
        />
        <h2 id="support-heading" className="sr-only">
          Support contacts
        </h2>

        <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
          {SUPPORT_LINES.map((line) => {
            const Icon = line.icon;
            return (
              <a
                key={line.phone}
                href={`tel:+91${line.phone}`}
                className="lg-card lg-raise lg-sheen flex h-full flex-col gap-2.5 p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dc-blue-bright)]"
              >
                <PortalIcon tone="blue">
                  <Icon className="h-[17px] w-[17px]" aria-hidden="true" />
                </PortalIcon>
                <div>
                  <p className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--dc-muted)]">
                    {line.role}
                  </p>
                  <p className="mt-1 text-[15px] font-extrabold text-[var(--dc-ink)]">+91 {line.phone}</p>
                  <p className="mt-1.5 text-[11.5px] font-medium leading-snug text-[var(--dc-body)]">{line.covers}</p>
                </div>
              </a>
            );
          })}
        </div>

        <a
          href={`mailto:${contactDetails.email}`}
          className="lg-card lg-raise mt-2.5 flex items-center gap-3 p-3.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dc-blue-bright)]"
        >
          <PortalIcon tone="muted">
            <Mail className="h-[17px] w-[17px]" aria-hidden="true" />
          </PortalIcon>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-extrabold text-[var(--dc-ink)]">Email us</p>
            <p className="mt-0.5 truncate text-[12px] font-semibold text-[var(--dc-muted)]">{contactDetails.email}</p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-[var(--dc-muted)]" aria-hidden="true" />
        </a>
      </section>

      {/* ── Credit reports ───────────────────────────────────────────── */}
      <Reveal>
        <PortalCard className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <PortalIcon tone="flame">
              <Gauge className="h-[18px] w-[18px]" aria-hidden="true" />
            </PortalIcon>
            <div className="min-w-0">
              <p className="text-[14px] font-extrabold text-[var(--dc-ink)]">Your credit reports</p>
              <p className="mt-1 text-[12.5px] font-medium leading-relaxed text-[var(--dc-body)]">
                Every bureau check we have run for you, with the score history.
              </p>
            </div>
          </div>
          <PortalButton href="/customer/credit-reports" tone="ghost" className="shrink-0">
            Open reports
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </PortalButton>
        </PortalCard>
      </Reveal>

      {/* ── FAQs ─────────────────────────────────────────────────────── */}
      <Reveal>
        <section aria-labelledby="faq-heading">
          <PortalHeading eyebrow="Common questions" title="Before you call" />
          <h2 id="faq-heading" className="sr-only">
            Frequently asked questions
          </h2>

          <div className="mt-5 space-y-2">
            {FAQS.map((faq, index) => {
              const isOpen = open === index;
              return (
                <div key={faq.question} className="lg-card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dc-blue-bright)]"
                  >
                    <span className="text-[13.5px] font-extrabold text-[var(--dc-ink)]">{faq.question}</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-[var(--dc-muted)] transition-transform duration-300",
                        isOpen && "rotate-180",
                      )}
                      aria-hidden="true"
                    />
                  </button>
                  {isOpen ? (
                    <p className="border-t border-[var(--dc-blue-bright)]/12 px-4 py-3.5 text-[12.5px] font-medium leading-relaxed text-[var(--dc-body)]">
                      {faq.answer}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>

          <p className="mt-4 text-center text-[12px] font-medium text-[var(--dc-body)]">
            Still stuck?{" "}
            <a href={whatsappUrl} className="font-extrabold text-[var(--dc-blue-mid)] underline">
              Message us on WhatsApp
            </a>
            .
          </p>
        </section>
      </Reveal>
    </div>
  );
}
