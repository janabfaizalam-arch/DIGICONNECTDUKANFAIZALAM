import Link from "next/link";
import { Globe, MessageCircle, Phone } from "lucide-react";

import { contactDetails } from "@/lib/constants";
import { generateWhatsAppLink } from "@/lib/whatsapp";

const footerLinks = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "About", href: "/#about" },
  { label: "Gallery", href: "/#gallery" },
  { label: "Support", href: "/#support" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms & Conditions", href: "/terms-and-conditions" },
];

const popularServices = [
  { label: "PAN Card", href: "/services/pan-card" },
  { label: "Aadhaar Update", href: "/services/aadhaar-update" },
  { label: "GST Registration", href: "/services/gst-registration" },
  { label: "Certificates", href: "/services/income-caste-domicile-certificate" },
];

export function MarketingFooter() {
  return (
    <footer className="px-0 pb-6 pt-2">
      <div className="container-shell">
        <div className="rounded-[1.75rem] border border-white/15 bg-[linear-gradient(135deg,#061226,#0d2a52_58%,#0b4a7a)] p-5 text-white shadow-[0_24px_80px_rgba(15,23,42,0.22)] md:rounded-[2rem] md:p-8">
          <div className="grid gap-7 lg:grid-cols-[1.05fr_0.85fr_0.85fr_0.8fr]">
            <div className="max-w-sm">
              <p className="text-2xl font-bold">DigiConnect Dukan</p>
              <p className="mt-2 text-sm font-medium text-white/70">Powered By RNoS India Pvt Ltd</p>
              <p className="mt-4 text-base leading-7 text-white/82">
                Connecting People, Empowering Digital India
              </p>
              <Link href="https://www.rnos.in" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-sky-200 hover:text-white">
                <Globe className="h-4 w-4" />
                Website: rnos.in
              </Link>
            </div>

            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-white/50">Quick Links</p>
              <nav className="mt-4 grid gap-2 text-sm text-white/72">
                {footerLinks.map((link) => (
                  <Link key={link.label} href={link.href} className="transition hover:text-white">
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-white/50">Popular Services</p>
              <nav className="mt-4 grid gap-2 text-sm text-white/72">
                {popularServices.map((link) => (
                  <Link key={link.label} href={link.href} className="transition hover:text-white">
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-white/50">Contact/WhatsApp</p>
              <div className="mt-4 grid gap-3">
                <a href={`tel:+91${contactDetails.primaryPhone}`} className="inline-flex items-center gap-2 text-sm font-bold text-white">
                  <Phone className="h-4 w-4 text-orange-300" />
                  +91 {contactDetails.primaryPhone}
                </a>
                <a href={generateWhatsAppLink()} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/15">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              </div>
            </div>
          </div>
          <div className="mt-6 border-t border-white/10 pt-4 text-xs text-white/60">
            &copy; 2026 DigiConnect Dukan. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
