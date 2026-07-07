"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Phone, Award, TrendingUp, RefreshCw, LayoutGrid, ArrowRight, Save } from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";

interface LeadRecord {
  id: string;
  customer_name: string;
  customer_email?: string;
  customer_mobile: string;
  pipeline_stage: "lead" | "opportunity" | "negotiation" | "won" | "lost";
  lead_score: number;
  estimated_clv: number;
  notes?: string;
  created_at?: string;
}

const STAGES: { id: LeadRecord["pipeline_stage"]; label: string; color: string }[] = [
  { id: "lead", label: "Leads / Enquiries", color: "border-slate-200 bg-slate-50/50" },
  { id: "opportunity", label: "Opportunities", color: "border-blue-200 bg-blue-50/30" },
  { id: "negotiation", label: "Negotiation", color: "border-purple-200 bg-purple-50/30" },
  { id: "won", label: "Won / Active", color: "border-emerald-200 bg-emerald-50/30" },
  { id: "lost", label: "Lost / Closed", color: "border-red-200 bg-red-50/30" }
];

export default function AdminCRMPipeline() {
  const { success, error } = useToast();
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // New lead form inputs
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [stage, setStage] = useState<LeadRecord["pipeline_stage"]>("lead");
  const [score, setScore] = useState(70);
  const [clv, setClv] = useState(15000);
  const [notes, setNotes] = useState("");

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/crm/leads");
      if (!res.ok) throw new Error("Failed to load pipeline leads.");
      const json = await res.json();
      setLeads(json.data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load leads.";
      error(msg);
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !mobile) {
      error("Customer name and mobile are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: name,
          customer_email: email,
          customer_mobile: mobile,
          pipeline_stage: stage,
          lead_score: score,
          estimated_clv: clv,
          notes,
        }),
      });

      if (!res.ok) throw new Error("Failed to save lead.");
      success("Lead created successfully!");
      setShowAddForm(false);
      setName("");
      setEmail("");
      setMobile("");
      setNotes("");
      fetchLeads();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unexpected error saving lead.";
      error(msg);
    } finally {
      setSaving(false);
    }
  };

  const moveStage = async (leadId: string, nextStage: LeadRecord["pipeline_stage"]) => {
    const targetLead = leads.find((l) => l.id === leadId);
    if (!targetLead) return;

    // Optimistically update local UI state
    setLeads(leads.map((l) => (l.id === leadId ? { ...l, pipeline_stage: nextStage } : l)));

    try {
      const res = await fetch("/api/admin/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: leadId,
          customer_name: targetLead.customer_name,
          customer_email: targetLead.customer_email,
          customer_mobile: targetLead.customer_mobile,
          pipeline_stage: nextStage,
          lead_score: targetLead.lead_score,
          estimated_clv: targetLead.estimated_clv,
          notes: targetLead.notes,
        }),
      });
      if (!res.ok) throw new Error("Failed to transition lead stage.");
      success(`Moved ${targetLead.customer_name} to ${nextStage}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update lead stage.";
      error(msg);
      fetchLeads(); // roll back
    }
  };

  // Computations
  const totalLeads = leads.length;
  const avgScore = totalLeads ? Math.round(leads.reduce((sum, l) => sum + l.lead_score, 0) / totalLeads) : 0;
  const pipelineValue = leads.reduce((sum, l) => sum + Number(l.estimated_clv || 0), 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* Header info */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight font-heading flex items-center gap-2">
            CRM Sales & Lead Pipeline
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Monitor incoming citizen leads, opportunities value, and schedule automatic reminders.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-black text-white hover:bg-blue-700 shadow-md shadow-blue-900/10 transition"
        >
          <Plus className="h-4 w-4" />
          Add Lead Profile
        </button>
      </div>

      {/* KPI Stats cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <LayoutGrid className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Leads</span>
            <h3 className="text-lg font-black text-slate-900">{totalLeads} Profile(s)</h3>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg Lead Score</span>
            <h3 className="text-lg font-black text-slate-900">{avgScore} / 100</h3>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-cyan-50 flex items-center justify-center text-cyan-600">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pipeline Volume</span>
            <h3 className="text-lg font-black text-slate-900">₹{pipelineValue.toLocaleString("en-IN")}</h3>
          </div>
        </div>
      </div>

      {/* New lead form expansion drawer */}
      {showAddForm && (
        <form onSubmit={handleCreateLead} className="rounded-3xl border border-slate-200/80 bg-slate-50/50 p-6 space-y-4 animate-in fade-in duration-200">
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b pb-2">Add New Client Enquiry Lead</h4>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-700">Customer Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Amit Patel"
                className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-700">Customer Mobile</label>
              <input
                type="text"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-700">Customer Email (Optional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. amit@mail.com"
                className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-700">Initial Pipeline Stage</label>
              <select
                value={stage}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStage(e.target.value as LeadRecord["pipeline_stage"])}
                className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden"
              >
                <option value="lead">Leads / Enquiries</option>
                <option value="opportunity">Opportunities</option>
                <option value="negotiation">Negotiation</option>
                <option value="won">Won / Active</option>
                <option value="lost">Lost / Closed</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-700">Estimated CLV Value (₹)</label>
              <input
                type="number"
                value={clv}
                onChange={(e) => setClv(Number(e.target.value))}
                className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-700">Lead Qualification Score (0-100)</label>
              <input
                type="number"
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
                className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-700">Internal Agent CRM Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Follow up scheduled next Monday. Interested in combo discount offers..."
              className="w-full text-xs font-semibold p-3 bg-white border border-slate-200 rounded-xl focus:outline-hidden h-20"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-9 items-center justify-center gap-1.5 bg-blue-600 text-white hover:bg-blue-750 disabled:bg-blue-300 text-xs font-black px-4 py-2 rounded-xl transition"
            >
              <Save className="h-4 w-4" />
              {saving ? "Creating..." : "Save Lead"}
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs font-extrabold px-4 py-2 bg-white border rounded-xl hover:bg-slate-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Kanban Pipeline Columns */}
      {loading ? (
        <div className="flex h-64 items-center justify-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
          <span className="text-xs text-slate-400 font-bold">Loading pipeline structure...</span>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-5 items-start overflow-x-auto pb-4">
          {STAGES.map((col) => {
            const stageLeads = leads.filter((l) => l.pipeline_stage === col.id);
            return (
              <div key={col.id} className={`rounded-3xl border p-4 space-y-3 shrink-0 w-80 md:w-auto ${col.color}`}>
                <div className="flex justify-between items-center border-b border-slate-200/50 pb-2">
                  <h4 className="text-xs font-black text-slate-900 tracking-tight">{col.label}</h4>
                  <span className="text-[10px] font-black bg-white border shadow-xs px-2 py-0.5 rounded-full text-slate-700">
                    {stageLeads.length}
                  </span>
                </div>

                <div className="space-y-3.5">
                  {stageLeads.length === 0 ? (
                    <div className="text-center p-6 border border-dashed border-slate-200 rounded-2xl text-[10px] text-slate-450 font-bold">
                      No profiles in this stage
                    </div>
                  ) : (
                    stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="bg-white border border-slate-200/70 p-4 rounded-2xl shadow-xs space-y-2 relative group hover:border-slate-350 transition-all duration-200"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="text-xs font-black text-slate-900">{lead.customer_name}</h5>
                            <span className="inline-flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                              Est. CLV: ₹{Number(lead.estimated_clv).toLocaleString("en-IN")}
                            </span>
                          </div>

                          <span
                            className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                              lead.lead_score >= 80
                                ? "bg-emerald-50 text-emerald-700"
                                : lead.lead_score >= 50
                                ? "bg-amber-50 text-amber-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            Score: {lead.lead_score}
                          </span>
                        </div>

                        {lead.notes && (
                          <p className="text-[10px] leading-relaxed text-slate-500 font-semibold italic bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                            {lead.notes}
                          </p>
                        )}

                        <div className="flex items-center gap-2 text-[9px] font-bold text-slate-450 mt-1 border-t border-slate-50 pt-2">
                          <Phone className="h-3 w-3" /> {lead.customer_mobile}
                        </div>

                        {/* Drag / shift buttons to reorder stages */}
                        <div className="flex justify-end gap-1.5 pt-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          {col.id !== "lead" && (
                            <button
                              onClick={() => {
                                const stagesIndex = STAGES.findIndex((s) => s.id === col.id);
                                const prevStage = STAGES[stagesIndex - 1].id;
                                moveStage(lead.id, prevStage);
                              }}
                              className="text-[9px] font-black text-slate-450 hover:text-slate-900 px-1 border border-slate-100 rounded-md hover:bg-slate-50"
                            >
                              ← Back
                            </button>
                          )}
                          {col.id !== "lost" && col.id !== "won" && (
                            <button
                              onClick={() => {
                                const stagesIndex = STAGES.findIndex((s) => s.id === col.id);
                                const nextStage = STAGES[stagesIndex + 1].id;
                                moveStage(lead.id, nextStage);
                              }}
                              className="text-[9px] font-black text-indigo-650 hover:text-indigo-800 px-1 border border-slate-100 rounded-md hover:bg-slate-50 flex items-center gap-0.5"
                            >
                              Next <ArrowRight className="h-2 w-2" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
