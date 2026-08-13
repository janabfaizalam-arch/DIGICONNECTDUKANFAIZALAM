"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Globe,
  MessageCircle,
  Phone,
  Mail,
  ShieldCheck,
  Clock,
  Lock,
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

const helpLinks = [
  { label: "FAQ Center", href: "/#faq" },
  { label: "Track application", href: "/track-application" },
  { label: "Smart Print", href: "/print" },
  { label: "Support desk", href: "/#support" },
];

const categoryLinks = [
  { label: "Browse categories", href: "/#categories" },
  { label: "All services", href: "/services" },
  { label: "Government schemes", href: "/#schemes" },
  { label: "Knowledge Center", href: "/#blog" },
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

const partnerLinks = [
  { label: "Become a Digi Partner", href: "/digi-partner" },
  { label: "Partner login", href: "/ap/login" },
];

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
      <footer className="relative isolate overflow-hidden bg-[var(--dc-navy-950)] pb-8 pb-safe-bottom pt-12 text-white print:hidden md:pb-10">
        {/* Depth, not decoration: two brand washes and a masked grid keep the
            footer from reading as a flat navy slab at the end of the page. */}
        <div
          className="al-drift pointer-events-none absolute -left-40 -top-40 -z-10 h-[460px] w-[460px] rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(255,104,0,0.45) 0%, transparent 68%)" }}
          aria-hidden="true"
        />
        <div
          className="al-drift pointer-events-none absolute -bottom-48 right-[-10%] -z-10 h-[480px] w-[480px] rounded-full opacity-35 blur-3xl"
          style={{
            background: "radial-gradient(circle, rgba(56,189,248,0.4) 0%, transparent 68%)",
            animationDelay: "-13s",
          }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.14]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 0%, #000 20%, transparent 78%)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 0%, #000 20%, transparent 78%)",
          }}
          aria-hidden="true"
        />

        <div className="mx-auto max-w-[var(--dc-max)] px-[var(--mobile-page-gutter)] sm:px-6 md:px-8">
          {/* Real support desk, not an invented mailing list. */}
          <div className="overflow-hidden rounded-[1.75rem] border border-white/15 bg-gradient-to-br from-[var(--dc-blue-800)] via-[var(--dc-blue-700)] to-[var(--dc-navy-900)] p-6 shadow-2xl sm:p-8">
            <div className="grid gap-6 lg:grid-cols-[1.3fr_auto] lg:items-center">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--dc-orange-400)]">
                  Talk to a person
                </p>
                <h3 className="mt-1.5 text-2xl font-black tracking-tight md:text-[1.75rem]">
                  Stuck somewhere? Message us on WhatsApp.
                </h3>
                <p className="mt-2 max-w-xl text-[15px] font-medium leading-relaxed text-white/80">
                  Service questions, application status, document help — the support desk replies during
                  business hours. No bots, no mailing list.
                </p>
              </div>
              <a
                id="footer-whatsapp-support"
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-[var(--dc-orange-500)] px-7 py-3.5 text-[15px] font-black shadow-lg shadow-orange-900/30 transition hover:-translate-y-0.5 hover:bg-[var(--dc-orange-600)]"
              >
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
                WhatsApp support
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </a>
            </div>
          </div>

          <div className="mt-12 grid gap-10 md:grid-cols-[1.35fr_repeat(4,1fr)]">
            <div>
              <span className="inline-flex rounded-xl bg-white px-3 py-2 shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-navbar.png" alt="DigiConnect Dukan" className="h-8 w-auto" />
              </span>
              <p className="mt-4 text-base font-black">RNOS India Private Limited</p>
              <p className="mt-2 max-w-sm text-[14.5px] font-medium leading-relaxed text-white/70">
                Private digital assistance for tax, business, identity and government scheme paperwork
                across India. We are not an official government portal.
              </p>

              <div className="mt-5 space-y-1">
                <a
                  href={`tel:+91${contactDetails.primaryPhone}`}
                  className="flex min-h-10 items-center gap-2.5 text-[14.5px] font-bold text-white/85 transition hover:text-[var(--dc-orange-400)]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                    <Phone className="h-4 w-4" aria-hidden="true" />
                  </span>
                  +91 {contactDetails.primaryPhone}
                </a>
                <a
                  href={`mailto:${contactDetails.email}`}
                  className="flex min-h-10 items-center gap-2.5 text-[14.5px] font-bold text-white/85 transition hover:text-[var(--dc-orange-400)]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                    <Mail className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {contactDetails.email}
                </a>
                <p className="flex min-h-10 items-center gap-2.5 text-[14.5px] font-medium text-white/60">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                    <Clock className="h-4 w-4" aria-hidden="true" />
                  </span>
                  Mon–Sat · 10:00 AM – 6:00 PM IST
                </p>
              </div>

              {enabledSocial.length ? (
                <div className="mt-5 flex flex-wrap items-center gap-2">
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
                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-[var(--dc-orange-500)]"
                      >
                        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                      </a>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {[
              { title: "Services", links: servicesLinks },
              { title: "Explore", links: categoryLinks },
              {
                title: "Company",
                // partnerLinks and companyLinks both carry the Digi Partner
                // entries, so merging them listed the same link twice and
                // collided on the React key.
                links: dedupeLinks([
                  ...partnerLinks,
                  ...companyLinks.slice(0, 3).map((l) => ({ label: l.label, href: l.href })),
                ]),
              },
              { title: "Help & Legal", links: dedupeLinks([...helpLinks.slice(0, 3), ...legalLinks.slice(0, 4)]) },
            ].map((group) => (
              <div key={group.title}>
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--dc-orange-400)]">
                  {group.title}
                </p>
                <nav className="mt-3.5 grid gap-2.5">
                  {group.links.map((link) => (
                    <Link
                      key={`${group.title}-${link.label}`}
                      href={link.href}
                      className="w-fit text-[14.5px] font-medium text-white/75 transition hover:translate-x-0.5 hover:text-white"
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </div>
            ))}
          </div>

          {/* What a customer actually wants reassurance about before paying. */}
          <div className="mt-10 grid gap-3 border-t border-white/12 pt-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: ShieldCheck, title: "Razorpay secured", body: "UPI, cards and net banking. Card details never touch our servers." },
              { icon: Lock, title: "Documents encrypted", body: "Uploads are stored privately and shared only with your application." },
              { icon: CheckCircle2, title: "Human verification", body: "Every filing is checked by our team before it is submitted." },
              { icon: Globe, title: "PAN India", body: "Assistance available across states, in Hindi and English." },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl border border-white/12 bg-white/[0.05] p-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--dc-orange-500)]/20 text-[var(--dc-orange-400)]">
                    <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  </span>
                  <p className="mt-3 text-[13.5px] font-black">{item.title}</p>
                  <p className="mt-1 text-[12.5px] font-medium leading-relaxed text-white/60">{item.body}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-white/12 pt-6 text-[13.5px] font-medium text-white/60 sm:flex-row sm:items-center">
            <div>
              <p className="font-bold text-white/75">
                &copy; {new Date().getFullYear()} DigiConnect Dukan · RNOS India Private Limited
              </p>
              <p className="mt-1">
                Private assistance platform — not affiliated with any government department.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {legalLinks.slice(0, 3).map((link) => (
                <Link key={link.label} href={link.href} className="transition hover:text-white">
                  {link.label}
                </Link>
              ))}
            </div>
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
