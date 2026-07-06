"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, User, Share2, Smartphone, LogOut } from "lucide-react";

export default function CustomerV2Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/customer-v2/dashboard", icon: LayoutDashboard },
    { name: "Profile", href: "/customer-v2/profile", icon: User },
    { name: "Devices", href: "/customer-v2/devices", icon: Smartphone },
    { name: "Referrals", href: "/customer-v2/referral", icon: Share2 },
  ];

  const handleLogout = async () => {
    try {
      await fetch("/api/customer-auth/logout", { method: "POST" });
      window.location.href = "/customer-auth-v2/login";
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f16] flex text-white font-sans selection:bg-[#00bfa5]/30">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-white/[0.02] backdrop-blur-xl flex flex-col fixed inset-y-0 left-0 z-50">
        <div className="p-6 h-20 flex items-center border-b border-white/5">
          <Link href="/customer-v2/dashboard" className="text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent tracking-tight">
            Digi<span className="text-[#00bfa5]">Connect</span>
          </Link>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative overflow-hidden group ${
                  isActive ? "bg-white/10 text-white" : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                {isActive && (
                  <motion.div layoutId="activeNavIndicator" className="absolute left-0 top-0 bottom-0 w-1 bg-[#00bfa5] rounded-r-full" />
                )}
                <item.icon className={`w-5 h-5 transition-colors ${isActive ? "text-[#00bfa5]" : "group-hover:text-white/80"}`} />
                <span className="font-medium text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-white/50 hover:text-red-400 hover:bg-red-500/10 group">
            <LogOut className="w-5 h-5 transition-colors" />
            <span className="font-medium text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8 relative min-h-screen overflow-x-hidden">
        {/* Background glow effects */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#00bfa5]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
