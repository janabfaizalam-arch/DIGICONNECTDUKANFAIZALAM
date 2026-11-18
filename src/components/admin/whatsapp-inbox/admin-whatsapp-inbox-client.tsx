"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  BellOff,
  Inbox,
  Volume2,
  VolumeX,
} from "lucide-react";

import { createClient } from "@/lib/supabase/browser";
import type {
  InboxConversationDetail,
  InboxConversationSummary,
  InboxFilter,
  InboxMessageItem,
} from "@/lib/whatsapp/inbox-ops";
import { cn } from "@/lib/utils";
import { InboxConversationList } from "./inbox-conversation-list";
import { InboxChatThread } from "./inbox-chat-thread";
import { InboxCustomerDrawer } from "./inbox-customer-drawer";

import {
  globalInboxDeduplicator,
  isBrowserNotificationSupported,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  playNotificationChime,
  isNotificationSoundMuted,
  setNotificationSoundMuted,
  dispatchBrowserNotification,
} from "@/lib/whatsapp/inbox-notifications";

export function AdminWhatsAppInboxClient({ currentUserId }: { currentUserId: string }) {
  const [conversations, setConversations] = useState<InboxConversationSummary[]>([]);
  const [activeConversation, setActiveConversation] = useState<InboxConversationDetail | null>(null);
  const [messages, setMessages] = useState<InboxMessageItem[]>([]);
  const [activeCustomer, setActiveCustomer] = useState<{
    id: string;
    fullName: string;
    mobile: string;
    email?: string | null;
    city?: string | null;
    address?: string | null;
    notes?: string;
  } | null>(null);

  const [filter, setFilter] = useState<InboxFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [totalUnread, setTotalUnread] = useState(0);

  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [busyAction, setBusyAction] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  const [isMuted, setIsMuted] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");

  const activeIdRef = useRef<string | null>(null);
  activeIdRef.current = activeConversation?.id ?? null;

  // Sound & notification preferences
  useEffect(() => {
    setIsMuted(isNotificationSoundMuted());
    setNotificationPermission(getBrowserNotificationPermission());
  }, []);

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    setNotificationSoundMuted(next);
  };

  const requestNotificationAccess = async () => {
    const perm = await requestBrowserNotificationPermission();
    setNotificationPermission(perm);
  };

  // Fetch Conversations list
  const loadConversations = useCallback(
    async (silent = false) => {
      if (!silent) setLoadingConversations(true);
      try {
        const params = new URLSearchParams({
          filter,
          q: searchQuery,
          pageSize: "50",
        });
        const res = await fetch(`/api/admin/whatsapp-inbox/conversations?${params}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as {
          ok?: boolean;
          conversations?: InboxConversationSummary[];
          totalUnread?: number;
        };

        if (res.ok && data.conversations) {
          setConversations(data.conversations);
          setTotalUnread(data.totalUnread ?? 0);

          // Update active conversation in state if present
          if (activeIdRef.current) {
            const updatedActive = data.conversations.find((c) => c.id === activeIdRef.current);
            if (updatedActive) {
              setActiveConversation((prev) => (prev ? { ...prev, ...updatedActive } : null));
            }
          }
        }
      } catch (err) {
        console.error("[inbox-client] loadConversations error", err);
      } finally {
        if (!silent) setLoadingConversations(false);
      }
    },
    [filter, searchQuery],
  );

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  // Fetch Chat Messages when activeConversation changes
  const loadMessages = useCallback(async (conversationId: string, markRead = true) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(
        `/api/admin/whatsapp-inbox/conversations/${conversationId}/messages?limit=60&markRead=${markRead}`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as {
        ok?: boolean;
        messages?: InboxMessageItem[];
      };
      if (res.ok && data.messages) {
        setMessages(data.messages);
      }

      // Fetch full details and customer linkage
      const detailRes = await fetch(`/api/admin/whatsapp-inbox/conversations/${conversationId}`, {
        cache: "no-store",
      });
      const detailData = (await detailRes.json()) as {
        ok?: boolean;
        conversation?: InboxConversationDetail;
      };
      if (detailRes.ok && detailData.conversation) {
        setActiveConversation(detailData.conversation);
        setActiveCustomer(detailData.conversation.customer ?? null);
      }
    } catch (err) {
      console.error("[inbox-client] loadMessages error", err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const handleCustomerLinked = (customer: {
    id: string;
    fullName: string;
    mobile: string;
    email?: string | null;
    city?: string | null;
    address?: string | null;
  }) => {
    setActiveCustomer(customer);
    setActiveConversation((prev) =>
      prev ? { ...prev, customerId: customer.id, customerName: customer.fullName } : null,
    );
    void loadConversations(true);
  };

  const handleSelectConversation = (conv: InboxConversationSummary) => {
    setActiveConversation({
      ...conv,
      metadata: {},
    });
    void loadMessages(conv.id, true);
  };

  const handleBackToList = () => {
    setActiveConversation(null);
    setDrawerOpen(false);
  };

  // Status and assignment mutations
  const handleUpdateStatus = async (status: "open" | "pending" | "resolved" | "archived") => {
    if (!activeConversation) return;
    setBusyAction(true);
    try {
      const res = await fetch(`/api/admin/whatsapp-inbox/conversations/${activeConversation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setActiveConversation((prev) => (prev ? { ...prev, status } : null));
        void loadConversations(true);
      }
    } finally {
      setBusyAction(false);
    }
  };

  const handleAssign = async (userId: string | null) => {
    if (!activeConversation) return;
    const assignedId = userId === "me" ? currentUserId : userId;
    setBusyAction(true);
    try {
      const res = await fetch(`/api/admin/whatsapp-inbox/conversations/${activeConversation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedTo: assignedId }),
      });
      if (res.ok) {
        setActiveConversation((prev) => (prev ? { ...prev, assignedTo: assignedId } : null));
        void loadConversations(true);
      }
    } finally {
      setBusyAction(false);
    }
  };

  const handleAddNote = async (internalNote: string) => {
    if (!activeConversation) return;
    setBusyAction(true);
    try {
      const res = await fetch(`/api/admin/whatsapp-inbox/conversations/${activeConversation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internalNote }),
      });
      if (res.ok) {
        void loadMessages(activeConversation.id, false);
      }
    } finally {
      setBusyAction(false);
    }
  };

  const handleSendText = async (body: string) => {
    if (!activeConversation) return;
    const requestId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    setSendingMessage(true);
    try {
      const res = await fetch(`/api/admin/whatsapp-inbox/conversations/${activeConversation.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "text", textBody: body, requestId }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Failed to send message.");
      }
      void loadMessages(activeConversation.id, false);
      void loadConversations(true);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSendTemplate = async (templateName: string, templateKey: string, params: string[]) => {
    if (!activeConversation) return;
    const requestId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    setSendingMessage(true);
    try {
      const res = await fetch(`/api/admin/whatsapp-inbox/conversations/${activeConversation.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "template",
          templateName,
          templateKey,
          templateParams: params,
          requestId,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Failed to send template.");
      }
      void loadMessages(activeConversation.id, false);
      void loadConversations(true);
    } finally {
      setSendingMessage(false);
    }
  };

  // Real-time Subscriptions & Polling Fallback
  useEffect(() => {
    const supabase = createClient();

    let channel: ReturnType<NonNullable<typeof supabase>["channel"]> | null = null;
    if (supabase) {
      channel = supabase
        .channel("admin-whatsapp-inbox-live")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "whatsapp_conversations" },
          (payload) => {
            void loadConversations(true);
            if (payload.eventType === "UPDATE" && activeIdRef.current === payload.new?.id) {
              setActiveConversation((prev) => (prev ? { ...prev, ...(payload.new as object) } : null));
            }
          },
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "whatsapp_messages" },
          (payload) => {
            const newMsg = payload.new as Record<string, unknown>;
            if (newMsg && String(newMsg.conversation_id) === activeIdRef.current) {
              // Append to active message thread
              setMessages((prev) => {
                const exists = prev.some((m) => m.id === newMsg.id || (m.metaMessageId && m.metaMessageId === newMsg.meta_message_id));
                if (exists) return prev;
                const formatted: InboxMessageItem = {
                  id: String(newMsg.id),
                  conversationId: String(newMsg.conversation_id),
                  metaMessageId: newMsg.meta_message_id ? String(newMsg.meta_message_id) : null,
                  direction: (newMsg.direction as InboxMessageItem["direction"]) || "inbound",
                  messageType: (newMsg.message_type as InboxMessageItem["messageType"]) || "text",
                  messageBody: String(newMsg.message_body ?? ""),
                  mediaId: newMsg.media_id ? String(newMsg.media_id) : null,
                  mediaMimeType: newMsg.media_mime_type ? String(newMsg.media_mime_type) : null,
                  mediaStoragePath: newMsg.media_storage_path ? String(newMsg.media_storage_path) : null,
                  messageStatus: (newMsg.message_status as InboxMessageItem["messageStatus"]) || "received",
                  errorDetails: newMsg.error_details ? String(newMsg.error_details) : null,
                  senderType: (newMsg.sender_type as InboxMessageItem["senderType"]) || "customer",
                  senderId: newMsg.sender_id ? String(newMsg.sender_id) : null,
                  timestamp: String(newMsg.timestamp ?? newMsg.created_at),
                  rawMetadata: (newMsg.raw_metadata || null) as Record<string, unknown> | null,
                };
                return [...prev, formatted];
              });
            }

            // Audio & Browser notification for inbound message (deduplicated)
            if (newMsg?.direction === "inbound") {
              const msgId = String(newMsg.meta_message_id || newMsg.id || "");
              if (globalInboxDeduplicator.shouldNotify(msgId)) {
                if (!isMuted) {
                  playNotificationChime();
                }
                if (
                  isBrowserNotificationSupported() &&
                  getBrowserNotificationPermission() === "granted" &&
                  document.hidden
                ) {
                  dispatchBrowserNotification({
                    title: "New WhatsApp message",
                    body: String(newMsg.message_body || "New customer message received"),
                    tag: `wa-conv-${newMsg.conversation_id}`,
                    onClick: () => {
                      if (typeof window !== "undefined") {
                        window.focus();
                      }
                    },
                  });
                }
              }
            }

            void loadConversations(true);
          },
        )
        .subscribe();
    }

    // Polling interval fallback every 10 seconds
    const interval = setInterval(() => {
      void loadConversations(true);
      if (activeIdRef.current) {
        void loadMessages(activeIdRef.current, false);
      }
    }, 10_000);

    return () => {
      if (supabase && channel) {
        void supabase.removeChannel(channel);
      }
      clearInterval(interval);
    };
  }, [loadConversations, loadMessages, isMuted]);

  return (
    <div className="space-y-2.5">
      {/* Top Toolbar: Audio Mute & Notification controls */}
      <div className="flex items-center justify-between text-xs text-slate-500 bg-white border border-slate-200/80 rounded-xl px-3.5 py-2 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-700">Live Inbox Feed</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500">
            {conversations.length} conversation{conversations.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isBrowserNotificationSupported() && notificationPermission === "default" && (
            <button
              type="button"
              onClick={requestNotificationAccess}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100 transition"
              title="Enable desktop/browser notifications"
            >
              <Bell className="h-3.5 w-3.5 text-blue-600" />
              <span className="hidden sm:inline">Enable Alerts</span>
            </button>
          )}

          {isBrowserNotificationSupported() && notificationPermission === "granted" && (
            <span
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50"
              title="Browser notifications active"
            >
              <Bell className="h-3 w-3 text-emerald-600" />
              <span className="hidden sm:inline">Alerts Active</span>
            </span>
          )}

          {isBrowserNotificationSupported() && notificationPermission === "denied" && (
            <span
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-400"
              title="Notifications are blocked in browser site permissions"
            >
              <BellOff className="h-3 w-3 text-slate-400" />
              <span className="hidden sm:inline">Alerts Blocked</span>
            </span>
          )}

          <button
            type="button"
            onClick={toggleSound}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 transition",
              isMuted ? "text-slate-400 hover:text-slate-600" : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100",
            )}
            title={isMuted ? "Unmute sound chime" : "Mute sound chime"}
          >
            {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{isMuted ? "Muted" : "Chime On"}</span>
          </button>
        </div>
      </div>

      {/* Main Inbox Responsive Shell */}
      <div className="relative flex h-[calc(100vh-210px)] min-h-[580px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Left Column: Conversation List */}
        <div
          className={cn(
            "h-full w-full lg:w-[380px] flex-shrink-0 transition-all duration-200",
            activeConversation ? "hidden lg:block" : "block",
          )}
        >
          <InboxConversationList
            conversations={conversations}
            activeId={activeConversation?.id ?? null}
            onSelect={handleSelectConversation}
            filter={filter}
            onFilterChange={setFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            totalUnread={totalUnread}
            loading={loadingConversations}
            onRefresh={() => loadConversations(false)}
          />
        </div>

        {/* Center Column: Active Chat Stream */}
        <div
          className={cn(
            "h-full flex-1 flex-col transition-all duration-200",
            activeConversation ? "flex" : "hidden lg:flex",
          )}
        >
          {activeConversation ? (
            <InboxChatThread
              conversation={activeConversation}
              messages={messages}
              loading={loadingMessages}
              onBackToList={handleBackToList}
              onToggleDrawer={() => setDrawerOpen((prev) => !prev)}
              drawerOpen={drawerOpen}
              onSendText={handleSendText}
              onSendTemplate={handleSendTemplate}
              sending={sendingMessage}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center bg-slate-50/40">
              <div className="rounded-2xl bg-white p-4 text-[#1268e8] shadow-xs border border-slate-200/60">
                <Inbox className="h-8 w-8" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-slate-800">Select a conversation</h3>
              <p className="mt-1 max-w-sm text-xs text-slate-500">
                Choose a customer from the left list to review chat history, view customer documents, and reply.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Customer Details Drawer */}
        {activeConversation && drawerOpen && (
          <>
            {/* Mobile backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/30 lg:hidden"
              onClick={() => setDrawerOpen(false)}
            />

            {/* Slide-over panel */}
            <div
              className={cn(
                "fixed inset-y-0 right-0 z-50 w-full sm:w-[360px] lg:static lg:w-[320px] lg:z-auto h-full flex-shrink-0 shadow-lg lg:shadow-none animate-in slide-in-from-right duration-200",
              )}
            >
              <InboxCustomerDrawer
                conversation={activeConversation}
                customerData={activeCustomer}
                onClose={() => setDrawerOpen(false)}
                onUpdateStatus={handleUpdateStatus}
                onAssign={handleAssign}
                onAddNote={handleAddNote}
                onCustomerLinked={handleCustomerLinked}
                busy={busyAction}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
