"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BadgeCheck, Download, FileCheck2, LayoutDashboard, LogIn, Menu, MessageCircle } from "lucide-react";
import { useEffect, useRef } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import { buildSupportWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { DIGI_PARTNER_CTA_LABEL, DIGI_PARTNER_LOGIN_ROUTE } from "@/lib/auth/partner-access";

const menuLinks = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/customer/dashboard#applications", label: "Track Application" },
  { href: "/#support", label: "Contact" },
  { href: "/download-app", label: "Download App", icon: Download },
];

type MobileMenuProps = {
  isLoggedIn: boolean;
  isCustomer?: boolean;
  panelHref: string | null;
  panelLabel: string | null;
};

export function MobileMenu({ isLoggedIn, isCustomer = false, panelHref, panelLabel }: MobileMenuProps) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  const whatsappUrl = buildWhatsAppUrl(
    buildSupportWhatsAppMessage({
      page: "mobile_menu",
      topic: isLoggedIn ? `${panelLabel ?? "Dashboard"} support` : "Website service enquiry",
    }),
  );

  useEffect(() => {
    if (menuRef.current) {
      menuRef.current.open = false;
    }
  }, [pathname]);

  function closeMenu() {
    if (menuRef.current) {
      menuRef.current.open = false;
    }
  }

  return (
    <details ref={menuRef} className="relative z-50 md:hidden">
      <summary
        aria-controls="mobile-navigation"
        className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border border-white/50 bg-white/70 text-blue-700 shadow-[0_6px_16px_rgba(15,23,42,0.06)] hover:scale-[1.05] active:scale-[0.95] transition-all duration-200 [&::-webkit-details-marker]:hidden"
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Open navigation menu</span>
      </summary>
      <div id="mobile-navigation" className="absolute right-0 top-13 z-[60] w-[min(19rem,calc(100vw-1.5rem))] rounded-[24px] border border-white/40 bg-white/94 p-4 shadow-[0_18px_48px_rgba(15,23,42,0.12)] backdrop-blur-md transition-all duration-200">
        <nav className="grid gap-1 text-sm font-semibold text-slate-700">
          {menuLinks.map((link) => {
            const Icon = link.icon;

            return (
              <Link
                key={link.label}
                href={link.href}
                onClick={closeMenu}
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 hover:bg-blue-50/50 hover:text-blue-700 transition-all duration-150"
              >
                {Icon ? <Icon className="h-4 w-4" /> : null}
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3">
          {isLoggedIn && panelHref && panelLabel ? (
            <>
              {isCustomer ? (
                <>
                  {[
                    ["/customer/dashboard", "Dashboard"],
                    ["/customer/dashboard#applications", "My Applications"],
                    ["/customer/wallet", "Wallet"],
                    ["/customer/dashboard#refer-earn", "Refer & Earn"],
                    ["/customer/profile", "Profile"],
                  ].map(([href, label]) => (
                    <Link key={href} href={href} onClick={closeMenu} className="rounded-xl border border-blue-50/80 bg-blue-50/40 px-4 py-2.5 text-sm font-bold text-blue-800 transition hover:bg-blue-50/70">
                      {label}
                    </Link>
                  ))}
                  <Link href="/services" onClick={closeMenu} className="flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 px-4 text-sm font-extrabold text-white shadow-md shadow-orange-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
                    <FileCheck2 className="h-4 w-4" />
                    Apply Now
                  </Link>
                </>
              ) : null}
              {!isCustomer ? (
                <Link
                  href={panelHref}
                  onClick={closeMenu}
                  className="flex h-11 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-bold text-white"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  {panelLabel}
                </Link>
              ) : null}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMenu}
                className="flex h-11 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/60 px-4 text-sm font-bold text-emerald-700 shadow-sm transition hover:bg-white/80"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
              <LogoutButton className="h-11 w-full" onLoggedOut={closeMenu} />
            </>
          ) : (
            <>
              <Link href="/services" onClick={closeMenu} className="flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 px-4 text-sm font-extrabold text-white shadow-md shadow-orange-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
                <FileCheck2 className="h-4 w-4" />
                Apply Now
              </Link>
              <Link
                href="/login/customer"
                onClick={closeMenu}
                className="flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 px-4 text-sm font-extrabold text-white shadow-md shadow-blue-700/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                <LogIn className="h-4 w-4" />
                Login
              </Link>
              <Link
                href={DIGI_PARTNER_LOGIN_ROUTE}
                onClick={closeMenu}
                aria-label={DIGI_PARTNER_CTA_LABEL}
                className="flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-700 to-indigo-600 px-4 text-sm font-extrabold text-white shadow-md shadow-indigo-700/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                <BadgeCheck className="h-4 w-4" />
                {DIGI_PARTNER_CTA_LABEL}
              </Link>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMenu}
                className="flex h-11 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/60 px-4 text-sm font-bold text-emerald-700 shadow-sm transition hover:bg-white/80"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </>
          )}
        </div>
      </div>
    </details>
  );
}
