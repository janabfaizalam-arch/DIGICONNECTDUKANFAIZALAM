"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Layers,
  Users,
  WalletCards,
  HandCoins,
  Headphones,
  Inbox,
  Bell,
  UserCog,
  ChevronDown,
  Plus,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { LogoutButton } from "@/components/auth/logout-button";
import { cn } from "@/lib/utils";

// Custom outside click hook to dismiss dropdown panels
function useOutsideClick(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);
  return ref;
}

// 7 Primary Navigation Items Visible on Desktop
const primaryItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/ap/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ap/applications", label: "Applications", icon: FileText },
  { href: "/ap/services", label: "Services", icon: Layers },
  { href: "/ap/customers", label: "Customers", icon: Users },
  { href: "/ap/wallet", label: "Wallet", icon: WalletCards },
  { href: "/ap/commissions", label: "Earnings", icon: HandCoins },
  { href: "/ap/support", label: "Support", icon: Headphones },
];

// Secondary Items placed in the "More" Dropdown on Desktop
const secondaryItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/ap/leads", label: "Leads", icon: Inbox },
  { href: "/ap/notifications", label: "Notifications", icon: Bell },
  { href: "/ap/profile", label: "Profile & Settings", icon: UserCog },
];

// Mobile Visible Items (First 4 items)
const mobileVisibleItems = primaryItems.slice(0, 3).concat([primaryItems[4]]); // Dashboard, Applications, Services, Wallet

// Mobile More Dropdown items (Everything else)
const mobileMoreItems: { href: string; label: string; icon: LucideIcon; isCta?: boolean }[] = [
  { href: "/ap/applications/new", label: "New Application", icon: Plus, isCta: true },
  primaryItems[3], // Customers
  primaryItems[5], // Earnings
  primaryItems[6], // Support
  ...secondaryItems, // Leads, Notifications, Profile
];

export function APPanelNav() {
  const pathname = usePathname();
  
  // Dropdown visibility states
  const [desktopMoreOpen, setDesktopMoreOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  // Outside click refs
  const desktopDropdownRef = useOutsideClick(() => setDesktopMoreOpen(false));
  const mobileDropdownRef = useOutsideClick(() => setMobileMoreOpen(false));
  
  // Exclude dashboard navigation bar from login routes to avoid double header sections
  if (pathname === "/ap/login") return null;

  return (
    <nav 
      aria-label="Partner Workspace Navigation" 
      className="sticky top-[3.25rem] md:top-16 z-30 min-h-[64px] h-16 border-b border-white/10 bg-slate-900/90 backdrop-blur-xl flex items-center px-4 md:px-6 w-full"
    >
      <div className="mx-auto w-full max-w-7xl flex items-center justify-between h-full">
        
        {/* DESKTOP LAYOUT (>= md Breakpoint) */}
        <div className="hidden md:flex items-center justify-between w-full h-full">
          
          {/* Left section: 7 Primary visible tabs */}
          <div className="flex items-center gap-1.5 lg:gap-2">
            {primaryItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "relative text-xs lg:text-sm font-semibold h-10 px-3 lg:px-4 inline-flex items-center gap-2 rounded-full relative z-0 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                    active
                      ? "text-white"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="activeApTab"
                      className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full -z-10 shadow-md shadow-blue-500/20"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right section: New App CTA + More Dropdown + Logout */}
          <div className="flex items-center gap-3">
            
            {/* New Application CTA button */}
            <Link
              href="/ap/applications/new"
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <Plus className="h-[18px] w-[18px] shrink-0" />
              <span>New App</span>
            </Link>

            {/* Desktop More dropdown button container */}
            <div className="relative" ref={desktopDropdownRef}>
              <button
                onClick={() => setDesktopMoreOpen(!desktopMoreOpen)}
                aria-haspopup="true"
                aria-expanded={desktopMoreOpen}
                className={cn(
                  "h-10 px-4 text-xs lg:text-sm font-semibold inline-flex items-center gap-1 rounded-full transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer",
                  desktopMoreOpen
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                <span>More</span>
                <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", desktopMoreOpen && "rotate-180")} />
              </button>

              <AnimatePresence>
                {desktopMoreOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-white/10 bg-slate-950/95 backdrop-blur-xl p-2 shadow-2xl z-50 flex flex-col gap-1"
                  >
                    {secondaryItems.map(({ href, label, icon: Icon }) => {
                      const active = pathname === href || pathname.startsWith(`${href}/`);
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setDesktopMoreOpen(false)}
                          className={cn(
                            "flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs lg:text-sm font-semibold transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                            active
                              ? "bg-white/10 text-white"
                              : "text-slate-400 hover:bg-white/5 hover:text-white"
                          )}
                        >
                          <Icon className="h-[18px] w-[18px] shrink-0" />
                          <span>{label}</span>
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Logout button */}
            <LogoutButton 
              variant="ghost" 
              className="h-10 text-slate-400 hover:bg-white/5 hover:text-white rounded-full px-4 text-xs lg:text-sm font-semibold shrink-0 transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-500" 
            />
          </div>

        </div>

        {/* MOBILE LAYOUT (< md Breakpoint) */}
        <div className="flex md:hidden items-center justify-between w-full h-full">
          
          <div className="flex w-full items-center justify-between gap-1 h-full">
            {mobileVisibleItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "relative flex-1 py-1.5 text-center text-xs font-semibold inline-flex flex-col items-center justify-center gap-1 transition-all rounded-xl h-full outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                    active ? "text-blue-500" : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="text-[9px] font-bold leading-none mt-0.5">{label}</span>
                </Link>
              );
            })}
            
            {/* Mobile Dropdown Button container */}
            <div className="relative flex-1 h-full" ref={mobileDropdownRef}>
              <button
                onClick={() => setMobileMoreOpen(!mobileMoreOpen)}
                aria-haspopup="true"
                aria-expanded={mobileMoreOpen}
                className={cn(
                  "w-full py-1.5 text-center text-xs font-semibold inline-flex flex-col items-center justify-center gap-1 transition-all rounded-xl h-full outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer",
                  mobileMoreOpen ? "text-blue-500" : "text-slate-400 hover:text-slate-200"
                )}
              >
                {mobileMoreOpen ? <X className="h-5 w-5 shrink-0" /> : <Menu className="h-5 w-5 shrink-0" />}
                <span className="text-[9px] font-bold leading-none mt-0.5">More</span>
              </button>
              
              <AnimatePresence>
                {mobileMoreOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-white/10 bg-slate-950/95 backdrop-blur-xl p-2.5 shadow-2xl z-50 flex flex-col gap-1"
                  >
                    {mobileMoreItems.map(({ href, label, icon: Icon, isCta }) => {
                      const active = pathname === href || pathname.startsWith(`${href}/`);
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setMobileMoreOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                            isCta
                              ? "bg-blue-600/20 text-blue-400 border border-blue-500/10 shadow-[0_2px_8px_rgba(37,99,235,0.1)]"
                              : active
                              ? "bg-white/10 text-white"
                              : "text-slate-400 hover:bg-white/5 hover:text-white"
                          )}
                        >
                          <Icon className="h-5 w-5 shrink-0" />
                          <span>{label}</span>
                        </Link>
                      );
                    })}
                    
                    <div className="border-t border-white/5 my-1.5" />
                    
                    {/* Mobile Logout Button */}
                    <LogoutButton
                      variant="ghost"
                      className="w-full justify-start h-11 text-slate-400 hover:bg-white/5 hover:text-rose-400 rounded-xl px-3.5 text-sm font-semibold transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      onLoggedOut={() => setMobileMoreOpen(false)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>

      </div>
    </nav>
  );
}
