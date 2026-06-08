import Link from "next/link";
import { Globe, MessageCircle, Phone } from "lucide-react";

import { contactDetails } from "@/lib/constants";
import { buildSupportWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

const quickLinks = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "About", href: "/about" },
  { label: "Download App", href: "/download-app" },
];

const legalLinks = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms & Conditions", href: "/terms-and-conditions" },
  { label: "Refund Policy", href: "/terms-and-conditions" },
];

const supportLinks = [
  { label: "Support", href: "/#support" },
  { label: "Contact", href: "/#support" },
  { label: "FAQ", href: "/#faq" },
];

export function MarketingFooter() {
  const whatsappUrl = buildWhatsAppUrl(buildSupportWhatsAppMessage({ page: "footer", topic: "Website footer service enquiry" }));

  return (
    <footer className="bg-white border-t border-slate-100 px-3 pt-10 pb-6 pb-safe-bottom print:hidden">
      <div className="container-shell">
        <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr_0.8fr_1fr]">
          {/* Brand */}
          <div className="max-w-xs">
            <h3 className="text-lg font-black text-slate-900">DigiConnect Dukan</h3>
            <p className="mt-1 text-xs font-semibold text-slate-400">Powered By RNoS India Pvt Ltd</p>
            <p className="mt-3 text-sm text-slate-500 leading-relaxed">
              Connecting People, Empowering Digital India
            </p>
            <Link
              href="https://www.rnos.in"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition"
            >
              <Globe className="h-3.5 w-3.5" />
              rnos.in
            </Link>
          </div>

          {/* Quick Links */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-3">Quick Links</p>
            <nav className="grid gap-2">
              {quickLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm font-medium text-slate-500 hover:text-slate-800 transition"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Legal */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-3">Legal</p>
            <nav className="grid gap-2">
              {legalLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm font-medium text-slate-500 hover:text-slate-800 transition"
                >
                  {link.label}
                </Link>
              ))}
              {supportLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm font-medium text-slate-500 hover:text-slate-800 transition"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Contact */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-3">Contact</p>
            <div className="space-y-2.5">
              <a
                href={`tel:+91${contactDetails.primaryPhone}`}
                className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition"
              >
                <Phone className="h-3.5 w-3.5 text-blue-500" />
                +91 {contactDetails.primaryPhone}
              </a>
              <a
                href={`tel:+91${contactDetails.officeSupportPhone}`}
                className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition"
              >
                <Phone className="h-3.5 w-3.5 text-orange-500" />
                +91 {contactDetails.officeSupportPhone}
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-emerald-700 transition hover:border-emerald-200 hover:bg-emerald-50"
              >
                <MessageCircle className="h-4 w-4 text-emerald-500" />
                WhatsApp Support
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <p>&copy; 2026 DigiConnect Dukan. All rights reserved.</p>
          <p className="text-[10px]">Built with care by RNOS India Pvt Ltd</p>
        </div>
      </div>
    </footer>
  );
}
