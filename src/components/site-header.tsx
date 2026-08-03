"use client";

import Link from "next/link";
import Image from "next/image";
import { Bell, LayoutDashboard, LogIn, Search, UserRound, WalletCards, X, AlertCircle, FileText, Gift, Info, CheckCircle2, Coins, ArrowRight, Check, Layers, Users, Inbox, BadgeCheck, ChevronDown, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { LogoutButton } from "@/components/auth/logout-button";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import {
  DIGI_PARTNER_BECOME_CTA_LABEL,
  DIGI_PARTNER_CTA_LABEL,
  DIGI_PARTNER_LANDING_ROUTE,
  DIGI_PARTNER_LOGIN_ROUTE,
} from "@/lib/auth/partner-access";
import { AUTH_LOGOUT_EVENT } from "@/lib/auth/logout-destinations";

type AppRole = "admin" | "agent" | "customer" | "agency_partner";

const roleValues = ["admin", "agent", "customer", "agency_partner"];
const adminRoleAliases = new Set(["super_admin", "staff", "team", "employee", "processor"]);
const apRoleAliases = new Set(["agent", "agency_partner"]);

function isAppRole(role: string): role is AppRole {
  return roleValues.includes(role);
}

function getMetadataRole(user: User | null) {
  const role = String(user?.user_metadata.role ?? "").toLowerCase();

  if (adminRoleAliases.has(role)) {
    return "admin";
  }
  if (apRoleAliases.has(role)) {
    return "agency_partner";
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
  if (apRoleAliases.has(profileRole)) {
    return "agency_partner";
  }

  if (isAppRole(profileRole)) {
    return profileRole;
  }

  const { data: portalUser } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
  const portalRole = String(portalUser?.role ?? "").toLowerCase();

  if (adminRoleAliases.has(portalRole)) {
    return "admin";
  }
  if (apRoleAliases.has(portalRole)) {
    return "agency_partner";
  }

  return isAppRole(portalRole) ? portalRole : "customer";
}

function getPanelConfig(role: AppRole | null) {
  if (role === "admin") {
    return { href: "/admin", label: "Admin Dashboard" };
  }

  if (role === "agent" || role === "agency_partner") {
    return { href: "/ap/dashboard", label: "Partner Dashboard" };
  }

  if (role === "customer") {
    return { href: "/customer/dashboard", label: "Dashboard" };
  }

  return null;
}

function isAgentShellPath(pathname: string) {
  return pathname === "/agent/dashboard" || pathname.startsWith("/agent/") || pathname === "/ap" || pathname.startsWith("/ap/");
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
  type: "status" | "wallet" | "referral" | "document" | "payment";
  href?: string;
}

interface DbNotification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
}

interface DbApplication {
  id: string;
  service_name: string;
  status: string;
  payment_status: string;
  created_at: string;
  updated_at: string | null;
  amount?: number;
}

interface DbWalletTransaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
}

function getRelativeTime(dateStr: string) {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

export function SiteHeader({ announcement }: { announcement?: ReactNode } = {}) {
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
  const [searchQuery, setSearchQuery] = useState("");
  const [partnerResults, setPartnerResults] = useState<{
    services: { id: string; title: string; slug: string; customer_fee: number }[];
    customers: { id: string; full_name: string; mobile: string; email?: string | null }[];
    applications: { id: string; customer_name: string; service_name: string; application_code: string; status: string }[];
    leads: { id: string; name: string; mobile: string; service: string; status: string }[];
  }>({ services: [], customers: [], applications: [], leads: [] });

  const handlePartnerSearch = async (val: string) => {
    setSearchQuery(val);
    if (!val.trim() || !supabase) {
      setPartnerResults({ services: [], customers: [], applications: [], leads: [] });
      return;
    }
    try {
      interface DBAppSearchRow {
        id: string;
        service_name: string;
        customer_name: string;
        status: string;
        application_code?: string | null;
      }

      const [servicesRes, customersRes, appsRes, leadsRes] = await Promise.all([
        supabase.from("agent_services").select("id, title, slug, customer_fee").ilike("title", `%${val}%`).limit(4),
        supabase.from("customers").select("id, full_name, mobile, email").or(`full_name.ilike.%${val}%,mobile.ilike.%${val}%`).limit(4),
        supabase.from("applications").select("id, service_name, customer_name, status, application_code").or(`service_name.ilike.%${val}%,customer_name.ilike.%${val}%`).limit(4),
        supabase.from("leads").select("id, name, mobile, service, status").or(`name.ilike.%${val}%,mobile.ilike.%${val}%,service.ilike.%${val}%`).limit(4)
      ]);

      setPartnerResults({
        services: servicesRes.data ?? [],
        customers: customersRes.data ?? [],
        applications: ((appsRes.data ?? []) as unknown as DBAppSearchRow[]).map((app) => ({
          id: app.id,
          customer_name: app.customer_name || "",
          service_name: app.service_name || "",
          application_code: app.application_code || "",
          status: app.status || ""
        })),
        leads: leadsRes.data ?? []
      });
    } catch (err) {
      console.error("Partner search error", err);
    }
  };

  // Notifications State
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const lastScrollYRef = useRef(0);
  const scrolledRef = useRef(false);
  const ticking = useRef(false);

  const focusHomepageSearch = useCallback(() => {
    if (typeof document === "undefined") return false;
    const el = document.getElementById("homepage-search-input") as HTMLInputElement | null;
    if (!el) return false;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => el.focus({ preventScroll: true }), 180);
    return true;
  }, []);

  // Search: on homepage prefer the primary search hub; elsewhere open header search
  useEffect(() => {
    if (typeof window === "undefined") return;

    const openSearch = () => {
      if (pathname === "/" && focusHomepageSearch()) return;
      setSearchOpen(true);
    };

    const handleOpenSearch = () => openSearch();
    window.addEventListener("open-ai-search", handleOpenSearch);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (pathname === "/" && focusHomepageSearch()) return;
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("open-ai-search", handleOpenSearch);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [pathname, focusHomepageSearch]);

  // Auth sync — never trust a stale client session after logout
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

    // Force guest UI immediately after logout in the same document (before hard reload).
    const onLogout = () => {
      setUser(null);
      setRole(null);
      setWalletBalance(null);
      setNotifications([]);
      setUnreadCount(0);
    };
    window.addEventListener(AUTH_LOGOUT_EVENT, onLogout);

    // loggedOut=1 means treat as guest even if a stale getSession() briefly returns data.
    const loggedOutIntent = new URLSearchParams(window.location.search).get("loggedOut") === "1";
    if (loggedOutIntent) {
      onLogout();
    }

    // Prefer getUser() over getSession() — validates against the auth server when possible.
    void supabase.auth.getUser().then(({ data }) => {
      if (loggedOutIntent) {
        onLogout();
        return;
      }
      void syncUser(data.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session?.user) {
        onLogout();
        return;
      }
      if (new URLSearchParams(window.location.search).get("loggedOut") === "1") {
        onLogout();
        return;
      }
      void syncUser(session.user);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener(AUTH_LOGOUT_EVENT, onLogout);
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

  // Notifications aggregation effect
  useEffect(() => {
    if (!user || !supabase) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    let active = true;

    async function loadNotifications() {
      if (!active || !supabase || !user) return;
      setNotifLoading(true);
      try {
        // 1. Fetch DB customer notifications
        const { data: dbNotifs } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);

        // 2. Fetch Applications to build real-time status and payment reminders
        const { data: dbApps } = await supabase
          .from("applications")
          .select("id, service_name, status, payment_status, created_at, updated_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);

        // 3. Fetch wallet transactions to build cashback alerts
        const { data: dbTxs } = await supabase
          .from("wallet_transactions")
          .select("id, amount, type, description, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);

        if (!active) return;

        const list: NotificationItem[] = [];
        const readIds = JSON.parse(localStorage.getItem(`read_notifs_${user.id}`) || "[]");
        const clearedIds = JSON.parse(localStorage.getItem(`cleared_notifs_${user.id}`) || "[]");

        // Process actual DB notifications
        if (dbNotifs) {
          dbNotifs.forEach((n: DbNotification) => {
            const isWallet = n.title.toLowerCase().includes("wallet") || n.title.toLowerCase().includes("cashback") || n.message.toLowerCase().includes("cashback");
            const isReferral = n.title.toLowerCase().includes("referral") || n.message.toLowerCase().includes("referral");
            list.push({
              id: n.id,
              title: n.title,
              message: n.message,
              created_at: n.created_at,
              read_at: n.read_at || (readIds.includes(n.id) ? new Date().toISOString() : null),
              type: isWallet ? "wallet" : isReferral ? "referral" : "status"
            });
          });
        }

        // Process Applications for reminders & completions
        if (dbApps) {
          dbApps.forEach((app: DbApplication) => {
            // Payment Reminder
            if (app.payment_status === "payment_pending") {
              const notifId = `pay-${app.id}`;
              list.push({
                id: notifId,
                title: "Payment Reminder",
                message: `Payment of ₹${app.amount || "pending"} is pending for ${app.service_name}. Complete now to process.`,
                created_at: app.updated_at || app.created_at,
                read_at: readIds.includes(notifId) ? new Date().toISOString() : null,
                type: "payment",
                href: `/customer/dashboard?tab=applications`
              });
            }
            // Document required
            if (app.status === "documents_required" || app.status === "document_pending") {
              const notifId = `doc-req-${app.id}`;
              list.push({
                id: notifId,
                title: "Action Required: Verify Docs",
                message: `Specialist requested document correction/upload for ${app.service_name}.`,
                created_at: app.updated_at || app.created_at,
                read_at: readIds.includes(notifId) ? new Date().toISOString() : null,
                type: "document",
                href: `/customer/dashboard?tab=documents`
              });
            }
            // Finished
            if (app.status === "completed" || app.status === "delivered") {
              const notifId = `doc-ready-${app.id}`;
              list.push({
                id: notifId,
                title: "Final Document Issued",
                message: `Your final registration file for ${app.service_name} is complete and ready.`,
                created_at: app.updated_at || app.created_at,
                read_at: readIds.includes(notifId) ? new Date().toISOString() : null,
                type: "document",
                href: `/customer/dashboard?tab=documents`
              });
            }
            // Status Update
            if (app.status === "in_process" || app.status === "assigned_to_agent" || app.status === "submitted") {
              const notifId = `status-${app.id}`;
              const friendlyStatus = app.status === "in_process" ? "Processing" : app.status === "assigned_to_agent" ? "Assigned to Agent" : "Submitted";
              list.push({
                id: notifId,
                title: `Status: ${friendlyStatus}`,
                message: `Your application for ${app.service_name} status updated to: ${friendlyStatus}.`,
                created_at: app.updated_at || app.created_at,
                read_at: readIds.includes(notifId) ? new Date().toISOString() : null,
                type: "status",
                href: `/customer/dashboard?tab=applications`
              });
            }
          });
        }

        // Process Wallet transactions
        if (dbTxs) {
          dbTxs.forEach((tx: DbWalletTransaction) => {
            const notifId = `tx-${tx.id}`;
            const isCashback = tx.type === "cashback" || tx.description.toLowerCase().includes("cashback");
            const isReferral = tx.description.toLowerCase().includes("referral");
            if (isCashback || isReferral) {
              list.push({
                id: notifId,
                title: isReferral ? "Referral Reward Credited" : "Cashback Points Added",
                message: `₹${tx.amount} added to your active wallet: ${tx.description}`,
                created_at: tx.created_at,
                read_at: readIds.includes(notifId) ? new Date().toISOString() : null,
                type: isReferral ? "referral" : "wallet",
                href: `/customer/wallet`
              });
            }
          });
        }

        // Sort all by date desc
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        // Deduplicate and filter out cleared notifications
        const seen = new Set();
        const uniqueList = list.filter((item) => {
          if (clearedIds.includes(item.id)) return false;
          const key = `${item.title}-${item.message}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }).slice(0, 10);

        setNotifications(uniqueList);
        setUnreadCount(uniqueList.filter((n) => !n.read_at).length);
      } catch (err) {
        console.warn("Failed to load notifications:", err);
      } finally {
        if (active) setNotifLoading(false);
      }
    }

    void loadNotifications();
    const interval = setInterval(loadNotifications, 35000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [user, supabase]);

  const handleMarkAllRead = async () => {
    if (!user || !supabase) return;

    try {
      const readTime = new Date().toISOString();
      const updatedList = notifications.map((n) => ({ ...n, read_at: readTime }));
      setNotifications(updatedList);
      setUnreadCount(0);

      // Save local IDs to localStorage read list
      const allIds = updatedList.map((n) => n.id);
      localStorage.setItem(`read_notifs_${user.id}`, JSON.stringify(allIds));

      // Update actual DB unread notifications
      const unreadDbIds = notifications
        .filter((n) => !n.read_at && !n.id.startsWith("pay-") && !n.id.startsWith("doc-") && !n.id.startsWith("status-") && !n.id.startsWith("tx-"))
        .map((n) => n.id);

      if (unreadDbIds.length > 0) {
        await supabase
          .from("notifications")
          .update({ read_at: readTime })
          .in("id", unreadDbIds);
      }
    } catch (err) {
      console.warn("Failed to mark notifications as read:", err);
    }
  };

  const handleClearAll = () => {
    if (!user) return;
    try {
      const allIds = notifications.map((n) => n.id);
      const clearedIds = JSON.parse(localStorage.getItem(`cleared_notifs_${user.id}`) || "[]");
      const nextCleared = Array.from(new Set([...clearedIds, ...allIds]));
      localStorage.setItem(`cleared_notifs_${user.id}`, JSON.stringify(nextCleared));
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.warn("Failed to clear notifications:", err);
    }
  };

  const handleNotifKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setNotifOpen(!notifOpen);
    } else if (e.key === "Escape") {
      setNotifOpen(false);
    }
  };

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

  // Click outside to close notifications
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Don't render on admin/dashboard pages or auth routes
  const isAuthRoute =
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/signup" ||
    pathname.startsWith("/signup/") ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/forgot-password/") ||
    pathname === "/reset-password" ||
    pathname.startsWith("/reset-password/") ||
    pathname === "/admin-login" ||
    pathname.startsWith("/admin-login/") ||
    pathname === "/agent-login" ||
    pathname.startsWith("/agent-login/") ||
    pathname === "/customer-login" ||
    pathname.startsWith("/customer-login/");

  if (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/customer/dashboard" ||
    pathname.startsWith("/customer/dashboard") ||
    pathname === "/ap" ||
    pathname.startsWith("/ap/") ||
    isAuthRoute
  ) {
    return null;
  }

  const dashboardHref = panelConfig?.href ?? "/login/customer";
  const isLoggedIn = !!user;

  const isHome = pathname === "/";

  return (
    <>
      <header
        className={`site-header print:hidden ${isHome ? "home-header home-stacked" : ""} ${scrolled ? "scrolled" : ""} ${navHidden ? "nav-hidden" : ""}`}
      >
        {isHome && announcement ? (
          <div className="home-announcement-slot w-full shrink-0 empty:hidden">{announcement}</div>
        ) : null}
        <div className="flex h-[var(--header-height)] w-full items-center justify-between gap-3 bg-white px-4 md:px-6 lg:px-8">
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

          {/* CENTER — Primary nav (desktop) + compact search trigger */}
          {!agentShell && (
            <div className="hidden min-w-0 flex-1 items-center justify-center gap-2 px-2 lg:flex lg:gap-3 lg:px-6">
              <nav aria-label="Primary" className="flex max-w-full flex-wrap items-center justify-center gap-0.5 xl:flex-nowrap">
                {(
                  [
                    { href: "/services", label: "Services" },
                    { href: isHome ? "#categories" : "/services", label: "Categories" },
                    { href: isHome ? "#schemes" : "/services", label: "Schemes" },
                    { href: "/print", label: "Smart Print" },
                    { href: "/track-application", label: "Track" },
                    { href: isHome ? "#support" : "/#support", label: "Help" },
                    ...(!isLoggedIn
                      ? [{ href: DIGI_PARTNER_LANDING_ROUTE, label: DIGI_PARTNER_BECOME_CTA_LABEL }]
                      : []),
                  ] as const
                ).map((item) => {
                  const active =
                    item.href.startsWith("#") || item.href.includes("#")
                      ? false
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={`${item.href}-${item.label}`}
                      href={item.href}
                      className={cn(
                        "rounded-lg px-2.5 py-2 text-[11px] font-bold transition xl:px-3 xl:text-xs",
                        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
                        active
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              {/* Compact search trigger — homepage focuses primary hub; elsewhere opens header search */}
              <button
                type="button"
                onClick={() => {
                  if (isHome && focusHomepageSearch()) return;
                  setSearchOpen(true);
                }}
                className={cn(
                  "inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200/70 bg-white/80 px-3 text-xs font-semibold text-slate-500 transition",
                  "hover:border-slate-300 hover:bg-white hover:text-slate-800",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
                  isHome ? "max-w-[2.5rem] justify-center px-0 xl:max-w-none xl:px-3" : "max-w-xs",
                )}
                aria-label={isHome ? "Focus homepage search" : "Open search"}
              >
                <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className={cn("truncate", isHome ? "hidden xl:inline" : "hidden lg:inline")}>
                  Search
                </span>
                {!isHome ? (
                  <kbd className="ml-1 hidden rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-bold text-slate-400 xl:inline-block">
                    ⌘K
                  </kbd>
                ) : null}
              </button>
            </div>
          )}

          {/* Agent shell center label */}
          {agentShell && (
            <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
              {[
                ["/ap/dashboard", "Dashboard"],
                ["/ap/applications/new", "New Application"],
                ["/ap/applications", "Applications"],
                ["/ap/commissions", "Commissions"],
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
            {/* Mobile / tablet search — homepage focuses primary hub */}
            <button
              type="button"
              onClick={() => {
                if (isHome && focusHomepageSearch()) return;
                setSearchOpen(true);
              }}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 lg:hidden"
              aria-label={isHome ? "Focus homepage search" : "Open search"}
              title="Search"
            >
              <Search className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>

            {/* Notifications System */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                title="Notifications"
                onClick={() => setNotifOpen(!notifOpen)}
                onKeyDown={handleNotifKeyDown}
                aria-label="Notifications"
                aria-haspopup="dialog"
                aria-expanded={notifOpen}
                className="relative flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
                {unreadCount > 0 && (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-white animate-pulse" />
                )}
              </button>

              {/* Notification Liquid-Glass Panel */}
              {notifOpen && (
                <>
                  {/* Backdrop for mobile bottom drawer */}
                  <div 
                    className="fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-xs md:hidden"
                    onClick={() => setNotifOpen(false)}
                  />

                  {/* Panel Container */}
                  <div className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[80vh] flex-col rounded-t-[2rem] border-t border-slate-200/60 bg-white/95 p-5 shadow-2xl backdrop-blur-xl md:absolute md:bottom-auto md:left-auto md:right-0 md:top-full md:mt-2 md:w-96 md:rounded-2xl md:border md:bg-white/92 md:p-4 md:shadow-xl">
                    
                    {/* Drawer drag handle for mobile */}
                    <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 md:hidden" />

                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                        Notifications
                        {unreadCount > 0 && (
                          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-600">
                            {unreadCount} new
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center gap-2">
                        {isLoggedIn && notifications.length > 0 && (
                          <div className="flex items-center gap-2 shrink-0">
                            {unreadCount > 0 && (
                              <button
                                onClick={handleMarkAllRead}
                                className="text-[10px] font-black text-blue-600 hover:underline flex items-center gap-0.5"
                              >
                                <Check className="h-3 w-3" /> Read All
                              </button>
                            )}
                            <button
                              onClick={handleClearAll}
                              className="text-[10px] font-black text-slate-400 hover:text-slate-650 hover:underline"
                            >
                              Clear All
                            </button>
                          </div>
                        )}
                        <button
                          onClick={() => setNotifOpen(false)}
                          className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 md:hidden"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Notification Content List */}
                    <div className="overflow-y-auto py-2 max-h-[45vh] md:max-h-[300px] no-scrollbar">
                      {notifLoading && notifications.length === 0 ? (
                        <div className="space-y-3 py-4">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="flex gap-3 animate-pulse">
                              <div className="h-8 w-8 rounded-full bg-slate-100" />
                              <div className="flex-1 space-y-2">
                                <div className="h-3 w-2/3 rounded bg-slate-100" />
                                <div className="h-2.5 w-5/6 rounded bg-slate-100" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : !isLoggedIn ? (
                        /* Logged Out State */
                        <div className="py-6 text-center">
                          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-500">
                            <Info className="h-6 w-6" />
                          </div>
                          <h4 className="text-xs font-bold text-slate-800">Stay Updated</h4>
                          <p className="mx-auto mt-1 max-w-[220px] text-[10px] leading-normal text-slate-400 font-semibold">
                            Login to track applications, wallet cashback, referral rewards & document updates.
                          </p>
                          <Link
                            href="/login/customer"
                            onClick={() => setNotifOpen(false)}
                            className="mx-auto mt-4 inline-flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
                          >
                            Login <ArrowRight className="h-3 w-3" />
                          </Link>
                        </div>
                      ) : notifications.length === 0 ? (
                        /* Empty State */
                        <div className="py-8 text-center">
                          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                            <Bell className="h-6 w-6" />
                          </div>
                          <h4 className="text-xs font-bold text-slate-800">You&apos;re all caught up!</h4>
                          <p className="mx-auto mt-1 max-w-[220px] text-[10px] leading-normal text-slate-400 font-semibold">
                            No notifications yet. We will alert you here for application status changes.
                          </p>
                        </div>
                      ) : (
                        /* List */
                        <div className="space-y-1.5">
                          {notifications.map((item) => {
                            const unread = !item.read_at;
                            let IconComponent = Info;
                            let iconColor = "bg-blue-50 text-blue-600";

                            if (item.type === "payment") {
                              IconComponent = AlertCircle;
                              iconColor = "bg-rose-50 text-rose-600 border border-rose-100";
                            } else if (item.type === "document") {
                              IconComponent = FileText;
                              iconColor = "bg-sky-50 text-sky-600 border border-sky-100";
                            } else if (item.type === "wallet") {
                              IconComponent = Coins;
                              iconColor = "bg-emerald-50 text-emerald-600 border border-emerald-100";
                            } else if (item.type === "referral") {
                              IconComponent = Gift;
                              iconColor = "bg-amber-50 text-amber-600 border border-amber-100";
                            } else if (item.type === "status") {
                              IconComponent = CheckCircle2;
                              iconColor = "bg-indigo-50 text-indigo-600 border border-indigo-100";
                            }

                            const elementContent = (
                              <div className={`flex gap-3 rounded-xl p-2.5 transition duration-150 hover:bg-slate-50 text-left ${unread ? "bg-blue-50/25" : ""}`}>
                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconColor}`}>
                                  <IconComponent className="h-4.5 w-4.5" />
                                </div>
                                <div className="flex-1 space-y-0.5">
                                  <div className="flex items-start justify-between gap-1">
                                    <h4 className={`text-xs font-bold text-slate-800 ${unread ? "font-black" : ""}`}>{item.title}</h4>
                                    <span className="text-[9px] font-semibold text-slate-400 shrink-0">{getRelativeTime(item.created_at)}</span>
                                  </div>
                                  <p className="text-[10px] leading-relaxed text-slate-500 font-semibold">{item.message}</p>
                                </div>
                                {unread && (
                                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                                )}
                              </div>
                            );

                            return item.href ? (
                              <Link
                                key={item.id}
                                href={item.href}
                                onClick={() => setNotifOpen(false)}
                                className="block"
                              >
                                {elementContent}
                              </Link>
                            ) : (
                              <div key={item.id}>
                                {elementContent}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

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

            {/* Digi Partner Login — secondary CTA (guests only, desktop) */}
            {!isLoggedIn && (
              <Link
                href={DIGI_PARTNER_LOGIN_ROUTE}
                aria-label={DIGI_PARTNER_CTA_LABEL}
                title={DIGI_PARTNER_CTA_LABEL}
                className="hidden h-9 items-center gap-1.5 rounded-xl border border-indigo-200/70 bg-white/60 px-3 text-xs font-bold text-indigo-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50/70 hover:text-indigo-800 active:scale-[0.98] lg:inline-flex"
              >
                <BadgeCheck className="h-3.5 w-3.5" />
                Digi Partner
              </Link>
            )}

            {/* Dashboard (logged in) or Login menu (guest) */}
            {isLoggedIn ? (
              <Link
                href={dashboardHref}
                className="hidden h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98] md:inline-flex"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                Dashboard
              </Link>
            ) : (
              <details className="relative hidden md:block">
                <summary className="flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98] [&::-webkit-details-marker]:hidden">
                  <LogIn className="h-3.5 w-3.5" />
                  Login
                  <ChevronDown className="h-3.5 w-3.5 opacity-80" />
                </summary>
                <div
                  role="menu"
                  aria-label="Choose login type"
                  className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-xl backdrop-blur-xl"
                >
                  {[
                    { href: "/customer/login", label: "Customer", icon: UserRound, hint: "Mobile + PIN" },
                    { href: DIGI_PARTNER_LOGIN_ROUTE, label: "Digi Partner", icon: BadgeCheck, hint: "Username + password" },
                    { href: "/admin/login", label: "Admin", icon: ShieldCheck, hint: "Email or mobile + PIN" },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-slate-50"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 text-left">
                          <span className="block text-xs font-bold text-slate-800">{item.label}</span>
                          <span className="block text-[10px] font-semibold text-slate-400">{item.hint}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </details>
            )}

            {/* Profile / Logout (desktop) */}
            {isLoggedIn && !agentShell && (
              <div className="hidden md:block">
                <LogoutButton showLabel={false} className="h-9 w-9 rounded-xl p-0" />
              </div>
            )}

            {/* Digi Partner Login — compact icon (guests only, mobile) */}
            {!isLoggedIn && (
              <Link
                href={DIGI_PARTNER_LOGIN_ROUTE}
                aria-label={DIGI_PARTNER_CTA_LABEL}
                title={DIGI_PARTNER_CTA_LABEL}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-200/70 bg-white/60 text-indigo-700 transition hover:bg-indigo-50/70 active:scale-95 md:hidden"
              >
                <BadgeCheck className="h-[18px] w-[18px]" />
              </Link>
            )}

            {/* Mobile Login/Dashboard */}
            <Link
              href={isLoggedIn ? dashboardHref : "/customer/login"}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 active:scale-95 md:hidden"
              aria-label={isLoggedIn ? "Dashboard" : "Customer Login"}
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
        <div className={cn(
          "fixed inset-0 z-[60] flex flex-col backdrop-blur-xl",
          pathname.startsWith("/ap") ? "bg-slate-950/98 text-slate-100" : "bg-white/95 text-slate-850"
        )}>
          <div className={cn(
            "flex items-center gap-3 border-b px-4 py-3",
            pathname.startsWith("/ap") ? "border-white/10 bg-slate-900" : "border-slate-150 bg-slate-50"
          )}>
            <Search className="h-5 w-5 shrink-0 text-slate-400" />
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => {
                if (pathname.startsWith("/ap")) {
                  handlePartnerSearch(e.target.value);
                }
              }}
              placeholder={
                pathname.startsWith("/ap")
                  ? "Search partner services, customers, applications, leads..."
                  : "Search GST, ITR, Passport, CIBIL, DL..."
              }
              className={cn(
                "flex-1 bg-transparent text-base font-medium outline-none",
                pathname.startsWith("/ap") ? "text-white placeholder:text-slate-500" : "text-slate-800 placeholder:text-slate-400"
              )}
              onKeyDown={(e) => {
                if (e.key === "Escape") setSearchOpen(false);
              }}
            />
            <button
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery("");
                setPartnerResults({ services: [], customers: [], applications: [], leads: [] });
              }}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition",
                pathname.startsWith("/ap") ? "text-slate-400 hover:bg-white/5 hover:text-white" : "text-slate-400 hover:bg-slate-200/50 hover:text-slate-700"
              )}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
            {pathname.startsWith("/ap") ? (
              // Partner Search Results
              searchQuery.trim() ? (
                <div className="space-y-6 max-w-4xl mx-auto">
                  {/* Services */}
                  {partnerResults.services.length > 0 && (
                    <div className="space-y-2.5">
                      <h3 className="text-xs font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5" /> Services ({partnerResults.services.length})
                      </h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {partnerResults.services.map((item) => (
                          <Link
                            key={item.id}
                            href={`/ap/applications/new?serviceId=${item.id}`}
                            onClick={() => setSearchOpen(false)}
                            className="flex items-center justify-between p-3.5 rounded-xl border border-white/5 bg-slate-900/40 hover:border-blue-500/30 hover:bg-slate-900 transition-all group"
                          >
                            <div>
                              <p className="font-extrabold text-white text-sm group-hover:text-blue-400 transition-colors">{item.title}</p>
                              <p className="text-xs text-slate-500 font-mono">Slug: {item.slug}</p>
                            </div>
                            <span className="text-xs font-black text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                              Apply (₹{item.customer_fee})
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Customers */}
                  {partnerResults.customers.length > 0 && (
                    <div className="space-y-2.5">
                      <h3 className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" /> Customers ({partnerResults.customers.length})
                      </h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {partnerResults.customers.map((item) => (
                          <Link
                            key={item.id}
                            href={`/ap/customers?search=${item.full_name}`}
                            onClick={() => setSearchOpen(false)}
                            className="flex items-center justify-between p-3.5 rounded-xl border border-white/5 bg-slate-900/40 hover:border-indigo-500/30 hover:bg-slate-900 transition-all group"
                          >
                            <div>
                              <p className="font-extrabold text-white text-sm group-hover:text-indigo-400 transition-colors">{item.full_name}</p>
                              <p className="text-xs text-slate-500 font-mono">{item.mobile}</p>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                              View CRM
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Applications */}
                  {partnerResults.applications.length > 0 && (
                    <div className="space-y-2.5">
                      <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" /> Applications ({partnerResults.applications.length})
                      </h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {partnerResults.applications.map((item) => (
                          <Link
                            key={item.id}
                            href={`/ap/applications/${item.id}`}
                            onClick={() => setSearchOpen(false)}
                            className="flex items-center justify-between p-3.5 rounded-xl border border-white/5 bg-slate-900/40 hover:border-emerald-500/30 hover:bg-slate-900 transition-all group"
                          >
                            <div>
                              <p className="font-extrabold text-white text-sm group-hover:text-emerald-400 transition-colors">{item.customer_name}</p>
                              <p className="text-xs text-slate-450">{item.service_name}</p>
                            </div>
                            <span className="text-[10px] font-bold capitalize text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                              {item.status.replace(/_/g, " ")}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Leads */}
                  {partnerResults.leads.length > 0 && (
                    <div className="space-y-2.5">
                      <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <Inbox className="h-3.5 w-3.5" /> Leads ({partnerResults.leads.length})
                      </h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {partnerResults.leads.map((item) => (
                          <Link
                            key={item.id}
                            href={`/ap/leads?search=${item.name}`}
                            onClick={() => setSearchOpen(false)}
                            className="flex items-center justify-between p-3.5 rounded-xl border border-white/5 bg-slate-900/40 hover:border-amber-500/30 hover:bg-slate-900 transition-all group"
                          >
                            <div>
                              <p className="font-extrabold text-white text-sm group-hover:text-amber-400 transition-colors">{item.name}</p>
                              <p className="text-xs text-slate-400">{item.service} ({item.mobile})</p>
                            </div>
                            <span className="text-[10px] font-bold capitalize text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                              {item.status}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {Object.values(partnerResults).every((arr) => arr.length === 0) && (
                    <div className="py-12 text-center text-slate-500">
                      No matching services, customers, applications, or leads found for &ldquo;{searchQuery}&rdquo;.
                    </div>
                  )}
                </div>
              ) : (
                // Partner Quick Links
                <div className="max-w-md mx-auto py-8 text-center space-y-4">
                  <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-400 mx-auto border border-white/10">
                    <Search className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-white text-base">DigiPartner Unified Search</h3>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                    Type a name, mobile number, or service title to search across customers, active services, leads, and applications.
                  </p>
                </div>
              )
            ) : (
              // Public Customer Search
              <>
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
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
