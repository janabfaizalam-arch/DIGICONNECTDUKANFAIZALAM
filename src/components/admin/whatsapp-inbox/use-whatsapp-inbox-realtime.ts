"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import {
  globalInboxDeduplicator,
  isBrowserNotificationSupported,
  getBrowserNotificationPermission,
  playNotificationChime,
  isNotificationSoundMuted,
  dispatchBrowserNotification,
} from "@/lib/whatsapp/inbox-notifications";

export function useWhatsAppInboxRealtime() {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const pathname = usePathname();
  const activePathRef = useRef(pathname);
  activePathRef.current = pathname;

  const refreshUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/whatsapp-inbox/unread-count", {
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as {
          ok?: boolean;
          unreadConversations?: number;
          totalUnreadMessages?: number;
        };
        if (data.ok && typeof data.unreadConversations === "number") {
          setUnreadCount(data.unreadConversations);
        }
      }
    } catch {
      /* ignore network errors */
    }
  }, []);

  useEffect(() => {
    void refreshUnreadCount();
  }, [refreshUnreadCount]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel("admin-whatsapp-inbox-global")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_conversations" },
        () => {
          void refreshUnreadCount();
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "whatsapp_messages" },
        (payload) => {
          const newMsg = payload.new as Record<string, unknown> | null;
          if (!newMsg) return;

          void refreshUnreadCount();

          if (newMsg.direction === "inbound") {
            const messageId = String(newMsg.meta_message_id || newMsg.id || "");
            if (globalInboxDeduplicator.shouldNotify(messageId)) {
              if (!isNotificationSoundMuted()) {
                playNotificationChime();
              }

              const isInboxPage = activePathRef.current === "/admin/whatsapp-inbox";
              const isDocumentHidden = typeof document !== "undefined" && document.hidden;

              if (
                (!isInboxPage || isDocumentHidden) &&
                isBrowserNotificationSupported() &&
                getBrowserNotificationPermission() === "granted"
              ) {
                dispatchBrowserNotification({
                  title: "New WhatsApp message",
                  body: String(newMsg.message_body || "New customer message received"),
                  tag: `wa-conv-${newMsg.conversation_id}`,
                  onClick: () => {
                    if (typeof window !== "undefined") {
                      window.location.href = "/admin/whatsapp-inbox";
                    }
                  },
                });
              }
            }
          }
        },
      )
      .subscribe();

    // Periodic poll every 40s to keep badge synchronized when active
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        void refreshUnreadCount();
      }
    }, 40_000);

    return () => {
      void supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, [refreshUnreadCount]);

  return { unreadCount, refreshUnreadCount };
}
