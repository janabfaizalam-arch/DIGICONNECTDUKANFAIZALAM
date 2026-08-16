"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Home, FileText, Wallet, PlusCircle, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/browser";
import { isAuthRoutePath } from "@/lib/auth/auth-routes";

type AppRole = "admin" | "agent" | "customer" | "agency_partner";

const roleValues = ["admin", "agent", "customer", "agency_partner"];
const adminRoleAliases = new Set(["super_admin", "staff", "team", "employee", "processor"]);
const apRoleAliases = new Set(["agent", "agency_partner"]);

function isAppRole(role: string): role is AppRole {
  return roleValues.includes(role);
}

async function resolveRole(user: User | null): Promise<AppRole | null> {
  if (!user) return null;
  const metadataRole = String(user.user_metadata.role ?? "").toLowerCase();
  if (adminRoleAliases.has(metadataRole)) return "admin";
  if (apRoleAliases.has(metadataRole)) return "agency_partner";
  if (isAppRole(metadataRole)) return metadataRole;

  const email = (user.email ?? "").toLowerCase();
  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
    .split(",")
    .map((adminEmail) => adminEmail.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.includes(email)) return "admin";

  const supabase = createClient();
  if (!supabase) return "customer";

  try {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const profileRole = String(profile?.role ?? "").toLowerCase();
    if (adminRoleAliases.has(profileRole)) return "admin";
    if (apRoleAliases.has(profileRole)) return "agency_partner";
    if (isAppRole(profileRole)) return profileRole;

    const { data: portalUser } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
    const portalRole = String(portalUser?.role ?? "").toLowerCase();
    if (adminRoleAliases.has(portalRole)) return "admin";
    if (apRoleAliases.has(portalRole)) return "agency_partner";
    return isAppRole(portalRole) ? portalRole : "customer";
  } catch {
    return "customer";
  }
}

const hiddenPrefixes = ["/admin", "/agent", "/ap", "/staff", "/apply"];

function shouldHide(pathname: string) {
  if (isAuthRoutePath(pathname)) return true;
  return hiddenPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [navHidden, setNavHidden] = useState(false);
  const lastScrollYRef = useRef(0);

  const currentTabParam = searchParams.get("tab") || "";

  // Sync auth state & resolve role
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    let isMounted = true;

    async function syncUser(nextUser: User | null) {
      if (!isMounted) return;
      setUser(nextUser);
      const nextRole = nextUser ? await resolveRole(nextUser) : null;
      if (isMounted) setRole(nextRole);
    }

    supabase.auth.getSession().then(({ data }) => {
      void syncUser(data.session?.user || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Scroll aware show/hide logic
  useEffect(() => {
    if (shouldHide(pathname)) return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollYRef.current;

      // Scroll down threshold 15px, scroll up threshold -10px
      if (scrollDelta > 15 && currentScrollY > 60) {
        setNavHidden(true);
      } else if (scrollDelta < -10) {
        setNavHidden(false);
      }

      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  // Reset hide state on path changes
  useEffect(() => {
    setNavHidden(false);
  }, [pathname]);

  if (shouldHide(pathname)) {
    return null;
  }

  // Resolve dynamic dashboard links
  let applicationsHref = "/login";
  let walletHref = "/login";
  let applyHref = "/apply";
  let accountHref = "/login";
  let homeHref = "/";

  if (user) {
    if (role === "admin") {
      applicationsHref = "/admin/applications";
      walletHref = "/admin/wallet";
      applyHref = "/admin";
      accountHref = "/admin";
      homeHref = "/admin";
    } else if (role === "agent" || role === "agency_partner") {
      applicationsHref = "/ap/applications";
      walletHref = "/ap/wallet";
      applyHref = "/ap/applications/new";
      accountHref = "/ap/profile";
      homeHref = "/ap/dashboard";
    } else {
      homeHref = "/customer/dashboard";
      applicationsHref = "/customer/dashboard?tab=applications";
      walletHref = "/customer/dashboard?tab=wallet";
      applyHref = "/apply";
      accountHref = "/customer/dashboard?tab=profile";
    }
  }

  const navVariants = {
    visible: { 
      y: 0, 
      transition: { type: "spring", stiffness: 280, damping: 26 } 
    },
    hidden: { 
      y: "115%", 
      transition: { ease: "easeInOut", duration: 0.25 } 
    }
  } as const;

  const isTabActive = (tabHref: string) => {
    if (tabHref === "/" || tabHref === "/customer/dashboard") {
      return (
        pathname === "/" ||
        (pathname === "/customer/dashboard" &&
          (currentTabParam === "" || currentTabParam === "dashboard"))
      );
    }

    if (tabHref.includes("?tab=applications")) {
      return (
        (pathname === "/customer/dashboard" && currentTabParam === "applications") ||
        pathname.startsWith("/customer/applications/")
      );
    }

    if (tabHref.includes("?tab=wallet")) {
      return pathname === "/customer/dashboard" && currentTabParam === "wallet";
    }

    if (tabHref.includes("?tab=profile")) {
      return pathname === "/customer/dashboard" && currentTabParam === "profile";
    }

    if (tabHref === "/apply") {
      return pathname === "/apply" || pathname.startsWith("/apply/");
    }

    const baseHref = tabHref.split("?")[0];
    if (baseHref === "/login") {
      return pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname.startsWith("/forgot-password") || pathname.startsWith("/reset-password");
    }

    return pathname.startsWith(baseHref);
  };

  const tabs =
    role === "customer" || (!role && user)
      ? [
          { label: "Home", href: homeHref, icon: Home },
          { label: "Applications", href: applicationsHref, icon: FileText },
          { label: "Apply", href: applyHref, icon: PlusCircle },
          { label: "Wallet", href: walletHref, icon: Wallet },
          { label: "Account", href: accountHref, icon: UserRound },
        ]
      : [
          { label: "Home", href: homeHref === "/customer/dashboard" ? "/" : homeHref, icon: Home },
          { label: "Applications", href: applicationsHref, icon: FileText },
          { label: "Wallet", href: walletHref, icon: Wallet },
          { label: "Apply", href: applyHref, icon: PlusCircle },
          { label: "Account", href: accountHref, icon: UserRound },
        ];

  return (
    <motion.nav
      variants={navVariants}
      animate={navHidden ? "hidden" : "visible"}
      initial="visible"
      className="bottom-nav-container fixed bottom-0 left-0 right-0 z-[50] px-3 print:hidden md:hidden"
      style={{ paddingBottom: "max(0.35rem, env(safe-area-inset-bottom))" }}
      aria-label="Primary mobile navigation"
    >
      <div className="mx-auto flex h-[var(--bottom-nav-height)] max-w-md items-stretch justify-around rounded-[1.35rem] border border-[var(--dc-blue-500)]/15 bg-white px-1 shadow-[0_-8px_28px_rgba(7,31,77,0.12)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = isTabActive(tab.href);
          const isApply = tab.label === "Apply";
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={`relative flex min-h-11 flex-1 flex-col items-center justify-center transition-colors duration-200 ${
                isApply
                  ? "text-[var(--dc-orange-600)]"
                  : isActive
                    ? "text-[var(--dc-blue-700)]"
                    : "text-[var(--dc-ink)]/55 hover:text-[var(--dc-ink)]"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="relative z-10 flex flex-col items-center justify-center gap-0.5">
                <span
                  className={
                    isApply
                      ? "flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--dc-orange-500)] text-white shadow-[0_6px_14px_rgba(242,90,0,0.35)]"
                      : undefined
                  }
                >
                  <Icon
                    className={`h-5 w-5 transition-all duration-200 ${
                      isApply ? "stroke-[2.4] text-white" : isActive ? "stroke-[2.3]" : "stroke-[1.9]"
                    }`}
                    aria-hidden="true"
                  />
                </span>
                <span className="max-w-[4.75rem] truncate text-[10px] font-bold tracking-wide">{tab.label}</span>
              </div>
              {isActive && !isApply ? (
                <motion.span
                  layoutId="activeTabIndicator"
                  className="absolute inset-x-1 inset-y-1 -z-10 rounded-xl bg-[var(--dc-blue-soft)]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              ) : null}
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
}
