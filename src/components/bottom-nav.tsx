"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  FileText,
  HelpCircle,
  Home,
  LayoutGrid,
  LifeBuoy,
  LogIn,
  PlusCircle,
  Search,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, LazyMotion, domAnimation, m } from "framer-motion";

import { isAuthRoutePath } from "@/lib/auth/auth-routes";
import { useAppSession } from "@/components/providers/session-provider";
import { requestSection, useActiveSection } from "@/lib/customer/section-bus";
import { resolveSection, sectionHref, type CustomerSection } from "@/lib/customer/sections";

const hiddenPrefixes = ["/admin", "/agent", "/ap", "/staff", "/apply"];

function shouldHide(pathname: string) {
  if (isAuthRoutePath(pathname)) return true;
  return hiddenPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/* ─────────────────────────────────────────────────────────────────────────
   What the bar holds
   ───────────────────────────────────────────────────────────────────────── */

/**
 * A destination in the bar.
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

/**
 * Five tabs, and only five.
 *
 * There is no "More" sheet any more. Applications is reached from the
 * dashboard, which lists them and is one tap away; Account from the person
 * button in the header, which is where people look for it; and a filing's
 * paperwork now lives on the filing itself rather than in a section of its
 * own. What is left is what a customer opens the app to do.
 */
const CUSTOMER_TABS: Item[] = [
  HOME_ITEM,
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid, href: sectionHref("home"), section: "home" },
  { id: "apply", label: "Apply", icon: PlusCircle, href: "/apply" },
  { id: "wallet", label: "Wallet", icon: Wallet, href: sectionHref("wallet"), section: "wallet" },
  { id: "help", label: "Help", icon: HelpCircle, href: sectionHref("help"), section: "help" },
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
  const { user, role } = useAppSession();
  const [navHidden, setNavHidden] = useState(false);
  const lastScrollYRef = useRef(0);

  const onDashboard = pathname === "/customer/dashboard";
  const activeSection = useActiveSection(resolveSection(searchParams.get("tab")));

  /**
   * Hide on the way down, come back on the way up.
   *
   * `lastScrollYRef` is re-seeded from the live scroll position whenever the
   * path changes, and that is the whole fix for a real bug: opening Apply and
   * coming back left the reference at whatever it held on the previous
   * screen, so the very first scroll event after the return computed a delta
   * of several hundred pixels and hid the bar immediately — on a page the
   * customer had not scrolled at all. The bar looked broken because it was
   * reacting to a movement that never happened.
   */
  useEffect(() => {
    if (shouldHide(pathname)) return;

    lastScrollYRef.current = window.scrollY;
    setNavHidden(false);

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

  /**
   * A section switch does not change the path, so the effect above does not
   * re-run — but it does scroll the page to the top, which would otherwise
   * read as a large upward movement and is not one.
   */
  useEffect(() => {
    lastScrollYRef.current = 0;
    setNavHidden(false);
  }, [activeSection]);

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

  if (shouldHide(pathname)) {
    return null;
  }

  return (
    <LazyMotion features={domAnimation} strict>
      <m.nav
        animate={navHidden ? "hidden" : "visible"}
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
        bundle this component loads, and one sliding rectangle is not worth
        the full motion build.

        That swap saves nothing today — other components still import `motion`
        directly, so the full build is in the graph regardless, and every route
        measured byte-identical across the change. It is worth doing anyway
        because this one is mounted by the root layout: while it imports the
        full build, converting any of the others can never get the site off it.
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

  /*
    No `prefetch`.

    I added it to get the dashboard chunk moving before the tap, and it made
    things worse in a way that was not visible from a bundle report. This bar
    is mounted by the root layout, so it renders on every page — and an
    explicit prefetch of `/customer/dashboard` and `/apply` fetches the render
    payload of two `force-dynamic`, auth-protected routes. Every one of those
    goes through middleware, which talks to Supabase. One page view became
    several authenticated round trips, on every page of the site, and it
    helped push middleware into the invocation timeout that took the portal
    down. Next's default prefetching is enough.
  */
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
