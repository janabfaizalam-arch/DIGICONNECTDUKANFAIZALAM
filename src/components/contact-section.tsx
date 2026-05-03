import Link from "next/link";
import { Globe, Mail, MessageCircle, Phone, ShieldCheck } from "lucide-react";

import { contactDetails } from "@/lib/constants";
import { generateWhatsAppLink } from "@/lib/whatsapp";

export function ContactSection() {
  return (
    <section id="support" className="section-pad pt-0">
      <div className="container-shell">
        <div className="glass-panel reveal-on-scroll rounded-[1.75rem] border border-white/70 p-5 shadow-liquid md:rounded-[2rem] md:p-8">
          <div className="grid gap-7 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--secondary)]">Support</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950 md:text-4xl">Need help? Our team is ready to support you.</h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
              Get online digital service support for PAN, Aadhaar, GST, Passport, certificates, licences, and more across India.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a href={`tel:+91${contactDetails.primaryPhone}`} className="premium-button premium-button-blue">
                <Phone className="h-4 w-4" />
                Call Now
              </a>
              <a href={generateWhatsAppLink()} target="_blank" rel="noreferrer" className="premium-button premium-button-whatsapp">
                <MessageCircle className="h-4 w-4" />
                WhatsApp Now
              </a>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="liquid-card rounded-[1.3rem] p-5">
              <Phone className="h-5 w-5 text-[var(--primary)]" />
              <p className="mt-4 text-sm font-medium text-slate-500">Primary Contact</p>
              <p className="mt-1 text-xl font-bold text-slate-950">+91 {contactDetails.primaryPhone}</p>
            </div>
            <div className="liquid-card rounded-[1.3rem] p-5">
              <Phone className="h-5 w-5 text-[var(--secondary)]" />
              <p className="mt-4 text-sm font-medium text-slate-500">Office Support</p>
              <p className="mt-1 text-xl font-bold text-slate-950">+91 {contactDetails.officeSupportPhone}</p>
            </div>
            <div className="liquid-card rounded-[1.3rem] p-5">
              <ShieldCheck className="h-5 w-5 text-[var(--primary)]" />
              <p className="mt-4 text-sm font-medium text-slate-500">Availability</p>
              <p className="mt-1 text-lg font-bold text-slate-950">Service available across India</p>
              <p className="mt-1 text-sm text-slate-600">Serving customers through online services</p>
            </div>
            <div className="liquid-card rounded-[1.3rem] p-5">
              <Mail className="h-5 w-5 text-[var(--primary)]" />
              <p className="mt-4 text-sm font-medium text-slate-500">Online</p>
              <Link href={`mailto:${contactDetails.email}`} className="mt-1 block text-lg font-bold text-slate-950">
                {contactDetails.email}
              </Link>
              <Link
                href={contactDetails.website}
                target="_blank"
                rel="noreferrer"
                className="mt-1 flex items-center gap-2 text-sm text-slate-600"
              >
                <Globe className="h-4 w-4" />
                www.rnos.in
              </Link>
            </div>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}
