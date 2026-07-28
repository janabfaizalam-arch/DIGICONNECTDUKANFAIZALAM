"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, Info, AlertCircle, FileText, Coins, Gift, Check, Trash2, CheckCircle2, ShieldCheck, LogIn } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/browser";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
  application_id?: string | null;
  type: "status" | "wallet" | "referral" | "document" | "payment" | "info";
}

interface DbNotification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
  application_id?: string | null;
}

export default function NotificationsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      const supabase = createClient();
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      if (!session?.user) {
        setUser(null);
        setLoading(false);
        return;
      }
      setUser(session.user);
      await fetchNotifications(session.user);
    }

    loadSession();

    return () => {
      active = false;
    };
  }, []);

  const fetchNotifications = async (currentUser: User) => {
    const supabase = createClient();
    if (!supabase) return;
    try {
      const { data: dbNotifs } = await supabase
        .from("notifications")
        .select("id, title, message, created_at, read_at, application_id")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false })
        .limit(50);

      const list: NotificationItem[] = [];
      const readIds = JSON.parse(localStorage.getItem(`read_notifs_${currentUser.id}`) || "[]");

      if (dbNotifs) {
        dbNotifs.forEach((n: DbNotification) => {
          const titleLower = n.title.toLowerCase();
          const msgLower = n.message.toLowerCase();
          const isWallet = titleLower.includes("wallet") || titleLower.includes("cashback") || msgLower.includes("cashback");
          const isReferral = titleLower.includes("referral") || msgLower.includes("referral");
          const isDoc = titleLower.includes("doc") || msgLower.includes("document") || msgLower.includes("upload");
          const isPayment = titleLower.includes("payment") || titleLower.includes("pending") || titleLower.includes("razorpay");

          let type: NotificationItem["type"] = "info";
          if (isWallet) type = "wallet";
          else if (isReferral) type = "referral";
          else if (isDoc) type = "document";
          else if (isPayment) type = "payment";

          list.push({
            id: n.id,
            title: n.title,
            message: n.message,
            created_at: n.created_at,
            read_at: n.read_at || (readIds.includes(n.id) ? new Date().toISOString() : null),
            application_id: n.application_id ?? null,
            type,
          });
        });
      }
      
      setNotifications(list);
    } catch (err) {
      console.warn("Failed to load notifications page data:", err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    if (!user) return;
    const supabase = createClient();
    if (!supabase) return;

    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );

      // Save to local read history fallback
      const readIds = JSON.parse(localStorage.getItem(`read_notifs_${user.id}`) || "[]");
      if (!readIds.includes(id)) {
        readIds.push(id);
        localStorage.setItem(`read_notifs_${user.id}`, JSON.stringify(readIds));
      }

      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);
    } catch (err) {
      console.warn("Failed to mark notification as read:", err);
    }
  };

  const markAllRead = async () => {
    if (!user || notifications.length === 0) return;
    const supabase = createClient();
    if (!supabase) return;

    try {
      const time = new Date().toISOString();
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: time })));

      const readIds = notifications.map((n) => n.id);
      localStorage.setItem(`read_notifs_${user.id}`, JSON.stringify(readIds));

      await supabase
        .from("notifications")
        .update({ read_at: time })
        .eq("user_id", user.id)
        .is("read_at", null);
    } catch (err) {
      console.warn("Failed to mark all as read:", err);
    }
  };

  const deleteNotification = async (id: string) => {
    if (!user) return;
    const supabase = createClient();
    if (!supabase) return;

    try {
      setNotifications((prev) => prev.filter((n) => n.id !== id));

      await supabase.from("notifications").delete().eq("id", id);
    } catch (err) {
      console.warn("Failed to delete notification:", err);
    }
  };

  const getRelativeTime = (dateStr: string) => {
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
  };

  return (
    <div className="min-h-screen bg-slate-50/50 noise-bg pt-20 pb-24 px-4 relative">
      <div className="ambient-glow ambient-blue w-[400px] h-[400px] -top-20 -left-20" />
      
      <div className="container-shell max-w-2xl relative z-10">
        {/* Header toolbar */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/customer/dashboard"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200/60 text-slate-500 hover:text-slate-800 transition active:scale-95 shadow-sm"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </Link>
          <h1 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-500 fill-blue-100" /> Alerts Center
          </h1>
          {user && notifications.length > 0 ? (
            <button
              onClick={markAllRead}
              className="text-xs font-black text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" /> Read All
            </button>
          ) : (
            <div className="w-9" />
          )}
        </div>

        {/* Content Board */}
        {loading ? (
          /* Loading Skeletion */
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass-liquid-premium rounded-3xl p-5 animate-pulse flex gap-4">
                <div className="h-10 w-10 rounded-2xl bg-slate-100/80" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-1/3 rounded bg-slate-100/80" />
                  <div className="h-2.5 w-5/6 rounded bg-slate-100/80" />
                </div>
              </div>
            ))}
          </div>
        ) : !user ? (
          /* Guest state */
          <div className="glass-liquid-premium rounded-[2rem] p-8 text-center space-y-5 shadow-[0_16px_48px_rgba(15,23,42,0.04)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100/50">
              <Bell className="h-7 w-7" />
            </div>
            <div className="space-y-2 max-w-sm mx-auto">
              <h3 className="text-base font-black text-slate-800">Track your application alerts</h3>
              <p className="text-xs font-semibold text-slate-450 leading-relaxed">
                Log in to view secure updates for your GST submissions, document verifications, refer & earn points, and wallet balances.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/login/customer"
                className="inline-flex h-11 px-8 items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-black text-white transition active:scale-95 shadow-sm"
              >
                <LogIn className="h-4 w-4" /> Log In to Account
              </Link>
            </div>
          </div>
        ) : notifications.length === 0 ? (
          /* Empty alert state */
          <div className="glass-liquid-premium rounded-[2rem] p-8 text-center space-y-4 shadow-[0_16px_48px_rgba(15,23,42,0.04)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 border border-slate-100/50">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="text-base font-black text-slate-800">You&apos;re all caught up!</h3>
              <p className="text-xs font-semibold text-slate-450 leading-relaxed">
                No active notifications or alerts at this moment. We will notify you here as your applications progress.
              </p>
            </div>
          </div>
        ) : (
          /* Real notifications list */
          <div className="space-y-3.5">
            {notifications.map((item) => {
              const unread = !item.read_at;
              let Icon = Info;
              let colorClasses = "bg-blue-50 text-blue-600 border border-blue-100";

              if (item.type === "payment") {
                Icon = AlertCircle;
                colorClasses = "bg-rose-50 text-rose-600 border border-rose-100";
              } else if (item.type === "document") {
                Icon = FileText;
                colorClasses = "bg-sky-50 text-sky-600 border border-sky-100";
              } else if (item.type === "wallet") {
                Icon = Coins;
                colorClasses = "bg-emerald-50 text-emerald-600 border border-emerald-100";
              } else if (item.type === "referral") {
                Icon = Gift;
                colorClasses = "bg-amber-50 text-amber-600 border border-amber-100";
              }

              return (
                <div
                  key={item.id}
                  className={`glass-liquid-premium rounded-3xl p-5 flex gap-4 transition-all duration-350 border-white/50 ${
                    unread ? "bg-white/80 border-blue-200/40 shadow-sm" : ""
                  }`}
                >
                  {/* Status Badge Icon */}
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${colorClasses}`}>
                    <Icon className="h-5 w-5 stroke-[2]" />
                  </div>

                  {/* Body text content */}
                  <div className="flex-1 min-w-0 text-left space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`text-xs md:text-sm font-black text-slate-800 ${unread ? "text-blue-900" : ""}`}>
                        {item.title}
                      </h3>
                      <span className="text-[9.5px] font-semibold text-slate-400 shrink-0 mt-0.5">
                        {getRelativeTime(item.created_at)}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                      {item.message}
                    </p>

                    {item.application_id ? (
                      <Link
                        href={`/customer/applications/${item.application_id}`}
                        onClick={() => {
                          if (unread) void markAsRead(item.id);
                        }}
                        className="inline-flex pt-1 text-[11px] font-bold text-blue-600 hover:underline"
                      >
                        Open application
                      </Link>
                    ) : null}

                    {/* Footer Actions */}
                    <div className="flex justify-end items-center gap-3.5 pt-3 border-t border-slate-100/50 mt-3">
                      {unread && (
                        <button
                          onClick={() => markAsRead(item.id)}
                          className="inline-flex items-center gap-1 text-[10px] font-black text-blue-600 hover:text-blue-700 cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5" /> Mark read
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(item.id)}
                        className="inline-flex items-center gap-1 text-[10px] font-black text-slate-400 hover:text-rose-600 transition cursor-pointer"
                        title="Delete notification"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Clear
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Info compliance line */}
        <div className="mt-8 border-t border-slate-200/30 pt-4 flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>Real-time identity protection encrypted alerts</span>
        </div>
      </div>
    </div>
  );
}
