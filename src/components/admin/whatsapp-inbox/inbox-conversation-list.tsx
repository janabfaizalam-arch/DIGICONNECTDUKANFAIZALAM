"use client";

import { useMemo } from "react";
import {
  FileText,
  Filter,
  Image as ImageIcon,
  Mic,
  RefreshCw,
  Search,
  User,
  Video,
  X,
} from "lucide-react";

import type { InboxConversationSummary, InboxFilter } from "@/lib/whatsapp/inbox-ops";
import { cn } from "@/lib/utils";

const FILTER_TABS: { id: InboxFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "open", label: "Open" },
  { id: "pending", label: "Pending" },
  { id: "resolved", label: "Resolved" },
  { id: "mine", label: "Assigned to me" },
];

function formatTime(timestamp: string): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m`;
  if (diffHours < 24 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffHours < 48) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function previewIcon(text: string) {
  if (text.startsWith("[Image")) return <ImageIcon className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />;
  if (text.startsWith("[Document")) return <FileText className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />;
  if (text.startsWith("[Voice") || text.startsWith("[Audio")) return <Mic className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />;
  if (text.startsWith("[Video")) return <Video className="h-3.5 w-3.5 text-purple-600 flex-shrink-0" />;
  return null;
}

export function InboxConversationList({
  conversations,
  activeId,
  onSelect,
  filter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  totalUnread,
  loading,
  onRefresh,
}: {
  conversations: InboxConversationSummary[];
  activeId: string | null;
  onSelect: (conv: InboxConversationSummary) => void;
  filter: InboxFilter;
  onFilterChange: (f: InboxFilter) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  totalUnread: number;
  loading: boolean;
  onRefresh: () => void;
}) {
  const filteredConversations = useMemo(() => {
    return conversations;
  }, [conversations]);

  return (
    <div className="flex h-full flex-col bg-white border-r border-slate-200">
      {/* Header & Search */}
      <div className="p-3 border-b border-slate-100 space-y-2.5 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold tracking-tight text-slate-900">Chats</h2>
            {totalUnread > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-[#1268e8] px-2 py-0.5 text-xs font-semibold text-white">
                {totalUnread} new
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-500 hover:bg-slate-200/60 hover:text-slate-800 transition disabled:opacity-50"
            title="Refresh conversations"
            aria-label="Refresh conversations"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search name, phone, or text..."
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#1268e8] focus:outline-none focus:ring-1 focus:ring-[#1268e8]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-0.5 no-scrollbar text-xs">
          {FILTER_TABS.map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onFilterChange(tab.id)}
                className={cn(
                  "whitespace-nowrap rounded-md px-2.5 py-1 font-medium transition",
                  active
                    ? "bg-[#1268e8] text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100",
                )}
              >
                {tab.label}
                {tab.id === "unread" && totalUnread > 0 && ` (${totalUnread})`}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {loading && conversations.length === 0 ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-slate-200" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-28 bg-slate-200 rounded" />
                  <div className="h-2.5 w-44 bg-slate-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Filter className="h-5 w-5" />
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-800">No conversations found</p>
            <p className="mt-1 text-[11px] text-slate-500">
              {searchQuery ? "Try a different search query" : "Customer messages will appear here"}
            </p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isSelected = activeId === conv.id;
            const hasUnread = conv.unreadCount > 0;
            const icon = previewIcon(conv.lastMessage);

            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => onSelect(conv)}
                className={cn(
                  "flex w-full items-start gap-3 p-3 text-left transition select-none",
                  isSelected
                    ? "bg-blue-50/80 border-l-4 border-l-[#1268e8]"
                    : "hover:bg-slate-50",
                  hasUnread && !isSelected && "bg-slate-50/60 font-medium",
                )}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    hasUnread
                      ? "bg-[#1268e8] text-white"
                      : "bg-slate-200 text-slate-700",
                  )}
                >
                  {conv.customerName
                    ? conv.customerName.slice(0, 2).toUpperCase()
                    : <User className="h-5 w-5" />}
                </div>

                {/* Info & preview */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={cn(
                        "truncate text-xs text-slate-900",
                        hasUnread ? "font-bold" : "font-semibold",
                      )}
                    >
                      {conv.customerName || conv.phoneNumber}
                    </span>
                    <span className="text-[10px] text-slate-400 flex-shrink-0">
                      {formatTime(conv.lastMessageAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] text-slate-500 font-mono">
                      +91 {conv.phoneNumber.slice(-10)}
                    </span>
                    {conv.status !== "open" && (
                      <span
                        className={cn(
                          "rounded px-1 text-[9px] font-semibold uppercase",
                          conv.status === "resolved" && "bg-emerald-100 text-emerald-800",
                          conv.status === "pending" && "bg-amber-100 text-amber-800",
                          conv.status === "archived" && "bg-slate-100 text-slate-600",
                        )}
                      >
                        {conv.status}
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="flex items-center gap-1 text-[11px] text-slate-600 truncate">
                      {icon}
                      <span className="truncate">{conv.lastMessage || "No messages yet"}</span>
                    </p>
                    {hasUnread && (
                      <span className="flex-shrink-0 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-[#1268e8] text-[10px] font-bold text-white">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
