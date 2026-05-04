"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogIn, Menu, MessageCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import { generateWhatsAppLink } from "@/lib/whatsapp";

const menuLinks = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/#about", label: "About" },
  { href: "/#gallery", label: "Gallery" },
  { href: "/#support", label: "Support" },
];

type MobileMenuProps = {
  isLoggedIn: boolean;
  panelHref: string | null;
  panelLabel: string | null;
};

export function MobileMenu({ isLoggedIn, panelHref, panelLabel }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!open) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative md:hidden">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="mobile-navigation"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/50 text-blue-700 shadow-sm"
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Open navigation menu</span>
      </button>
      {open ? (
        <div id="mobile-navigation" className="absolute right-0 top-12 w-[min(18rem,calc(100vw-1.5rem))] rounded-[1.35rem] border border-white/15 bg-white/90 p-3 shadow-liquid">
          <nav className="grid gap-1 text-sm font-medium text-slate-700">
            {menuLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-2xl px-4 py-2.5 hover:bg-white/75 hover:text-blue-700"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 grid gap-2 border-t pt-3">
            {isLoggedIn && panelHref && panelLabel ? (
              <>
                <Link
                  href={panelHref}
                  onClick={() => setOpen(false)}
                  className="flex h-11 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-bold text-white"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  {panelLabel}
                </Link>
                <LogoutButton className="h-11 w-full" onLoggedOut={() => setOpen(false)} />
              </>
            ) : (
              <>
                <Link
                  href="/login/customer"
                  onClick={() => setOpen(false)}
                  className="flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-4 text-sm font-bold text-white shadow-md shadow-blue-600/15"
                >
                  <LogIn className="h-4 w-4" />
                  Login
                </Link>
                <a
                  href={generateWhatsAppLink()}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setOpen(false)}
                  className="flex h-11 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/60 px-4 text-sm font-bold text-emerald-700 shadow-sm"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
