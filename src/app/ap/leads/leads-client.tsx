"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, UserCheck, Phone, MapPin, Edit, ArrowRight, UserPlus, Inbox, X, CheckCircle2, Layers } from "lucide-react";

import { Card } from "@/components/ui/card";
import { useToast } from "@/components/providers/toast-provider";
import type { Lead, LeadStatus } from "@/lib/portal-types";
import type { AgentService } from "@/lib/agent-services";

interface PartnerLeadsClientProps {
  initialLeads: Lead[];
  services: AgentService[];
}

const UI_TO_DB_STATUS: Record<string, LeadStatus> = {
  "New": "new",
  "Contacted": "contacted",
  "Interested": "in_progress",
  "Documents Received": "documents_under_review",
  "Converted": "converted",
  "Lost": "cancelled"
};

const DB_TO_UI_STATUS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  in_progress: "Interested",
  documents_under_review: "Documents Received",
  converted: "Converted",
  cancelled: "Lost",
  closed: "Lost",
  completed: "Converted"
};

export function PartnerLeadsClient({ initialLeads, services }: PartnerLeadsClientProps) {
  const { success, error: toastError } = useToast();
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [search, setSearch] = useState("");
  const [selectedStage, setSelectedStage] = useState("All");

  // Modal control
  const [addOpen, setAddOpen] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);

  // Form states for new lead
  const [newName, setNewName] = useState("");
  const [newMobile, setNewMobile] = useState("");
  const [newService, setNewService] = useState(services[0]?.title ?? "");
  const [newCity, setNewCity] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  // Form states for edit lead
  const [editStage, setEditStage] = useState<string>("New");
  const [editNotes, setEditNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Stats
  const totalCount = leads.length;
  const newCount = leads.filter((l) => l.status === "new").length;
  const contactedCount = leads.filter((l) => l.status === "contacted").length;
  const interestedCount = leads.filter((l) => l.status === "in_progress").length;
  const convertedCount = leads.filter((l) => l.status === "converted" || l.status === "completed").length;
  const lostCount = leads.filter((l) => l.status === "cancelled" || l.status === "closed").length;

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newMobile || !newService) {
      toastError("Please fill in Name, Mobile, and Service.");
      return;
    }
    setIsSubmittingNew(true);
    try {
      const res = await fetch("/api/ap/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          mobile: newMobile,
          service: newService,
          city: newCity,
          message: newMessage,
          notes: newNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add lead.");
      
      setLeads([data.lead, ...leads]);
      success("Lead added successfully.");
      setAddOpen(false);
      // Reset form
      setNewName("");
      setNewMobile("");
      setNewCity("");
      setNewMessage("");
      setNewNotes("");
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to submit lead.";
      toastError(errMsg);
    } finally {
      setIsSubmittingNew(false);
    }
  };

  const openEditModal = (lead: Lead) => {
    setEditLead(lead);
    setEditStage(DB_TO_UI_STATUS[lead.status] || "New");
    setEditNotes(lead.notes || "");
  };

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLead) return;
    setIsUpdating(true);
    try {
      const dbStatus = UI_TO_DB_STATUS[editStage] || "new";
      const res = await fetch("/api/ap/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editLead.id,
          status: dbStatus,
          notes: editNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update lead.");

      setLeads(leads.map((l) => (l.id === editLead.id ? data.lead : l)));
      success("Lead updated successfully.");
      setEditLead(null);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to update lead.";
      toastError(errMsg);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConvertLead = async (lead: Lead) => {
    try {
      // Mark as converted in backend
      await fetch("/api/ap/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: lead.id,
          status: "converted",
        }),
      });
      // Update local state
      setLeads(leads.map((l) => (l.id === lead.id ? { ...l, status: "converted" } : l)));
    } catch (err) {
      console.warn("Conversion state update failed", err);
    }
  };

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = l.name.toLowerCase().includes(q);
        const matchesMobile = l.mobile.includes(q);
        const matchesService = l.service.toLowerCase().includes(q);
        const matchesCity = (l.city || "").toLowerCase().includes(q);
        if (!matchesName && !matchesMobile && !matchesService && !matchesCity) return false;
      }

      // Stage filter
      if (selectedStage !== "All") {
        const uiStage = DB_TO_UI_STATUS[l.status] || "New";
        if (uiStage !== selectedStage) return false;
      }

      return true;
    });
  }, [leads, search, selectedStage]);

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 border border-blue-500/20 text-xs font-bold text-blue-400">
            <Inbox className="h-3.5 w-3.5" />
            CRM Lead Engine
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white md:text-5xl">
            Lead Management
          </h1>
          <p className="mt-2 text-slate-400 max-w-2xl text-sm">
            Track customer enquiries, log communications notes, schedule follow-ups, and convert verified leads to POS applications.
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-6 font-bold text-white shadow-lg shadow-blue-500/25 hover:from-blue-600 hover:to-indigo-600 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
        >
          <UserPlus className="h-4.5 w-4.5" />
          Add New Lead
        </button>
      </div>

      {/* Leads Stats Overview */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-6">
        {[
          { label: "Total Leads", val: totalCount, border: "border-white/5 bg-slate-900/10 text-slate-400" },
          { label: "New", val: newCount, border: "border-blue-500/20 bg-blue-500/5 text-blue-400" },
          { label: "Contacted", val: contactedCount, border: "border-amber-500/20 bg-amber-500/5 text-amber-400" },
          { label: "Interested", val: interestedCount, border: "border-indigo-500/20 bg-indigo-500/5 text-indigo-400" },
          { label: "Converted", val: convertedCount, border: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400" },
          { label: "Lost", val: lostCount, border: "border-rose-500/20 bg-rose-500/5 text-rose-400" },
        ].map((item) => (
          <Card key={item.label} className={`border p-3.5 rounded-xl text-center backdrop-blur-md ${item.border}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{item.label}</p>
            <p className="text-xl font-black mt-0.5">{item.val}</p>
          </Card>
        ))}
      </div>

      {/* Search & Filter Pills */}
      <div className="grid gap-4 md:grid-cols-4 items-center">
        <div className="relative md:col-span-3">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads by customer name, mobile, service category or city..."
            className="w-full rounded-xl border border-white/5 bg-slate-900/40 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          />
        </div>

        <div className="flex justify-end gap-1.5 overflow-x-auto">
          {["All", "New", "Contacted", "Interested", "Converted", "Lost"].map((stage) => (
            <button
              key={stage}
              onClick={() => setSelectedStage(stage)}
              className={`h-9 px-3.5 shrink-0 rounded-xl text-xs font-bold transition-all border ${
                selectedStage === stage
                  ? "bg-slate-800 text-white border-white/20 shadow-sm"
                  : "bg-slate-900/20 text-slate-500 border-white/5 hover:text-white"
              }`}
            >
              {stage}
            </button>
          ))}
        </div>
      </div>

      {/* Leads Grid list */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredLeads.length ? (
          filteredLeads.map((lead) => {
            const uiStage = DB_TO_UI_STATUS[lead.status] || "New";
            const stageColors: Record<string, string> = {
              "New": "bg-blue-500/10 border-blue-500/20 text-blue-400",
              "Contacted": "bg-amber-500/10 border-amber-500/20 text-amber-400",
              "Interested": "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
              "Documents Received": "bg-purple-500/10 border-purple-500/20 text-purple-400",
              "Converted": "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
              "Lost": "bg-rose-500/10 border-rose-500/20 text-rose-400",
            };

            const matchingService = services.find((s) => s.title.toLowerCase().includes(lead.service.toLowerCase()) || lead.service.toLowerCase().includes(s.slug.toLowerCase()));

            return (
              <Card
                key={lead.id}
                className="relative overflow-hidden border border-white/5 bg-slate-900/20 p-5 rounded-2xl backdrop-blur-md flex flex-col justify-between hover:border-white/10 hover:bg-slate-900/30 transition-all duration-150 group"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-extrabold text-white text-base group-hover:text-blue-400 transition-colors">
                        {lead.name}
                      </h4>
                      <span className="text-[10px] font-semibold text-slate-500 font-mono">
                        Lead ID: {lead.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>

                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${stageColors[uiStage] || "bg-slate-500/10 border-slate-550/20 text-slate-400"}`}>
                      {uiStage}
                    </span>
                  </div>

                  <div className="space-y-1.5 font-mono text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-650" />
                      <span>{lead.mobile}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Layers className="h-3.5 w-3.5 text-slate-650" />
                      <span className="text-slate-300 font-semibold">{lead.service}</span>
                    </div>
                    {lead.city && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-slate-650" />
                        <span>{lead.city}</span>
                      </div>
                    )}
                  </div>

                  {lead.notes && (
                    <div className="rounded-xl bg-slate-950/70 p-3 border border-white/5 text-xs text-slate-450 leading-relaxed italic">
                      <p className="font-bold text-slate-400 font-sans not-italic text-[10px] uppercase mb-0.5">Latest Update Notes</p>
                      {lead.notes}
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3.5 border-t border-white/5 flex items-center justify-between">
                  <button
                    onClick={() => openEditModal(lead)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 px-3 text-xs font-bold text-slate-300 border border-white/5 transition"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Update
                  </button>

                  {lead.status !== "converted" && lead.status !== "completed" && (
                    <Link
                      href={`/ap/applications/new?name=${encodeURIComponent(lead.name)}&mobile=${encodeURIComponent(lead.mobile)}&serviceId=${matchingService?.id ?? ""}`}
                      onClick={() => handleConvertLead(lead)}
                      className="inline-flex h-8 items-center gap-1 rounded-lg bg-blue-500/10 hover:bg-blue-500 hover:text-white px-3 text-xs font-bold text-blue-400 border border-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      <span>Convert</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full rounded-2xl border border-dashed border-white/10 p-12 text-center">
            <Inbox className="mx-auto h-12 w-12 text-slate-600" />
            <h3 className="mt-4 text-lg font-semibold text-slate-300">No leads found</h3>
            <p className="mt-2 text-sm text-slate-500">
              Register website/social leads or use manual creation to initiate follow-up workflows.
            </p>
          </div>
        )}
      </div>

      {/* Add Lead Modal Overlay */}
      {addOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg border border-white/10 bg-slate-900 p-6 rounded-3xl shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setAddOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            
            <h3 className="text-xl font-black text-white flex items-center gap-2 mb-4">
              <UserPlus className="h-5 w-5 text-blue-400" />
              Register New Lead
            </h3>

            <form onSubmit={handleAddLead} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400">Lead Name *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Enter name"
                    className="w-full rounded-xl border border-white/5 bg-slate-950 py-2.5 px-4 text-sm text-white focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400">Mobile Number *</label>
                  <input
                    type="text"
                    required
                    value={newMobile}
                    onChange={(e) => setNewMobile(e.target.value)}
                    placeholder="Enter 10-digit number"
                    className="w-full rounded-xl border border-white/5 bg-slate-950 py-2.5 px-4 text-sm text-white focus:outline-none focus:border-blue-500/50"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400">Target Service *</label>
                  <select
                    value={newService}
                    onChange={(e) => setNewService(e.target.value)}
                    className="w-full rounded-xl border border-white/5 bg-slate-950 py-2.5 px-4 text-sm text-white focus:outline-none focus:border-blue-500/50 appearance-none"
                  >
                    {services.map((srv) => (
                      <option key={srv.id} value={srv.title} className="bg-slate-900">
                        {srv.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400">City / Town</label>
                  <input
                    type="text"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    placeholder="e.g. Kanpur"
                    className="w-full rounded-xl border border-white/5 bg-slate-950 py-2.5 px-4 text-sm text-white focus:outline-none focus:border-blue-500/50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">Requirement details</label>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Enquiry requirements details, business type, references..."
                  className="w-full rounded-xl border border-white/5 bg-slate-950 py-2 px-4 text-sm text-white focus:outline-none focus:border-blue-500/50 min-h-16"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">Initial follow-up status update note</label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Spoke over call, requested PAN copy."
                  className="w-full rounded-xl border border-white/5 bg-slate-950 py-2 px-4 text-sm text-white focus:outline-none focus:border-blue-500/50 min-h-16"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingNew}
                className="w-full h-11 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-indigo-600 shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2"
              >
                {isSubmittingNew ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Saving...
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4" />
                    Save Lead
                  </>
                )}
              </button>
            </form>
          </Card>
        </div>
      )}

      {/* Edit Lead Modal Overlay */}
      {editLead && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md border border-white/10 bg-slate-900 p-6 rounded-3xl shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setEditLead(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            
            <h3 className="text-lg font-black text-white flex items-center gap-2 mb-4">
              <Edit className="h-5 w-5 text-indigo-400" />
              Update Lead Status
            </h3>

            <div className="space-y-4">
              <div className="rounded-xl bg-slate-950 p-4 border border-white/5 text-xs space-y-1 leading-relaxed">
                <p className="font-extrabold text-white">{editLead.name}</p>
                <p className="text-slate-500 font-mono">{editLead.mobile} • {editLead.service}</p>
              </div>

              <form onSubmit={handleUpdateLead} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400">Lead Stage</label>
                  <select
                    value={editStage}
                    onChange={(e) => setEditStage(e.target.value)}
                    className="w-full rounded-xl border border-white/5 bg-slate-950 py-2.5 px-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 appearance-none"
                  >
                    {Object.keys(UI_TO_DB_STATUS).map((stage) => (
                      <option key={stage} value={stage} className="bg-slate-900">
                        {stage}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400">Follow-up Notes / Activity updates</label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Log latest conversation, document collection details, etc."
                    className="w-full rounded-xl border border-white/5 bg-slate-950 py-2.5 px-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 min-h-[100px]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isUpdating}
                  className="w-full h-11 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-indigo-600 shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2"
                >
                  {isUpdating ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </form>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
