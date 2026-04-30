import Link from "next/link";
import Image from "next/image";
import { PhoneCall } from "lucide-react";

import { contactDetails } from "@/lib/constants";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { MobileMenu } from "@/components/mobile-menu";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/#lead-form", label: "Apply Now" },
  { href: "/dashboard", label: "Dashboard" },
];

export async function SiteHeader() {
  await getCurrentUser();

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
            <Button size="default">
              <PhoneCall className="h-4 w-4" />
              Call Now
            </Button>
          </a>
        </div>
        <MobileMenu />
      </div>
    </header>
  );
}
