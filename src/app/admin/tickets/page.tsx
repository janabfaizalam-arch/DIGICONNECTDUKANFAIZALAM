"use client";

import { useEffect, useState, useRef } from "react";
import {
  Search,
  Send,
  Clock,
  BookOpen,
} from "lucide-react";
import { AdminPageHeader, AdminEmptyState } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  sender: "agent" | "support";
  senderName: string;
  content: string;
  timestamp: string;
}

interface TicketTimelineEvent {
  id: string;
  title: string;
  timestamp: string;
  type: "info" | "success" | "warning";
}

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: "Open" | "In Progress" | "Closed" | "Resolved";
  priority: "Low" | "Medium" | "High" | "Urgent";
  category: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  timeline: TicketTimelineEvent[];
  agentName?: string;
  agentMobile?: string;
  assignedAdmin?: string;
}

const CANNED_RESPONSES = [
  { label: "Request Documents", text: "Hello! We have reviewed your request, but require additional supporting documents (Aadhaar scan, PAN card, or shop photographs). Please upload them in your dashboard to proceed." },
  { label: "Payment Verification", text: "Hi there! Your payment has been received and verified. The application is now being processed by our administrative desk. You will receive updates here." },
  { label: "Completion Alert", text: "Good news! Your service filing has been successfully completed. You can download the final receipt/document from the 'Documents' page in your partner dashboard." },
  { label: "Under Review Notice", text: "Greetings. Your request is currently under review by our operations team. We are cross-verifying the values with government registry APIs and will update you shortly." },
];

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [replyText, setReplyText] = useState("");
  const [assignedAdmin, setAssignedAdmin] = useState("Admin Control Desk");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load tickets from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("digiticket_tickets");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as SupportTicket[];
        setTickets(parsed);
        if (parsed.length > 0) {
          setSelectedTicketId(parsed[0].id);
        }
      } catch (err) {
        console.error("Failed to load tickets", err);
      }
    }
  }, []);

  // Save tickets back to localStorage whenever they change
  const saveTickets = (updatedTickets: SupportTicket[]) => {
    setTickets(updatedTickets);
    localStorage.setItem("digiticket_tickets", JSON.stringify(updatedTickets));
  };

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || null;

  // Filter tickets
  const filteredTickets = tickets.filter((ticket) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      ticket.id.toLowerCase().includes(query) ||
      ticket.subject.toLowerCase().includes(query) ||
      (ticket.description && ticket.description.toLowerCase().includes(query)) ||
      (ticket.agentName && ticket.agentName.toLowerCase().includes(query));

    const matchesStatus =
      statusFilter === "All" ||
      (statusFilter === "Open" && ["Open", "In Progress"].includes(ticket.status)) ||
      (statusFilter === "Resolved" && ["Closed", "Resolved"].includes(ticket.status));

    return matchesSearch && matchesStatus;
  });

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedTicket?.messages]);

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      sender: "support",
      senderName: assignedAdmin,
      content: replyText.trim(),
      timestamp: new Date().toISOString(),
    };

    const newEvent: TicketTimelineEvent = {
      id: `evt-${Date.now()}`,
      title: `Response sent by ${assignedAdmin}`,
      timestamp: new Date().toISOString(),
      type: "info",
    };

    const updated = tickets.map((t) => {
      if (t.id === selectedTicket.id) {
        return {
          ...t,
          status: "In Progress" as const,
          updatedAt: new Date().toISOString(),
          messages: [...(t.messages || []), newMessage],
          timeline: [...(t.timeline || []), newEvent],
        };
      }
      return t;
    });

    saveTickets(updated);
    setReplyText("");
  };

  const handleStatusChange = (newStatus: SupportTicket["status"]) => {
    if (!selectedTicket) return;

    const newEvent: TicketTimelineEvent = {
      id: `evt-${Date.now()}`,
      title: `Status updated to ${newStatus}`,
      timestamp: new Date().toISOString(),
      type: newStatus === "Resolved" || newStatus === "Closed" ? "success" : "info",
    };

    const updated = tickets.map((t) => {
      if (t.id === selectedTicket.id) {
        return {
          ...t,
          status: newStatus,
          updatedAt: new Date().toISOString(),
          timeline: [...(t.timeline || []), newEvent],
        };
      }
      return t;
    });

    saveTickets(updated);
  };

  const handlePriorityChange = (newPriority: SupportTicket["priority"]) => {
    if (!selectedTicket) return;

    const newEvent: TicketTimelineEvent = {
      id: `evt-${Date.now()}`,
      title: `Priority escalated to ${newPriority}`,
      timestamp: new Date().toISOString(),
      type: newPriority === "Urgent" || newPriority === "High" ? "warning" : "info",
    };

    const updated = tickets.map((t) => {
      if (t.id === selectedTicket.id) {
        return {
          ...t,
          priority: newPriority,
          updatedAt: new Date().toISOString(),
          timeline: [...(t.timeline || []), newEvent],
        };
      }
      return t;
    });

    saveTickets(updated);
  };

  const insertCannedResponse = (text: string) => {
    setReplyText((prev) => (prev ? prev + "\n" + text : text));
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="CRM Operations"
        title="Support Tickets Desk"
        description="Communicate with agency partners in real-time, resolve operational blockages, and check escalation SLA parameters."
      />

      <div className="grid gap-6 lg:grid-cols-[22rem_1fr] h-[calc(100vh-14rem)] min-h-[500px]">
        {/* Left Side: Tickets List */}
        <div className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-xl p-4 flex flex-col justify-between overflow-hidden shadow-xs glass-liquid-premium">
          <div className="space-y-4 min-h-0 flex-1 flex flex-col">
            {/* Search Input */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search ticket ID or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 text-xs rounded-xl"
              />
            </div>

            {/* Filter Tabs */}
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 text-center text-xs font-bold">
              {["All", "Open", "Resolved"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={cn(
                    "py-1.5 rounded-lg transition",
                    statusFilter === tab ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar">
              {filteredTickets.length > 0 ? (
                filteredTickets.map((t) => {
                  const active = t.id === selectedTicketId;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTicketId(t.id)}
                      className={cn(
                        "w-full text-left rounded-xl border p-3.5 transition flex flex-col justify-between hover:bg-slate-50/50 outline-none",
                        active
                          ? "bg-blue-50/70 border-blue-200/80 shadow-xs"
                          : "border-slate-100 bg-white"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-[10px] font-bold text-slate-400">
                          #{t.id.slice(0, 8)}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold",
                            t.priority === "Urgent"
                              ? "bg-rose-50 text-rose-700"
                              : t.priority === "High"
                                ? "bg-orange-50 text-orange-700"
                                : "bg-blue-50 text-blue-700"
                          )}
                        >
                          {t.priority}
                        </span>
                      </div>
                      <p className="font-bold text-slate-900 text-xs mt-1.5 truncate max-w-full">
                        {t.subject}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                        {t.description}
                      </p>
                      <div className="mt-3 flex items-center justify-between border-t border-slate-50 pt-2 text-[10px] text-slate-400">
                        <span className="truncate max-w-[10rem]">
                          By: {t.agentName || "Partner"}
                        </span>
                        <span className="font-mono">
                          {t.status}
                        </span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="pt-8">
                  <AdminEmptyState title="No tickets" description="No tickets match the active filters." />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Conversation Panel */}
        {selectedTicket ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between overflow-hidden shadow-xs glass-liquid-premium">
            {/* Header info */}
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Category: {selectedTicket.category}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                    <Clock className="h-3 w-3" /> Updated {new Date(selectedTicket.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900 font-heading mt-1">
                  {selectedTicket.subject}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Assigned Operator:{" "}
                  <input
                    type="text"
                    value={assignedAdmin}
                    onChange={(e) => setAssignedAdmin(e.target.value)}
                    className="font-bold border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none px-1 text-slate-700 bg-transparent"
                  />
                </p>
              </div>

              {/* Status toggles */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedTicket.status}
                  onChange={(e) => handleStatusChange(e.target.value as SupportTicket["status"])}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 outline-none hover:bg-slate-50 transition"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
                <select
                  value={selectedTicket.priority}
                  onChange={(e) => handlePriorityChange(e.target.value as SupportTicket["priority"])}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 outline-none hover:bg-slate-50 transition"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto my-4 space-y-3 p-3 bg-slate-50/50 rounded-2xl border border-slate-100 no-scrollbar">
              {/* Ticket description card */}
              <div className="bg-blue-50/30 border border-blue-100/50 rounded-xl p-3.5 text-xs">
                <p className="font-bold text-blue-900">Original issue description:</p>
                <p className="text-slate-700 mt-1 leading-relaxed whitespace-pre-wrap">
                  {selectedTicket.description}
                </p>
                <p className="text-[10px] text-slate-400 mt-2 font-mono">
                  Submitted: {new Date(selectedTicket.createdAt).toLocaleString()}
                </p>
              </div>

              {/* Chat messages */}
              {selectedTicket.messages && selectedTicket.messages.map((msg) => {
                const isSupport = msg.sender === "support";
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex w-full flex-col max-w-[85%]",
                      isSupport ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-xs",
                        isSupport
                          ? "bg-slate-900 text-white rounded-br-none"
                          : "bg-white border border-slate-200 text-slate-800 rounded-bl-none"
                      )}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    <span className="text-[9px] text-slate-400 font-semibold mt-1 font-mono px-1">
                      {msg.senderName} · {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Action Bar: Canned templates */}
            <div className="mb-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-2">
                <BookOpen className="h-3.5 w-3.5 text-blue-500" /> Canned Responses
              </p>
              <div className="flex flex-wrap gap-1.5">
                {CANNED_RESPONSES.map((res) => (
                  <button
                    key={res.label}
                    onClick={() => insertCannedResponse(res.text)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-50 transition active:scale-95"
                  >
                    {res.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input form */}
            <form onSubmit={handleSendReply} className="flex gap-2">
              <Textarea
                placeholder="Type reply and press Send..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="resize-none h-11 text-xs rounded-xl pr-10 focus-visible:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendReply(e);
                  }
                }}
              />
              <Button
                type="submit"
                disabled={!replyText.trim()}
                className="h-11 w-11 rounded-xl bg-blue-600 hover:bg-blue-700 flex items-center justify-center p-0 shrink-0 shadow-xs"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 flex items-center justify-center shadow-xs glass-liquid-premium">
            <AdminEmptyState title="No active ticket" description="Select a support ticket from the sidebar to view details and reply." />
          </div>
        )}
      </div>
    </div>
  );
}
