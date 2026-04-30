"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogIn, Menu, PhoneCall } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import { contactDetails } from "@/lib/constants";

const menuLinks = [
  { href: "/", label: "Home" },
  { href: "/#about", label: "About" },
  { href: "/#gallery", label: "Gallery" },
  { href: "/#contact", label: "Contact" },
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
        className="flex h-10 w-10 items-center justify-center rounded-full border bg-white text-[var(--primary)] shadow-sm"
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Open navigation menu</span>
      </button>
      {open ? (
        <div id="mobile-navigation" className="absolute right-0 top-12 w-72 rounded-2xl border bg-white p-3 shadow-soft">
          <nav className="grid gap-1 text-sm font-medium text-slate-700">
            {menuLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 hover:bg-[var(--muted)] hover:text-[var(--primary)]"
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
                <a
                  href={`tel:${contactDetails.primaryPhone}`}
                  onClick={() => setOpen(false)}
                  className="flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-4 text-sm font-bold text-white"
                >
                  <PhoneCall className="h-4 w-4" />
                  Call Now
                </a>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex h-11 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-bold text-white"
                >
                  <LogIn className="h-4 w-4" />
                  Login
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
