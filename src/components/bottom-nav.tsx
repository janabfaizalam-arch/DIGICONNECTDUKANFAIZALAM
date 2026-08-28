"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  FileText,
  FolderOpen,
  HelpCircle,
  Home,
  LayoutGrid,
  LifeBuoy,
  LogIn,
  LogOut,
  Menu,
  PlusCircle,
  Search,
  UserRound,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, LazyMotion, domAnimation, m } from "framer-motion";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/browser";
import { isAuthRoutePath } from "@/lib/auth/auth-routes";
import { requestSection, useActiveSection } from "@/lib/customer/section-bus";
import { resolveSection, sectionHref, type CustomerSection } from "@/lib/customer/sections";

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

/* ─────────────────────────────────────────────────────────────────────────
   What the bar holds
   ───────────────────────────────────────────────────────────────────────── */

/**
 * A destination in the bar or in its More sheet.
 *
 * `section` entries are the ones that matter: while the customer is already on
 * `/customer/dashboard` they switch the visible section in place instead of
 * navigating, which is the difference between a tap costing a full Supabase
 * round trip and costing nothing. Off the dashboard the same entry is an
 * ordinary link to the section's URL.
 */
type Item = {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  section?: CustomerSection;
};

/** The website's own home, for everyone. */
const HOME_ITEM: Item = { id: "home", label: "Home", icon: Home, href: "/" };

const CUSTOMER_TABS: Item[] = [
  HOME_ITEM,
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid, href: sectionHref("home"), section: "home" },
  { id: "apply", label: "Apply", icon: PlusCircle, href: "/apply" },
  { id: "wallet", label: "Wallet", icon: Wallet, href: sectionHref("wallet"), section: "wallet" },
];

const CUSTOMER_MORE: Item[] = [
  { id: "applications", label: "Applications", icon: FileText, href: sectionHref("applications"), section: "applications" },
  { id: "documents", label: "Documents", icon: FolderOpen, href: sectionHref("documents"), section: "documents" },
  { id: "help", label: "Help & support", icon: HelpCircle, href: sectionHref("help"), section: "help" },
  { id: "account", label: "Account", icon: UserRound, href: sectionHref("account"), section: "account" },
];

const ADMIN_TABS: Item[] = [
  HOME_ITEM,
  { id: "applications", label: "Applications", icon: FileText, href: "/admin/applications" },
  { id: "apply", label: "Console", icon: PlusCircle, href: "/admin" },
  { id: "wallet", label: "Wallet", icon: Wallet, href: "/admin/wallet" },
  { id: "account", label: "Account", icon: UserRound, href: "/admin" },
];

const PARTNER_TABS: Item[] = [
  HOME_ITEM,
  { id: "applications", label: "Applications", icon: FileText, href: "/ap/applications" },
  { id: "apply", label: "New", icon: PlusCircle, href: "/ap/applications/new" },
  { id: "wallet", label: "Wallet", icon: Wallet, href: "/ap/wallet" },
  { id: "account", label: "Account", icon: UserRound, href: "/ap/profile" },
];

/**
 * Signed out.
 *
 * This used to point Applications, Wallet and Account all at `/login`: three
 * of the five tabs were the same screen wearing three names. These are five
 * different places a visitor can actually use before they have an account.
 */
const GUEST_TABS: Item[] = [
  HOME_ITEM,
  { id: "services", label: "Services", icon: Search, href: "/services" },
  { id: "apply", label: "Apply", icon: PlusCircle, href: "/apply" },
  { id: "track", label: "Track", icon: LifeBuoy, href: "/track-application" },
  { id: "signin", label: "Sign in", icon: LogIn, href: "/login/customer" },
];

/* ─────────────────────────────────────────────────────────────────────────
   The bar
   ───────────────────────────────────────────────────────────────────────── */

export function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [navHidden, setNavHidden] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const lastScrollYRef = useRef(0);

  const onDashboard = pathname === "/customer/dashboard";
  const activeSection = useActiveSection(resolveSection(searchParams.get("tab")));

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

  // Reset hide state on path changes, and never leave the sheet open behind a
  // navigation.
  useEffect(() => {
    setNavHidden(false);
    setMoreOpen(false);
  }, [pathname]);

  const isCustomer = role === "customer" || (!role && !!user);

  const tabs = isCustomer
    ? CUSTOMER_TABS
    : role === "admin"
      ? ADMIN_TABS
      : role === "agent" || role === "agency_partner"
        ? PARTNER_TABS
        : GUEST_TABS;

  const isActive = useCallback(
    (item: Item) => {
      if (item.section) {
        return onDashboard && activeSection === item.section;
      }
      if (item.href === "/") return pathname === "/";
      if (item.href === "/apply") return pathname === "/apply" || pathname.startsWith("/apply/");
      if (item.id === "applications") {
        return pathname.startsWith("/customer/applications/") || pathname.startsWith(item.href);
      }
      return pathname === item.href || pathname.startsWith(`${item.href}/`);
    },
    [onDashboard, activeSection, pathname],
  );

  const moreActive = isCustomer && onDashboard && CUSTOMER_MORE.some((item) => item.section === activeSection);

  if (shouldHide(pathname)) {
    return null;
  }

  return (
    <LazyMotion features={domAnimation} strict>
      {isCustomer ? (
        <MoreSheet
          open={moreOpen}
          onClose={() => setMoreOpen(false)}
          onDashboard={onDashboard}
          activeSection={activeSection}
        />
      ) : null}

      <m.nav
        animate={navHidden && !moreOpen ? "hidden" : "visible"}
        initial="visible"
        variants={{
          visible: { y: 0, transition: { type: "spring", stiffness: 280, damping: 26 } },
          hidden: { y: "135%", transition: { ease: "easeInOut", duration: 0.25 } },
        }}
        className="bottom-nav-container fixed bottom-0 left-0 right-0 z-[50] px-3 print:hidden md:hidden"
        style={{ paddingBottom: "max(0.45rem, env(safe-area-inset-bottom))" }}
        aria-label="Primary mobile navigation"
      >
        {/*
          One floating glass bar rather than an edge-to-edge white strip. The
          `overflow-visible` matters: the Apply control is lifted above the
          bar's own box and would otherwise be cut in half by it.
        */}
        <div className="dc-tabbar mx-auto flex h-[var(--bottom-nav-height)] max-w-md items-stretch justify-around px-1.5">
          {tabs.map((item) =>
            item.id === "apply" ? (
              <ApplyTab key={item.id} item={item} active={isActive(item)} />
            ) : (
              <Tab
                key={item.id}
                item={item}
                active={isActive(item)}
                inPlace={!!item.section && onDashboard}
              />
            ),
          )}

          {isCustomer ? (
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              className={`dc-tab ${moreActive || moreOpen ? "is-active" : ""}`}
            >
              <TabInner icon={Menu} label="More" active={moreActive || moreOpen} />
            </button>
          ) : null}
        </div>
      </m.nav>
    </LazyMotion>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Tabs
   ───────────────────────────────────────────────────────────────────────── */

function TabInner({ icon: Icon, label, active }: { icon: LucideIcon; label: string; active: boolean }) {
  return (
    <>
      {/*
        The active pill is an opacity/scale transition rather than a shared
        `layoutId`: layout projection is not in the `domAnimation` feature
        bundle this component now loads, and one sliding rectangle is not
        worth the full motion build.

        That swap saves nothing today — thirty other components still import
        `motion` directly, so the full build is in the graph regardless, and
        every route measured byte-identical across the change. It is worth
        doing anyway because this one is mounted by the root layout: while it
        imports the full build, converting any of the other thirty can never
        get the site off it.
      */}
      <AnimatePresence initial={false}>
        {active ? (
          <m.span
            key="pill"
            initial={{ opacity: 0, scale: 0.82 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.82 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="dc-tab-pill"
            aria-hidden="true"
          />
        ) : null}
      </AnimatePresence>
      <span className="relative z-10 flex flex-col items-center justify-center gap-[3px]">
        <Icon className={`h-[19px] w-[19px] ${active ? "stroke-[2.4]" : "stroke-[1.9]"}`} aria-hidden="true" />
        <span className="max-w-[4.75rem] truncate text-[10px] font-bold tracking-wide">{label}</span>
      </span>
    </>
  );
}

function Tab({ item, active, inPlace }: { item: Item; active: boolean; inPlace: boolean }) {
  const className = `dc-tab ${active ? "is-active" : ""}`;
  const inner = <TabInner icon={item.icon} label={item.label} active={active} />;

  if (inPlace && item.section) {
    const section = item.section;
    return (
      <button type="button" onClick={() => requestSection(section)} aria-current={active ? "page" : undefined} className={className}>
        {inner}
      </button>
    );
  }

  return (
    <Link href={item.href} aria-current={active ? "page" : undefined} className={className}>
      {inner}
    </Link>
  );
}

/** The one raised control: starting an application is the bar's primary act. */
function ApplyTab({ item, active }: { item: Item; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} aria-current={active ? "page" : undefined} className="dc-tab dc-tab-apply">
      <span className="dc-tab-fab" aria-hidden="true">
        <Icon className="h-[22px] w-[22px] stroke-[2.3]" />
      </span>
      <span className="relative z-10 mt-[3px] text-[10px] font-extrabold tracking-wide text-[var(--dc-orange-600)]">
        {item.label}
      </span>
    </Link>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   More
   ───────────────────────────────────────────────────────────────────────── */

/**
 * The rest of the portal.
 *
 * Six sections, a website exit and Apply do not fit five slots, and the
 * previous answer — a second rail of pills inside the dashboard header —
 * meant a phone carried two navigations that said mostly the same thing. The
 * four sections a customer reaches less often live here instead.
 */
function MoreSheet({
  open,
  onClose,
  onDashboard,
  activeSection,
}: {
  open: boolean;
  onClose: () => void;
  onDashboard: boolean;
  activeSection: CustomerSection;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  const signOut = useCallback(async () => {
    setSigningOut(true);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        body: JSON.stringify({ portal: "customer" }),
        credentials: "same-origin",
      });
      const result = (await response.json().catch(() => ({}))) as { ok?: boolean; redirectTo?: string };
      try {
        await createClient()?.auth.signOut({ scope: "local" });
      } catch {
        // The server already cleared the httpOnly cookies.
      }
      window.location.replace(result.redirectTo || "/customer/login?loggedOut=1");
    } catch {
      // Leaving the sheet open and the button enabled is the honest outcome:
      // the customer is still signed in.
      setSigningOut(false);
    }
  }, []);

  const go = (item: Item) => {
    if (onDashboard && item.section) {
      requestSection(item.section);
      onClose();
      return true;
    }
    return false;
  };

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true" aria-label="More">
          <m.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-label="Close"
            className="absolute inset-0 h-full w-full bg-[#00102e]/45 backdrop-blur-[2px]"
          />

          <m.div
            ref={panelRef}
            tabIndex={-1}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className="dc-sheet absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto px-4 pt-3"
            style={{ paddingBottom: "max(1.1rem, calc(env(safe-area-inset-bottom) + 0.75rem))" }}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--dc-ink)]/15" aria-hidden="true" />

            <div className="mb-2 flex items-center justify-between">
              <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-[var(--dc-blue-mid)]">
                More
              </p>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--dc-blue-soft)] text-[var(--dc-blue-mid)]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <ul className="space-y-1.5">
              {CUSTOMER_MORE.map((item) => {
                const active = onDashboard && activeSection === item.section;
                const Icon = item.icon;
                const body = (
                  <>
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                      style={{ background: active ? "var(--dc-grad-flame)" : "var(--dc-grad-blue)" }}
                      aria-hidden="true"
                    >
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                  </>
                );
                const cls = `flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-[14.5px] font-bold transition ${
                  active ? "bg-[var(--dc-blue-soft)] text-[var(--dc-blue-mid)]" : "text-[var(--dc-ink)] hover:bg-[var(--dc-blue-soft)]/60"
                }`;

                return (
                  <li key={item.id}>
                    {onDashboard ? (
                      <button type="button" onClick={() => go(item)} aria-current={active ? "page" : undefined} className={cls}>
                        {body}
                      </button>
                    ) : (
                      <Link href={item.href} onClick={onClose} className={cls}>
                        {body}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="mt-3 border-t border-[var(--dc-ink)]/10 pt-3">
              <button
                type="button"
                onClick={signOut}
                disabled={signingOut}
                className="flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-[14.5px] font-bold text-[var(--dc-ink)]/70 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--dc-ink)]/[0.06]" aria-hidden="true">
                  <LogOut className="h-[18px] w-[18px]" />
                </span>
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </m.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
