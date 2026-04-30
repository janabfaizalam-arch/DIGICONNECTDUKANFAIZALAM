import Link from "next/link";
import { Globe, Mail, Phone, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { contactDetails } from "@/lib/constants";
import { generateWhatsAppLink } from "@/lib/whatsapp";

export function ContactSection() {
  return (
    <section id="contact" className="section-pad pt-0">
      <div className="container-shell rounded-3xl border bg-white/90 p-6 shadow-soft md:p-10">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--secondary)]">Contact</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950 md:text-4xl">Contact DigiConnect Dukan</h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
              Get online digital service support for PAN, Aadhaar, GST, Passport, certificates, and more across India.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a href={`tel:${contactDetails.phone}`}>
                <Button>Call Now</Button>
              </a>
              <a href={generateWhatsAppLink()} target="_blank" rel="noreferrer">
                <Button variant="secondary">Contact Now</Button>
              </a>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.75rem] bg-[var(--muted)] p-6">
              <Phone className="h-5 w-5 text-[var(--primary)]" />
              <p className="mt-4 text-sm font-medium text-slate-500">Primary</p>
              <p className="mt-1 text-xl font-bold text-slate-950">{contactDetails.primaryPhone}</p>
            </div>
            <div className="rounded-[1.75rem] bg-[var(--accent)] p-6">
              <Phone className="h-5 w-5 text-[var(--secondary)]" />
              <p className="mt-4 text-sm font-medium text-slate-500">Secondary</p>
              <p className="mt-1 text-xl font-bold text-slate-950">Office Support: {contactDetails.officeSupportPhone}</p>
            </div>
            <div className="rounded-[1.75rem] border p-6">
              <ShieldCheck className="h-5 w-5 text-[var(--primary)]" />
              <p className="mt-4 text-sm font-medium text-slate-500">Availability</p>
              <p className="mt-1 text-lg font-bold text-slate-950">Service available across India</p>
              <p className="mt-1 text-sm text-slate-600">Serving customers through online services</p>
            </div>
            <div className="rounded-[1.75rem] border p-6">
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
    </section>
  );
}
