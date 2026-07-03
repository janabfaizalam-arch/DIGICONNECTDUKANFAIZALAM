"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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

const hiddenPrefixes = ["/admin", "/agent", "/login", "/signup", "/ap", "/forgot-password", "/reset-password", "/staff", "/customer-login"];

function shouldHide(pathname: string) {
  return hiddenPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function BottomNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [navHidden, setNavHidden] = useState(false);
  const [currentTabParam, setCurrentTabParam] = useState("");
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setCurrentTabParam(params.get("tab") || "");
    }
  }, [pathname]);

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
      className="fixed bottom-0 inset-x-0 z-[50] flex md:hidden items-center justify-around h-[60px] px-2 bg-white/60 backdrop-blur-2xl border-t border-white/40 shadow-[0_-2px_16px_rgba(15,23,42,0.04)] pb-safe-bottom print:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = isTabActive(tab.href);
        return (
          <Link
            key={tab.label}
            href={tab.href}
            className={`flex flex-col items-center justify-center flex-1 h-full relative text-slate-400 hover:text-slate-600 transition-colors ${
              isActive ? "text-blue-600 font-semibold" : "font-medium"
            }`}
          >
            <div className="flex flex-col items-center justify-center gap-0.5">
              <Icon className="h-4.5 w-4.5 stroke-[1.8]" />
              <span className="text-[10px] tracking-wide">{tab.label}</span>
            </div>
            {isActive && (
              <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-blue-600" />
            )}
          </Link>
        );
      })}
    </motion.nav>
  );
}
