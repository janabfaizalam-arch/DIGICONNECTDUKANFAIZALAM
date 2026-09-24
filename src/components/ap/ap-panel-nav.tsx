"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  FileText,
  Layers,
  Users,
  Bell,
  ChevronDown,
  Search,
  X,
  Compass,
  LayoutGrid,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LogoutButton } from "@/components/auth/logout-button";
import { ApMobileBottomNav } from "@/components/ap/ap-mobile-bottom-nav";
import { apNavGroups, isApNavItemActive } from "@/lib/ap/nav";
import { createClient } from "@/lib/supabase/browser";
import { isAuthRoutePath } from "@/lib/auth/auth-routes";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
}

export function APPanelNav({ canManageTeam = false }: { canManageTeam?: boolean } = {}) {
  const pathname = usePathname();
  const supabase = createClient();
  const reduceMotion = useReducedMotion();

  // Navigation states
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    services: { id: string; title: string; slug: string; customer_fee: number }[];
    customers: { id: string; full_name: string; mobile: string }[];
    applications: { id: string; customer_name: string; service_name: string; status: string }[];
  }>({ services: [], customers: [], applications: [] });

  // Notifications State
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [partnerTier, setPartnerTier] = useState("Partner Workspace");
  const [partnerCode, setPartnerCode] = useState("");
  const [partnerName, setPartnerName] = useState("");

  const notifRef = useRef<HTMLDivElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);

  // Sync user notifications and partner tier
  useEffect(() => {
    let isMounted = true;

    async function syncUserData() {
      if (!supabase) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isMounted) return;

      // Fetch partner details
      const { data } = await supabase
        .from("agency_partners")
        .select("full_name, partner_code, agency_partner_tiers(name)")
        .eq("user_id", user.id)
        .maybeSingle();

      interface AgencyPartnerQueryResult {
        full_name: string;
        partner_code: string;
        agency_partner_tiers: { name: string } | { name: string }[] | null;
      }

      const ap = data as unknown as AgencyPartnerQueryResult | null;

      if (ap && isMounted) {
        setPartnerCode(ap.partner_code);
        setPartnerName(ap.full_name);
        const tierRaw = ap.agency_partner_tiers;
        let tierName = "";

        if (tierRaw) {
          if (Array.isArray(tierRaw)) {
            const first = tierRaw[0];
            if (first && typeof first === "object" && "name" in first) {
              tierName = first.name;
            }
          } else {
            tierName = tierRaw.name;
          }
        }

        if (tierName) {
          setPartnerTier(tierName);
        }
      }

      // Fetch active notifications
      const { data: notifs } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (notifs && isMounted) {
        setNotifications(notifs as NotificationItem[]);
        setUnreadCount(notifs.filter((n) => !n.read_at).length);
      }
    }

    syncUserData();
    const interval = setInterval(syncUserData, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [supabase]);

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

  // Escape closes overlays; focus close control when drawer opens
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (drawerOpen) setDrawerOpen(false);
      if (searchOpen) setSearchOpen(false);
      if (notifOpen) setNotifOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen, searchOpen, notifOpen]);

  useEffect(() => {
    if (drawerOpen) {
      drawerCloseRef.current?.focus();
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }
  }, [drawerOpen]);

  // Search handler
  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (!val.trim() || !supabase) {
      setSearchResults({ services: [], customers: [], applications: [] });
      return;
    }
    try {
      const [servicesRes, customersRes, appsRes] = await Promise.all([
        supabase.from("agent_services").select("id, title, slug, customer_fee").ilike("title", `%${val}%`).limit(3),
        supabase.from("customers").select("id, full_name, mobile").or(`full_name.ilike.%${val}%,mobile.ilike.%${val}%`).limit(3),
        supabase.from("applications").select("id, service_name, customer_name, status").or(`service_name.ilike.%${val}%,customer_name.ilike.%${val}%`).limit(3)
      ]);

      setSearchResults({
        services: servicesRes.data ?? [],
        customers: customersRes.data ?? [],
        applications: (appsRes.data ?? []).map((app: { id: string; customer_name?: string | null; service_name?: string | null; status?: string | null }) => ({
          id: app.id,
          customer_name: app.customer_name || "",
          service_name: app.service_name || "",
          status: app.status || ""
        }))
      });
    } catch (err) {
      console.error("Partner search error", err);
    }
  };

  const markAllRead = async () => {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);

    setNotifications(notifications.map(n => ({ ...n, read_at: new Date().toISOString() })));
    setUnreadCount(0);
  };

  // Auth pages skip chrome
  if (isAuthRoutePath(pathname)) {
    return null;
  }

  return (
    <>
      {/* Sleek, responsive white glassmorphism header row */}
      <header className="sticky top-0 z-40 w-full border-b border-white/60 bg-[rgba(252,253,255,0.72)] shadow-[0_1px_0_rgba(10,24,52,0.04)] backdrop-blur-2xl [backdrop-filter:blur(22px)_saturate(1.7)]">
        <div className="mx-auto flex h-12 max-w-[1800px] items-center justify-between px-3 sm:px-4 md:h-[52px] md:px-5 xl:px-6">
          
          {/* LEFT: Logo + Workspace Badge */}
          <div className="flex min-w-0 items-center gap-2.5 md:gap-3">
            <Link href="/ap/dashboard" className="flex shrink-0 items-center gap-2">
              <span className="flex h-5 w-[88px] items-center md:h-6 md:w-24">
                <Image
                  src="/logo-navbar.png"
                  alt="DigiConnect Logo"
                  width={120}
                  height={30}
                  priority
                  className="h-full w-auto object-contain"
                />
              </span>
            </Link>

            <span
              className="hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#0a1834] shadow-[0_3px_10px_-4px_rgba(255,104,0,0.7)] sm:inline-flex"
              style={{ backgroundImage: "var(--dcp-g-accent)" }}
            >
              <Compass className="h-3 w-3" aria-hidden />
              {partnerTier}
            </span>
          </div>

          {/*
            No centre nav here any more.

            Seven links sat in the middle of this bar while twenty-three other
            screens lived behind a menu — which is exactly how a partner ended
            up unable to find the print counter or the invoice book. The whole
            map is now in the sidebar on a computer and behind "Sab kuch" on a
            phone, so repeating a slice of it here would only be a fourth place
            to keep in sync.
          */}
          <div className="flex-1" aria-hidden />

          {/* RIGHT: Actions (Search, Notification, Settings Menu) */}
          <div className="flex items-center gap-1.5 md:gap-2">
            
            {/* Search Icon */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--dcp-ink-3)] transition hover:bg-white hover:text-[var(--dcp-ink)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dcp-brand)] md:h-10 md:w-10"
              aria-label="Search services, customers and applications"
            >
              <Search className="h-4.5 w-4.5" aria-hidden />
            </button>

            {/* Notifications Panel */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl text-[var(--dcp-ink-3)] transition hover:bg-white hover:text-[var(--dcp-ink)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dcp-brand)] md:h-10 md:w-10"
                aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
                aria-expanded={notifOpen}
                aria-haspopup="dialog"
              >
                <Bell className="h-4.5 w-4.5" aria-hidden />
                {unreadCount > 0 && (
                  <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-white motion-safe:animate-pulse" aria-hidden />
                )}
              </button>

              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    role="dialog"
                    aria-label="Notifications"
                    initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: reduceMotion ? 0 : 0.15 }}
                    className="absolute right-0 mt-2 w-80 rounded-2xl border border-[var(--dcp-line)] bg-white p-3.5 shadow-xl ring-1 ring-black/5 z-50 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between border-b border-[var(--dcp-line)] pb-2">
                      <h4 className="text-xs font-bold text-[var(--dcp-ink)] uppercase tracking-wide">Notifications</h4>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className="text-[10px] font-black text-blue-600 hover:underline"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 py-1">
                      {notifications.length === 0 ? (
                        <p className="text-center text-[10px] text-[var(--dcp-ink-4)] py-6 font-semibold">All caught up!</p>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className={cn("rounded-lg p-2 text-left text-[11px] leading-relaxed transition", !n.read_at ? "bg-blue-50/30 border border-blue-100/20" : "hover:bg-[var(--dcp-surface-2)]")}>
                            <p className="font-extrabold text-[var(--dcp-ink)] leading-tight">{n.title}</p>
                            <p className="text-[var(--dcp-ink-3)] mt-0.5">{n.message}</p>
                            <span className="text-[9px] text-[var(--dcp-ink-4)] block mt-1">{new Date(n.created_at).toLocaleDateString()}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/*
              The panel's only nav now that the permanent left sidebar is gone,
              so it stops looking like a settings affordance: a filled control
              with the word on it from `sm` up, not a ghost icon.
            */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex h-9 items-center justify-center gap-2 rounded-xl border border-[var(--dcp-line)] bg-[var(--dcp-surface-2)] px-2 text-[var(--dcp-ink-2)] shadow-[var(--dcp-e1)] transition hover:border-[var(--dcp-line-2)] hover:bg-[var(--dcp-surface-3)] hover:text-[var(--dcp-ink)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dcp-brand)] md:h-10 md:px-2.5"
              aria-label="Open panel menu"
              aria-expanded={drawerOpen}
              aria-haspopup="dialog"
            >
              <span className="dcp-chip dcp-chip-filled h-6 w-6 font-mono text-[10px] font-bold">
                {partnerCode ? partnerCode.slice(-2) : "DC"}
              </span>
              <span className="hidden text-xs font-bold sm:inline-block">Menu</span>
              <ChevronDown className="hidden h-3.5 w-3.5 sm:block" aria-hidden />
            </button>
          </div>

        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION DOCK */}
      <ApMobileBottomNav canManageTeam={canManageTeam} />

      {/* SLIDE-OUT DRAWER MENU (RIGHT SIDE, Liquid Glass Theme) */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
            {/* Backdrop Overlay */}
            <motion.div
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-[rgba(10,24,52,0.28)] backdrop-blur-sm"
              aria-hidden
            />

            {/* Right Drawer Container */}
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Account and more"
              initial={reduceMotion ? false : { x: "100%" }}
              animate={{ x: 0 }}
              exit={reduceMotion ? undefined : { x: "100%" }}
              transition={reduceMotion ? { duration: 0 } : { type: "spring", damping: 26, stiffness: 240 }}
              className="relative flex h-full w-[86%] max-w-[360px] flex-col border-l border-white/60 bg-[rgba(246,249,255,0.86)] shadow-[-24px_0_60px_-20px_rgba(10,24,52,0.35)] backdrop-blur-2xl pb-safe-bottom"
            >
              {/* Drawer Header */}
              <div
                className="relative flex items-center justify-between overflow-hidden px-4 py-3.5 text-white"
                style={{ backgroundImage: "var(--dcp-g-navy)" }}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full bg-[#ff6800]/30 blur-3xl"
                />
                <div className="relative flex min-w-0 items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 font-mono text-[11px] font-bold text-white ring-1 ring-inset ring-white/25">
                    {partnerCode ? partnerCode.slice(-2) : "DC"}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-bold leading-tight">
                      {partnerName || "Partner"}
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-[10px] font-semibold text-white/70">
                      {partnerCode}
                    </span>
                  </span>
                </div>
                <button
                  ref={drawerCloseRef}
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  aria-label="Close menu"
                >
                  <X className="h-4.5 w-4.5" aria-hidden />
                </button>
              </div>

              {/*
                The drawer, from the map.

                This was two hundred and sixty lines of hand-written links —
                six sections, thirty destinations, each with its own colour and
                its own idea of what to call the screen. It drifted from the
                pages it linked to, and half the panel never appeared in it at
                all. It now renders src/lib/ap/nav.ts, which is the same list
                the sidebar, the phone's sheet and /ap/all read, so the four
                can never disagree again.
              */}
              <div className="flex-1 space-y-3.5 overflow-y-auto px-3 py-4">
                {apNavGroups({ canManageTeam }).map((group) => (
                  <div key={group.id}>
                    <p className="flex items-center gap-2 px-1 pb-1.5 text-[9.5px] font-bold uppercase tracking-[0.16em] text-[var(--dcp-ink-4)]">
                      <span className="whitespace-nowrap">{group.label}</span>
                      <span aria-hidden className="h-px flex-1 bg-[var(--dcp-line)]" />
                    </p>

                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const active = isApNavItemActive(pathname, item);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setDrawerOpen(false)}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "group relative flex items-center gap-2.5 rounded-[11px] py-1.5 pl-1.5 pr-2.5 text-[12.5px] font-semibold transition-all duration-200",
                              active
                                ? "bg-[var(--dcp-brand-soft)] text-[var(--dcp-brand-deep)] shadow-[inset_0_0_0_1px_rgba(18,104,232,0.16)]"
                                : "text-[var(--dcp-ink-2)] hover:bg-white/70 hover:text-[var(--dcp-ink)]",
                            )}
                          >
                            <span
                              className={cn(
                                "dcp-chip h-7 w-7 shrink-0",
                                active
                                  ? "dcp-chip-filled"
                                  : "bg-white text-[var(--dcp-ink-3)] shadow-[0_1px_2px_rgba(10,24,52,0.06)] group-hover:bg-[var(--dcp-brand-soft)] group-hover:text-[var(--dcp-brand-deep)]",
                              )}
                            >
                              <Icon className="h-[15px] w-[15px]" aria-hidden />
                            </span>
                            <span className="min-w-0 truncate">{item.label}</span>
                            {active ? (
                              <span
                                aria-hidden
                                className="absolute inset-y-1.5 -left-3 w-[3px] rounded-r-full bg-[image:var(--dcp-g-brand)]"
                              />
                            ) : null}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <Link
                  href="/ap/all"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-2.5 rounded-[11px] border border-dashed border-[var(--dcp-line-2)] py-1.5 pl-1.5 pr-2.5 text-[12.5px] font-semibold text-[var(--dcp-ink-3)] transition-all duration-200 hover:border-[var(--dcp-brand)] hover:bg-[var(--dcp-brand-soft)] hover:text-[var(--dcp-brand-deep)]"
                >
                  <span className="dcp-chip h-7 w-7 shrink-0 bg-white text-[var(--dcp-ink-3)]">
                    <LayoutGrid className="h-[15px] w-[15px]" aria-hidden />
                  </span>
                  Sab kuch ek jagah
                </Link>
              </div>

              {/* Drawer Footer with Apple settings layout Logout */}
              <div className="border-t border-[var(--dcp-line)] bg-white/50 p-3">
                <LogoutButton
                  portal="ap"
                  variant="ghost"
                  className="flex h-10 w-full items-center justify-start gap-2.5 rounded-[11px] px-3 text-[12.5px] font-bold text-[var(--dcp-ink-2)] outline-none transition-colors duration-150 hover:bg-[var(--dcp-bad-soft)] hover:text-[var(--dcp-bad)]"
                  onLoggedOut={() => setDrawerOpen(false)}
                />
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Unified search Overlay for Partners */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[rgba(10,24,52,0.35)] backdrop-blur-md">
          <div className="flex items-center gap-3 border-b border-[var(--dcp-line)] bg-white px-4 py-3 shadow-sm">
            <Search className="h-5 w-5 shrink-0 text-[var(--dcp-ink-4)]" />
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search partner services, customers, applications..."
              className="flex-1 bg-transparent text-base font-medium outline-none text-[var(--dcp-ink)] placeholder:text-[var(--dcp-ink-4)]"
              onKeyDown={(e) => {
                if (e.key === "Escape") setSearchOpen(false);
              }}
            />
            <button
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery("");
                setSearchResults({ services: [], customers: [], applications: [] });
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--dcp-ink-4)] hover:bg-[var(--dcp-surface-3)] hover:text-[var(--dcp-ink)] transition"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 max-w-2xl mx-auto w-full">
            {searchQuery.trim() ? (
              <div className="space-y-6">
                
                {/* Services */}
                {searchResults.services.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-black uppercase tracking-wider text-blue-500 flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5" /> Services ({searchResults.services.length})
                    </h3>
                    <div className="grid gap-2">
                      {searchResults.services.map((item) => (
                        <Link
                          key={item.id}
                          href={`/ap/applications/new?serviceId=${item.id}`}
                          onClick={() => setSearchOpen(false)}
                          className="flex items-center justify-between p-3 bg-white rounded-xl border border-[var(--dcp-line)] hover:border-blue-500 hover:shadow-sm transition-all"
                        >
                          <div>
                            <p className="font-bold text-[var(--dcp-ink)] text-sm">{item.title}</p>
                            <p className="font-mono text-[10px] text-[var(--dcp-ink-4)]">Slug: {item.slug}</p>
                          </div>
                          <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                            Apply (₹{item.customer_fee})
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Customers */}
                {searchResults.customers.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-black uppercase tracking-wider text-indigo-500 flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" /> Customers ({searchResults.customers.length})
                    </h3>
                    <div className="grid gap-2">
                      {searchResults.customers.map((item) => (
                        <Link
                          key={item.id}
                          href={`/ap/customers?search=${item.full_name}`}
                          onClick={() => setSearchOpen(false)}
                          className="flex items-center justify-between p-3 bg-white rounded-xl border border-[var(--dcp-line)] hover:border-indigo-500 hover:shadow-sm transition-all"
                        >
                          <div>
                            <p className="font-bold text-[var(--dcp-ink)] text-sm">{item.full_name}</p>
                            <p className="font-mono text-[10px] text-[var(--dcp-ink-4)]">{item.mobile}</p>
                          </div>
                          <span className="text-[10px] font-bold text-[var(--dcp-ink-4)] bg-[var(--dcp-surface-2)] px-2 py-0.5 rounded border border-[var(--dcp-line)]">
                            CRM
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Applications */}
                {searchResults.applications.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-black uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" /> Applications ({searchResults.applications.length})
                    </h3>
                    <div className="grid gap-2">
                      {searchResults.applications.map((item) => (
                        <Link
                          key={item.id}
                          href={`/ap/applications/${item.id}`}
                          onClick={() => setSearchOpen(false)}
                          className="flex items-center justify-between p-3 bg-white rounded-xl border border-[var(--dcp-line)] hover:border-emerald-500 hover:shadow-sm transition-all"
                        >
                          <div>
                            <p className="font-bold text-[var(--dcp-ink)] text-sm">{item.customer_name}</p>
                            <p className="text-[10px] text-[var(--dcp-ink-4)]">{item.service_name}</p>
                          </div>
                          <span className="text-[10px] font-extrabold capitalize text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                            {item.status.replace(/_/g, " ")}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {searchResults.services.length === 0 && searchResults.customers.length === 0 && searchResults.applications.length === 0 && (
                  <div className="py-12 text-center text-[var(--dcp-ink-4)] text-xs font-semibold bg-white rounded-2xl border border-[var(--dcp-line)]">
                    No matching services, customers, or applications found.
                  </div>
                )}

              </div>
            ) : (
              <div className="py-12 text-center space-y-3 bg-white rounded-2xl border border-[var(--dcp-line)] p-6">
                <div className="h-10 w-10 rounded-full bg-[var(--dcp-surface-2)] flex items-center justify-center text-[var(--dcp-ink-4)] mx-auto border border-[var(--dcp-line)]">
                  <Search className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-[var(--dcp-ink)] text-sm">DC Partners Unified Search</h3>
                <p className="text-[11px] text-[var(--dcp-ink-3)] leading-relaxed max-w-xs mx-auto font-medium">
                  Type a customer name, mobile number, service name, or application details to query active partner datasets.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

