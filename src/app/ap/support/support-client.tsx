"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Plus,
  Paperclip,
  Send,
  User,
  Shield,
  AlertCircle,
  X,
  Phone,
  MessageCircle,
  FileText,
  Sparkles,
  Download
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { buildAgentWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

interface Message {
  id: string;
  sender: "agent" | "support";
  senderName: string;
  avatar?: string;
  content: string;
  timestamp: string;
  attachments?: { name: string; size: string }[];
}

interface TimelineEvent {
  id: string;
  title: string;
  timestamp: string;
  type: "info" | "success" | "warning" | "message";
}

interface Ticket {
  id: string;
  subject: string;
  category: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: "Open" | "Working" | "Resolved" | "Closed";
  description: string;
  createdAt: string;
  updatedAt: string;
  assignedTo: string;
  messages: Message[];
  timeline: TimelineEvent[];
}

interface SupportClientProps {
  partnerName: string;
}

const SUPPORT_TOPICS = [
  "KYC Documents & Aadhaar/PAN Validation",
  "Application Status & Document Pending Help",
  "Razorpay Double Payments & Refunds",
  "Wallet Ledger Settlement & Commissions Discrepancy",
  "Partner Tier Promotion Eligibility",
];

const INITIAL_TICKETS: Ticket[] = [
  {
    id: "TKT-2026-9081",
    subject: "KYC Verification Delayed",
    category: "KYC Documents & Aadhaar/PAN Validation",
    priority: "High",
    status: "Working",
    description: "I uploaded my Aadhaar and GST details 2 days ago, but the verification is still pending. My portal shows KYC under review.",
    createdAt: "2026-06-11T10:00:00.000Z",
    updatedAt: "2026-06-12T09:20:00.000Z",
    assignedTo: "Amit Kumar (Compliance)",
    messages: [
      {
        id: "msg-1",
        sender: "agent",
        senderName: "Partner",
        content: "I uploaded my Aadhaar and GST details 2 days ago, but the verification is still pending. Please expedite so I can submit new GST applications for my clients.",
        timestamp: "2026-06-11T10:00:00.000Z"
      },
      {
        id: "msg-2",
        sender: "support",
        senderName: "Amit Kumar",
        content: "Hello! I checked your compliance file. The uploaded GST Certificate copy is slightly blurry at the bottom, and our automated OCR checks couldn't extract the details. Could you please re-upload a clear scanned PDF of your GST Certificate?",
        timestamp: "2026-06-11T14:35:00.000Z"
      },
      {
        id: "msg-3",
        sender: "agent",
        senderName: "Partner",
        content: "Sure, I have uploaded the clear copy of the GST Certificate here. Please verify.",
        timestamp: "2026-06-12T09:15:00.000Z",
        attachments: [{ name: "gst_certificate_clear_june.pdf", size: "2.1 MB" }]
      },
      {
        id: "msg-4",
        sender: "support",
        senderName: "Amit Kumar",
        content: "Thanks for the clear document! I have forwarded this file directly to our senior verifications manager. We will review and attempt validation. Expect an update within 2 hours.",
        timestamp: "2026-06-12T09:20:00.000Z"
      }
    ],
    timeline: [
      { id: "evt-1", title: "Ticket created by agent", timestamp: "2026-06-11T10:00:00.000Z", type: "info" },
      { id: "evt-2", title: "Status set to Open", timestamp: "2026-06-11T10:05:00.000Z", type: "info" },
      { id: "evt-3", title: "Assigned to Amit Kumar (Compliance)", timestamp: "2026-06-11T14:30:00.000Z", type: "info" },
      { id: "evt-4", title: "Support representative requested clarification", timestamp: "2026-06-11T14:35:00.000Z", type: "message" },
      { id: "evt-5", title: "Agent uploaded GST Certificate file", timestamp: "2026-06-12T09:15:00.000Z", type: "success" },
      { id: "evt-6", title: "Status changed to Working", timestamp: "2026-06-12T09:20:00.000Z", type: "warning" }
    ]
  },
  {
    id: "TKT-2026-4032",
    subject: "Razorpay Double Payment - App #1094",
    category: "Razorpay Double Payments & Refunds",
    priority: "Critical",
    status: "Resolved",
    description: "Double deduction occurred while submitting Yuva Scheme Application #1094. Rs. 450 was deducted twice from my wallet/payment gateway.",
    createdAt: "2026-06-12T11:00:00.000Z",
    updatedAt: "2026-06-12T12:45:00.000Z",
    assignedTo: "Neha Sharma (Finance Desk)",
    messages: [
      {
        id: "msg-201",
        sender: "agent",
        senderName: "Partner",
        content: "Double payment occurred for Application #1094. The transaction ID is pay_Pk982kdn. Kindly check the logs and refund Rs. 450 to my wallet balance.",
        timestamp: "2026-06-12T11:00:00.000Z"
      },
      {
        id: "msg-202",
        sender: "support",
        senderName: "Neha Sharma",
        content: "We apologize for the inconvenience. We have verified the gateway logs for transaction ID pay_Pk982kdn. The double deduction was processed due to a transient API timeout. We have successfully initiated a reversal of Rs. 450 back to your wallet ledger.",
        timestamp: "2026-06-12T12:45:00.000Z"
      }
    ],
    timeline: [
      { id: "evt-201", title: "Ticket created by agent", timestamp: "2026-06-12T11:00:00.000Z", type: "info" },
      { id: "evt-202", title: "Assigned to Neha Sharma (Finance Desk)", timestamp: "2026-06-12T11:10:00.000Z", type: "info" },
      { id: "evt-203", title: "Refund verified & processed to wallet", timestamp: "2026-06-12T12:40:00.000Z", type: "success" },
      { id: "evt-204", title: "Status changed to Resolved", timestamp: "2026-06-12T12:45:00.000Z", type: "success" }
    ]
  },
  {
    id: "TKT-2026-1029",
    subject: "Wallet Settlement Discrepancy",
    category: "Wallet Ledger Settlement & Commissions Discrepancy",
    priority: "Medium",
    status: "Open",
    description: "For last month's commission payout, there is a mismatch of Rs. 1,200. The dashboard showed Rs. 14,500 but only Rs. 13,300 was credited.",
    createdAt: "2026-06-13T08:30:00.000Z",
    updatedAt: "2026-06-13T08:30:00.000Z",
    assignedTo: "Unassigned",
    messages: [
      {
        id: "msg-301",
        sender: "agent",
        senderName: "Partner",
        content: "Please check the settlement report for May 2026. The amount transferred is Rs. 13,300, but the total earned was Rs. 14,500. There's a mismatch of Rs. 1,200.",
        timestamp: "2026-06-13T08:30:00.000Z"
      }
    ],
    timeline: [
      { id: "evt-301", title: "Ticket created by agent", timestamp: "2026-06-13T08:30:00.000Z", type: "info" },
      { id: "evt-302", title: "Status set to Open", timestamp: "2026-06-13T08:30:00.000Z", type: "info" }
    ]
  }
];

export function SupportClient({ partnerName }: SupportClientProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [priorityFilter, setPriorityFilter] = useState<string>("All");
  
  // New ticket modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newCategory, setNewCategory] = useState(SUPPORT_TOPICS[0]);
  const [newPriority, setNewPriority] = useState<"Low" | "Medium" | "High" | "Critical">("Medium");
  const [newDescription, setNewDescription] = useState("");
  
  // Chat typing states
  const [replyText, setReplyText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; size: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Load / Save tickets from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("digiticket_tickets");
    if (saved) {
      try {
        setTickets(JSON.parse(saved));
      } catch {
        setTickets(INITIAL_TICKETS);
      }
    } else {
      setTickets(INITIAL_TICKETS);
      localStorage.setItem("digiticket_tickets", JSON.stringify(INITIAL_TICKETS));
    }
  }, []);

  useEffect(() => {
    if (tickets.length > 0) {
      localStorage.setItem("digiticket_tickets", JSON.stringify(tickets));
    }
  }, [tickets]);

  // Set default selected ticket if none is selected
  useEffect(() => {
    if (tickets.length > 0 && !selectedTicketId) {
      setSelectedTicketId(tickets[0].id);
    }
  }, [tickets, selectedTicketId]);

  // Auto scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedTicketId, tickets, isTyping]);

  const selectedTicket = tickets.find(t => t.id === selectedTicketId) || tickets[0] || null;

  // Filter logic
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesStatus = statusFilter === "All" || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === "All" || ticket.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Critical": return "bg-red-50 border-red-200 text-red-750 font-extrabold";
      case "High": return "bg-amber-50 border-amber-200 text-amber-750 font-extrabold";
      case "Medium": return "bg-blue-50 border-blue-200 text-blue-750 font-extrabold";
      default: return "bg-slate-50 border-slate-200 text-slate-600 font-extrabold";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open": return "bg-blue-50 border-blue-200 text-blue-750 font-extrabold";
      case "Working": return "bg-amber-50 border-amber-200 text-amber-750 font-extrabold";
      case "Resolved": return "bg-emerald-50 border-emerald-200 text-emerald-750 font-extrabold";
      case "Closed": return "bg-slate-100 border-slate-200 text-slate-500 font-extrabold";
      default: return "bg-slate-50 border-slate-200 text-slate-500 font-extrabold";
    }
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newDescription.trim()) return;

    const tktId = `TKT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const newTicketObj: Ticket = {
      id: tktId,
      subject: newSubject,
      category: newCategory,
      priority: newPriority,
      status: "Open",
      description: newDescription,
      createdAt: now,
      updatedAt: now,
      assignedTo: "Unassigned (Queue)",
      messages: [
        {
          id: `msg-${Date.now()}-1`,
          sender: "agent",
          senderName: partnerName,
          content: newDescription,
          timestamp: now
        },
        {
          id: `msg-${Date.now()}-2`,
          sender: "support",
          senderName: "System Assistant",
          content: `Hello! Your ticket has been logged in our queue. A DigiConnect support representative will review your topic: "${newCategory}" and update the status within 30-45 minutes.`,
          timestamp: now
        }
      ],
      timeline: [
        { id: `evt-${Date.now()}-1`, title: "Ticket created by partner", timestamp: now, type: "info" },
        { id: `evt-${Date.now()}-2`, title: "Assigned to general support queue", timestamp: now, type: "info" }
      ]
    };

    const updated = [newTicketObj, ...tickets];
    setTickets(updated);
    setSelectedTicketId(tktId);
    
    // Reset form
    setNewSubject("");
    setNewCategory(SUPPORT_TOPICS[0]);
    setNewPriority("Medium");
    setNewDescription("");
    setIsCreateOpen(false);

    // Auto-respond trigger from live agent after 8 seconds
    setTimeout(() => {
      simulateRepresentativeAssignment(tktId);
    }, 8000);
  };

  const simulateRepresentativeAssignment = (tktId: string) => {
    setTickets(prev => prev.map(t => {
      if (t.id !== tktId) return t;
      const now = new Date().toISOString();
      const updatedMessages = [
        ...t.messages,
        {
          id: `msg-sim-${Date.now()}`,
          sender: "support" as const,
          senderName: "Rohan Varma",
          content: "Hi there! I have picked up your ticket and am analyzing your request. Could you please provide your Application/Transaction ID if applicable?",
          timestamp: now
        }
      ];
      const updatedTimeline = [
        ...t.timeline,
        { id: `evt-sim-${Date.now()}-1`, title: "Assigned to Rohan Varma (Support Desk)", timestamp: now, type: "info" as const },
        { id: `evt-sim-${Date.now()}-2`, title: "Status changed to Working", timestamp: now, type: "warning" as const }
      ];

      return {
        ...t,
        status: "Working",
        updatedAt: now,
        assignedTo: "Rohan Varma (Support Desk)",
        messages: updatedMessages,
        timeline: updatedTimeline
      };
    }));
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() && attachedFiles.length === 0) return;
    if (!selectedTicket) return;

    const now = new Date().toISOString();
    const currentReplyText = replyText;
    const currentAttachments = [...attachedFiles];

    // Reset input fields
    setReplyText("");
    setAttachedFiles([]);

    const newMsg: Message = {
      id: `msg-rep-${Date.now()}`,
      sender: "agent",
      senderName: partnerName,
      content: currentReplyText,
      timestamp: now,
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined
    };

    const updatedTimelineEvent: TimelineEvent = {
      id: `evt-rep-${Date.now()}`,
      title: currentAttachments.length > 0 ? "Agent uploaded a file / document" : "Agent posted a reply",
      timestamp: now,
      type: currentAttachments.length > 0 ? "success" : "message"
    };

    // Update tickets locally
    setTickets(prev => prev.map(t => {
      if (t.id !== selectedTicket.id) return t;
      return {
        ...t,
        updatedAt: now,
        messages: [...t.messages, newMsg],
        timeline: [...t.timeline, updatedTimelineEvent]
      };
    }));

    // Trigger support response simulation
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const replyNow = new Date().toISOString();
      const repName = selectedTicket.assignedTo.split(" ")[0] || "Support Representative";
      const supportReplyText = getSimulatedResponse(selectedTicket.category, currentReplyText);

      const supportMsg: Message = {
        id: `msg-sup-${Date.now()}`,
        sender: "support",
        senderName: repName === "Unassigned" ? "Support Executive" : repName,
        content: supportReplyText,
        timestamp: replyNow
      };

      const supportTimelineEvent: TimelineEvent = {
        id: `evt-sup-${Date.now()}`,
        title: `Support desk responded`,
        timestamp: replyNow,
        type: "info"
      };

      setTickets(prev => prev.map(t => {
        if (t.id !== selectedTicket.id) return t;
        return {
          ...t,
          updatedAt: replyNow,
          messages: [...t.messages, supportMsg],
          timeline: [...t.timeline, supportTimelineEvent]
        };
      }));
    }, 2000);
  };

  const getSimulatedResponse = (category: string, userMsg: string): string => {
    const msg = userMsg.toLowerCase();
    if (category.includes("KYC")) {
      if (msg.includes("clear") || msg.includes("upload") || msg.includes("attach")) {
        return "Received! The document quality looks excellent. I have submitted this to our direct verification API. It should be approved automatically within the next 15-30 minutes. Please keep an eye on your partner notifications dashboard.";
      }
      return "Understood. Our manual validation agent is cross-referencing your Aadhaar/PAN record with the UIDAI register. Please allow us another 30-40 minutes to finalize the validation.";
    }
    if (category.includes("Razorpay")) {
      return "Got it. Our billing system logs show that both Rs. 450 charges were recorded, but the department API only acknowledged one payload. The duplicate transaction is flagged for refund. Your wallet ledger balance will be credited with Rs. 450 within 1 hour.";
    }
    if (category.includes("Wallet")) {
      return "I have fetched your monthly commission summary for May 2026. The Rs. 1,200 difference is due to TDS (5%) and GST (18%) deductions applied at settlement. I am attaching the detailed breakdown sheet here for your reference. Let me know if you want the PDF invoice emailed.";
    }
    return "Thank you for the detailed information. I have logged this update in our internal system and escalated it to our tech support supervisors. We will look into it immediately and provide another update shortly.";
  };

  const handleUpdateStatus = (newStatus: "Open" | "Working" | "Resolved" | "Closed") => {
    if (!selectedTicket) return;
    const now = new Date().toISOString();
    
    setTickets(prev => prev.map(t => {
      if (t.id !== selectedTicket.id) return t;
      return {
        ...t,
        status: newStatus,
        updatedAt: now,
        timeline: [
          ...t.timeline,
          { id: `evt-status-${Date.now()}`, title: `Status marked as ${newStatus}`, timestamp: now, type: newStatus === "Resolved" ? "success" : "info" }
        ]
      };
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const mockFiles = files.map(file => ({
      name: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
    }));
    setAttachedFiles(prev => [...prev, ...mockFiles]);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Rebranding */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 border border-blue-500/20 text-xs font-bold text-blue-600">
            <Sparkles className="h-3.5 w-3.5" /> DigiPartner Help Center
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
            Partner Support Console
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Open, track, and manage support tickets for KYC, ledger settlements, and service applications.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-[1.02] active:scale-[0.98] px-5 font-bold text-white transition-all duration-150 text-sm shadow-lg shadow-indigo-500/10"
        >
          <Plus className="h-4 w-4" /> Create Support Ticket
        </button>
      </div>

      {/* Overview stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <Card className="border border-slate-200/50 bg-white/70 p-5 rounded-2xl backdrop-blur-md shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-450">Total Tickets</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{tickets.length}</p>
        </Card>
        <Card className="border border-slate-200/50 bg-white/70 p-5 rounded-2xl backdrop-blur-md shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-450">Open Tickets</p>
          <p className="mt-1 text-3xl font-black text-blue-600">
            {tickets.filter(t => t.status === "Open" || t.status === "Working").length}
          </p>
        </Card>
        <Card className="border border-slate-200/50 bg-white/70 p-5 rounded-2xl backdrop-blur-md shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-450">Resolved</p>
          <p className="mt-1 text-3xl font-black text-emerald-600">
            {tickets.filter(t => t.status === "Resolved").length}
          </p>
        </Card>
        <Card className="border border-slate-200/50 bg-white/70 p-5 rounded-2xl backdrop-blur-md shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-450">Closed</p>
          <p className="mt-1 text-3xl font-black text-slate-500">
            {tickets.filter(t => t.status === "Closed").length}
          </p>
        </Card>
      </div>

      {/* Main Console Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Ticket List Pane */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border border-slate-200/50 bg-white/70 p-4 rounded-2xl backdrop-blur-md space-y-4 shadow-sm">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-10 rounded-xl bg-white pl-10 pr-4 text-xs font-semibold text-slate-800 placeholder-slate-400 border border-slate-200 focus:border-indigo-500 focus:outline-none transition-all shadow-sm"
              />
            </div>

            {/* Filter buttons */}
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Status Filter</p>
                <div className="flex flex-wrap gap-1.5">
                  {["All", "Open", "Working", "Resolved", "Closed"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                        statusFilter === st 
                          ? "bg-indigo-50 border-indigo-200 text-indigo-750 font-bold" 
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Priority Filter</p>
                <div className="flex flex-wrap gap-1.5">
                  {["All", "Low", "Medium", "High", "Critical"].map((pr) => (
                    <button
                      key={pr}
                      onClick={() => setPriorityFilter(pr)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                        priorityFilter === pr
                          ? "bg-indigo-50 border-indigo-200 text-indigo-750 font-bold"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                      }`}
                    >
                      {pr}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Actual ticket list */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filteredTickets.length === 0 ? (
              <Card className="border border-dashed border-slate-250 bg-white/50 p-8 text-center rounded-2xl">
                <AlertCircle className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-2 text-sm font-bold text-slate-800">No tickets found</p>
                <p className="text-xs text-slate-400 mt-1 font-semibold">Try refining your filter queries or open a new support ticket.</p>
              </Card>
            ) : (
              filteredTickets.map(ticket => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all flex flex-col gap-2 ${
                    selectedTicket?.id === ticket.id
                      ? "bg-white border-indigo-400 shadow-md"
                      : "bg-white/50 border-slate-200/50 hover:bg-white hover:border-slate-350"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider font-mono">{ticket.id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-slate-900 text-sm line-clamp-1">{ticket.subject}</h3>
                  <p className="text-xs text-slate-500 line-clamp-1 leading-relaxed font-semibold">{ticket.description}</p>

                  <div className="flex justify-between items-center mt-1 pt-2 border-t border-slate-100">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${getStatusColor(ticket.status)}`}>
                      {ticket.status}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">
                      {new Date(ticket.updatedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Quick Help Channels */}
          <Card className="border border-slate-200/50 bg-white/70 p-5 rounded-2xl backdrop-blur-md space-y-4 shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-900">Need Urgent Help?</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              For immediate service processing halts, billing emergencies, or high-priority inquiries, you can use our direct hotlines.
            </p>
            <div className="flex flex-col gap-2 pt-1">
              <a
                href="tel:7007595931"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-350 font-bold text-slate-800 transition-all text-xs"
              >
                <Phone className="h-3.5 w-3.5" /> Call Support Helpdesk
              </a>
              <a
                href={buildWhatsAppUrl(
                  buildAgentWhatsAppMessage({
                    agentName: partnerName,
                    topic: "KYC validation, wallet balance query, or service configuration help.",
                  })
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white transition-all text-xs"
              >
                <MessageCircle className="h-3.5 w-3.5" /> Chat on WhatsApp
              </a>
            </div>
          </Card>

        </div>

        {/* Selected Ticket Workspace */}
        <div className="lg:col-span-8">
          {selectedTicket ? (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              
              {/* Messages & Chat Console */}
              <div className="xl:col-span-8 flex flex-col gap-4">
                <Card className="border border-slate-200/50 bg-white/70 rounded-2xl backdrop-blur-md flex flex-col min-h-[500px] max-h-[650px] overflow-hidden shadow-sm">
                  
                  {/* Chat Header */}
                  <div className="p-4 border-b border-slate-150 bg-white/70 flex justify-between items-center gap-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 tracking-wider font-mono">{selectedTicket.id}</span>
                      <h2 className="font-extrabold text-slate-900 text-base line-clamp-1 leading-snug">{selectedTicket.subject}</h2>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${getStatusColor(selectedTicket.status)}`}>
                        {selectedTicket.status}
                      </span>
                    </div>
                  </div>

                  {/* Messages list */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Initial Description */}
                    <div className="bg-white/55 p-4 rounded-2xl border border-slate-200/50 space-y-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ticket Description & Context</p>
                      <p className="text-sm font-semibold text-slate-700 leading-relaxed">{selectedTicket.description}</p>
                      <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 pt-1 font-bold">
                        <span>Category: {selectedTicket.category}</span>
                        <span>•</span>
                        <span>Opened: {new Date(selectedTicket.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Chat log */}
                    <div className="space-y-4">
                      {selectedTicket.messages.map((msg) => {
                        const isAgent = msg.sender === "agent";
                        return (
                          <div key={msg.id} className={`flex gap-3 max-w-[85%] ${isAgent ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
                            {/* Avatar */}
                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold border ${
                              isAgent 
                                ? "bg-indigo-50 text-indigo-600 border-indigo-200" 
                                : "bg-blue-50 text-blue-600 border-blue-200"
                            }`}>
                              {isAgent ? <User className="h-4.5 w-4.5" /> : <Shield className="h-4.5 w-4.5" />}
                            </span>

                            {/* Text Bubble */}
                            <div className="space-y-1">
                              <div className={`rounded-2xl p-3 text-xs font-semibold leading-relaxed border ${
                                isAgent 
                                  ? "bg-indigo-50/70 border-indigo-200/60 text-slate-800 shadow-sm" 
                                  : "bg-white border-slate-200 text-slate-800 shadow-sm"
                              }`}>
                                <p className="text-[10px] font-bold text-slate-400 mb-1">{msg.senderName}</p>
                                <p className="whitespace-pre-wrap">{msg.content}</p>

                                {/* Message Attachments */}
                                {msg.attachments && msg.attachments.length > 0 && (
                                  <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-1">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Attached Proofs</p>
                                    {msg.attachments.map((file, idx) => (
                                      <div key={idx} className="inline-flex items-center gap-2 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-200 text-[10px]">
                                        <FileText className="h-3 w-3 text-blue-500" />
                                        <span className="text-slate-700 truncate max-w-[130px] font-mono">{file.name}</span>
                                        <span className="text-slate-400 font-mono">({file.size})</span>
                                        <button className="text-slate-500 hover:text-slate-850 ml-1">
                                          <Download className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <p className={`text-[9px] text-slate-400 font-bold px-1 ${isAgent ? "text-right" : "text-left"}`}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          </div>
                        );
                      })}

                      {/* Simulated typing indicator */}
                      {isTyping && (
                        <div className="flex gap-3 max-w-[80%] mr-auto items-center">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                            <Shield className="h-4.5 w-4.5" />
                          </span>
                          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex gap-1 shadow-sm">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }}></span>
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }}></span>
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }}></span>
                          </div>
                        </div>
                      )}

                      <div ref={chatBottomRef} />
                    </div>
                  </div>

                  {/* Chat reply panel */}
                  <form onSubmit={handleSendReply} className="p-3 border-t border-slate-150 bg-white/75 space-y-2">
                    
                    {/* List of files pending upload */}
                    {attachedFiles.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-250">
                        {attachedFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg text-[10px] font-bold text-slate-600 border border-slate-100">
                            <FileText className="h-3 w-3 text-blue-550" />
                            <span className="truncate max-w-[150px]">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                              className="text-slate-400 hover:text-red-500"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        multiple
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-all shadow-sm"
                        title="Attach Documents / Proofs"
                      >
                        <Paperclip className="h-4.5 w-4.5" />
                      </button>

                      <input
                        type="text"
                        placeholder={selectedTicket.status === "Closed" ? "This ticket is closed. Reopen to chat..." : "Write your support reply..."}
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        disabled={selectedTicket.status === "Closed"}
                        className="flex-1 h-10 rounded-xl bg-slate-950 pl-4 pr-4 text-xs font-semibold text-slate-200 placeholder-slate-500 border border-white/5 focus:border-indigo-500 focus:outline-none transition-all disabled:opacity-40"
                      />

                      <button
                        type="submit"
                        disabled={selectedTicket.status === "Closed" || (!replyText.trim() && attachedFiles.length === 0)}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md transition-all disabled:opacity-40"
                      >
                        <Send className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  </form>

                </Card>
              </div>

              {/* Ticket Sidebar Metadata & Timeline */}
              <div className="xl:col-span-4 space-y-4">
                
                {/* Details card */}
                <Card className="border border-slate-200/50 bg-white/70 p-4 rounded-2xl backdrop-blur-md space-y-4 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">Ticket Info</h3>
                  
                  <div className="space-y-3 text-xs font-semibold">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Assignee</p>
                      <p className="text-slate-850 mt-0.5 font-bold">{selectedTicket.assignedTo}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Category</p>
                      <p className="text-slate-850 mt-0.5 leading-normal font-bold">{selectedTicket.category}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Priority</p>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold border mt-1 ${getPriorityColor(selectedTicket.priority)}`}>
                        {selectedTicket.priority}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Created</p>
                      <p className="text-slate-600 mt-0.5 font-bold">
                        {new Date(selectedTicket.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Actions / Change Status manually */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Ticket Control</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {selectedTicket.status !== "Closed" ? (
                        <>
                          {selectedTicket.status !== "Resolved" && (
                            <button
                              onClick={() => handleUpdateStatus("Resolved")}
                              className="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-[10px] font-bold text-emerald-700 transition-all text-center"
                            >
                              Mark Resolved
                            </button>
                          )}
                          <button
                            onClick={() => handleUpdateStatus("Closed")}
                            className="px-2 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 transition-all text-center"
                          >
                            Close Ticket
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus("Open")}
                          className="col-span-2 px-2 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-[10px] font-bold text-blue-700 transition-all text-center"
                        >
                          Reopen Ticket
                        </button>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Audit Timeline */}
                <Card className="border border-slate-200/50 bg-white/70 p-4 rounded-2xl backdrop-blur-md space-y-4 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">Ticket Timeline</h3>
                  
                  <div className="relative pl-4 border-l border-slate-200 space-y-4">
                    {selectedTicket.timeline.slice().reverse().map((event) => (
                      <div key={event.id} className="relative group">
                        {/* Timeline point indicator */}
                        <span className={`absolute -left-[20.5px] top-1 h-2 w-2 rounded-full border ${
                          event.type === "success" 
                            ? "bg-emerald-500 border-emerald-500" 
                            : event.type === "warning" 
                            ? "bg-amber-500 border-amber-500" 
                            : "bg-blue-500 border-blue-500"
                        }`} />
                        
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-slate-800 leading-normal">{event.title}</p>
                          <p className="text-[9px] font-bold text-slate-400 font-mono">
                            {new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

              </div>

            </div>
          ) : (
            <Card className="border border-slate-200/50 bg-white/50 p-12 text-center rounded-2xl">
              <p className="text-slate-500 font-bold">Select a support ticket to start auditing diagnostics.</p>
            </Card>
          )}
        </div>

      </div>

      {/* Slide-over Drawer / Modal for ticket generation */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 md:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 border border-blue-200 text-[10px] font-bold text-blue-700">
                Compliance & Billing Desk
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 mt-1.5">Open Support Ticket</h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Fill details below. Our ticket engine automatically parses and routes inquiries.
              </p>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="Summarize the issue (e.g. Wallet recharge failed)"
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  className="w-full h-11 rounded-xl bg-white px-4 text-xs font-semibold text-slate-805 border border-slate-200 focus:border-indigo-650 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Topic Category</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="w-full h-11 rounded-xl bg-white px-3 text-xs font-semibold text-slate-805 border border-slate-200 focus:border-indigo-650 focus:outline-none"
                  >
                    {SUPPORT_TOPICS.map((topic) => (
                      <option key={topic} value={topic}>{topic}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Severity Priority</label>
                  <select
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value as ("Low" | "Medium" | "High" | "Critical"))}
                    className="w-full h-11 rounded-xl bg-white px-3 text-xs font-semibold text-slate-850 border border-slate-200 focus:border-indigo-650 focus:outline-none"
                  >
                    <option value="Low">Low (General Query)</option>
                    <option value="Medium">Medium (General Support)</option>
                    <option value="High">High (KYC & Escalations)</option>
                    <option value="Critical">Critical (Double Payments/Locks)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Detailed Description</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide transaction IDs, customer names, application categories, and detailed timelines of the issue."
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  className="w-full rounded-xl bg-white p-4 text-xs font-semibold text-slate-805 border border-slate-200 focus:border-indigo-650 focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1 h-11 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-[1.01] active:scale-[0.99] text-xs font-bold text-white transition-all shadow-md shadow-blue-500/10"
                >
                  Open Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
