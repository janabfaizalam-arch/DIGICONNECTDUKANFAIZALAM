"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  MessageSquare,
  Search,
  ShieldCheck,
  Tag,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";

import type { InboxConversationSummary } from "@/lib/whatsapp/inbox-ops";

type AssigneeItem = {
  id: string;
  label: string;
  kind: "admin" | "agency_partner";
};

type CustomerData = {
  id: string;
  fullName: string;
  mobile: string;
  email?: string | null;
  city?: string | null;
  address?: string | null;
  notes?: string;
};

export function InboxCustomerDrawer({
  conversation,
  customerData,
  onClose,
  onUpdateStatus,
  onAssign,
  onAddNote,
  onCustomerLinked,
  busy,
}: {
  conversation: InboxConversationSummary & { metadata?: Record<string, unknown> };
  customerData?: CustomerData | null;
  onClose: () => void;
  onUpdateStatus: (status: "open" | "pending" | "resolved" | "archived") => Promise<void>;
  onAssign: (userId: string | null) => Promise<void>;
  onAddNote: (note: string) => Promise<void>;
  onCustomerLinked?: (customer: CustomerData) => void;
  busy: boolean;
}) {
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Staff assignees list
  const [assignees, setAssignees] = useState<AssigneeItem[]>([]);
  const [loadingAssignees, setLoadingAssignees] = useState(false);

  // Customer creation / linking inline state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [nameInput, setNameInput] = useState(conversation.customerName || "");
  const [emailInput, setEmailInput] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [submittingCustomer, setSubmittingCustomer] = useState(false);
  const [customerError, setCustomerError] = useState("");

  // Customer search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CustomerData[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    setNameInput(conversation.customerName || "");
  }, [conversation.customerName]);

  // Load eligible staff assignees
  useEffect(() => {
    let mounted = true;
    async function loadAssignees() {
      setLoadingAssignees(true);
      try {
        const res = await fetch("/api/admin/whatsapp-inbox/assignees", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { ok?: boolean; assignees?: AssigneeItem[] };
          if (mounted && data.assignees) {
            setAssignees(data.assignees);
          }
        }
      } catch {
        /* ignore */
      } finally {
        if (mounted) setLoadingAssignees(false);
      }
    }
    void loadAssignees();
    return () => {
      mounted = false;
    };
  }, []);

  const notesList = (
    Array.isArray(conversation.metadata?.internal_notes)
      ? conversation.metadata.internal_notes
      : []
  ) as Array<{ text: string; created_at: string; author_id?: string | null }>;

  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim() || savingNote) return;
    setSavingNote(true);
    try {
      await onAddNote(noteText.trim());
      setNoteText("");
    } finally {
      setSavingNote(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim() || submittingCustomer) return;
    setSubmittingCustomer(true);
    setCustomerError("");

    try {
      const res = await fetch(`/api/admin/whatsapp-inbox/conversations/${conversation.id}/customer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name: nameInput.trim(),
          mobile: conversation.phoneNumber,
          email: emailInput.trim() || null,
          city: cityInput.trim() || null,
        }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        customer?: CustomerData;
        error?: string;
      };

      if (!res.ok || !data.customer) {
        throw new Error(data.error || "Failed to create customer profile.");
      }

      onCustomerLinked?.(data.customer);
      setShowCreateForm(false);
    } catch (err: unknown) {
      setCustomerError(err instanceof Error ? err.message : "Error creating customer");
    } finally {
      setSubmittingCustomer(false);
    }
  };

  const handleSearchCustomers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;
    setSearching(true);

    try {
      const res = await fetch(`/api/admin/whatsapp-inbox/conversations/${conversation.id}/customer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "search", query: searchQuery.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; customers?: CustomerData[] };
      if (res.ok && data.customers) {
        setSearchResults(data.customers);
      }
    } finally {
      setSearching(false);
    }
  };

  const handleLinkCustomer = async (customerId: string) => {
    setSubmittingCustomer(true);
    setCustomerError("");

    try {
      const res = await fetch(`/api/admin/whatsapp-inbox/conversations/${conversation.id}/customer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "link", customerId }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        customer?: CustomerData;
        error?: string;
      };

      if (!res.ok || !data.customer) {
        throw new Error(data.error || "Failed to link customer profile.");
      }

      onCustomerLinked?.(data.customer);
      setShowSearchModal(false);
    } catch (err: unknown) {
      setCustomerError(err instanceof Error ? err.message : "Error linking customer");
    } finally {
      setSubmittingCustomer(false);
    }
  };

  const hasFlowSubmission = Boolean(conversation.metadata?.latest_flow_submission);
  const crmLeadId = conversation.metadata?.crm_lead_id ? String(conversation.metadata.crm_lead_id) : null;

  return (
    <div className="flex h-full flex-col bg-white border-l border-slate-200">
      {/* Drawer Header */}
      <div className="flex h-14 items-center justify-between border-b border-slate-100 px-4 bg-slate-50/50">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Customer Details</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
          aria-label="Close drawer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {/* Profile Summary Card */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-slate-900 truncate">
              {customerData?.fullName || conversation.customerName || "Customer"}
            </span>
            {customerData?.id ? (
              <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800 shrink-0">
                <CheckCircle2 className="h-3 w-3" /> CRM Linked
              </span>
            ) : (
              <span className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 shrink-0">
                Unlinked Contact
              </span>
            )}
          </div>

          <div className="space-y-1 text-slate-600">
            <p className="font-mono text-slate-800">+91 {conversation.phoneNumber.slice(-10)}</p>
            {customerData?.email && <p className="truncate">{customerData.email}</p>}
            {customerData?.city && <p className="capitalize">{customerData.city}</p>}
          </div>

          {customerData?.id ? (
            <div className="pt-2 border-t border-slate-200/60 flex flex-col gap-1.5">
              <Link
                href={`/admin/customers/${customerData.id}`}
                className="inline-flex items-center gap-1.5 font-bold text-[#1268e8] hover:underline text-[11px]"
              >
                Open full CRM profile <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <div className="pt-2 border-t border-slate-200/60 space-y-2">
              <p className="text-[11px] text-slate-500">
                Connect this WhatsApp contact to the DigiConnect CRM to unify customer history.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm((v) => !v);
                    setShowSearchModal(false);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#1268e8] px-2.5 py-1.5 font-bold text-white hover:bg-blue-700 transition"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>{showCreateForm ? "Close Form" : "Create Profile"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSearchModal((v) => !v);
                    setShowCreateForm(false);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>Link Existing</span>
                </button>
              </div>
            </div>
          )}

          {/* Inline Create Customer Form */}
          {showCreateForm && !customerData?.id && (
            <form onSubmit={handleCreateCustomer} className="mt-3 space-y-2 rounded-lg border border-blue-200 bg-blue-50/40 p-3">
              <p className="font-bold text-slate-900 text-[11px]">New CRM Customer Profile</p>
              {customerError && <p className="text-[11px] text-red-600">{customerError}</p>}
              <div>
                <label className="text-[10px] font-bold text-slate-600 block">Full Name</label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  required
                  placeholder="Customer Name"
                  className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block">Email (optional)</label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block">City (optional)</label>
                <input
                  type="text"
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  placeholder="e.g. Patna, Kolkata"
                  className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="rounded px-2 py-1 text-slate-600 hover:bg-slate-200 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCustomer}
                  className="inline-flex items-center gap-1 rounded bg-[#1268e8] px-3 py-1 font-bold text-white hover:bg-blue-700 text-xs"
                >
                  {submittingCustomer && <Loader2 className="h-3 w-3 animate-spin" />}
                  Save Customer
                </button>
              </div>
            </form>
          )}

          {/* Inline Link Existing Search */}
          {showSearchModal && !customerData?.id && (
            <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
              <p className="font-bold text-slate-900 text-[11px]">Search & Link Existing Customer</p>
              <form onSubmit={handleSearchCustomers} className="flex gap-1.5">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Name, mobile or email..."
                  className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={searching}
                  className="rounded bg-slate-800 px-2.5 py-1 text-white hover:bg-slate-900"
                >
                  {searching ? <Loader2 className="h-3 w-3 animate-spin" /> : "Search"}
                </button>
              </form>

              {searchResults.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-1.5 pt-1">
                  {searchResults.map((cust) => (
                    <div
                      key={cust.id}
                      className="flex items-center justify-between rounded border border-slate-100 bg-slate-50 p-2 hover:bg-slate-100 transition"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-bold text-slate-900 truncate text-[11px]">{cust.fullName}</p>
                        <p className="text-[10px] text-slate-500 font-mono">+91 {cust.mobile.slice(-10)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleLinkCustomer(cust.id)}
                        disabled={submittingCustomer}
                        className="rounded bg-emerald-600 px-2 py-0.5 font-bold text-[10px] text-white hover:bg-emerald-700 shrink-0"
                      >
                        Link
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* WhatsApp Flow & CRM Lead Integration Pill */}
        {(hasFlowSubmission || crmLeadId) && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-[11px]">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>WhatsApp Flow & CRM Lead</span>
            </div>
            <p className="text-slate-600 text-[11px]">
              Flow Enquiry: <span className="font-semibold text-slate-800">DigiConnect Customer Support</span>
            </p>
            {crmLeadId && (
              <Link
                href={`/admin/leads?q=${conversation.phoneNumber}`}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline pt-0.5"
              >
                View Pipeline Lead <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        )}

        {/* Conversation Status */}
        <div className="space-y-1.5">
          <label htmlFor="inbox-status-select" className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-slate-500" /> Conversation Status
          </label>
          <select
            id="inbox-status-select"
            value={conversation.status}
            disabled={busy}
            onChange={(e) => onUpdateStatus(e.target.value as "open" | "pending" | "resolved" | "archived")}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-[#1268e8] focus:outline-none"
          >
            <option value="open">Open (Active)</option>
            <option value="pending">Pending (Awaiting reply)</option>
            <option value="resolved">Resolved (Done)</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Staff Assignment Dropdown */}
        <div className="space-y-1.5">
          <label htmlFor="inbox-assignee-select" className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <UserCheck className="h-3.5 w-3.5 text-slate-500" /> Assigned Staff
            {loadingAssignees && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
          </label>
          <select
            id="inbox-assignee-select"
            value={conversation.assignedTo ?? ""}
            disabled={busy}
            onChange={(e) => onAssign(e.target.value ? e.target.value : null)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-[#1268e8] focus:outline-none"
          >
            <option value="">Unassigned</option>
            <option value="me">Assigned to Me</option>
            {assignees.length > 0 && (
              <optgroup label="Active Staff Members">
                {assignees.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* WhatsApp Consent Scope */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 space-y-1 text-[11px]">
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>WhatsApp Permissions</span>
          </div>
          <p className="text-slate-600">
            Service Scope: <span className="font-semibold text-emerald-700">Allowed</span>
          </p>
          <p className="text-slate-600">
            Marketing Scope: <span className="font-semibold text-slate-700">Standard Opt-In</span>
          </p>
        </div>

        {/* Internal Notes */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-slate-500" /> Internal Notes
            </span>
            <span className="text-[10px] text-slate-400">Team only</span>
          </div>

          {notesList.length > 0 ? (
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {notesList.map((n, i) => (
                <div key={i} className="rounded-lg bg-slate-50 p-2 text-slate-700 border border-slate-100 space-y-0.5">
                  <p className="text-[11.5px] leading-relaxed">{n.text}</p>
                  <p className="text-[9.5px] text-slate-400">
                    {new Date(n.created_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] italic text-slate-400">No internal notes yet.</p>
          )}

          <form onSubmit={handleNoteSubmit} className="space-y-1.5 pt-1">
            <textarea
              rows={2}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add internal note about customer..."
              className="w-full resize-none rounded-lg border border-slate-200 p-2 text-xs text-slate-900 focus:border-[#1268e8] focus:outline-none"
            />
            <button
              type="submit"
              disabled={savingNote || !noteText.trim()}
              className="w-full rounded-lg bg-slate-900 py-1.5 text-center font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition text-xs"
            >
              {savingNote ? "Saving..." : "Add Note"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
