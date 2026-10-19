import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Clock, Lock, Mail, MapPin, MessageCircle, Phone, ShieldCheck } from "lucide-react";

import { FooterSocial } from "@/components/footer-social";
import { CookieSettingsButton } from "@/components/privacy/cookie-consent";
import { business, legalLinks } from "@/lib/compliance/config";
import { STRUCTURES, type ModuleId, type ResolvedModule } from "@/lib/homepage/launch-catalog";
import type { SocialLink } from "@/lib/social-links";
import { buildSupportWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

type FooterLink = { label: string; href: string };

/**
 * The homepage's footer.
 *
 * Every fact in it comes from the compliance config the rest of the site uses
 * (legal entity, contact, hours, policies) or from the live catalogue (which
 * service pages exist), so it can never drift from the shared footer on the
 * other routes, which this does not replace.
 */
export function HomeFooter({ resolved, socialLinks }: { resolved: Record<ModuleId, ResolvedModule>; socialLinks: SocialLink[] }) {
  const linkFor = (id: ModuleId, fallback: string) => resolved[id]?.href ?? fallback;
  const whatsapp = buildWhatsAppUrl(buildSupportWhatsAppMessage({ page: "footer", topic: "Company registration" }));
  const year = new Date().getFullYear();

  const columns: { title: string; links: FooterLink[] }[] = [
    {
      title: "Register a company",
      links: [...STRUCTURES.map((structure) => ({ label: structure.name, href: "#structures" })), { label: "Compare structures", href: "#compare" }],
    },
    {
      title: "Registrations",
      links: [
        { label: "GST registration", href: linkFor("gst", "#addons") },
        { label: "Udyam (MSME)", href: linkFor("msme", "#addons") },
        { label: "Digital Signature (DSC)", href: linkFor("dsc", "#addons") },
        { label: "Startup India (DPIIT)", href: linkFor("startup-india", "#addons") },
        { label: "FSSAI licence", href: linkFor("fssai", "#addons") },
        { label: "Annual ROC compliance", href: linkFor("annual-compliance", "#addons") },
      ],
    },
    {
      title: "Plan & learn",
      links: [
        { label: "Build my company", href: "#builder" },
        { label: "Packages", href: "#packages" },
        { label: "Document checklist", href: "#documents" },
        { label: "Cost guide", href: "#costs" },
        { label: "Guides & blog", href: "/blog" },
        { label: "FAQs", href: "#faq" },
      ],
    },
    {
      title: "RNOS",
      links: [
        { label: "About us", href: "/about" },
        { label: "All services", href: "/services" },
        { label: "Track an application", href: "/track-application" },
        { label: "Become a DC Partner", href: "/digi-partner" },
        { label: "Partner login", href: "/ap/login" },
        { label: "Contact & grievance", href: "/contact" },
      ],
    },
  ];

  return (
    <footer className="rl rl-footer" aria-labelledby="footer-title">
      <h2 id="footer-title" className="rl-sr">
        Site footer
      </h2>
      <div className="rl-wrap">
        <div className="rl-footer__top">
          <div className="rl-footer__brand">
            <Link href="/" aria-label="DigiConnect Dukan by RNOS, home">
              <Image src="/logo-navbar.png" alt="" width={1024} height={171} className="rl-footer__logo" />
            </Link>
            <p>
              Company registration, tax registrations and business setup — guided, priced up front and tracked online. A service of{" "}
              <strong>{business.legalEntity}</strong>.
            </p>
            <ul className="rl-footer__contact">
              <li>
                <Mail aria-hidden="true" />
                <a href={`mailto:${business.email}`}>{business.email}</a>
              </li>
              <li>
                <Phone aria-hidden="true" />
                <a href={`tel:+91${business.phone}`}>+91 {business.phone}</a>
              </li>
              <li>
                <Clock aria-hidden="true" />
                <span>{business.supportHours}</span>
              </li>
              <li>
                <MapPin aria-hidden="true" />
                <span>{business.location}</span>
              </li>
            </ul>
            <div className="rl-footer__cta">
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="rl-btn rl-btn--launch rl-btn--sm">
                <MessageCircle aria-hidden="true" />
                Chat on WhatsApp
              </a>
              <a href="#builder" className="rl-btn rl-btn--ghost rl-btn--sm">
                Start your company
                <ArrowUpRight className="rl-arrow" aria-hidden="true" />
              </a>
            </div>
            <div className="rl-footer__social">
              <FooterSocial links={socialLinks} />
            </div>
          </div>

          <nav className="rl-footer__cols" aria-label="Footer">
            {columns.map((column) => (
              <div key={column.title}>
                <h3>{column.title}</h3>
                <ul>
                  {column.links.map((link) => (
                    <li key={link.label}>
                      {link.href.startsWith("/") ? <Link href={link.href}>{link.label}</Link> : <a href={link.href}>{link.label}</a>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="rl-footer__assure">
          <span>
            <ShieldCheck aria-hidden="true" />
            Payments via Razorpay, verified on our server
          </span>
          <span>
            <Lock aria-hidden="true" />
            HTTPS encrypted
          </span>
          <span>
            <Clock aria-hidden="true" />
            Track every application online
          </span>
        </div>

        <p className="rl-footer__word" aria-hidden="true">
          Your business <em>begins</em> here.
        </p>

        <div className="rl-footer__bottom">
          <p>
            © {year} {business.brand} · {business.legalEntity}, {business.location}. A private assistance service, not a government portal — registrations are
            issued by the relevant authority.
          </p>
          <ul>
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
            <li>
              <CookieSettingsButton className="rl-footer__cookie" />
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
