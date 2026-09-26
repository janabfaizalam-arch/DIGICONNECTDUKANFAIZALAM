"use client";

import React from "react";
import Link from "next/link";
import {
  MapPin,
  MessageCircle,
  Phone,
  Mail,
  ShieldCheck,
  Lock,
  Printer,
  Radar,
  Smartphone,
  Zap,
  ArrowRight,
} from "lucide-react";
import { contactDetails } from "@/lib/constants";
import { buildSupportWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { getEnabledSocialLinks, type SocialLink } from "@/lib/social-links";
import { FooterSocial } from "@/components/footer-social";
import { CookieSettingsButton } from "@/components/privacy/cookie-consent";
import { business, legalLinks } from "@/lib/compliance/config";


const servicesLinks = [
  { label: "GST Registration", href: "/services/gst-registration" },
  { label: "ITR Filing & Tax", href: "/services/itr-filing" },
  { label: "Passport Application", href: "/services/passport" },
  { label: "MSME / Udyam", href: "/services/msme-registration" },
  { label: "PM Vishwakarma", href: "/services/pm-vishwakarma" },
  { label: "Credit Cards", href: "/services/credit-cards" },
];

const companyLinks = [
  { label: "About Us", href: "/about", external: false },
  { label: "RNOS India (rnos.in)", href: "https://www.rnos.in", external: true },
  { label: "Become a DC Partner", href: "/digi-partner", external: false },
  { label: "DC Partner Login", href: "/ap/login", external: false },
  { label: "Contact Us", href: "/contact", external: false },
  { label: "FAQ", href: "/#faq", external: false },
];

/** Every policy page, plus the grievance desk — from the compliance config. */
const footerLegalLinks = legalLinks.map((link) => ({ label: link.label, href: link.href }));



/** Drop repeats when two link lists are merged into one footer column. */
function dedupeLinks<T extends { label: string; href: string }>(links: T[]): T[] {
  const seen = new Set<string>();
  return links.filter((link) => {
    const key = `${link.label}|${link.href}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}


export function MarketingFooter({
  variant = "default",
  socialLinks,
}: {
  variant?: "default" | "homepage";
  /** Admin-managed links, resolved on the server. Falls back to code defaults. */
  socialLinks?: SocialLink[];
}) {
  const isHomepage = variant === "homepage";
  const enabledSocial = socialLinks?.length ? socialLinks : getEnabledSocialLinks();

  const whatsappUrl = buildWhatsAppUrl(
    buildSupportWhatsAppMessage({ page: "footer", topic: "Website footer service enquiry" })
  );

  if (isHomepage) {
    return (
      <footer className="dc-ambient dc-bottom-nav-clearance relative isolate overflow-hidden bg-[var(--dc-sky-soft)] pb-6 pb-safe-bottom pt-10 text-[#0d1b3e] print:hidden md:pb-8 md:pt-14">
        {/* A light footer, deliberately. The page already ends on a dark
            section, and a second dark slab made the whole bottom read as one
            heavy block.

            Light does not have to mean bare, though — it used to be flat white
            with a hairline on top, which is where the page's design stopped.
            It now carries the same vocabulary as every band above it: the
            kolam dot field, both brand orbs, and a flame hairline where the
            page hands over. */}
        <div className="dc-ambient-layer" aria-hidden="true">
          <div className="dc-kolam absolute inset-0 text-[var(--dc-blue-bright)] opacity-[0.06]" />
          <div className="dc-orb dc-orb-blue lg-drift -left-[14%] -top-[22%] h-[34rem] w-[34rem] opacity-55" />
          <div className="dc-orb dc-orb-flame lg-drift-slow -bottom-[34%] -right-[10%] h-[30rem] w-[30rem] opacity-45" />
        </div>

        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, var(--dc-flame), transparent)" }}
          aria-hidden="true"
        />

        <div className="mx-auto max-w-[var(--dc-max)] px-[var(--mobile-page-gutter)] sm:px-6 md:px-8">
          {/* Action-first: the footer asks what you want to do next, instead of
              handing you a directory and leaving you to find it. */}
          <p className="dc-eyebrow-rule-start inline-flex items-center text-[11px] font-extrabold uppercase tracking-[0.18em] text-[var(--dc-flame)]">
            What next?
          </p>
          <h2 className="mt-2.5 text-[1.6rem] font-extrabold leading-tight tracking-[-0.025em] sm:text-[2rem]">
            Pick up where you left off.
          </h2>

          {/* Two columns from the smallest screen. One column made four tall
              cards out of four short ones and added most of a screen's worth of
              scrolling to the bottom of the page for no extra information. */}
          <div className="mt-6 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
            {[
              {
                href: "/services",
                icon: Zap,
                title: "Apply for a service",
                body: "GST, ITR, passport, licence, insurance and schemes.",
                tone: "blue" as const,
              },
              {
                href: "/track-application",
                icon: Radar,
                title: "Track an application",
                body: "Status, document requests and receipts in one place.",
                tone: "blue" as const,
              },
              {
                href: "/print",
                icon: Printer,
                title: "Smart Print",
                body: "Scan a QR or upload from your phone, collect at the counter.",
                tone: "flame" as const,
              },
              {
                href: whatsappUrl,
                external: true,
                icon: MessageCircle,
                title: "Talk to us",
                body: `Mon–Sat, 10–6 · +91 ${contactDetails.primaryPhone}`,
                tone: "whatsapp" as const,
              },
            ].map((action) => {
              const Icon = action.icon;
              const inner = (
                <>
                  {/* Four icons, four gradients, four unrelated hues — blue,
                      emerald, amber, green — was the rainbow the rest of the
                      redesign removed. Blue is the default, the flame ramp
                      marks Smart Print as the one thing people do not expect a
                      documentation company to offer, and WhatsApp keeps its
                      own green because that colour is the channel's identity. */}
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-[0_8px_18px_-8px_rgba(0,29,95,0.6)]"
                    style={{
                      background:
                        action.tone === "flame"
                          ? "var(--dc-grad-flame)"
                          : action.tone === "whatsapp"
                            ? "var(--dc-teal)"
                            : "var(--dc-grad-blue)",
                    }}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="mt-3 flex items-start gap-1.5 text-[14px] font-extrabold leading-tight sm:text-[15px]">
                    {action.title}
                    <ArrowRight
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                  <span className="mt-1.5 block text-[12px] font-medium leading-snug text-[var(--dc-muted)] sm:text-[13px]">
                    {action.body}
                  </span>
                </>
              );

              const className =
                "lg-card lg-raise lg-sheen group flex flex-col p-3.5 sm:p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dc-blue-bright)]";

              return action.external ? (
                <a
                  key={action.title}
                  href={action.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={className}
                >
                  {inner}
                </a>
              ) : (
                <Link key={action.title} href={action.href} className={className}>
                  {inner}
                </Link>
              );
            })}
          </div>

          {/* Everything else is one quiet line of links, not four columns. */}
          <nav aria-label="Footer" className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2.5 border-t border-[var(--dc-blue-bright)]/12 pt-6 text-[13.5px] font-semibold text-[var(--dc-body)]">
            {dedupeLinks([
              { label: "All services", href: "/services" },
              { label: "Government schemes", href: "/#schemes" },
              { label: "Knowledge Center", href: "/#blog" },
              { label: "Become a DC Partner", href: "/digi-partner" },
              { label: "Partner login", href: "/ap/login" },
              { label: "FAQ", href: "/#faq" },
              { label: "Support", href: "/#support" },
              ...footerLegalLinks,
            ]).map((link) => (
              <Link key={link.label} href={link.href} className="inline-flex min-h-11 items-center py-2 transition hover:text-[var(--dc-blue-700)]">
                {link.label}
              </Link>
            ))}
            <CookieSettingsButton className="inline-flex min-h-11 items-center py-2 transition hover:text-[var(--dc-blue-700)]" />
          </nav>

          {/* The sign-off, as one glass panel rather than three loose rows.

              It used to be a logo and an email floating on a hairline with the
              right two-thirds of the row empty, the socials orphaned below, and
              the security line pinned to the far edge with nothing to anchor
              it. Two columns give each half something to be: who we are on the
              left, how to reach and verify us on the right. */}
          <div className="lg-card mt-8 grid gap-6 p-5 md:grid-cols-[1.1fr_0.9fr] md:gap-8 md:p-7">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-navbar.png" alt="DigiConnect Dukan" className="h-7 w-auto" />
              <p className="mt-3.5 max-w-sm text-[13.5px] font-medium leading-relaxed text-[var(--dc-body)]">
                Private digital assistance for tax, business, identity, insurance and selected government scheme
                filings — by RNOS India Private Limited.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2.5">
                <a
                  href={`mailto:${contactDetails.email}`}
                  className="inline-flex min-h-11 items-center gap-2 text-[13.5px] font-bold text-[var(--dc-body)] transition hover:text-[var(--dc-blue-mid)]"
                >
                  <Mail className="h-4 w-4 text-[var(--dc-blue-bright)]" aria-hidden="true" />
                  {contactDetails.email}
                </a>
                <a
                  href={`tel:+91${contactDetails.primaryPhone}`}
                  className="inline-flex min-h-11 items-center gap-2 text-[13.5px] font-bold text-[var(--dc-body)] transition hover:text-[var(--dc-blue-mid)]"
                >
                  <Phone className="h-4 w-4 text-[var(--dc-blue-bright)]" aria-hidden="true" />
                  +91 {contactDetails.primaryPhone}
                </a>
              </div>
            </div>

            <div className="md:border-l md:border-[var(--dc-blue-bright)]/12 md:pl-8">
              {/* Social — the marks with their handles, so a customer can tell
                  our account from an impersonator before they click. */}
              <FooterSocial links={enabledSocial} />

              <ul className="mt-5 flex flex-wrap gap-2">
                {[
                  { icon: ShieldCheck, label: "Payments via Razorpay" },
                  { icon: Lock, label: "HTTPS encrypted" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <li
                      key={item.label}
                      className="lg-pill inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-[var(--dc-ink)]"
                    >
                      <Icon className="h-3.5 w-3.5 text-[var(--dc-teal)]" aria-hidden="true" />
                      {item.label}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <p className="mt-5 text-[12.5px] font-medium leading-relaxed text-[var(--dc-muted)]">
            &copy; {new Date().getFullYear()} DigiConnect Dukan · RNOS India Private Limited, {business.location} — private
            assistance platform, not a government portal.
          </p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="relative bg-slate-50/80 border-t border-slate-200/50 pt-16 pb-8 pb-safe-bottom print:hidden overflow-hidden noise-bg">
      {/* Background lights */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

      <div className="container-shell relative z-10">

        {/* Upper Part: App link.

            A newsletter box used to sit here. It stored nothing — the address
            was thrown away and "Subscribed" shown anyway — so it has gone
            until there is a real, consented mailing list behind it. The Google
            Play / App Store badges went too: there is no store listing, only
            the Android app on /download-app. */}
        <div className="flex flex-col gap-4 pb-12 mb-12 border-b border-slate-200/60 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-slate-800">DigiConnect Dukan on your phone</p>
            <p className="text-xs font-semibold text-slate-600 mt-0.5">Install the Android app or add the website to your home screen.</p>
          </div>
          <Link
            id="footer-download-app"
            href="/download-app"
            className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl bg-slate-900 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:self-auto"
          >
            <Smartphone className="h-4 w-4" aria-hidden="true" />
            Get the Android app
          </Link>
        </div>

        {/* Middle Part: Multi-column links grid */}
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">

          {/* Brand/Identity column */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-black text-slate-800">{business.brand}</h2>
            <p className="text-xs font-semibold text-slate-600 leading-normal">
              {business.tagline}. <br />
              Private digital assistance for tax, business, identity, insurance and selected government-scheme
              applications. We are not a government department or an official government portal.
            </p>
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Powered by</p>
              <p className="text-xs font-black text-slate-700">{business.legalEntity}</p>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <MapPin className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                {business.location}
              </p>
            </div>
          </div>

          {/* Quick Services column */}
          <nav aria-label="Popular services">
            <h2 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-4">Popular services</h2>
            <ul className="-my-2 grid gap-0.5">
              {servicesLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-11 items-center py-2 text-xs font-bold text-slate-600 transition hover:text-slate-900"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Company links column */}
          <nav aria-label="Company">
            <h2 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-4">Company</h2>
            <ul className="-my-2 grid gap-0.5">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center py-2 text-xs font-bold text-slate-600 transition hover:text-slate-900"
                    >
                      {link.label}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="inline-flex min-h-11 items-center py-2 text-xs font-bold text-slate-600 transition hover:text-slate-900"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact Support & Legal column */}
          <div className="space-y-6">
            <nav aria-label="Legal">
              <h2 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-3">Legal</h2>
              <ul className="-my-2 grid">
                {footerLegalLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="inline-flex min-h-11 items-center py-2 text-xs font-bold text-slate-600 transition hover:text-slate-900"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <CookieSettingsButton className="inline-flex min-h-11 items-center py-2 text-xs font-bold text-slate-600 underline-offset-2 transition hover:text-slate-900 hover:underline" />
                </li>
              </ul>
            </nav>

            <div>
              <h2 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-3">Helpline</h2>
              <p className="text-[11px] font-semibold text-slate-600">{business.supportHours}</p>
              <div className="-my-1.5 text-xs font-bold text-slate-600">
                <a href={`tel:+91${contactDetails.primaryPhone}`} className="flex min-h-11 items-center gap-1.5 transition hover:text-slate-900">
                  <Phone className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                  +91 {contactDetails.primaryPhone}
                </a>
                <a href={`mailto:${contactDetails.email}`} className="flex min-h-11 items-center gap-1.5 truncate transition hover:text-slate-900">
                  <Mail className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                  {contactDetails.email}
                </a>
                <a
                  id="footer-whatsapp-support"
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex min-h-11 items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-xs font-bold text-emerald-800 transition"
                >
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                  WhatsApp support
                  <span className="sr-only"> (opens WhatsApp in a new tab)</span>
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar: copyright.

            "Certified ISO 9001:2015 Compliant Entity" and a "GSTIN Verified"
            badge used to sit here and in the brand column. Neither was backed
            by anything the site could show, so both are gone; add them back
            only with the certificate / GSTIN published alongside. */}
        <div className="mt-12 pt-6 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-slate-600">
          <p>&copy; {new Date().getFullYear()} {business.brand} · {business.legalEntity}. All rights reserved.</p>
          <p className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />
            <span>Online payments processed by Razorpay over HTTPS</span>
          </p>
        </div>

      </div>
    </footer>
  );
}
