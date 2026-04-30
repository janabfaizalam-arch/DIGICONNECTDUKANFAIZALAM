import Link from "next/link";
import Image from "next/image";
import { LogIn, PhoneCall } from "lucide-react";

import { contactDetails } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { MobileMenu } from "@/components/mobile-menu";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/#services", label: "Services" },
  { href: "/#about", label: "About" },
  { href: "/#gallery", label: "Gallery" },
  { href: "/#contact", label: "Contact" },
];

export async function SiteHeader() {
  return (
    <header className="site-header sticky top-0 z-40 border-b border-white/50 bg-white/90 backdrop-blur-xl print:hidden">
      <div className="container-shell flex min-h-12 items-center justify-between gap-3 py-1 md:min-h-16 md:gap-4 md:py-2">
        <Link href="/" className="flex min-w-0 shrink-0 items-center" aria-label="DigiConnect Dukan home">
          <Image
            src="/logo-navbar.png"
            alt="DigiConnect Dukan Logo"
            width={1920}
            height={819}
            priority
            className="max-h-10 w-auto object-contain sm:h-9 lg:h-11"
          />
        </Link>
        <nav className="hidden items-center gap-5 text-sm font-medium text-slate-600 md:flex">
          {navLinks.map((link) => (
            <Link key={link.label} href={link.href} className="hover:text-[var(--primary)]">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <a href={`tel:${contactDetails.primaryPhone}`}>
            <Button size="default" variant="outline">
              <PhoneCall className="h-4 w-4" />
              Call Now
            </Button>
          </a>
          <Link href="/login" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:shadow-lg">
            <LogIn className="h-4 w-4" />
            Login
          </Link>
        </div>
        <MobileMenu />
      </div>
    </header>
  );
}
