"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Download, FileCheck2, LayoutDashboard, LogIn, Menu, MessageCircle, UserRound } from "lucide-react";
import { useEffect, useRef } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import { buildSupportWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

const menuLinks = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/#gallery", label: "Gallery" },
  { href: "/#support", label: "Support" },
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
        className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full border border-white/40 bg-white/62 text-blue-700 shadow-[0_4px_12px_rgba(15,23,42,0.06)] [&::-webkit-details-marker]:hidden"
      >
        <Menu className="h-4.5 w-4.5" />
        <span className="sr-only">Open navigation menu</span>
      </summary>
      <div id="mobile-navigation" className="absolute right-0 top-12 z-[60] w-[min(18rem,calc(100vw-1.5rem))] rounded-[1.35rem] border border-white/15 bg-white/95 p-3 shadow-liquid">
        <nav className="grid gap-1 text-sm font-medium text-slate-700">
          {menuLinks.map((link) => {
            const Icon = link.icon;

            return (
              <Link
                key={link.label}
                href={link.href}
                onClick={closeMenu}
                className="flex items-center gap-2 rounded-2xl px-4 py-2.5 hover:bg-white/75 hover:text-blue-700"
              >
                {Icon ? <Icon className="h-4 w-4" /> : null}
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-3 grid gap-2 border-t pt-3">
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
                        <Link key={href} href={href} onClick={closeMenu} className="rounded-2xl border border-blue-100 bg-blue-50/55 px-4 py-2.5 text-sm font-bold text-blue-800">
                          {label}
                        </Link>
                      ))}
                      <Link href="/services" onClick={closeMenu} className="flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-400 px-4 text-sm font-bold text-white shadow-md shadow-orange-500/15">
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
                className="flex h-11 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/60 px-4 text-sm font-bold text-emerald-700 shadow-sm"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
              <LogoutButton className="h-11 w-full" onLoggedOut={closeMenu} />
            </>
          ) : (
            <>
              <Link href="/services" onClick={closeMenu} className="flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-400 px-4 text-sm font-bold text-white shadow-md shadow-orange-500/15">
                <FileCheck2 className="h-4 w-4" />
                Apply Now
              </Link>
              <Link
                href="/login/customer"
                onClick={closeMenu}
                className="flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-4 text-sm font-bold text-white shadow-md shadow-blue-600/15"
              >
                <LogIn className="h-4 w-4" />
                Login
              </Link>
              <Link
                href="/ap/login"
                onClick={closeMenu}
                className="flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-500 px-4 text-sm font-bold text-white shadow-md shadow-indigo-600/15"
              >
                <UserRound className="h-4 w-4" />
                AP Login
              </Link>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMenu}
                className="flex h-11 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/60 px-4 text-sm font-bold text-emerald-700 shadow-sm"
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
