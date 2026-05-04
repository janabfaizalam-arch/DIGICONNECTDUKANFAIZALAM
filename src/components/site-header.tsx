"use client";

import Link from "next/link";
import Image from "next/image";
import { Home, LayoutDashboard, LogIn, MessageCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { LogoutButton } from "@/components/auth/logout-button";
import { createClient } from "@/lib/supabase/browser";
import { MobileMenu } from "@/components/mobile-menu";
import { generateWhatsAppLink } from "@/lib/whatsapp";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/#about", label: "About" },
  { href: "/#gallery", label: "Gallery" },
  { href: "/#support", label: "Support" },
];

type AppRole = "super_admin" | "admin" | "agent" | "staff" | "customer";

const roleValues = ["super_admin", "admin", "agent", "staff", "customer"];

function isAppRole(role: string): role is AppRole {
  return roleValues.includes(role);
}

function getMetadataRole(user: User | null) {
  const role = String(user?.user_metadata.role ?? "").toLowerCase();

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

  if (email === "janabfaizalam@gmail.com") {
    return "super_admin";
  }

  if (adminEmails.includes(email)) {
    return "admin";
  }

  const supabase = createClient();

  if (!supabase) {
    return "customer";
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const profileRole = String(profile?.role ?? "").toLowerCase();

  if (isAppRole(profileRole)) {
    return profileRole;
  }

  const { data: portalUser } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
  const portalRole = String(portalUser?.role ?? "").toLowerCase();

  return isAppRole(portalRole) ? portalRole : "customer";
}

function getPanelConfig(role: AppRole | null) {
  if (role === "super_admin" || role === "admin") {
    return { href: "/admin", label: "Admin Panel" };
  }

  if (role === "agent") {
    return { href: "/agent", label: "Agent Panel" };
  }

  if (role === "staff") {
    return { href: "/staff/dashboard", label: "Staff Dashboard" };
  }

  if (role === "customer") {
    return { href: "/customer/dashboard", label: "Dashboard" };
  }

  return null;
}

function isStaffShellPath(pathname: string) {
  return pathname === "/staff/dashboard" || pathname.startsWith("/staff/");
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
  const staffShell = isStaffShellPath(pathname);
  const agentShell = isAgentShellPath(pathname);
  const logoHref = role === "agent" || agentShell ? "/agent/dashboard" : role === "staff" || staffShell ? "/staff/dashboard" : "/";
  const appShell = staffShell || agentShell;
  const appShellLabel = agentShell ? "Agent Dashboard" : "Staff Dashboard";
  const appShellHref = agentShell ? "/agent/dashboard" : "/staff/dashboard";
  const [scrolled, setScrolled] = useState(false);
  const scrolledRef = useRef(false);

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

  return (
    <header
      className={`site-header sticky top-0 z-40 border-b border-white/10 bg-white/60 transition-[background-color,box-shadow,backdrop-filter] duration-200 print:hidden ${
        scrolled
          ? "shadow-[0_8px_24px_rgba(15,23,42,0.1)] backdrop-blur-sm"
          : "shadow-[0_6px_18px_rgba(15,23,42,0.06)] md:backdrop-blur-sm"
      }`}
    >
      <div className={`container-shell flex items-center justify-between gap-3 transition-[min-height,padding] duration-200 md:gap-4 ${scrolled ? "min-h-14 py-1 md:min-h-[3.75rem]" : "min-h-[3.75rem] py-1.5 md:min-h-16"}`}>
        <Link href={logoHref} className="flex min-w-0 shrink-0 items-center gap-2.5" aria-label="DigiConnect Dukan home">
          <span className="flex h-10 w-[8.75rem] items-center md:h-11 md:w-[9.75rem]">
            <Image
              src="/logo-navbar.png"
              alt="DigiConnect Dukan Logo"
              width={220}
              height={60}
              priority
              className="h-full w-auto object-contain"
            />
          </span>
          <span className="hidden max-w-[8.5rem] text-[0.62rem] font-bold uppercase leading-tight tracking-[0.12em] text-slate-500 min-[390px]:block">
            Powered By RNoS India Pvt Ltd
          </span>
        </Link>
        {appShell ? (
          agentShell ? (
            <nav className="hidden flex-1 items-center justify-center gap-3 text-sm font-bold text-slate-600 md:flex">
              {[
                ["/agent/dashboard", "Agent Dashboard"],
                ["/agent/leads", "Leads"],
                ["/agent/applications", "Applications"],
                ["/agent/commissions", "Commissions"],
              ].map(([href, label]) => (
                <Link key={href} href={href} className="rounded-full px-3 py-2 hover:bg-blue-50 hover:text-[var(--primary)]">
                  {label}
                </Link>
              ))}
            </nav>
          ) : (
            <div className="hidden flex-1 items-center justify-center md:flex">
              <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-[var(--primary)]">
                {appShellLabel}
              </span>
            </div>
          )
        ) : (
          <nav className="hidden items-center gap-1 rounded-full border border-white/15 bg-white/45 p-1 text-sm font-semibold text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] md:flex">
            {navLinks.map((link) => (
              <Link key={link.label} href={link.href} className="rounded-full px-3 py-2 transition hover:bg-white/85 hover:text-blue-700">
                {link.label}
              </Link>
            ))}
          </nav>
        )}
        <div className="hidden items-center gap-3 md:flex">
          {appShell ? (
            <>
              <Link href={appShellHref} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-5 text-sm font-bold text-white transition-transform md:hover:-translate-y-0.5">
                <LayoutDashboard className="h-4 w-4" />
                {agentShell ? "Agent Dashboard" : staffShell ? "Staff Dashboard" : "Dashboard"}
              </Link>
              {user ? <LogoutButton className="h-11" /> : null}
            </>
          ) : user && panelConfig ? (
            <>
              <Link href={panelConfig.href} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-5 text-sm font-bold text-white transition-transform md:hover:-translate-y-0.5">
                <LayoutDashboard className="h-4 w-4" />
                {panelConfig.label}
              </Link>
              <LogoutButton className="h-11" />
            </>
          ) : (
            <>
              <Link href="/login/customer" className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 px-4 text-sm font-bold text-white shadow-md shadow-blue-600/15 transition-transform md:hover:-translate-y-0.5">
                <LogIn className="h-4 w-4" />
                Login
              </Link>
              <a href={generateWhatsAppLink()} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/45 px-4 text-sm font-bold text-emerald-700 shadow-sm transition-[background-color,transform] md:hover:-translate-y-0.5 md:hover:bg-white/60">
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </>
          )}
        </div>
        {appShell ? (
          <div className="flex flex-wrap items-center justify-end gap-2 md:hidden">
            <Link href={appShellHref} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-[var(--primary)] px-3 text-xs font-bold text-white">
              <LayoutDashboard className="h-4 w-4" />
              {agentShell ? "Agent" : staffShell ? "Staff" : "Dashboard"}
            </Link>
            {agentShell ? (
              <>
                <Link href="/agent/leads" className="inline-flex h-10 items-center justify-center rounded-full border bg-white px-3 text-xs font-bold text-slate-900">
                  Leads
                </Link>
                <Link href="/agent/commissions" className="inline-flex h-10 items-center justify-center rounded-full border bg-white px-3 text-xs font-bold text-slate-900">
                  Commissions
                </Link>
              </>
            ) : null}
            {user ? <LogoutButton className="h-10 px-3 text-xs" /> : null}
          </div>
        ) : (
          <div className="flex items-center gap-2 md:hidden">
            <Link href="/" className="hidden h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/45 text-blue-700 shadow-sm min-[390px]:inline-flex">
              <Home className="h-4 w-4" />
              <span className="sr-only">Home</span>
            </Link>
            <MobileMenu isLoggedIn={Boolean(user)} panelHref={panelConfig?.href ?? null} panelLabel={panelConfig?.label ?? null} />
          </div>
        )}
      </div>
    </header>
  );
}
