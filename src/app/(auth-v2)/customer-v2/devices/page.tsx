"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Smartphone, Laptop, Globe, LogOut, ShieldAlert } from "lucide-react";

export default function DevicesPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/customer-auth/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleLogoutDevice = async (sessionId: string) => {
    try {
      const res = await fetch("/api/customer-auth/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId })
      });
      if (res.ok) {
        fetchSessions();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogoutAll = async () => {
    try {
      const res = await fetch("/api/customer-auth/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true })
      });
      if (res.ok) {
        window.location.href = "/customer-auth-v2/login";
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 bg-white/5 animate-pulse rounded-lg" />
        <div className="h-64 bg-white/5 animate-pulse rounded-[2rem]" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Active Devices</h1>
          <p className="text-white/50 mt-1">Manage the devices that are currently logged into your account.</p>
        </div>
        <button onClick={handleLogoutAll} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" /> Logout All Devices
        </button>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-[2rem] backdrop-blur-xl overflow-hidden divide-y divide-white/5">
        {sessions.map((session, i) => {
          const device = session.customer_devices;
          const isMobile = device?.device_name?.toLowerCase().includes("mobile") || device?.device_name?.toLowerCase().includes("android") || device?.device_name?.toLowerCase().includes("iphone");
          const isCurrent = i === 0; // Extremely simplified check for Current Session for demo purposes

          return (
            <div key={session.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/50">
                  {isMobile ? <Smartphone className="w-6 h-6" /> : <Laptop className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-white font-medium flex items-center gap-2">
                    {device?.device_name || "Unknown Device"}
                    {isCurrent && <span className="bg-[#00bfa5]/20 text-[#00bfa5] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Current</span>}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-white/40 mt-1">
                    <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {device?.ip_address || "Unknown IP"}</span>
                    <span>•</span>
                    <span>Last active: {new Date(device?.last_active || session.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {!isCurrent && (
                <button 
                  onClick={() => handleLogoutDevice(session.id)}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-white/5 text-white hover:bg-red-500/10 hover:text-red-400 transition-colors flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> Revoke
                </button>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
