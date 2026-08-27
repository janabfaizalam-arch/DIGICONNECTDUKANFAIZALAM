"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import {
  Bell,
  FileText,
  FolderOpen,
  HelpCircle,
  Home,
  LogOut,
  Plus,
  UserRound,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";

import { BrandField } from "@/components/homepage/brand-backdrop";
import { MotionRoot } from "@/components/homepage/motion";
import { useToast } from "@/components/providers/toast-provider";
import { createClient } from "@/lib/supabase/browser";
import { getCustomerAccountStatus } from "@/lib/customer/account-status";
import { countApplications } from "@/lib/customer/application-summary";
import { resolveSection, sectionHref, type CustomerSection } from "@/lib/customer/sections";
import { cn } from "@/lib/utils";

import { HomeSection } from "@/components/customer/section-home";
import { PortalButton } from "@/components/customer/ui";

/**
 * The five sections a customer is not looking at.
 *
 * Splitting the old file into six components did not, on its own, make the
 * portal any lighter — statically imported children all land in the same route
 * chunk, so the first measurement after the split was *heavier* than before,
 * not lighter. These are loaded on demand instead, which is what actually
 * keeps the document uploader and the whole profile form off the wire for a
 * customer who signed in to check one application.
 *
 * Home is deliberately static: it is where every customer lands, so deferring
 * it would only cost a round trip.
 */
const ApplicationsSection = dynamic(
  () => import("@/components/customer/section-applications").then((m) => m.ApplicationsSection),
  { loading: SectionSkeleton },
);
const WalletSection = dynamic(
  () => import("@/components/customer/section-wallet").then((m) => m.WalletSection),
  { loading: SectionSkeleton },
);
const DocumentsSection = dynamic(
  () => import("@/components/customer/section-documents").then((m) => m.DocumentsSection),
  { loading: SectionSkeleton },
);
const HelpSection = dynamic(() => import("@/components/customer/section-help").then((m) => m.HelpSection), {
  loading: SectionSkeleton,
});
const AccountSection = dynamic(
  () => import("@/components/customer/section-account").then((m) => m.AccountSection),
  { loading: SectionSkeleton },
);

/**
 * Placeholder while a section arrives.
 *
 * Shaped like the panels it stands in for, so the page does not jump when the
 * real thing lands. No spinner: on a normal connection the chunk is there
 * before a spinner would have finished its first turn.
 */
function SectionSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <div className="h-7 w-40 animate-pulse rounded-lg bg-[var(--dc-blue-soft)]" />
      <div className="lg-card h-28 animate-pulse" />
      <div className="lg-card h-40 animate-pulse" />
    </div>
  );
}
import type { CustomerNotification, CustomerPortalData } from "@/components/customer/types";

/**
 * The customer portal.
 *
 * This replaces a single 2,507-line client component that held the chrome and
 * all eight tabs in one file. Everything it rendered — every panel of every
 * tab, the whole profile form, the vault — shipped to every customer, however
 * little of it they came for.
 *
 * What is left here is chrome: which section is showing, the header, the
 * notification tray, and sign-out. The sections are their own files, and all
 * but Home are loaded on demand — see the `dynamic` imports below for why the
 * split alone was not enough.
 */

const NAV: { id: CustomerSection; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "applications", label: "Applications", icon: FileText },
  { id: "wallet", label: "Wallet", icon: WalletCards },
  { id: "documents", label: "Documents", icon: FolderOpen },
  { id: "help", label: "Help", icon: HelpCircle },
  { id: "account", label: "Account", icon: UserRound },
];

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.trim().slice(0, 2).toUpperCase() || "DC";
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function CustomerPortal(data: CustomerPortalData) {
  const { applications, profileStatus, profile, user, notifications = [] } = data;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { error: toastError } = useToast();

  const section = resolveSection(searchParams.get("tab"));

  const [trayOpen, setTrayOpen] = useState(false);
  const [localNotifications, setLocalNotifications] = useState<CustomerNotification[]>(notifications);

  useEffect(() => {
    setLocalNotifications(notifications);
  }, [notifications]);

  const unread = localNotifications.filter((item) => !item.read_at).length;

  const displayName = profileStatus?.profile?.full_name || profile.name || "Customer";
  const counts = useMemo(() => countApplications(applications), [applications]);

  const accountStatus = useMemo(
    () =>
      getCustomerAccountStatus({
        email: user.email,
        mobile: profileStatus?.profile?.mobile ?? user.phone,
        completionPercent: profileStatus?.completion?.percent ?? 0,
      }),
    [user.email, user.phone, profileStatus],
  );

  const goToSection = useCallback(
    (next: CustomerSection) => {
      router.push(sectionHref(next), { scroll: true });
    },
    [router],
  );

  const markAllRead = useCallback(async () => {
    const unreadIds = localNotifications.filter((item) => !item.read_at).map((item) => item.id);
    if (!unreadIds.length) return;

    const stamped = new Date().toISOString();
    setLocalNotifications((prev) => prev.map((item) => (item.read_at ? item : { ...item, read_at: stamped })));

    try {
      const supabase = createClient();
      if (!supabase) return;
      const { error } = await supabase.from("notifications").update({ read_at: stamped }).in("id", unreadIds);
      if (error) throw error;
    } catch {
      // The optimistic update stands; the rows re-read as unread on the next
      // load, which is the safe direction to be wrong in.
      toastError("Could not save that. Your alerts may reappear.");
    }
  }, [localNotifications, toastError]);

  const signOut = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        body: JSON.stringify({ portal: "customer" }),
        credentials: "same-origin",
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        redirectTo?: string;
        message?: string;
        error?: string;
      };
      if (!response.ok || !result.ok) throw new Error(result.error || result.message || "Failed to sign out.");

      try {
        const supabase = createClient();
        await supabase?.auth.signOut({ scope: "local" });
      } catch {
        // The server already cleared the httpOnly cookies.
      }
      window.location.replace(result.redirectTo || "/customer/login?loggedOut=1");
    } catch {
      toastError("Could not sign out. Please try again.");
    }
  }, [toastError]);

  return (
    <MotionRoot>
      <div className="dc-ambient min-h-screen bg-[var(--dc-sky-soft)] text-[var(--dc-ink)] md:flex">
        <PortalSidebar section={section} counts={counts} onNavigate={goToSection} onSignOut={signOut} />

        <div className="min-w-0 flex-1 md:pl-64">
          <PortalHeader
            name={displayName}
            initials={initialsOf(displayName)}
            badge={accountStatus.badge}
            unread={unread}
            onOpenTray={() => setTrayOpen(true)}
            section={section}
            onNavigate={goToSection}
          />

          <main
            id="main-content"
            className="dc-nav-clearance relative mx-auto w-full max-w-[var(--dc-max)] px-[var(--mobile-page-gutter)] pb-10 pt-5 sm:px-6 md:px-8 md:pt-7"
          >
            {section === "home" ? <HomeSection {...data} onNavigate={goToSection} /> : null}
            {section === "applications" ? <ApplicationsSection {...data} /> : null}
            {section === "wallet" ? <WalletSection {...data} /> : null}
            {section === "documents" ? <DocumentsSection {...data} /> : null}
            {section === "help" ? <HelpSection {...data} /> : null}
            {section === "account" ? <AccountSection {...data} onSignOut={signOut} /> : null}
          </main>
        </div>

        <NotificationTray
          open={trayOpen}
          notifications={localNotifications}
          unread={unread}
          onClose={() => setTrayOpen(false)}
          onMarkAllRead={markAllRead}
        />
      </div>
    </MotionRoot>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Chrome
   ───────────────────────────────────────────────────────────────────────── */

function PortalSidebar({
  section,
  counts,
  onNavigate,
  onSignOut,
}: {
  section: CustomerSection;
  counts: ReturnType<typeof countApplications>;
  onNavigate: (next: CustomerSection) => void;
  onSignOut: () => void;
}) {
  // A badge only where a number means something the customer should act on.
  const badgeFor = (id: CustomerSection) =>
    id === "applications" && counts.active > 0 ? counts.active : null;

  return (
    <aside
      className="fixed left-0 top-0 z-30 hidden h-full w-64 flex-col justify-between overflow-hidden p-5 text-white md:flex"
      style={{ background: "var(--dc-grad-blue)" }}
    >
      <div className="dc-ambient-layer" aria-hidden="true">
        <div className="dc-jaali absolute inset-0 opacity-[0.07]" />
        <div className="dc-orb dc-orb-flame lg-drift-slow -right-[40%] top-[52%] h-[26rem] w-[26rem] opacity-45" />
      </div>

      <div className="relative space-y-8">
        <Link href="/" className="block h-8 w-44" aria-label="DigiConnect Dukan home">
          <Image
            src="/logo-navbar.png"
            alt="DigiConnect Dukan"
            width={192}
            height={32}
            priority
            className="h-full w-auto object-contain brightness-0 invert"
          />
        </Link>

        <nav className="space-y-1" aria-label="Portal sections">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            const badge = badgeFor(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-bold transition duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                  active ? "lg-card-dark text-white" : "text-white/65 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                {badge ? (
                  <span
                    className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10.5px] font-extrabold text-white"
                    style={{ background: "var(--dc-grad-flame)" }}
                  >
                    {badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="relative space-y-2">
        <PortalButton href="/apply" tone="flame" className="w-full">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Apply for a service
        </PortalButton>
        <button
          type="button"
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-bold text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

function PortalHeader({
  name,
  initials,
  badge,
  unread,
  onOpenTray,
  section,
  onNavigate,
}: {
  name: string;
  initials: string;
  badge: { label: string; tone: "complete" | "partial" | "empty" };
  unread: number;
  onOpenTray: () => void;
  section: CustomerSection;
  onNavigate: (next: CustomerSection) => void;
}) {
  // A finished profile is stated in the brand amber; anything short of it is
  // held back to a quieter white, because it is a nudge and not an alarm.
  const badgeTone = badge.tone === "complete" ? "text-[var(--dc-amber)]" : "text-white/70";

  return (
    <header className="relative isolate overflow-hidden text-white">
      <BrandField />

      <div className="relative mx-auto w-full max-w-[var(--dc-max)] px-[var(--mobile-page-gutter)] pb-5 pt-6 sm:px-6 md:px-8 md:pb-6 md:pt-8">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.9rem] text-[15px] font-extrabold text-white"
              style={{ background: "var(--dc-grad-flame)" }}
              aria-hidden="true"
            >
              {initials}
            </span>
            <div className="min-w-0">
              <p className="text-[11.5px] font-bold text-white/60">{greeting()}</p>
              <h1 className="truncate text-[1.15rem] font-extrabold leading-tight tracking-[-0.02em] sm:text-[1.35rem]">
                {name}
              </h1>
              <p className={cn("mt-0.5 text-[11px] font-bold", badgeTone)}>{badge.label}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* The logo only appears here on phones; on desktop the sidebar
                already carries it, and two lockups on one screen is one too
                many. */}
            <Link href="/" className="hidden h-7 w-32 sm:block md:hidden" aria-label="DigiConnect Dukan home">
              <Image
                src="/logo-navbar.png"
                alt="DigiConnect Dukan"
                width={160}
                height={28}
                className="h-full w-auto object-contain brightness-0 invert"
              />
            </Link>

            <button
              type="button"
              onClick={onOpenTray}
              className="lg-pill-dark lg-raise-dark relative flex h-11 w-11 items-center justify-center text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              aria-label={unread > 0 ? `Alerts, ${unread} unread` : "Alerts"}
            >
              <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
              {unread > 0 ? (
                <span
                  className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-extrabold text-white ring-2 ring-[#012456]"
                  style={{ background: "var(--dc-grad-flame)" }}
                >
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : null}
            </button>
          </div>
        </div>

        {/*
          Section rail, phones only.

          The app's own bottom navigation already carries Home, Applications,
          Wallet and Account, but not Documents or Help — without this rail
          those two are unreachable on a phone, which is how the Secure Vault
          ends up being a screen nobody visits.
        */}
        <div className="-mx-[var(--mobile-page-gutter)] mt-5 overflow-x-auto px-[var(--mobile-page-gutter)] pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 md:hidden [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-1.5">
            {NAV.map((item) => {
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-extrabold transition duration-300",
                    active ? "bg-white text-[var(--dc-blue-mid)]" : "lg-pill-dark text-white/75",
                  )}
                >
                  <item.icon className="h-[15px] w-[15px]" aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Alerts
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Priority is read from the row when the server set one, and inferred from the
 * title only as a fallback. The inference is deliberately narrow: it looks for
 * words that genuinely change what the customer should do, and calls
 * everything else an update rather than guessing at urgency.
 */
function priorityOf(notification: CustomerNotification) {
  const explicit = notification.priority;
  const title = notification.title.toLowerCase();
  const level =
    explicit ??
    (/(reject|fail|objection|action required)/.test(title)
      ? "critical"
      : /(pending|due|awaiting|required)/.test(title)
        ? "important"
        : /(complete|delivered|approved)/.test(title)
          ? "completed"
          : "normal");

  switch (level) {
    case "critical":
      return { label: "Action needed", className: "bg-rose-50 text-rose-600 ring-rose-200" };
    case "important":
      return { label: "Important", className: "bg-amber-50 text-amber-700 ring-amber-200" };
    case "completed":
      return { label: "Done", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" };
    default:
      return { label: "Update", className: "bg-[var(--dc-blue-soft)] text-[var(--dc-blue-mid)] ring-[var(--dc-blue-bright)]/20" };
  }
}

function NotificationTray({
  open,
  notifications,
  unread,
  onClose,
  onMarkAllRead,
}: {
  open: boolean;
  notifications: CustomerNotification[];
  unread: number;
  onClose: () => void;
  onMarkAllRead: () => void;
}) {
  const reduced = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-[#00102c]/45 backdrop-blur-sm"
            aria-hidden="true"
          />
          <m.div
            role="dialog"
            aria-modal="true"
            aria-label="Alerts"
            initial={reduced ? { opacity: 0 } : { y: "100%" }}
            animate={reduced ? { opacity: 1 } : { y: 0 }}
            exit={reduced ? { opacity: 0 } : { y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-[60] flex max-h-[80vh] flex-col overflow-hidden rounded-t-[1.75rem] bg-white shadow-[0_-8px_60px_rgba(0,10,40,0.25)] md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-full md:max-w-md md:rounded-l-[1.75rem] md:rounded-tr-none"
          >
            <div
              className="relative shrink-0 overflow-hidden px-5 py-4 text-white"
              style={{ background: "var(--dc-grad-blue)" }}
            >
              <div className="dc-jaali pointer-events-none absolute inset-0 opacity-[0.08]" aria-hidden="true" />
              <div className="relative flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-[var(--dc-amber)]">
                    Alerts
                  </p>
                  <p className="mt-0.5 text-[15px] font-extrabold">
                    {unread > 0 ? `${unread} unread` : "You are up to date"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {unread > 0 ? (
                    <button
                      type="button"
                      onClick={onMarkAllRead}
                      className="lg-pill-dark px-3 py-1.5 text-[12px] font-extrabold text-white"
                    >
                      Mark all read
                    </button>
                  ) : null}
                  <button
                    ref={closeRef}
                    type="button"
                    onClick={onClose}
                    aria-label="Close alerts"
                    className="lg-pill-dark lg-raise-dark flex h-9 w-9 items-center justify-center text-white"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-2.5 overflow-y-auto p-4">
              {notifications.length === 0 ? (
                <p className="py-10 text-center text-[13.5px] font-medium text-[var(--dc-body)]">
                  Nothing yet. Updates on your applications will show up here.
                </p>
              ) : (
                notifications.map((notification) => {
                  const priority = priorityOf(notification);
                  return (
                    <article
                      key={notification.id}
                      className={cn(
                        "lg-card rounded-xl p-3.5",
                        !notification.read_at && "ring-1 ring-[var(--dc-blue-bright)]/25",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-[0.08em] ring-1",
                            priority.className,
                          )}
                        >
                          {priority.label}
                        </span>
                        <time className="shrink-0 text-[10.5px] font-semibold text-[var(--dc-muted)]">
                          {new Date(notification.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                        </time>
                      </div>
                      <p className="mt-1.5 text-[13.5px] font-extrabold leading-snug text-[var(--dc-ink)]">
                        {notification.title}
                      </p>
                      <p className="mt-1 text-[12.5px] font-medium leading-relaxed text-[var(--dc-body)]">
                        {notification.message}
                      </p>
                    </article>
                  );
                })
              )}
            </div>
          </m.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
