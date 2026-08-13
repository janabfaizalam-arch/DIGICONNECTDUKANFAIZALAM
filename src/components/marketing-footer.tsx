"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Globe,
  MessageCircle,
  Phone,
  Mail,
  ShieldCheck,
  Printer,
  Radar,
  Zap,
  Play,
  ArrowRight,
  CheckCircle2,
  Facebook,
  Instagram,
  Youtube,
  Linkedin,
  Send,
  ExternalLink,
} from "lucide-react";
import { contactDetails } from "@/lib/constants";
import { buildSupportWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { getEnabledSocialLinks, type SocialLink, type SocialPlatform } from "@/lib/social-links";

const socialIcon: Partial<Record<SocialPlatform, typeof Facebook>> = {
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
  linkedin: Linkedin,
  telegram: Send,
  whatsapp: MessageCircle,
};

const servicesLinks = [
  { label: "GST Registration", href: "/services/gst-registration" },
  { label: "ITR Filing & Tax", href: "/services/itr-filing" },
  { label: "Passport Application", href: "/services/passport" },
  { label: "MSME / Udyam", href: "/services/msme-registration" },
  { label: "PM Vishwakarma", href: "/services/pm-vishwakarma" },
  { label: "Credit Cards", href: "/services/credit-cards" },
];

const companyLinks = [
  { label: "About RNOS", href: "https://www.rnos.in", external: true },
  { label: "Become a Digi Partner", href: "/digi-partner" },
  { label: "Digi Partner Login", href: "/ap/login" },
  { label: "Contact Us", href: "/#support" },
  { label: "Support Desk", href: "/#support" },
  { label: "FAQ Center", href: "/#faq" },
];

const legalLinks = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms & Conditions", href: "/terms-and-conditions" },
  { label: "Refund / Cancellation", href: "/terms-and-conditions" },
  { label: "Grievance", href: "/#support" },
  { label: "Accessibility", href: "/#support" },
  { label: "Sitemap", href: "/sitemap.xml" },
];



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
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const isHomepage = variant === "homepage";
  const enabledSocial = socialLinks?.length ? socialLinks : getEnabledSocialLinks();

  const whatsappUrl = buildWhatsAppUrl(
    buildSupportWhatsAppMessage({ page: "footer", topic: "Website footer service enquiry" })
  );

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return;
    setSubscribed(true);
    setEmail("");
    setTimeout(() => setSubscribed(false), 5000);
  };

  if (isHomepage) {
    return (
      <footer className="relative isolate overflow-hidden bg-white pb-6 pb-safe-bottom pt-10 text-[#0d1b3e] print:hidden md:pb-8 md:pt-14">
        {/* A light footer, deliberately. The previous versions were both dark
            slabs of link columns; the page already ends on a dark section, and
            a second one made the whole bottom read as one heavy block. */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-[var(--dc-orange-500)]/40 to-transparent"
          aria-hidden="true"
        />

        <div className="mx-auto max-w-[var(--dc-max)] px-[var(--mobile-page-gutter)] sm:px-6 md:px-8">
          {/* Action-first: the footer asks what you want to do next, instead of
              handing you a directory and leaving you to find it. */}
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--dc-orange-600)]">
            What next?
          </p>
          <h2 className="mt-1.5 text-[1.6rem] font-black leading-tight tracking-tight sm:text-[2rem]">
            Pick up where you left off.
          </h2>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                href: "/services",
                icon: Zap,
                title: "Apply for a service",
                body: "GST, ITR, passport, licence, insurance and schemes.",
                ring: "from-blue-500 to-indigo-600",
              },
              {
                href: "/track-application",
                icon: Radar,
                title: "Track an application",
                body: "Status, document requests and receipts in one place.",
                ring: "from-emerald-500 to-teal-600",
              },
              {
                href: "/print",
                icon: Printer,
                title: "Smart Print",
                body: "Scan a QR or upload from your phone, collect at the counter.",
                ring: "from-orange-500 to-amber-600",
              },
              {
                href: whatsappUrl,
                external: true,
                icon: MessageCircle,
                title: "Talk to us",
                body: `Mon–Sat, 10–6 · +91 ${contactDetails.primaryPhone}`,
                ring: "from-green-500 to-emerald-600",
              },
            ].map((action) => {
              const Icon = action.icon;
              const inner = (
                <>
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md ${action.ring}`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="mt-3 flex items-center gap-1.5 text-[15px] font-black">
                    {action.title}
                    <ArrowRight
                      className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                  <span className="mt-1 block text-[13px] font-medium leading-relaxed text-slate-500">
                    {action.body}
                  </span>
                </>
              );

              const className =
                "group flex flex-col rounded-2xl border border-slate-200 bg-white p-4 transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg";

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
          <nav className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2.5 border-t border-slate-200 pt-6 text-[13.5px] font-semibold text-slate-600">
            {dedupeLinks([
              { label: "All services", href: "/services" },
              { label: "Government schemes", href: "/#schemes" },
              { label: "Knowledge Center", href: "/#blog" },
              { label: "Become a Digi Partner", href: "/digi-partner" },
              { label: "Partner login", href: "/ap/login" },
              { label: "FAQ", href: "/#faq" },
              { label: "Support", href: "/#support" },
              { label: "Privacy Policy", href: "/privacy-policy" },
              { label: "Terms & Conditions", href: "/terms-and-conditions" },
            ]).map((link) => (
              <Link key={link.label} href={link.href} className="transition hover:text-[var(--dc-blue-700)]">
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4 border-t border-slate-200 pt-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-navbar.png" alt="DigiConnect Dukan" className="h-7 w-auto" />

            <a
              href={`mailto:${contactDetails.email}`}
              className="inline-flex items-center gap-2 text-[13.5px] font-bold text-slate-600 transition hover:text-[var(--dc-blue-700)]"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              {contactDetails.email}
            </a>

            {enabledSocial.length ? (
              <div className="ml-auto flex items-center gap-2">
                {enabledSocial.map((link) => {
                  const Icon = socialIcon[link.platform] ?? ExternalLink;
                  return (
                    <a
                      key={link.platform}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Visit DigiConnect on ${link.label}`}
                      title={link.handle ? `${link.label} · ${link.handle}` : link.label}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-[var(--dc-orange-500)] hover:bg-[var(--dc-orange-500)] hover:text-white"
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </a>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex flex-col gap-2 text-[12.5px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              &copy; {new Date().getFullYear()} DigiConnect Dukan · RNOS India Private Limited — private
              assistance platform, not a government portal.
            </p>
            <span className="inline-flex shrink-0 items-center gap-1.5 font-bold text-slate-600">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              Razorpay secured · SSL
            </span>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="relative bg-slate-50/80 border-t border-slate-200/50 pt-16 pb-8 pb-safe-bottom print:hidden overflow-hidden noise-bg">
      {/* Background lights */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="container-shell relative z-10">
        
        {/* Upper Part: Newsletter and App Link */}
        <div className="grid gap-8 pb-12 mb-12 border-b border-slate-200/60 lg:grid-cols-2 lg:items-center">
          <div>
            <h3 className="text-base font-black text-slate-800 tracking-tight">Stay updated on compliance alerts</h3>
            <p className="text-xs font-semibold text-slate-400 mt-1">Get legal deadlines, GST schedules, and scheme notifications directly to your inbox.</p>
            <form onSubmit={handleSubscribe} className="mt-4 flex max-w-md gap-2">
              <div className="relative flex-1">
                <input
                  id="newsletter-email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition"
                  required
                />
                {subscribed && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Subscribed
                  </div>
                )}
              </div>
              <button
                id="newsletter-submit"
                type="submit"
                className="inline-flex h-11 px-5 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white hover:bg-slate-800 active:scale-[0.98] transition cursor-pointer"
              >
                Subscribe
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </button>
            </form>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-start lg:justify-end gap-6">
            <div>
              <p className="text-xs font-black text-slate-700">Download DigiConnect Dukan Mobile App</p>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Apply for services on-the-go with real-time push tracking.</p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <a
                id="footer-google-play"
                href="/download-app"
                className="inline-flex h-11 items-center gap-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition active:scale-[0.98] shadow-sm border border-slate-800"
              >
                <Play className="h-5 w-5 fill-current text-white stroke-[0.5]" />
                <div className="text-left leading-none">
                  <p className="text-[8px] font-bold text-slate-400 uppercase">Get it on</p>
                  <p className="text-xs font-black mt-0.5">Google Play</p>
                </div>
              </a>
              
              <a
                id="footer-app-store"
                href="/download-app"
                className="inline-flex h-11 items-center gap-2 px-4 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 transition active:scale-[0.98] shadow-sm"
              >
                <svg className="h-5 w-5 fill-current text-slate-800" viewBox="0 0 24 24">
                  <path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.1,16.67C20.08,16.74 19.67,18.11 18.71,19.5M15.97,4.17C16.63,3.37 17.07,2.28 16.95,1C16,1.04 14.9,1.6 14.24,2.38C13.68,3.04 13.19,4.14 13.34,5.39C14.39,5.47 15.4,4.88 15.97,4.17Z" />
                </svg>
                <div className="text-left leading-none">
                  <p className="text-[8px] font-bold text-slate-400 uppercase">Download on the</p>
                  <p className="text-xs font-black mt-0.5">App Store</p>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Middle Part: Multi-column links grid */}
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
          
          {/* Brand/Identity column */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-lg font-black text-slate-800">DigiConnect Dukan</h3>
            <p className="text-xs font-semibold text-slate-400 leading-normal">
              Connecting People, Empowering Digital India. <br />
              India&apos;s premium digital services marketplace offering hassle-free processing for corporate compliance, taxes, and government registrations.
            </p>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Corporate entity</p>
              <p className="text-xs font-black text-slate-700">RNOS India Private Limited</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Link
                href="https://www.rnos.in"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-xs font-bold text-slate-600 hover:text-slate-800 transition"
              >
                <Globe className="h-3.5 w-3.5 text-blue-500" />
                rnos.in
              </Link>
              <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                GSTIN Verified
              </div>
            </div>
          </div>

          {/* Quick Services column */}
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-4">Core Services</p>
            <nav className="grid gap-2.5">
              {servicesLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-xs font-bold text-slate-500 hover:text-slate-900 transition"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Company links column */}
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-4">Company</p>
            <nav className="grid gap-2.5">
              {companyLinks.map((link) => (
                link.external ? (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-slate-500 hover:text-slate-900 transition"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-xs font-bold text-slate-500 hover:text-slate-900 transition"
                  >
                    {link.label}
                  </Link>
                )
              ))}
            </nav>
          </div>

          {/* Contact Support & Legal column */}
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-3">Legal desk</p>
              <nav className="grid gap-2">
                {legalLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-xs font-bold text-slate-500 hover:text-slate-900 transition"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
            
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-3">Helpline</p>
              <div className="space-y-2 text-xs font-bold text-slate-500">
                <a href={`tel:+91${contactDetails.primaryPhone}`} className="flex items-center gap-1.5 hover:text-slate-900 transition">
                  <Phone className="h-3.5 w-3.5 text-blue-500" />
                  +91 {contactDetails.primaryPhone}
                </a>
                <a href={`mailto:${contactDetails.email}`} className="flex items-center gap-1.5 hover:text-slate-900 transition truncate">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  {contactDetails.email}
                </a>
                <a
                  id="footer-whatsapp-support"
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 text-[10px] font-bold text-emerald-700 transition"
                >
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />
                  WhatsApp Desk
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar: License and Copyright */}
        <div className="mt-12 pt-6 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-slate-400">
          <div className="flex flex-wrap justify-center sm:justify-start gap-x-4 gap-y-1">
            <p>&copy; 2026 DigiConnect Dukan. All rights reserved.</p>
            <p className="hidden sm:inline">|</p>
            <p>Certified ISO 9001:2015 Compliant Entity</p>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>Secured by Razorpay and SSL encryption</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
