"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Search, Bell, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/browser";

type AppRole = "admin" | "agent" | "customer";

const roleValues = ["admin", "agent", "customer"];
const adminRoleAliases = new Set(["super_admin", "staff", "team", "employee", "processor"]);

function isAppRole(role: string): role is AppRole {
  return roleValues.includes(role);
}

function getMetadataRole(user: User | null) {
  const role = String(user?.user_metadata.role ?? "").toLowerCase();
  if (adminRoleAliases.has(role)) {
    return "admin";
  }
  return isAppRole(role) ? role : null;
}

async function resolveRole(user: User | null): Promise<AppRole | null> {
  if (!user) return null;
  const metadataRole = getMetadataRole(user);
  if (metadataRole) return metadataRole;

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
    if (isAppRole(profileRole)) return profileRole;

    const { data: portalUser } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
    const portalRole = String(portalUser?.role ?? "").toLowerCase();
    if (adminRoleAliases.has(portalRole)) return "admin";
    return isAppRole(portalRole) ? portalRole : "customer";
  } catch {
    return "customer";
  }
}

const hiddenPrefixes = ["/admin", "/agent", "/login", "/signup", "/ap", "/forgot-password", "/reset-password", "/staff"];

function shouldHide(pathname: string) {
  return hiddenPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function BottomNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [navHidden, setNavHidden] = useState(false);
  const lastScrollYRef = useRef(0);

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

  // Fetch unread notifications count
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    let active = true;

    async function checkNotifications() {
      const supabase = createClient();
      if (!supabase) return;
      try {
        const { count, error } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user?.id)
          .is("read_at", null);

        if (!error && active) {
          setUnreadCount(count || 0);
        }
      } catch (err) {
        console.warn("[bottom-nav] Failed to check notifications:", err);
      }
    }

    checkNotifications();
    const interval = setInterval(checkNotifications, 45000); // Check every 45s

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [user]);

  // Scroll aware show/hide logic
  useEffect(() => {
    if (shouldHide(pathname)) return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollYRef.current;

      // scroll down threshold 15px, scroll up threshold -10px
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

  // Resolve dynamic dashboard link
  let dashboardHref = "/login";
  if (user) {
    if (role === "admin") dashboardHref = "/admin";
    else if (role === "agent") dashboardHref = "/agent/dashboard";
    else dashboardHref = "/customer/dashboard";
  }

  const handleSearchClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new Event("open-ai-search"));
  };

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

  const isTabActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <motion.nav
      variants={navVariants}
      animate={navHidden ? "hidden" : "visible"}
      initial="visible"
      className="fixed bottom-0 inset-x-0 z-[50] flex md:hidden items-center justify-around h-[76px] px-2 bg-white/60 backdrop-blur-3xl border-t border-white/40 shadow-[0_-8px_32px_rgba(15,23,42,0.06)] rounded-t-[2rem] pb-safe-bottom print:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Home Tab */}
      <Link
        href="/"
        className={`flex flex-col items-center justify-center flex-1 h-full text-slate-400 hover:text-slate-800 transition-colors ${
          isTabActive("/") ? "text-blue-600 font-extrabold" : ""
        }`}
      >
        <Home className="h-5.5 w-5.5 stroke-[2]" />
        <span className="text-[10px] mt-1">Home</span>
      </Link>

      {/* Services Tab */}
      <Link
        href="/services"
        className={`flex flex-col items-center justify-center flex-1 h-full text-slate-400 hover:text-slate-800 transition-colors ${
          isTabActive("/services") ? "text-blue-600 font-extrabold" : ""
        }`}
      >
        <LayoutGrid className="h-5.5 w-5.5 stroke-[2]" />
        <span className="text-[10px] mt-1">Services</span>
      </Link>

      {/* Elevated AI Search Tab */}
      <button
        onClick={handleSearchClick}
        className="flex flex-col items-center justify-center flex-1 h-full -translate-y-3 cursor-pointer group outline-none"
        title="Open AI Search"
      >
        <div className="flex h-13 w-13 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white border border-blue-400/40 shadow-[0_8px_24px_rgba(37,99,235,0.35),0_0_0_4px_rgba(255,255,255,0.9),0_12px_24px_rgba(37,99,235,0.15)] ring-1 ring-blue-500/10 transition-all duration-200 group-active:scale-90">
          <Search className="h-5.5 w-5.5 stroke-[2.5]" />
        </div>
        <span className="-mt-1 text-[9px] font-black text-blue-600 tracking-wide uppercase">
          AI Search
        </span>
      </button>

      {/* Notifications/Alerts Tab */}
      <Link
        href="/notifications"
        className={`flex flex-col items-center justify-center flex-1 h-full relative text-slate-400 hover:text-slate-800 transition-colors ${
          isTabActive("/notifications") ? "text-blue-600 font-extrabold" : ""
        }`}
      >
        <div className="relative">
          <Bell className="h-5.5 w-5.5 stroke-[2]" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[8px] font-black text-white ring-2 ring-white animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
        <span className="text-[10px] mt-1">Alerts</span>
      </Link>

      {/* Dashboard Tab */}
      <Link
        href={dashboardHref}
        className={`flex flex-col items-center justify-center flex-1 h-full text-slate-400 hover:text-slate-800 transition-colors ${
          isTabActive("/customer/dashboard") || isTabActive("/admin") || isTabActive("/agent/dashboard")
            ? "text-blue-600 font-extrabold"
            : ""
        }`}
      >
        <UserRound className="h-5.5 w-5.5 stroke-[2]" />
        <span className="text-[10px] mt-1">Account</span>
      </Link>
    </motion.nav>
  );
}
