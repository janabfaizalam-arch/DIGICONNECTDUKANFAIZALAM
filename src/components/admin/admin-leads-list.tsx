"use client";

import { useMemo, useState } from "react";
import { ExternalLink, MessageCircle, Phone, Search } from "lucide-react";

import { AdminEmptyState } from "@/components/admin/admin-shell";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { AdminLeadActions } from "@/components/admin/admin-lead-actions";
import { Input } from "@/components/ui/input";
import { safeDateTime } from "@/lib/admin-format";
import type { Lead } from "@/lib/portal-types";
import { buildSupportWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

function formatDate(date: string) {
  return safeDateTime(date);
}

export function AdminLeadsList({ leads }: { leads: Lead[] }) {
  const [search, setSearch] = useState("");
  const visibleLeads = useMemo(() => {
    const query = search.trim().toLowerCase();

    return leads.filter((lead) => {
      if (!query) return true;

      return `${lead.name} ${lead.mobile} ${lead.service} ${lead.message ?? ""}`.toLowerCase().includes(query);
    });
  }, [leads, search]);

  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm md:p-5">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, mobile, service..." className="h-12 pl-11" />
      </label>

      {!visibleLeads.length ? (
        <div className="mt-4">
          <AdminEmptyState title={leads.length ? "No matching leads" : "No leads yet"} description={leads.length ? "Try a different name, mobile, or service." : "New enquiries will appear here."} />
        </div>
      ) : null}

      <div className="mt-4 hidden overflow-hidden rounded-2xl border border-slate-100 lg:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Mobile</th>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Message</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">CRM Score / Events</th>
              <th className="px-4 py-3">File</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleLeads.map((lead) => (
              <tr key={lead.id} className="bg-white">
                <td className="px-4 py-3 font-bold text-slate-950">{lead.name}</td>
                <td className="px-4 py-3 font-mono text-slate-700">{lead.mobile}</td>
                <td className="px-4 py-3 text-slate-700">{lead.service}</td>
                <td className="max-w-xs px-4 py-3 text-slate-600">{lead.message || "-"}</td>
                <td className="px-4 py-3 text-slate-600">{lead.source || "website"}</td>
                <td className="px-4 py-3">
                  {(() => {
                    let crmScore = 5;
                    let crmEvents: string[] = [];
                    try {
                      if (lead.notes) {
                        const parsed = JSON.parse(lead.notes);
                        if (typeof parsed.score === "number") crmScore = parsed.score;
                        if (Array.isArray(parsed.events)) crmEvents = parsed.events;
                      }
                    } catch (e) {}

                    const getScoreBadge = (score: number) => {
                      if (score >= 100) return "bg-emerald-600 text-white font-extrabold";
                      if (score >= 50) return "bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold";
                      if (score >= 20) return "bg-amber-50 text-amber-700 border border-amber-200 font-bold";
                      return "bg-slate-50 text-slate-600 border border-slate-200 font-medium";
                    };

                    return (
                      <div className="space-y-1.5">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${getScoreBadge(crmScore)} shadow-sm`}>
                          Score: {crmScore}
                        </span>
                        {crmEvents.length > 0 && (
                          <div className="flex flex-wrap gap-1 max-w-[150px]">
                            {Array.from(new Set(crmEvents)).slice(0, 3).map((ev, idx) => (
                              <span key={idx} className="inline-block text-[8px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded uppercase font-bold">
                                {ev.replace(/_/g, " ")}
                              </span>
                            ))}
                            {new Set(crmEvents).size > 3 && (
                              <span className="text-[8px] text-slate-400 font-bold">+{new Set(crmEvents).size - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </td>
                <td className="px-4 py-3">
                  {lead.file_url ? (
                    <a href={lead.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-blue-700">
                      <ExternalLink className="h-4 w-4" />
                      Open
                    </a>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="grid gap-2">
                    <AdminStatusBadge status={lead.status} />
                    <AdminLeadActions leadId={lead.id} status={lead.status} />
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{formatDate(lead.created_at)}</td>
                <td className="px-4 py-3">
                  <a href={buildWhatsAppUrl(buildSupportWhatsAppMessage({ page: "admin_leads", customerName: lead.name || lead.customer_name, mobile: lead.mobile, topic: `Lead follow-up for ${lead.service}` }))} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-emerald-600 px-3 text-xs font-bold text-white">
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-3 lg:hidden">
        {visibleLeads.map((lead) => (
          <article key={lead.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-bold text-slate-950">{lead.name}</p>
                <p className="mt-1 font-mono text-sm text-slate-600">{lead.mobile}</p>
              </div>
              <AdminStatusBadge status={lead.status} />
            </div>
            <p className="mt-3 text-sm font-bold text-slate-800 flex items-center gap-2">
              <span>{lead.service}</span>
              {(() => {
                let crmScore = 5;
                try {
                  if (lead.notes) {
                    const parsed = JSON.parse(lead.notes);
                    if (typeof parsed.score === "number") crmScore = parsed.score;
                  }
                } catch (e) {}
                return (
                  <span className="text-[9px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full font-bold">
                    Score: {crmScore}
                  </span>
                );
              })()}
            </p>
            {lead.message ? <p className="mt-2 text-sm leading-6 text-slate-600">{lead.message}</p> : null}
            <p className="mt-3 font-mono text-xs text-slate-500">{formatDate(lead.created_at)}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <AdminLeadActions leadId={lead.id} status={lead.status} />
              <a href={`tel:${lead.mobile}`} className="inline-flex h-9 items-center gap-2 rounded-full bg-blue-600 px-3 text-xs font-bold text-white">
                <Phone className="h-3.5 w-3.5" />
                Call
              </a>
              <a href={buildWhatsAppUrl(buildSupportWhatsAppMessage({ page: "admin_leads", customerName: lead.name || lead.customer_name, mobile: lead.mobile, topic: `Lead follow-up for ${lead.service}` }))} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 rounded-full bg-emerald-600 px-3 text-xs font-bold text-white">
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </a>
              {lead.file_url ? (
                <a href={lead.file_url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-bold text-slate-700">
                  <ExternalLink className="h-3.5 w-3.5" />
                  File
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
