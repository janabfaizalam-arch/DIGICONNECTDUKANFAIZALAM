"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CheckCheck,
  LoaderCircle,
  FileText,
  CreditCard,
  FolderOpen,
  HelpCircle,
  Search,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { AdminEmptyState, AdminPageHeader } from "@/components/admin/admin-shell";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AdminNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  related_type: string | null;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
};

function relatedHref(notification: AdminNotification) {
  if (!notification.related_type || !notification.related_id) return "/admin";

  if (notification.related_type === "application") return `/admin/applications/${notification.related_id}`;
  if (notification.related_type === "insurance_quotation") return "/admin/insurance-quotations";
  if (notification.related_type === "payment") return "/admin/payments";
  if (notification.related_type === "document") return `/admin/applications/${notification.related_id}`;

  return "/admin";
}

function categoryIcon(type: string) {
  const t = type.toLowerCase();
  if (t.includes("payment")) return CreditCard;
  if (t.includes("document") || t.includes("upload")) return FolderOpen;
  if (t.includes("application")) return FileText;
  return HelpCircle;
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "payments" | "filings">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadNotifications = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/notifications", { cache: "no-store" });
      const data = (await response.json()) as { notifications?: AdminNotification[]; message?: string };
      if (!response.ok) throw new Error(data.message || "Notifications could not be loaded.");
      setNotifications(data.notifications ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failure to load alert logs.");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id?: string) => {
    try {
      const response = await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { id } : { markAll: true }),
      });
      if (!response.ok) return;

      // Optimistic update
      setNotifications((current) =>
        current.map((n) =>
          !id || n.id === id ? { ...n, is_read: true } : n
        )
      );
    } catch (err) {
      console.error("Failed to mark notifications as read", err);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const filteredNotifications = notifications.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filter === "all" ||
      (filter === "unread" && !n.is_read) ||
      (filter === "payments" && n.type.toLowerCase().includes("payment")) ||
      (filter === "filings" && (n.type.toLowerCase().includes("application") || n.type.toLowerCase().includes("document")));

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader
        eyebrow="System Events"
        title="Admin Notifications Hub"
        description="Monitor system alarms, incoming payments, KYC document filings, and customer leads."
      />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search notification messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs font-semibold text-slate-600 bg-white border border-slate-200/80 rounded-xl py-2.5 pl-9 pr-4 outline-none transition focus:border-blue-500"
          />
        </div>

        {/* Global mark as read */}
        <button
          onClick={() => markAsRead()}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-800 hover:bg-slate-50 transition"
        >
          <CheckCheck className="h-4 w-4 text-blue-600" />
          Mark all read
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
        {([
          { key: "all", label: "All Logs" },
          { key: "unread", label: "Unread Alerts" },
          { key: "payments", label: "Payments" },
          { key: "filings", label: "Filings & Vault" },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-bold transition",
              filter === tab.key
                ? "bg-blue-50 text-blue-700 shadow-xs border border-blue-100"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      <Card className="p-4 md:p-6 glass-liquid-premium">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-sm text-slate-500">
            <LoaderCircle className="h-6 w-6 animate-spin text-blue-600" />
            Syncing notification logs...
          </div>
        ) : error ? (
          <div className="rounded-xl bg-rose-50 border border-rose-100 p-4 text-xs font-semibold text-rose-800 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : filteredNotifications.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {filteredNotifications.map((n) => {
              const Icon = categoryIcon(n.type);
              return (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={cn(
                    "py-4.5 flex items-start gap-4 transition group cursor-pointer first:pt-0 last:pb-0",
                    !n.is_read && "bg-blue-50/20 px-3 -mx-3 rounded-xl border border-blue-50/50"
                  )}
                >
                  <span className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-xs",
                    !n.is_read
                      ? "bg-blue-50 border-blue-100 text-blue-600"
                      : "bg-slate-50 border-slate-100 text-slate-400"
                  )}>
                    <Icon className="h-4 w-4" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={cn("text-xs font-bold text-slate-900", !n.is_read ? "font-semibold" : "font-medium")}>
                        {n.title}
                      </p>
                      {!n.is_read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-2xl">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-1.5">
                      {new Date(n.created_at).toLocaleString("en-IN")}
                    </p>
                  </div>

                  {n.related_type && n.related_id && (
                    <Link
                      href={relatedHref(n)}
                      className="inline-flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 active:scale-95 transition"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <AdminEmptyState title="All caught up" description="No system alarms match the selected filter." />
        )}
      </Card>
    </div>
  );
}
