"use client";

import { useMemo, useState } from "react";
import { ExternalLink, MessageCircle, Phone, Search } from "lucide-react";

import { AdminEmptyState } from "@/components/admin/admin-shell";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { Input } from "@/components/ui/input";
import type { Lead } from "@/lib/portal-types";
import { generateWhatsAppLink } from "@/lib/whatsapp";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
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
                <td className="px-4 py-3"><AdminStatusBadge status={lead.status} /></td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{formatDate(lead.created_at)}</td>
                <td className="px-4 py-3">
                  <a href={generateWhatsAppLink(lead.mobile, `Assalamu Alaikum, DigiConnect Dukan se ${lead.service} enquiry ke liye contact kar rahe hain.`)} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-emerald-600 px-3 text-xs font-bold text-white">
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
            <p className="mt-3 text-sm font-bold text-slate-800">{lead.service}</p>
            {lead.message ? <p className="mt-2 text-sm leading-6 text-slate-600">{lead.message}</p> : null}
            <p className="mt-3 font-mono text-xs text-slate-500">{formatDate(lead.created_at)}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={`tel:${lead.mobile}`} className="inline-flex h-9 items-center gap-2 rounded-full bg-blue-600 px-3 text-xs font-bold text-white">
                <Phone className="h-3.5 w-3.5" />
                Call
              </a>
              <a href={generateWhatsAppLink(lead.mobile, `Assalamu Alaikum, DigiConnect Dukan se ${lead.service} enquiry ke liye contact kar rahe hain.`)} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-full bg-emerald-600 px-3 text-xs font-bold text-white">
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
