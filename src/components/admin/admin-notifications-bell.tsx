"use client";

import Link from "next/link";
import { Bell, CheckCheck, LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

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

  if (notification.related_type === "lead") return "/admin/leads";
  if (notification.related_type === "application") return `/admin/applications/${notification.related_id}`;
  if (notification.related_type === "insurance_quotation") return "/admin/insurance-quotations";
  if (notification.related_type === "payment") return "/admin/applications";
  if (notification.related_type === "document") return `/admin/applications/${notification.related_id}`;

  return "/admin";
}

function timeAgo(value: string) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "—";

  const diff = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function AdminNotificationsBell() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = useMemo(() => notifications.filter((notification) => !notification.is_read).length, [notifications]);

  async function loadNotifications() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/notifications", { cache: "no-store" });
      const data = (await response.json()) as { notifications?: AdminNotification[]; message?: string };

      if (!response.ok) throw new Error(data.message || "Notifications could not be loaded.");
      setNotifications(data.notifications ?? []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Notifications could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id?: string) {
    try {
      const response = await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { id } : { markAll: true }),
      });

      if (!response.ok) return;

      setNotifications((current) =>
        current.map((notification) =>
          !id || notification.id === id ? { ...notification, is_read: true } : notification,
        ),
      );
    } catch {
      return;
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Admin notifications"
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
        onClick={() => {
          setOpen((value) => !value);
          if (!open) loadNotifications();
        }}
      >
        <Bell className="h-4 w-4" />
        {unreadCount ? (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-50 w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <p className="font-bold text-slate-950">Notifications</p>
              <p className="text-xs text-slate-500">{unreadCount ? `${unreadCount} unread` : "All caught up"}</p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50"
              onClick={() => markAsRead()}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark read
            </button>
          </div>

          <div className="max-h-[24rem] overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-slate-500">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Loading notifications
              </div>
            ) : error ? (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
            ) : notifications.length ? (
              notifications.slice(0, 10).map((notification) => (
                <Link
                  key={notification.id}
                  href={relatedHref(notification)}
                  onClick={() => {
                    markAsRead(notification.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "block rounded-xl px-3 py-3 transition hover:bg-slate-50",
                    !notification.is_read && "bg-blue-50/70",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-bold text-slate-950">{notification.title}</p>
                    <span className="shrink-0 text-[11px] font-semibold text-slate-400">{timeAgo(notification.created_at)}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{notification.message}</p>
                </Link>
              ))
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="font-bold text-slate-950">No notifications yet</p>
                <p className="mt-1 text-sm text-slate-500">New office activity will appear here.</p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
