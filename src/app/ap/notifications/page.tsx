"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  Wallet,
  FileText,
  MessageSquare,
  Sparkles,
  Search,
  ArrowRight,
  Trash2,
  TrendingUp,
  Inbox,
  Check
} from "lucide-react";
import { Card } from "@/components/ui/card";
import Link from "next/link";

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  category: "Applications" | "Wallet & Payouts" | "Support Desk" | "Tier & Compliance";
  type: "info" | "success" | "warning" | "danger";
  createdAt: string;
  isRead: boolean;
  linkUrl?: string;
  actionLabel?: string;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    title: "Application Approved",
    description: "Application #1094 for CM Yuva Scheme has been successfully validated and approved by the department.",
    category: "Applications",
    type: "success",
    createdAt: "2026-06-13T09:30:00.000Z",
    isRead: false,
    linkUrl: "/ap/applications",
    actionLabel: "View Application"
  },
  {
    id: "notif-2",
    title: "Action Required: Re-upload document",
    description: "Application #1085 (GST Registration) has been marked as PENDING. The compliance verifier requested a clear PDF of the PAN card.",
    category: "Applications",
    type: "warning",
    createdAt: "2026-06-13T07:15:00.000Z",
    isRead: false,
    linkUrl: "/ap/applications",
    actionLabel: "Re-upload Now"
  },
  {
    id: "notif-3",
    title: "Weekly Payout Settled",
    description: "Your weekly commission payout of Rs. 13,300 has been settled to your registered HDFC bank account ending in 9081.",
    category: "Wallet & Payouts",
    type: "success",
    createdAt: "2026-06-12T04:30:00.000Z",
    isRead: true,
    linkUrl: "/ap/wallet",
    actionLabel: "Check Wallet Ledger"
  },
  {
    id: "notif-4",
    title: "Support Ticket Reply",
    description: "Support Representative Amit Kumar replied to ticket TKT-2026-9081 regarding KYC delayed checks.",
    category: "Support Desk",
    type: "info",
    createdAt: "2026-06-12T09:20:00.000Z",
    isRead: false,
    linkUrl: "/ap/support",
    actionLabel: "Open Support Desk"
  },
  {
    id: "notif-5",
    title: "Wallet Credit: Commission Earned",
    description: "Rs. 450 commission has been instantly credited to your wallet ledger for Yuva Scheme submission.",
    category: "Wallet & Payouts",
    type: "success",
    createdAt: "2026-06-11T12:00:00.000Z",
    isRead: true,
    linkUrl: "/ap/wallet",
    actionLabel: "View Ledger"
  },
  {
    id: "notif-6",
    title: "Partner Tier Promoted",
    description: "Congratulations! Your monthly transaction volume has crossed the threshold. You are promoted to Gold Partner tier, unlocking 5% higher commission rates.",
    category: "Tier & Compliance",
    type: "info",
    createdAt: "2026-06-10T10:00:00.000Z",
    isRead: true,
    linkUrl: "/ap/profile",
    actionLabel: "View Perks"
  },
  {
    id: "notif-7",
    title: "Razorpay Wallet Recharge Successful",
    description: "Successfully added Rs. 5,000 to your wallet balance. Transaction reference: pay_RZP_78201.",
    category: "Wallet & Payouts",
    type: "success",
    createdAt: "2026-06-10T09:45:00.000Z",
    isRead: true,
    linkUrl: "/ap/wallet",
    actionLabel: "View Balance"
  }
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("digiticket_notifications");
    if (saved) {
      try {
        setNotifications(JSON.parse(saved));
      } catch {
        setNotifications(INITIAL_NOTIFICATIONS);
      }
    } else {
      setNotifications(INITIAL_NOTIFICATIONS);
      localStorage.setItem("digiticket_notifications", JSON.stringify(INITIAL_NOTIFICATIONS));
    }
  }, []);

  // Sync back to localStorage
  const syncNotifications = (updated: NotificationItem[]) => {
    setNotifications(updated);
    localStorage.setItem("digiticket_notifications", JSON.stringify(updated));
  };

  const handleMarkAsRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
    syncNotifications(updated);
  };

  const handleMarkAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, isRead: true }));
    syncNotifications(updated);
  };

  const handleDeleteNotification = (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    syncNotifications(updated);
  };

  const handleDeleteAllRead = () => {
    const updated = notifications.filter(n => !n.isRead);
    syncNotifications(updated);
  };

  // Filter & Search Logic
  const filtered = notifications.filter((notif) => {
    const matchesSearch =
      notif.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notif.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === "All" || notif.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const getIcon = (category: string) => {
    switch (category) {
      case "Wallet & Payouts":
        return <Wallet className="h-5 w-5 text-emerald-400" />;
      case "Support Desk":
        return <MessageSquare className="h-5 w-5 text-indigo-400" />;
      case "Tier & Compliance":
        return <Sparkles className="h-5 w-5 text-amber-400" />;
      default:
        return <FileText className="h-5 w-5 text-blue-400" />;
    }
  };

  const getTypeStyle = (notif: NotificationItem) => {
    if (!notif.isRead) {
      switch (notif.type) {
        case "danger": return "border-red-500/30 bg-red-500/5 shadow-md shadow-red-950/5";
        case "warning": return "border-amber-500/30 bg-amber-500/5 shadow-md shadow-amber-950/5";
        case "success": return "border-emerald-500/30 bg-emerald-500/5 shadow-md shadow-emerald-950/5";
        default: return "border-blue-500/30 bg-blue-500/5 shadow-md shadow-blue-950/5";
      }
    }
    return "border-white/5 bg-slate-900/10 opacity-70";
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        
        {/* Header Rebranding */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 border border-blue-500/20 text-xs font-bold text-blue-400">
              <Bell className="h-3.5 w-3.5" /> Notification Center
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
              DigiPartner Alerts & Updates
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Stay updated with payouts, customer applications processing, security validations and compliance deadlines.
            </p>
          </div>

          {/* Quick operations */}
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-slate-900 border border-white/10 hover:bg-slate-800 px-4 font-bold text-white transition-all text-xs"
              >
                <Check className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
            {notifications.some(n => n.isRead) && (
              <button
                onClick={handleDeleteAllRead}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-slate-950 border border-white/5 hover:bg-slate-900 px-4 font-bold text-slate-400 hover:text-red-400 transition-all text-xs"
                title="Clear all read notifications"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear read
              </button>
            )}
          </div>
        </div>

        {/* Filter controls row */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
          {/* Categories Tab */}
          <div className="sm:col-span-8 flex flex-wrap gap-1">
            {["All", "Applications", "Wallet & Payouts", "Support Desk", "Tier & Compliance"].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  selectedCategory === cat
                    ? "bg-indigo-600/10 border-indigo-500/30 text-indigo-400"
                    : "bg-slate-900/30 border-white/5 text-slate-400 hover:text-slate-300"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="sm:col-span-4 relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 rounded-lg bg-slate-900/40 pl-9 pr-4 text-xs font-semibold text-slate-200 placeholder-slate-500 border border-white/5 focus:border-indigo-500 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Notifications list workspace */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <Card className="border border-dashed border-white/10 bg-slate-900/10 p-12 text-center rounded-3xl">
              <Inbox className="mx-auto h-10 w-10 text-slate-600 animate-pulse" />
              <p className="mt-3 text-base font-bold text-slate-400">All clear!</p>
              <p className="text-xs text-slate-500 mt-1.5">No notifications match your current filter settings.</p>
            </Card>
          ) : (
            filtered.map((item) => (
              <Card
                key={item.id}
                className={`relative border transition-all duration-200 p-4 md:p-5 rounded-2xl flex items-start gap-4 ${getTypeStyle(item)}`}
              >
                {/* Unread Indicator Dot */}
                {!item.isRead && (
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                )}

                {/* Category Icon */}
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 border border-white/5 shadow-inner">
                  {getIcon(item.category)}
                </span>

                {/* Text Context & Actions */}
                <div className="flex-1 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-white text-sm leading-snug">
                        {item.title}
                      </h3>
                      <span className="px-2 py-0.5 rounded-md bg-slate-950/80 border border-white/5 text-[9px] font-bold text-slate-400">
                        {item.category}
                      </span>
                    </div>
                    
                    <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 font-medium leading-relaxed">
                    {item.description}
                  </p>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-3">
                      {item.linkUrl && (
                        <Link
                          href={item.linkUrl}
                          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          {item.actionLabel || "Resolve Now"} <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                      {!item.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(item.id)}
                          className="text-[10px] font-bold text-slate-400 hover:text-white transition-colors"
                        >
                          Mark Read
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteNotification(item.id)}
                      className="text-slate-500 hover:text-red-400 transition-colors"
                      title="Delete notification log record"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Dynamic Tip Banner */}
        <Card className="border border-white/5 bg-gradient-to-r from-blue-950/10 via-slate-900/40 to-slate-950 p-5 rounded-2xl flex gap-3 items-center">
          <TrendingUp className="h-5 w-5 text-indigo-400 shrink-0" />
          <p className="text-xs text-slate-400 leading-relaxed font-semibold">
            <span className="text-white font-extrabold">Partner Tip:</span> Keep your notification settings toggled for immediate WhatsApp alerts under Profile Settings. Never miss payout clearances or document corrections.
          </p>
        </Card>

      </div>
    </main>
  );
}
