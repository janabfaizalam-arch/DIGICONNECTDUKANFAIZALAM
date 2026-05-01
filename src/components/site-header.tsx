"use client";

import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, LogIn, MessageCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { LogoutButton } from "@/components/auth/logout-button";
import { createClient } from "@/lib/supabase/browser";
import { MobileMenu } from "@/components/mobile-menu";
import { generateWhatsAppLink } from "@/lib/whatsapp";

const navLinks = [
  { href: "/#services", label: "Services" },
  { href: "/#why-choose-us", label: "Why Choose Us" },
  { href: "/#process", label: "Process" },
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

function isCustomerShellPath(pathname: string) {
  return (
    pathname === "/customer/dashboard" ||
    pathname.startsWith("/customer/dashboard/") ||
    pathname.startsWith("/dashboard/applications/")
  );
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
  const customerShell = isCustomerShellPath(pathname);
  const staffShell = isStaffShellPath(pathname);
  const agentShell = isAgentShellPath(pathname);
  const logoHref = role === "agent" || agentShell ? "/agent/dashboard" : role === "staff" || staffShell ? "/staff/dashboard" : role === "customer" || customerShell ? "/customer/dashboard" : "/";
  const appShell = customerShell || staffShell || agentShell;
  const appShellLabel = agentShell ? "Agent Dashboard" : staffShell ? "Staff Dashboard" : "Customer Dashboard";
  const appShellHref = agentShell ? "/agent/dashboard" : staffShell ? "/staff/dashboard" : "/customer/dashboard";

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

  return (
    <header className="site-header sticky top-0 z-40 border-b border-[rgba(15,23,42,0.08)] bg-[rgba(255,255,255,0.72)] shadow-[0_12px_36px_rgba(15,23,42,0.08)] backdrop-blur-[20px] print:hidden">
      <div className="container-shell flex min-h-16 items-center justify-between gap-3 py-2 md:min-h-[4.5rem] md:gap-4">
        <Link href={logoHref} className="flex h-8 min-w-0 shrink-0 items-center" aria-label="DigiConnect Dukan home">
          <Image
            src="/logo-navbar.png"
            alt="DigiConnect Dukan Logo"
            width={1920}
            height={819}
            priority
            className="h-7 w-auto object-contain md:h-10"
          />
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
          <nav className="hidden items-center gap-5 text-sm font-medium text-slate-600 md:flex">
            {navLinks.map((link) => (
              <Link key={link.label} href={link.href} className="hover:text-[var(--primary)]">
                {link.label}
              </Link>
            ))}
          </nav>
        )}
        <div className="hidden items-center gap-3 md:flex">
          {appShell ? (
            <>
              <Link href={appShellHref} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:shadow-lg">
                <LayoutDashboard className="h-4 w-4" />
                {agentShell ? "Agent Dashboard" : staffShell ? "Staff Dashboard" : "Dashboard"}
              </Link>
              {user ? <LogoutButton className="h-11" /> : null}
            </>
          ) : user && panelConfig ? (
            <>
              <Link href={panelConfig.href} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:shadow-lg">
                <LayoutDashboard className="h-4 w-4" />
                {panelConfig.label}
              </Link>
              <LogoutButton className="h-11" />
            </>
          ) : (
            <>
              <Link href="/login" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:shadow-xl">
                <LogIn className="h-4 w-4" />
                Login
              </Link>
              <a href={generateWhatsAppLink()} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/70 bg-white/65 px-5 text-sm font-bold text-emerald-700 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/85">
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
          <MobileMenu isLoggedIn={Boolean(user)} panelHref={panelConfig?.href ?? null} panelLabel={panelConfig?.label ?? null} />
        )}
      </div>
    </header>
  );
}
