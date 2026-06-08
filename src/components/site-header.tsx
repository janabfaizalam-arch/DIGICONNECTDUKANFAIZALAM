"use client";

import Link from "next/link";
import Image from "next/image";
import { Bell, LayoutDashboard, LogIn, Search, UserRound, WalletCards, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { LogoutButton } from "@/components/auth/logout-button";
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
  if (!user) {
    return null;
  }

  const metadataRole = getMetadataRole(user);

  if (metadataRole) {
    return metadataRole;
  }

  const email = (user.email ?? "").toLowerCase();
  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
    .split(",")
    .map((adminEmail) => adminEmail.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.includes(email)) {
    return "admin";
  }

  const supabase = createClient();

  if (!supabase) {
    return "customer";
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const profileRole = String(profile?.role ?? "").toLowerCase();

  if (adminRoleAliases.has(profileRole)) {
    return "admin";
  }

  if (isAppRole(profileRole)) {
    return profileRole;
  }

  const { data: portalUser } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
  const portalRole = String(portalUser?.role ?? "").toLowerCase();

  if (adminRoleAliases.has(portalRole)) {
    return "admin";
  }

  return isAppRole(portalRole) ? portalRole : "customer";
}

function getPanelConfig(role: AppRole | null) {
  if (role === "admin") {
    return { href: "/admin", label: "Admin Dashboard" };
  }

  if (role === "agent") {
    return { href: "/agent/dashboard", label: "Agent Dashboard" };
  }

  if (role === "customer") {
    return { href: "/customer/dashboard", label: "Dashboard" };
  }

  return null;
}

function isAgentShellPath(pathname: string) {
  return pathname === "/agent/dashboard" || pathname.startsWith("/agent/");
}

export function SiteHeader() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const panelConfig = getPanelConfig(role);
  const agentShell = isAgentShellPath(pathname);

  // Scroll-aware hide/show state
  const [scrolled, setScrolled] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const lastScrollYRef = useRef(0);
  const scrolledRef = useRef(false);
  const ticking = useRef(false);

  // Auth sync — identical to existing logic
  useEffect(() => {
    if (typeof window === "undefined") return;

    let isMounted = true;

    if (!supabase) {
      setUser(null);
      setRole(null);
      return;
    }

    async function syncUser(nextUser: User | null) {
      if (!isMounted) return;
      setUser(nextUser);
      const nextRole = nextUser ? await resolveRole(nextUser) : null;
      if (isMounted) setRole(nextRole);
    }

    supabase.auth.getSession().then(({ data }) => {
      void syncUser(data.session?.user || null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Wallet balance
  useEffect(() => {
    let active = true;

    async function loadWalletBalance() {
      if (!user || role !== "customer") {
        setWalletBalance(null);
        return;
      }

      try {
        const response = await fetch("/api/wallet", { cache: "no-store" });
        const data = (await response.json()) as { wallet?: { balance?: number; balance_points?: number } | null };
        const balance = Number(data.wallet?.balance_points ?? data.wallet?.balance ?? 0);

        if (active) {
          setWalletBalance(Number.isFinite(balance) ? balance : 0);
        }
      } catch {
        if (active) setWalletBalance(null);
      }
    }

    void loadWalletBalance();

    return () => {
      active = false;
    };
  }, [role, user]);

  // Scroll handler — Apple-style hide on scroll down, show on scroll up
  const handleScroll = useCallback(() => {
    if (ticking.current) return;

    ticking.current = true;
    window.requestAnimationFrame(() => {
      ticking.current = false;
      const currentScrollY = window.scrollY;
      const isScrolled = currentScrollY > 8;
      const scrollDelta = currentScrollY - lastScrollYRef.current;

      if (isScrolled !== scrolledRef.current) {
        scrolledRef.current = isScrolled;
        setScrolled(isScrolled);
      }

      // Hide on scroll down (>10px), show on scroll up
      if (scrollDelta > 10 && currentScrollY > 80) {
        setNavHidden(true);
      } else if (scrollDelta < -5) {
        setNavHidden(false);
      }

      lastScrollYRef.current = currentScrollY;
    });
  }, []);

  useEffect(() => {
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Don't render on admin/dashboard pages
  if (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/customer/dashboard" ||
    pathname.startsWith("/customer/dashboard")
  ) {
    return null;
  }

  const dashboardHref = panelConfig?.href ?? "/login/customer";
  const isLoggedIn = !!user;

  return (
    <>
      <header
        className={`site-header print:hidden ${scrolled ? "scrolled" : ""} ${navHidden ? "nav-hidden" : ""}`}
      >
        <div className="flex h-full items-center justify-between gap-3 px-4 md:px-6 lg:px-8">
          {/* LEFT — Logo */}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 transition-opacity duration-200 hover:opacity-80"
            aria-label="DigiConnect Dukan home"
          >
            <span className="flex h-7 w-[7rem] items-center md:h-9 md:w-[9rem]">
              <Image
                src="/logo-navbar.png"
                alt="DigiConnect Dukan Logo"
                width={200}
                height={50}
                priority
                className="h-full w-auto object-contain"
              />
            </span>
          </Link>

          {/* CENTER — Search Bar (Desktop) */}
          {!agentShell && (
            <div className="hidden flex-1 items-center justify-center px-8 md:flex lg:px-16">
              <button
                onClick={() => setSearchOpen(true)}
                className="flex h-10 w-full max-w-md items-center gap-2.5 rounded-2xl border border-slate-200/60 bg-slate-50/60 px-4 text-sm font-medium text-slate-400 transition-all duration-200 hover:border-slate-300 hover:bg-white hover:shadow-sm"
              >
                <Search className="h-4 w-4 text-slate-400" />
                <span>Search services...</span>
                <kbd className="ml-auto hidden rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-400 lg:inline-block">
                  ⌘K
                </kbd>
              </button>
            </div>
          )}

          {/* Agent shell center label */}
          {agentShell && (
            <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
              {[
                ["/agent/dashboard", "Dashboard"],
                ["/agent/applications/new", "New Application"],
                ["/agent/applications", "Applications"],
                ["/agent/commissions", "Commissions"],
              ].map(([href, label]) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* RIGHT — Actions */}
          <div className="flex items-center gap-1.5 md:gap-2">
            {/* Mobile search icon */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 md:hidden"
              title="Search"
            >
              <Search className="h-[18px] w-[18px]" />
            </button>

            {/* Notifications */}
            <button
              title="Notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            >
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-orange-500 ring-2 ring-white" />
            </button>

            {/* Wallet (logged-in customer only) */}
            {isLoggedIn && role === "customer" && walletBalance !== null && (
              <Link
                href="/customer/wallet"
                className="hidden h-9 items-center gap-1.5 rounded-xl border border-slate-200/60 bg-white/60 px-3 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50/40 hover:text-blue-700 md:inline-flex"
              >
                <WalletCards className="h-4 w-4 text-blue-500" />
                ₹{walletBalance.toLocaleString("en-IN")}
              </Link>
            )}

            {/* Dashboard / Login */}
            <Link
              href={dashboardHref}
              className="hidden h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98] md:inline-flex"
            >
              {isLoggedIn ? (
                <>
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Dashboard
                </>
              ) : (
                <>
                  <LogIn className="h-3.5 w-3.5" />
                  Login
                </>
              )}
            </Link>

            {/* Profile / Logout (desktop) */}
            {isLoggedIn && !agentShell && (
              <div className="hidden md:block">
                <LogoutButton showLabel={false} className="h-9 w-9 rounded-xl p-0" />
              </div>
            )}

            {/* Mobile Login/Dashboard */}
            <Link
              href={dashboardHref}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 active:scale-95 md:hidden"
            >
              {isLoggedIn ? (
                <UserRound className="h-[18px] w-[18px]" />
              ) : (
                <LogIn className="h-[18px] w-[18px]" />
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Search Overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white/95 backdrop-blur-xl">
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
            <Search className="h-5 w-5 shrink-0 text-slate-400" />
            <input
              autoFocus
              type="text"
              placeholder="Search GST, ITR, Passport, CIBIL, DL..."
              className="flex-1 bg-transparent text-base font-medium text-slate-800 placeholder:text-slate-400 outline-none"
              onKeyDown={(e) => {
                if (e.key === "Escape") setSearchOpen(false);
              }}
            />
            <button
              onClick={() => setSearchOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Quick Links</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["GST Registration", "ITR Filing", "Passport", "Driving Licence", "CIBIL Analysis", "PVC Card", "PM Vishwakarma"].map(
                (term) => (
                  <Link
                    key={term}
                    href={`/services`}
                    onClick={() => setSearchOpen(false)}
                    className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                  >
                    {term}
                  </Link>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
