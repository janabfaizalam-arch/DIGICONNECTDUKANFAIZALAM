"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronDown, FileCheck2, LayoutDashboard, LogIn, MessageCircle, UserRound, WalletCards } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { LogoutButton } from "@/components/auth/logout-button";
import { ApplyServiceTrigger } from "@/components/service-selection-modal";
import { createClient } from "@/lib/supabase/browser";
import { MobileMenu } from "@/components/mobile-menu";
import { buildAgentWhatsAppMessage, buildSupportWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/customer/dashboard#applications", label: "Track Application" },
  { href: "/#support", label: "Contact" },
];

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

function CustomerAccountMenu() {
  return (
    <details className="group relative z-50">
      <summary className="inline-flex h-10 cursor-pointer list-none items-center justify-center gap-2 rounded-full border border-white/50 bg-white/70 px-5 text-sm font-bold text-blue-700 shadow-sm transition-all duration-300 md:hover:-translate-y-0.5 active:scale-[0.98] [&::-webkit-details-marker]:hidden">
        <UserRound className="h-4 w-4 text-blue-600" />
        My Account
        <ChevronDown className="h-4 w-4 transition duration-200 group-open:rotate-180 text-blue-600" />
      </summary>
      <div className="absolute right-0 top-[2.75rem] z-[70] w-60 rounded-[20px] border border-blue-50/80 bg-white/96 p-2 shadow-[0_20px_48px_rgba(15,23,42,0.14)] backdrop-blur-md transition-all duration-200">
        <nav className="grid text-sm font-semibold text-slate-700">
          {[
            ["/customer/dashboard", "Dashboard"],
            ["/customer/dashboard#applications", "My Applications"],
            ["/customer/wallet", "Wallet"],
            ["/customer/dashboard#refer-earn", "Refer & Earn"],
            ["/customer/profile", "Profile"],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="rounded-xl px-3 py-2.5 transition hover:bg-blue-50/50 hover:text-blue-700">
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-1 border-t border-slate-100 pt-2">
          <LogoutButton className="h-10 w-full justify-center rounded-xl" />
        </div>
      </div>
    </details>
  );
}

export function SiteHeader() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const panelConfig = getPanelConfig(role);
  const publicCtaConfig = panelConfig ?? { href: "/login/customer", label: "Login" };
  const agentShell = isAgentShellPath(pathname);
  const logoHref = "/";
  const appShell = agentShell;
  const appShellLabel = "Agent Dashboard";
  const appShellHref = "/agent/dashboard";
  const [scrolled, setScrolled] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const scrolledRef = useRef(false);
  const whatsappUrl = buildWhatsAppUrl(
    role === "agent"
      ? buildAgentWhatsAppMessage({
          agentName: user?.user_metadata.full_name ?? user?.user_metadata.name ?? user?.email,
          topic: "Header support",
        })
      : buildSupportWhatsAppMessage({
          page: "header",
          customerName: role === "customer" ? user?.user_metadata.full_name ?? user?.user_metadata.name : null,
          topic: role === "admin" ? "Admin dashboard support" : "Website service enquiry",
        }),
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let isMounted = true;

    if (!supabase) {
      setUser(null);
      setRole(null);
      return;
    }

    async function syncUser(nextUser: User | null) {
      if (!isMounted) {
        return;
      }

      setUser(nextUser);
      const nextRole = nextUser ? await resolveRole(nextUser) : null;

      if (isMounted) {
        setRole(nextRole);
      }
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
        if (active) {
          setWalletBalance(null);
        }
      }
    }

    void loadWalletBalance();

    return () => {
      active = false;
    };
  }, [role, user]);

  useEffect(() => {
    let frameId = 0;

    function updateScrolled() {
      if (frameId) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        const nextScrolled = window.scrollY > 12;

        if (nextScrolled !== scrolledRef.current) {
          scrolledRef.current = nextScrolled;
          setScrolled(nextScrolled);
        }
      });
    }

    updateScrolled();
    window.addEventListener("scroll", updateScrolled, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateScrolled);
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 w-full px-3 sm:px-6 pt-2 print:hidden">
      <div
        className={`mx-auto max-w-7xl rounded-[20px] border border-white/60 bg-white/90 transition-all duration-300 ${
          scrolled
            ? "shadow-[0_16px_36px_rgba(15,23,42,0.06)] bg-white/94 backdrop-blur-[6px]"
            : "shadow-[0_8px_20px_rgba(15,23,42,0.03)] backdrop-blur-[4px]"
        }`}
      >
        <div className={`flex items-center justify-between gap-3 px-4 md:px-6 transition-all duration-300 ${scrolled ? "min-h-[3rem] py-1 md:min-h-[3.5rem]" : "min-h-[3.5rem] py-1.5 md:min-h-16"}`}>
          <Link href={logoHref} className="flex min-w-0 shrink-0 items-center gap-2 transition-transform duration-200 hover:scale-[1.01]" aria-label="DigiConnect Dukan home">
            <span className="flex h-7 w-[7rem] items-center md:h-10 md:w-[9.75rem]">
              <Image
                src="/logo-navbar.png"
                alt="DigiConnect Dukan Logo"
                width={220}
                height={60}
                priority
                className="h-full w-auto object-contain"
              />
            </span>
            <span className={`hidden max-w-[8.5rem] text-[0.62rem] font-bold uppercase leading-tight tracking-[0.12em] text-slate-400 ${appShell ? "lg:block" : "lg:block"}`}>
              Powered By RNoS India
            </span>
          </Link>
          {appShell ? (
            agentShell ? (
              <nav className="hidden flex-1 items-center justify-center gap-2 text-sm font-semibold text-slate-600 md:flex">
                {[
                  ["/agent/dashboard", "Agent Dashboard"],
                  ["/agent/applications/new", "New Application"],
                  ["/agent/applications", "Applications"],
                  ["/agent/commissions", "Commissions"],
                ].map(([href, label]) => {
                  const isActive = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`relative rounded-full px-4 py-2 transition-all duration-300 ${
                        isActive
                          ? "bg-white text-blue-700 shadow-sm"
                          : "hover:bg-white/60 hover:text-blue-700 text-slate-600"
                      }`}
                    >
                      {label}
                      {isActive && (
                        <span className="absolute bottom-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            ) : (
              <div className="hidden flex-1 items-center justify-center md:flex">
                <span className="rounded-full bg-blue-50/50 px-4 py-2 text-sm font-bold text-blue-700 border border-blue-100">
                  {appShellLabel}
                </span>
              </div>
            )
          ) : (
            <nav className="hidden items-center gap-1 rounded-full border border-white/40 bg-white/30 p-1 text-sm font-semibold text-slate-700 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] backdrop-blur-sm md:flex">
              {navLinks.map((link) => {
                const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    className={`relative rounded-full px-4 py-2 transition-all duration-300 ${
                      isActive
                        ? "bg-white text-blue-700 shadow-sm"
                        : "hover:bg-white/60 hover:text-blue-700 text-slate-600"
                    }`}
                  >
                    {link.label}
                    {isActive && (
                      <span className="absolute bottom-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500" />
                    )}
                  </Link>
                );
              })}
            </nav>
          )}
          <div className="hidden items-center gap-2.5 md:flex">
            {appShell ? (
              <>
                <Link href={appShellHref} className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 px-5 text-sm font-extrabold text-white shadow-md shadow-orange-600/15 transition-all duration-300 hover:shadow-orange-600/25 hover:-translate-y-0.5 active:scale-[0.98]">
                  <LayoutDashboard className="h-4 w-4" />
                  {agentShell ? "Agent Dashboard" : "Dashboard"}
                </Link>
                {user && !agentShell ? <LogoutButton className="h-10" /> : null}
              </>
            ) : user && panelConfig ? (
              <>
                <ApplyServiceTrigger className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-blue-600/20 bg-white/40 px-5 text-sm font-extrabold text-blue-700 shadow-sm transition-all duration-300 hover:border-blue-600 hover:bg-blue-50/50 hover:-translate-y-0.5 active:scale-[0.98]">
                  <FileCheck2 className="h-4 w-4 text-blue-600" />
                  Apply Now
                </ApplyServiceTrigger>
                {role === "customer" && walletBalance !== null ? (
                  <Link href="/customer/dashboard" className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-blue-100 bg-white/60 px-4 text-sm font-bold text-blue-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98]">
                    <WalletCards className="h-4 w-4 text-blue-600" />
                    Rs {walletBalance.toLocaleString("en-IN")}
                  </Link>
                ) : null}
                {role === "customer" ? (
                  <CustomerAccountMenu />
                ) : null}
                <Link href={panelConfig.href} className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 px-5 text-sm font-extrabold text-white shadow-md shadow-orange-600/15 transition-all duration-300 hover:shadow-orange-600/25 hover:-translate-y-0.5 active:scale-[0.98]">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/40 px-4 text-sm font-bold text-emerald-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/60 active:scale-[0.98]">
                  <MessageCircle className="h-4 w-4 text-emerald-600" />
                  WhatsApp
                </a>
                {role === "customer" ? null : <LogoutButton className="h-10" />}
              </>
            ) : (
              <>
                <ApplyServiceTrigger className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-blue-600/20 bg-white/40 px-5 text-sm font-extrabold text-blue-700 shadow-sm transition-all duration-300 hover:border-blue-600 hover:bg-blue-50/50 hover:-translate-y-0.5 active:scale-[0.98]">
                  <FileCheck2 className="h-4 w-4 text-blue-600" />
                  Apply Now
                </ApplyServiceTrigger>
                <Link href="/login/customer" className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 px-5 text-sm font-extrabold text-white shadow-md shadow-orange-600/15 transition-all duration-300 hover:shadow-orange-600/25 hover:-translate-y-0.5 active:scale-[0.98]">
                  <LayoutDashboard className="h-4 w-4" />
                  Login / Dashboard
                </Link>
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/40 px-4 text-sm font-bold text-emerald-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/60 active:scale-[0.98]">
                  <MessageCircle className="h-4 w-4 text-emerald-600" />
                  WhatsApp
                </a>
              </>
            )}
          </div>
          {appShell ? (
            <div className="ml-auto flex shrink-0 flex-nowrap items-center justify-end gap-2 overflow-hidden md:hidden">
              <Link href={appShellHref} className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 px-3 text-xs font-bold text-white shadow-sm">
                <LayoutDashboard className="h-4 w-4" />
                {agentShell ? "Agent" : "Dashboard"}
              </Link>
              {user && !agentShell ? <LogoutButton showLabel={false} className="h-9 w-9 shrink-0 rounded-full p-0" /> : null}
            </div>
          ) : (
            <div className="flex items-center md:hidden">
              <Link href={publicCtaConfig.href} className="inline-flex h-9 items-center justify-center gap-1.5 truncate rounded-full bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 px-4 text-xs font-extrabold text-white shadow-md shadow-orange-600/15 transition-all duration-200 active:scale-[0.98]">
                {panelConfig ? <LayoutDashboard className="h-3.5 w-3.5 shrink-0" /> : <LogIn className="h-3.5 w-3.5 shrink-0" />}
                <span className="truncate">{user ? "Dashboard" : "Login"}</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

