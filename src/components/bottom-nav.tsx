"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, FileText, Wallet, UserRound } from "lucide-react";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/services", label: "Services", icon: LayoutGrid },
  { href: "/customer/dashboard#applications", label: "Applications", icon: FileText },
  { href: "/customer/wallet", label: "Wallet", icon: Wallet },
  { href: "/customer/profile", label: "Profile", icon: UserRound },
] as const;

function isTabActive(pathname: string, tabHref: string) {
  if (tabHref === "/") {
    return pathname === "/";
  }

  const base = tabHref.split("#")[0];
  return pathname === base || pathname.startsWith(`${base}/`);
}

const hiddenPrefixes = ["/admin", "/agent", "/login", "/signup", "/ap/login", "/forgot-password", "/reset-password"];

function shouldHide(pathname: string) {
  return hiddenPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function BottomNav() {
  const pathname = usePathname();

  if (shouldHide(pathname)) {
    return null;
  }

  return (
    <nav className="bottom-nav print:hidden" aria-label="Mobile navigation">
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = isTabActive(pathname, href);

        return (
          <Link
            key={label}
            href={href}
            className={`bottom-nav-item${active ? " active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <span className="nav-icon">
              <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
            </span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
