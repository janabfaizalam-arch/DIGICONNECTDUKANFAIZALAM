import Link from "next/link";
import { LogIn, MessageCircle } from "lucide-react";

import { generateWhatsAppLink } from "@/lib/whatsapp";

const footerLinks = [
  { label: "Services", href: "/services" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms & Conditions", href: "/terms-and-conditions" },
];

export function MarketingFooter() {
  return (
    <footer className="px-0 pb-6 pt-2">
      <div className="container-shell">
        <div className="rounded-[2rem] border border-white/15 bg-[linear-gradient(135deg,#07111f,#10233f_56%,#123a5b)] p-5 text-white shadow-[0_24px_80px_rgba(15,23,42,0.22)] md:p-8">
          <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr] md:items-end">
            <div>
              <p className="text-2xl font-bold">DigiConnect Dukan</p>
              <p className="mt-2 text-sm font-medium text-white/70">Powered by RNoS India Pvt Ltd</p>
              <p className="mt-4 max-w-xl text-base leading-7 text-white/82">
                Connecting People, Empowering Digital India
              </p>
            </div>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Link href="/login" className="premium-button bg-white text-slate-950 hover:bg-white">
                  <LogIn className="h-4 w-4" />
                  Login
                </Link>
                <a href={generateWhatsAppLink()} target="_blank" rel="noreferrer" className="premium-button border border-white/25 bg-white/10 text-white backdrop-blur-xl hover:bg-white/15">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              </div>
              <nav className="flex flex-wrap gap-2 text-sm text-white/72">
                {footerLinks.map((link) => (
                  <Link key={link.label} href={link.href} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 transition hover:bg-white/10 hover:text-white">
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
          <div className="mt-6 border-t border-white/10 pt-4 text-xs text-white/60">
            © 2026 DigiConnect Dukan. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
