"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, LayoutGrid, FileText, Wallet, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/browser";

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

const hiddenPrefixes = ["/admin", "/agent", "/login", "/signup", "/ap/login", "/forgot-password", "/reset-password", "/customer/dashboard"];

function shouldHide(pathname: string) {
  return hiddenPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function BottomNav() {
  const pathname = usePathname();
  const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);

  useEffect(() => {
    if (shouldHide(pathname)) return;

    const checkProfile = async () => {
      try {
        const supabase = createClient();
        if (!supabase) return;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setIsProfileIncomplete(false);
          return;
        }

        const { data } = await supabase
          .from("profiles")
          .select("mobile, pincode, city, state")
          .eq("id", session.user.id)
          .maybeSingle();

        if (data) {
          const incomplete = !data.mobile || !data.pincode || !data.city || !data.state;
          setIsProfileIncomplete(incomplete);
        } else {
          setIsProfileIncomplete(true);
        }
      } catch (error) {
        console.warn("[bottom-nav] Profile status check failed:", error);
      }
    };

    checkProfile();
  }, [pathname]);

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
            <span className="nav-icon relative">
              <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
              {active && (
                <motion.div
                  layoutId="activeTabGlow"
                  className="absolute -inset-1.5 -z-10 rounded-xl bg-white/10 opacity-90"
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                />
              )}
            </span>
            <span className="inline-flex items-center gap-1">
              {label}
              {label === "Profile" && isProfileIncomplete && (
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.8)] animate-pulse" />
              )}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
