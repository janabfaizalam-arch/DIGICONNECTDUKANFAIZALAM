"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCheck,
  Clock,
  Download,
  FileText,
  Info,
  Send,
  Sparkles,
  User,
} from "lucide-react";

import type { InboxConversationDetail, InboxMessageItem } from "@/lib/whatsapp/inbox-ops";
import { cn } from "@/lib/utils";
import { InboxTemplatePicker } from "./inbox-template-picker";

function formatMessageTime(isoString: string): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateSeparator(isoString: string): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function StatusIndicator({ status }: { status: InboxMessageItem["messageStatus"] }) {
  switch (status) {
    case "read":
      return <span title="Read"><CheckCheck className="h-3.5 w-3.5 text-blue-500 inline-block" /></span>;
    case "delivered":
      return <span title="Delivered"><CheckCheck className="h-3.5 w-3.5 text-slate-400 inline-block" /></span>;
    case "sent":
      return <span title="Sent"><Check className="h-3.5 w-3.5 text-slate-400 inline-block" /></span>;
    case "failed":
      return <span title="Failed"><AlertCircle className="h-3.5 w-3.5 text-red-500 inline-block" /></span>;
    default:
      return <span title="Pending"><Clock className="h-3 w-3 text-slate-400 inline-block" /></span>;
  }
}

export function InboxChatThread({
  conversation,
  messages,
  loading,
  onBackToList,
  onToggleDrawer,
  drawerOpen,
  onSendText,
  onSendTemplate,
  sending,
}: {
  conversation: InboxConversationDetail;
  messages: InboxMessageItem[];
  loading: boolean;
  onBackToList: () => void;
  onToggleDrawer: () => void;
  drawerOpen: boolean;
  onSendText: (body: string) => Promise<void>;
  onSendTemplate: (templateName: string, templateKey: string, params: string[]) => Promise<void>;
  sending: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [textBody, setTextBody] = useState("");
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const serviceWindow = conversation.serviceWindow;
  const isWindowOpen = serviceWindow?.isOpen ?? false;

  const handleSend = async () => {
    if (!textBody.trim() || sending) return;
    setErrorBanner(null);

    if (!isWindowOpen) {
      setErrorBanner("The 24-hour customer service window has expired. Please select an approved template.");
      setTemplatePickerOpen(true);
      return;
    }

    try {
      await onSendText(textBody.trim());
      setTextBody("");
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : "Failed to send message.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col bg-[#efeae2]/30 bg-repeat">
      {/* Top Bar */}
      <div className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-3 py-2 z-10 shadow-2xs">
        <div className="flex items-center gap-2">
          {/* Mobile Back Button */}
          <button
            type="button"
            onClick={onBackToList}
            className="inline-flex lg:hidden items-center justify-center rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 transition"
            aria-label="Back to conversations"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          {/* Contact Details */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1268e8] text-xs font-bold text-white">
              {conversation.customerName
                ? conversation.customerName.slice(0, 2).toUpperCase()
                : <User className="h-4 w-4" />}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold text-slate-900 leading-none">
                  {conversation.customerName || conversation.phoneNumber}
                </h3>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                    conversation.status === "open" && "bg-blue-100 text-blue-800",
                    conversation.status === "pending" && "bg-amber-100 text-amber-800",
                    conversation.status === "resolved" && "bg-emerald-100 text-emerald-800",
                    conversation.status === "archived" && "bg-slate-100 text-slate-600",
                  )}
                >
                  {conversation.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                +91 {conversation.phoneNumber.slice(-10)}
              </p>
            </div>
          </div>
        </div>

        {/* Top Right Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTemplatePickerOpen(true)}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
            title="Send WhatsApp Template"
          >
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <span className="hidden sm:inline">Templates</span>
          </button>

          <button
            type="button"
            onClick={onToggleDrawer}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition",
              drawerOpen
                ? "bg-[#1268e8] text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200/80",
            )}
            title="Customer CRM details"
          >
            <Info className="h-4 w-4" />
            <span className="hidden sm:inline">Details</span>
          </button>
        </div>
      </div>

      {/* Service Window Banner */}
      <div
        className={cn(
          "px-4 py-1.5 text-[11px] flex items-center justify-between border-b transition-colors",
          isWindowOpen
            ? "bg-blue-50/80 border-blue-100 text-blue-900"
            : "bg-amber-50/90 border-amber-200/80 text-amber-900",
        )}
      >
        <div className="flex items-center gap-2">
          <Clock className={cn("h-3.5 w-3.5", isWindowOpen ? "text-blue-600" : "text-amber-600")} />
          {isWindowOpen ? (
            <span>
              24-hour service window active ({serviceWindow?.hoursRemaining}h remaining)
            </span>
          ) : (
            <span>
              24-hour service window expired. Free-form text is locked by Meta. Use an approved template to message.
            </span>
          )}
        </div>
        {!isWindowOpen && (
          <button
            type="button"
            onClick={() => setTemplatePickerOpen(true)}
            className="font-bold underline text-amber-800 hover:text-amber-900"
          >
            Choose Template
          </button>
        )}
      </div>

      {/* Message Stream */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {loading && messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="space-y-2 text-center text-xs text-slate-400">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-[#1268e8]" />
              <p>Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6">
            <div className="rounded-full bg-slate-100 p-3 text-slate-400">
              <Check className="h-6 w-6" />
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-800">No message history yet</p>
            <p className="text-[11px] text-slate-500">Inbound and outbound messages will appear here.</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOutbound = msg.direction === "outbound";
            const prevMsg = messages[index - 1];
            const showDate =
              !prevMsg ||
              formatDateSeparator(msg.timestamp) !== formatDateSeparator(prevMsg.timestamp);

            return (
              <div key={msg.id} className="space-y-2">
                {/* Date separator pill */}
                {showDate && (
                  <div className="flex justify-center my-2">
                    <span className="rounded-full bg-white/90 px-3 py-0.5 text-[10px] font-semibold text-slate-600 shadow-2xs border border-slate-200/60">
                      {formatDateSeparator(msg.timestamp)}
                    </span>
                  </div>
                )}

                {/* Message Bubble Container */}
                <div
                  className={cn(
                    "flex w-full",
                    isOutbound ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "relative max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 text-xs shadow-2xs space-y-1.5",
                      isOutbound
                        ? "bg-[#d9fdd3] text-slate-900 rounded-tr-xs"
                        : "bg-white text-slate-900 border border-slate-200/80 rounded-tl-xs",
                    )}
                  >
                    {/* Media Previews */}
                    {msg.mediaId && msg.messageType === "image" && (
                      <div className="overflow-hidden rounded-lg border border-black/5 bg-black/5">
                        <img
                          src={`/api/admin/whatsapp-inbox/media/${msg.mediaId}`}
                          alt="Customer attachment"
                          className="max-h-64 w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}

                    {msg.mediaId && msg.messageType === "document" && (
                      <a
                        href={`/api/admin/whatsapp-inbox/media/${msg.mediaId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 rounded-lg bg-black/5 p-2 text-xs font-medium text-slate-800 hover:bg-black/10 transition"
                      >
                        <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        <span className="truncate flex-1">
                          {msg.rawMetadata?.filename ? String(msg.rawMetadata.filename) : "Attached Document"}
                        </span>
                        <Download className="h-4 w-4 text-slate-500 flex-shrink-0" />
                      </a>
                    )}

                    {Boolean(msg.mediaId && msg.messageType === "audio") && (
                      <div className="p-1">
                        <audio
                          controls
                          src={`/api/admin/whatsapp-inbox/media/${msg.mediaId}`}
                          className="h-8 w-60 max-w-full"
                        />
                      </div>
                    )}

                    {/* WhatsApp Flow / Interactive reply card */}
                    {Boolean(msg.rawMetadata?.flow_name) && (
                      <div className="rounded-lg bg-blue-50/90 border border-blue-200/80 p-2 space-y-1 text-[11px]">
                        <div className="flex items-center gap-1.5 font-bold text-blue-900">
                          <CheckCheck className="h-3.5 w-3.5 text-blue-600" />
                          <span>{String(msg.rawMetadata?.flow_name)}</span>
                        </div>
                        {Boolean(msg.rawMetadata?.flow_data && typeof msg.rawMetadata.flow_data === "object") && (
                          <div className="mt-1 space-y-0.5 border-t border-blue-100 pt-1 text-slate-700 font-mono text-[10px]">
                            {Object.entries((msg.rawMetadata?.flow_data ?? {}) as Record<string, unknown>).map(
                              ([key, val]) => (
                                <div key={key} className="flex justify-between gap-2">
                                  <span className="text-slate-500 capitalize">{key}:</span>
                                  <span className="font-semibold text-slate-900 truncate">{String(val)}</span>
                                </div>
                              ),
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Text Body */}
                    {msg.messageBody && (
                      <p className="whitespace-pre-wrap break-words leading-relaxed">
                        {msg.messageBody}
                      </p>
                    )}

                    {/* Message Meta (Time & Status Tick) */}
                    <div
                      className={cn(
                        "flex items-center justify-end gap-1 text-[10px] select-none",
                        isOutbound ? "text-slate-500" : "text-slate-400",
                      )}
                    >
                      <span>{formatMessageTime(msg.timestamp)}</span>
                      {isOutbound && <StatusIndicator status={msg.messageStatus} />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Message Composer */}
      <div className="border-t border-slate-200 bg-white p-3 space-y-2">
        {errorBanner && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs text-red-700 flex items-center justify-between">
            <span>{errorBanner}</span>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="font-bold hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Open Template Picker */}
          <button
            type="button"
            onClick={() => setTemplatePickerOpen(true)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition"
            title="Choose Approved WhatsApp Template"
          >
            <Sparkles className="h-5 w-5" />
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={textBody}
            onChange={(e) => setTextBody(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isWindowOpen || sending}
            placeholder={
              isWindowOpen
                ? "Type a reply (Enter to send)..."
                : "24-hour service window closed. Click the sparkle button to send an approved template."
            }
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#1268e8] focus:outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
          />

          {/* Send Button */}
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!textBody.trim() || !isWindowOpen || sending}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#1268e8] text-white shadow-xs hover:bg-[#0b4fb8] transition disabled:opacity-40 disabled:cursor-not-allowed"
            title="Send WhatsApp Reply"
          >
            <Send className={cn("h-4 w-4", sending && "animate-pulse")} />
          </button>
        </div>
      </div>

      {/* Template Picker Dialog */}
      <InboxTemplatePicker
        customerName={conversation.customerName}
        isOpen={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
        onSendTemplate={onSendTemplate}
        sending={sending}
      />
    </div>
  );
}
