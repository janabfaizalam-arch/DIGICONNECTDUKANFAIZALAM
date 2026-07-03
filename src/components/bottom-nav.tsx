"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Home, FileText, Wallet, Gift, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/browser";

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

<<<<<<< HEAD
const hiddenPrefixes = ["/admin", "/agent", "/login", "/signup", "/ap", "/forgot-password", "/reset-password", "/staff", "/customer-login"];
=======
const hiddenPrefixes = ["/admin", "/agent", "/login", "/signup", "/ap", "/forgot-password", "/reset-password", "/staff", "/customer-login", "/apply"];
>>>>>>> 8e743fc (feat(platform): customer portal isolation, premium UI overhaul, performance optimization and application wizard improvements)

function shouldHide(pathname: string) {
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
  let rewardsHref = "/login";
  let dashboardHref = "/login";

  if (user) {
    if (role === "admin") {
      applicationsHref = "/admin/applications";
      walletHref = "/admin/wallet";
      rewardsHref = "/admin";
      dashboardHref = "/admin";
    } else if (role === "agent" || role === "agency_partner") {
      applicationsHref = "/ap/applications";
      walletHref = "/ap/wallet";
      rewardsHref = "/ap/dashboard";
      dashboardHref = "/ap/dashboard";
    } else {
      applicationsHref = "/customer/dashboard?tab=applications";
      walletHref = "/customer/dashboard?tab=wallet";
      rewardsHref = "/customer/dashboard?tab=referral";
      dashboardHref = "/customer/dashboard";
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
    if (tabHref === "/") return pathname === "/";
    
    if (tabHref.includes("?tab=applications")) {
      return pathname === "/customer/dashboard" && currentTabParam === "applications";
    }
    
    if (tabHref.includes("?tab=wallet")) {
      return pathname === "/customer/dashboard" && currentTabParam === "wallet";
    }

    if (tabHref.includes("?tab=referral")) {
      return pathname === "/customer/dashboard" && currentTabParam === "referral";
    }

    if (tabHref === "/customer/dashboard") {
      return pathname === "/customer/dashboard" && (currentTabParam === "" || currentTabParam === "dashboard" || currentTabParam === "profile");
    }

    const baseHref = tabHref.split("?")[0];
    if (baseHref === "/login") {
      return pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname.startsWith("/forgot-password") || pathname.startsWith("/reset-password");
    }

    return pathname.startsWith(baseHref);
  };

  const tabs = [
    { label: "Home", href: "/", icon: Home },
    { label: "Applications", href: applicationsHref, icon: FileText },
    { label: "Wallet", href: walletHref, icon: Wallet },
    { label: "Rewards", href: rewardsHref, icon: Gift },
    { label: "Account", href: dashboardHref, icon: UserRound },
  ];

  return (
    <motion.nav
      variants={navVariants}
      animate={navHidden ? "hidden" : "visible"}
      initial="visible"
<<<<<<< HEAD
      className="fixed bottom-5 left-4 right-4 max-w-md md:hidden mx-auto z-[50] flex items-center justify-around h-16 px-3 bg-white/75 backdrop-blur-2xl border border-slate-200/40 rounded-[24px] shadow-[0_12px_36px_-6px_rgba(15,23,42,0.08),0_4px_16px_-4px_rgba(15,23,42,0.04)] print:hidden"
=======
      className="bottom-nav-container fixed bottom-5 left-4 right-4 max-w-md md:hidden mx-auto z-[50] flex items-center justify-around h-16 px-3 bg-white/75 backdrop-blur-2xl border border-slate-200/40 rounded-[24px] shadow-[0_12px_36px_-6px_rgba(15,23,42,0.08),0_4px_16px_-4px_rgba(15,23,42,0.04)] print:hidden"
>>>>>>> 8e743fc (feat(platform): customer portal isolation, premium UI overhaul, performance optimization and application wizard improvements)
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = isTabActive(tab.href);
        return (
          <Link
            key={tab.label}
            href={tab.href}
            className={`flex flex-col items-center justify-center flex-1 h-full relative transition-all duration-300 ${
              isActive ? "text-blue-600 font-semibold scale-105" : "text-slate-400 hover:text-slate-650"
            }`}
          >
            <div className="flex flex-col items-center justify-center gap-0.5 relative z-10">
              <Icon className={`h-4.5 w-4.5 transition-all duration-300 ${
                isActive ? "stroke-[2.2] scale-110 drop-shadow-[0_0_8px_rgba(37,99,235,0.25)]" : "stroke-[1.8]"
              }`} />
              <span className="text-[9px] tracking-wide font-bold">{tab.label}</span>
            </div>
            {isActive && (
              <motion.span
                layoutId="activeTabIndicator"
                className="absolute inset-0 bg-blue-50/60 rounded-[18px] border border-blue-100/20 -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </Link>
        );
      })}
    </motion.nav>
  );
}
