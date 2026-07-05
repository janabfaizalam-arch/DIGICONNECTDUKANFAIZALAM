"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Layers,
  Users,
  WalletCards,
  HandCoins,
  Headphones,
  Bell,
  UserCog,
  Search,
  Menu,
  X,
  ChevronRight,
  Share2,
  Settings,
  Compass,
  Landmark,
  Home,
  Link as LinkIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LogoutButton } from "@/components/auth/logout-button";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
}

export function APPanelNav() {
  const pathname = usePathname();
  const supabase = createClient();

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

  // Scroll-aware bottom nav
  const [navVisible, setNavVisible] = useState(true);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const lastScrollY = useRef(0);

  const notifRef = useRef<HTMLDivElement>(null);

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

  // Scroll direction detection for bottom nav
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;

      if (delta > 8) {
        setNavVisible(false);
      } else if (delta < -8) {
        setNavVisible(true);
      }

      lastScrollY.current = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Keyboard detection: hide nav when virtual keyboard opens
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const handleResize = () => {
      const threshold = window.innerHeight * 0.75;
      setKeyboardOpen(vv.height < threshold);
    };

    vv.addEventListener("resize", handleResize);
    return () => vv.removeEventListener("resize", handleResize);
  }, []);

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

  // Primary Navigation items
  const navItems = [
    { href: "/ap/dashboard", label: "Dashboard", icon: LayoutDashboard, color: "bg-blue-500" },
    { href: "/ap/applications", label: "Applications", icon: FileText, color: "bg-orange-500" },
    { href: "/ap/payment-links", label: "Payment Links", icon: LinkIcon, color: "bg-purple-500" },
    { href: "/ap/services", label: "Services", icon: Layers, color: "bg-emerald-500" },
    { href: "/ap/customers", label: "Customers", icon: Users, color: "bg-sky-500" },
    { href: "/ap/wallet", label: "Wallet", icon: WalletCards, color: "bg-teal-500" },
    { href: "/ap/commissions", label: "Earnings", icon: HandCoins, color: "bg-amber-500" },
    { href: "/ap/referrals", label: "Referrals", icon: Share2, color: "bg-indigo-500" },
    { href: "/ap/support", label: "Support", icon: Headphones, color: "bg-indigo-500" },
  ];

  if (
    pathname === "/ap/login" ||
    pathname === "/ap/forgot-password" ||
    pathname === "/ap/reset-password"
  ) {
    return null;
  }

  return (
    <>
      {/* Sleek, responsive white glassmorphism header row */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-100/80 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:px-6 lg:px-8">
          
          {/* LEFT: Logo + Workspace Badge */}
          <div className="flex items-center gap-3">
            <Link href="/ap/dashboard" className="flex shrink-0 items-center gap-2">
              <span className="flex h-6 w-24 items-center">
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

            <span className="hidden items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 md:inline-flex border border-slate-200/50">
              <Compass className="h-3 w-3 text-slate-500" />
              {partnerTier}
            </span>
          </div>

          {/* CENTER: Desktop navigation links */}
          <nav className="hidden flex-1 items-center justify-center gap-1.5 md:flex">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-xs font-semibold tracking-wide transition-all duration-150 outline-none",
                    active
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-500/10"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* RIGHT: Actions (Search, Notification, Settings Menu) */}
          <div className="flex items-center gap-1.5 md:gap-2">
            
            {/* Search Icon */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
              title="Search Services & CRM"
            >
              <Search className="h-4.5 w-4.5" />
            </button>

            {/* Notifications Panel */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                title="Notifications"
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
                )}
              </button>

              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-xl ring-1 ring-black/5 z-50 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Notifications</h4>
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
                        <p className="text-center text-[10px] text-slate-400 py-6 font-semibold">All caught up!</p>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className={cn("rounded-lg p-2 text-left text-[11px] leading-relaxed transition", !n.read_at ? "bg-blue-50/30 border border-blue-100/20" : "hover:bg-slate-50")}>
                            <p className="font-extrabold text-slate-800 leading-tight">{n.title}</p>
                            <p className="text-slate-500 mt-0.5">{n.message}</p>
                            <span className="text-[9px] text-slate-400 block mt-1">{new Date(n.created_at).toLocaleDateString()}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Settings Drawer Button (Profile Badging) */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex h-9 items-center justify-center rounded-xl px-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 gap-1.5 cursor-pointer"
              title="Menu Drawer"
            >
              <div className="h-6 w-6 rounded-full bg-blue-100 border border-blue-200/50 flex items-center justify-center text-blue-700 text-xs font-bold font-mono">
                {partnerCode ? partnerCode.slice(-2) : "AP"}
              </div>
              <span className="hidden text-xs font-bold text-slate-600 md:inline-block">Menu</span>
            </button>
          </div>

        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className={cn("fixed bottom-0 inset-x-0 z-[49] flex md:hidden items-center justify-around h-[60px] px-2 bg-white/90 backdrop-blur-md border-t border-slate-100 shadow-[0_-4px_24px_rgba(15,23,42,0.04)] pb-safe-bottom transition-transform duration-300 ease-out", (!navVisible || keyboardOpen) && "translate-y-full")}>
        {[
          { label: "Home", href: "/ap/dashboard", icon: Home },
          { label: "Applications", href: "/ap/applications", icon: FileText },
          { label: "Customers", href: "/ap/customers", icon: Users },
          { label: "Wallet", href: "/ap/wallet", icon: WalletCards },
          { label: "More", href: "#more", icon: Menu, action: () => setDrawerOpen(true) }
        ].map((item) => {
          const Icon = item.icon;
          const isActive = item.href !== "#more" && (pathname === item.href || pathname.startsWith(`${item.href}/`));

          return item.action ? (
            <button
              key={item.label}
              onClick={item.action}
              className="flex flex-col items-center justify-center flex-1 h-full text-slate-450 hover:text-slate-700 transition-colors border-none bg-transparent"
            >
              <Icon className="h-5 w-5 stroke-[1.8]" />
              <span className="text-[10px] font-bold mt-1 tracking-wide">{item.label}</span>
            </button>
          ) : (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full relative transition-colors",
                isActive ? "text-blue-600 font-extrabold" : "text-slate-450 hover:text-slate-700 font-bold"
              )}
            >
              <Icon className="h-5 w-5 stroke-[1.8]" />
              <span className="text-[10px] mt-1 tracking-wide">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-600" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* SLIDE-OUT DRAWER MENU (RIGHT SIDE, Liquid Glass Theme) */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-slate-900/20 backdrop-blur-xs"
            />

            {/* Right Drawer Container */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 240 }}
              className="relative flex h-full w-[85%] max-w-sm flex-col bg-white/90 backdrop-blur-xl shadow-2xl border-l border-slate-200/50 pb-safe-bottom"
            >
              {/* Drawer Header */}
              <div className="flex h-16 items-center justify-between px-5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 text-xs font-mono font-bold">
                    {partnerCode ? partnerCode.slice(-2) : "AP"}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-black text-slate-800 leading-none">{partnerName || "Partner"}</p>
                    <p className="text-[9px] font-mono font-bold text-slate-500 leading-none mt-1">{partnerCode}</p>
                  </div>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200/50 hover:text-slate-800 transition cursor-pointer"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto py-6 px-4 space-y-6">
                {/* 1. Account Section */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2">Account Profile</h4>
                  <div className="space-y-1 bg-slate-50/50 border border-slate-100 rounded-2xl p-1.5">
                    <Link
                      href="/ap/profile"
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-white rounded-xl transition-all"
                    >
                      <UserCog className="h-4.5 w-4.5 text-blue-500" />
                      <span>My Profile</span>
                      <ChevronRight className="ml-auto h-3.5 w-3.5 text-slate-350" />
                    </Link>
                    <Link
                      href="/ap/profile"
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-white rounded-xl transition-all"
                    >
                      <Settings className="h-4.5 w-4.5 text-slate-500" />
                      <span>Workspace Settings</span>
                      <ChevronRight className="ml-auto h-3.5 w-3.5 text-slate-350" />
                    </Link>
                  </div>
                </div>

                {/* 2. Operations Section */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2">Workflow Tracker</h4>
                  <div className="space-y-1 bg-slate-50/50 border border-slate-100 rounded-2xl p-1.5 text-xs font-bold">
                    <Link
                      href="/ap/dashboard"
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-white rounded-xl transition-all text-slate-750"
                    >
                      <LayoutDashboard className="h-4 w-4 text-blue-500" />
                      <span>Dashboard</span>
                    </Link>
                    <Link
                      href="/ap/applications/new"
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-white rounded-xl transition-all text-slate-750"
                    >
                      <Home className="h-4 w-4 text-emerald-500" />
                      <span>New Application</span>
                    </Link>
                    <Link
                      href="/ap/applications?status=draft"
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-white rounded-xl transition-all text-slate-750"
                    >
                      <FileText className="h-4 w-4 text-slate-450" />
                      <span>Drafts (Step 2)</span>
                    </Link>
                    <Link
                      href="/ap/applications?status=documents_pending"
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-white rounded-xl transition-all text-slate-750"
                    >
                      <FileText className="h-4 w-4 text-amber-500" />
                      <span>Pending Documents (Step 3)</span>
                    </Link>
                    <Link
                      href="/ap/applications?status=payment_pending"
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-white rounded-xl transition-all text-slate-750"
                    >
                      <FileText className="h-4 w-4 text-rose-500" />
                      <span>Pending Payment (Step 5)</span>
                    </Link>
                    <Link
                      href="/ap/applications?status=submitted"
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-white rounded-xl transition-all text-slate-750"
                    >
                      <FileText className="h-4 w-4 text-blue-500" />
                      <span>Submitted</span>
                    </Link>
                    <Link
                      href="/ap/applications?status=processing"
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-white rounded-xl transition-all text-slate-750"
                    >
                      <FileText className="h-4 w-4 text-purple-500" />
                      <span>Processing</span>
                    </Link>
                    <Link
                      href="/ap/applications?status=completed"
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-white rounded-xl transition-all text-slate-750"
                    >
                      <FileText className="h-4 w-4 text-emerald-500" />
                      <span>Completed</span>
                    </Link>
                  </div>
                </div>

                {/* 2.5. Catalog & CRM Section */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2">Services & Filings</h4>
                  <div className="space-y-1 bg-slate-50/50 border border-slate-100 rounded-2xl p-1.5">
                    <Link
                      href="/ap/services"
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-slate-750 hover:bg-white rounded-xl transition-all"
                    >
                      <Layers className="h-4.5 w-4.5 text-emerald-500" />
                      <span>Services Catalog</span>
                      <ChevronRight className="ml-auto h-3.5 w-3.5 text-slate-350" />
                    </Link>
                    <Link
                      href="/ap/customers"
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-slate-750 hover:bg-white rounded-xl transition-all"
                    >
                      <Users className="h-4.5 w-4.5 text-sky-500" />
                      <span>Customers & CRM</span>
                      <ChevronRight className="ml-auto h-3.5 w-3.5 text-slate-350" />
                    </Link>
                    <Link
                      href="/ap/referrals"
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-slate-750 hover:bg-white rounded-xl transition-all"
                    >
                      <Share2 className="h-4.5 w-4.5 text-indigo-500" />
                      <span>Referrals & Links</span>
                      <ChevronRight className="ml-auto h-3.5 w-3.5 text-slate-350" />
                    </Link>
                  </div>
                </div>

                {/* 3. Financials Section */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2">Wallet & earnings</h4>
                  <div className="space-y-1 bg-slate-50/50 border border-slate-100 rounded-2xl p-1.5">
                    <Link
                      href="/ap/wallet"
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-white rounded-xl transition-all"
                    >
                      <WalletCards className="h-4.5 w-4.5 text-teal-500" />
                      <span>Wallet Ledger</span>
                      <ChevronRight className="ml-auto h-3.5 w-3.5 text-slate-350" />
                    </Link>
                    <Link
                      href="/ap/wallet"
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-white rounded-xl transition-all"
                    >
                      <Landmark className="h-4.5 w-4.5 text-indigo-500" />
                      <span>Payout Requests</span>
                      <ChevronRight className="ml-auto h-3.5 w-3.5 text-slate-350" />
                    </Link>
                    <Link
                      href="/ap/commissions"
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-white rounded-xl transition-all"
                    >
                      <HandCoins className="h-4.5 w-4.5 text-amber-500" />
                      <span>Earning Reports</span>
                      <ChevronRight className="ml-auto h-3.5 w-3.5 text-slate-350" />
                    </Link>
                  </div>
                </div>

                {/* 4. Support & Notices Section */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2">Information Desk</h4>
                  <div className="space-y-1 bg-slate-50/50 border border-slate-100 rounded-2xl p-1.5">
                    <Link
                      href="/ap/notifications"
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-white rounded-xl transition-all"
                    >
                      <Bell className="h-4.5 w-4.5 text-rose-500" />
                      <span>Updates & Bulletins</span>
                      <ChevronRight className="ml-auto h-3.5 w-3.5 text-slate-350" />
                    </Link>
                    <Link
                      href="/ap/support"
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-white rounded-xl transition-all"
                    >
                      <Headphones className="h-4.5 w-4.5 text-indigo-650" />
                      <span>Help Support Desk</span>
                      <ChevronRight className="ml-auto h-3.5 w-3.5 text-slate-350" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Drawer Footer with Apple settings layout Logout */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/40">
                <LogoutButton
                  variant="ghost"
                  className="w-full justify-start h-11 text-slate-600 hover:bg-rose-50 hover:text-rose-600 rounded-xl px-4 text-xs font-bold transition-colors duration-150 outline-none flex items-center gap-3"
                  onLoggedOut={() => setDrawerOpen(false)}
                />
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Unified search Overlay for Partners */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/40 backdrop-blur-md">
          <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-4 py-3 shadow-sm">
            <Search className="h-5 w-5 shrink-0 text-slate-400" />
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search partner services, customers, applications..."
              className="flex-1 bg-transparent text-base font-medium outline-none text-slate-800 placeholder:text-slate-400"
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
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition"
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
                          className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 hover:border-blue-500 hover:shadow-sm transition-all"
                        >
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{item.title}</p>
                            <p className="text-[10px] text-slate-450 font-mono">Slug: {item.slug}</p>
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
                          className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 hover:border-indigo-500 hover:shadow-sm transition-all"
                        >
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{item.full_name}</p>
                            <p className="text-[10px] text-slate-450 font-mono">{item.mobile}</p>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
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
                          className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 hover:border-emerald-500 hover:shadow-sm transition-all"
                        >
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{item.customer_name}</p>
                            <p className="text-[10px] text-slate-400">{item.service_name}</p>
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
                  <div className="py-12 text-center text-slate-400 text-xs font-semibold bg-white rounded-2xl border border-slate-100">
                    No matching services, customers, or applications found.
                  </div>
                )}

              </div>
            ) : (
              <div className="py-12 text-center space-y-3 bg-white rounded-2xl border border-slate-100 p-6">
                <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mx-auto border border-slate-100">
                  <Search className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">DigiPartner Unified Search</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto font-medium">
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

