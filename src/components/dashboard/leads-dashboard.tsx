"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { CheckCircle2, LoaderCircle, Phone, Search, Send, UsersRound } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

export type LeadStatus = "new" | "in_progress" | "completed";

export type Lead = {
  id: string;
  name: string;
  mobile: string;
  service: string;
  message: string | null;
  status: LeadStatus;
  created_at: string;
};

type FilterValue = "all" | "new" | "in_progress" | "completed";

type LeadsDashboardProps = {
  initialLeads: Lead[];
  name: string;
  email: string;
};

const statusLabels: Record<LeadStatus, string> = {
  new: "New",
  in_progress: "In Progress",
  completed: "Completed",
};

const statusClasses: Record<LeadStatus, string> = {
  new: "bg-blue-50 text-blue-700 ring-blue-100",
  in_progress: "bg-orange-50 text-orange-700 ring-orange-100",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-100",
};

function normalizeIndianMobile(mobile: string) {
  const digits = mobile.replace(/\D/g, "");

  if (digits.length === 10) {
    return `91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return digits;
  }

  return digits;
}

function formatLeadDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "blue" | "orange" | "green";
}) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700",
    orange: "bg-orange-50 text-orange-700",
    green: "bg-emerald-50 text-emerald-700",
  }[tone];

  return (
    <Card className="rounded-2xl p-5">
      <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", toneClass)}>
        {tone === "green" ? <CheckCircle2 className="h-5 w-5" /> : <UsersRound className="h-5 w-5" />}
      </div>
      <p className="mt-4 text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
    </Card>
  );
}

export function LeadsDashboard({ initialLeads, name, email }: LeadsDashboardProps) {
  const [leads, setLeads] = useState(initialLeads);
  const [filter, setFilter] = useState<FilterValue>("all");
  const [search, setSearch] = useState("");
  const [pendingLeadId, setPendingLeadId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const channel = supabase
      .channel("dashboard-leads")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        (payload) => {
          const nextLead = payload.new as Lead | null;

          if (!nextLead?.id) {
            return;
          }

          setLeads((current) => {
            const exists = current.some((lead) => lead.id === nextLead.id);
            const nextLeads = exists
              ? current.map((lead) => (lead.id === nextLead.id ? { ...lead, ...nextLead } : lead))
              : [nextLead, ...current];

            return nextLeads.sort(
              (first, second) => new Date(second.created_at).getTime() - new Date(first.created_at).getTime(),
            );
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const stats = useMemo(
    () => ({
      total: leads.length,
      new: leads.filter((lead) => lead.status === "new").length,
      completed: leads.filter((lead) => lead.status === "completed").length,
    }),
    [leads],
  );

  const visibleLeads = useMemo(() => {
    const mobileQuery = search.replace(/\D/g, "");

    return leads.filter((lead) => {
      const matchesFilter = filter === "all" || lead.status === filter;
      const matchesSearch = !mobileQuery || lead.mobile.replace(/\D/g, "").includes(mobileQuery);

      return matchesFilter && matchesSearch;
    });
  }, [filter, leads, search]);

  const updateLeadStatus = (leadId: string, status: LeadStatus) => {
    const previousLeads = leads;
    setPendingLeadId(leadId);
    setLeads((current) => current.map((lead) => (lead.id === leadId ? { ...lead, status } : lead)));

    startTransition(async () => {
      try {
        const response = await fetch("/api/leads", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: leadId, status }),
        });

        const result = (await response.json()) as { message?: string; lead?: Lead };

        if (!response.ok || !result.lead) {
          throw new Error(result.message ?? "Lead update failed.");
        }

        setLeads((current) => current.map((lead) => (lead.id === leadId ? result.lead! : lead)));
        showToast("Lead status updated.");
      } catch (error) {
        setLeads(previousLeads);
        showToast(error instanceof Error ? error.message : "Lead update failed.", "error");
      } finally {
        setPendingLeadId(null);
      }
    });
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7fbff_0%,#eef5fb_100%)] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--secondary)]">
              DigiConnect Dukan
            </p>
            <h1 className="mt-3 text-3xl font-bold text-slate-950 md:text-5xl">Customer Leads Dashboard</h1>
            <p className="mt-3 text-base font-medium text-slate-600">Track all customer requests from one dashboard.</p>
          </div>
          <div className="rounded-2xl border bg-white px-4 py-3 shadow-soft">
            <p className="text-sm font-bold text-slate-950">{name}</p>
            <p className="mt-1 max-w-[260px] truncate text-xs text-slate-500">{email}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Total Leads" value={stats.total} tone="blue" />
          <StatCard label="New Leads" value={stats.new} tone="orange" />
          <StatCard label="Completed Leads" value={stats.completed} tone="green" />
        </div>

        <Card className="rounded-2xl p-4 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative md:w-80">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Mobile number search"
                inputMode="numeric"
                className="pl-11"
              />
            </div>
            <div className="grid grid-cols-4 rounded-2xl bg-slate-100 p-1 text-sm font-bold text-slate-600 md:w-[480px]">
              {(["all", "new", "in_progress", "completed"] as FilterValue[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={cn(
                    "h-10 rounded-xl px-3 transition",
                    filter === item ? "bg-white text-[var(--primary)] shadow-sm" : "hover:bg-white/70",
                  )}
                >
                  {item === "all" ? "All" : item === "new" ? "New" : item === "in_progress" ? "In Progress" : "Completed"}
                </button>
              ))}
            </div>
          </div>

          {leads.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed bg-blue-50/50 p-8 text-center">
              <p className="text-lg font-bold text-slate-950">No leads yet</p>
              <p className="mt-2 text-sm text-slate-600">New requests from the website form will appear here automatically.</p>
            </div>
          ) : visibleLeads.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed bg-orange-50/60 p-8 text-center">
              <p className="text-lg font-bold text-slate-950">No matching leads</p>
              <p className="mt-2 text-sm text-slate-600">Adjust the filter or mobile search and try again.</p>
            </div>
          ) : (
            <>
              <div className="mt-6 hidden overflow-hidden rounded-2xl border md:block">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="min-w-[300px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleLeads.map((lead) => {
                      const whatsappMobile = normalizeIndianMobile(lead.mobile);
                      const isUpdating = isPending && pendingLeadId === lead.id;

                      return (
                        <TableRow key={lead.id}>
                          <TableCell className="font-bold text-slate-950">{lead.name}</TableCell>
                          <TableCell className="font-mono text-slate-700">{lead.mobile}</TableCell>
                          <TableCell className="max-w-[220px] text-slate-700">{lead.service}</TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1",
                                statusClasses[lead.status],
                              )}
                            >
                              {statusLabels[lead.status]}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-slate-500">{formatLeadDate(lead.created_at)}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                type="button"
                                size="default"
                                variant="secondary"
                                disabled={isUpdating || lead.status === "completed"}
                                onClick={() => updateLeadStatus(lead.id, "completed")}
                              >
                                {isUpdating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                Completed
                              </Button>
                              <Select
                                value={lead.status}
                                onValueChange={(value) => updateLeadStatus(lead.id, value as LeadStatus)}
                              >
                                <SelectTrigger className="h-11 w-[150px] rounded-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="new">New</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                              </Select>
                              <a
                                href={`tel:${lead.mobile}`}
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border bg-white px-4 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                              >
                                <Phone className="h-4 w-4" />
                                Call
                              </a>
                              <a
                                href={`https://wa.me/${whatsappMobile}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-medium text-white transition hover:bg-emerald-700"
                              >
                                <Send className="h-4 w-4" />
                                WhatsApp
                              </a>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-6 grid gap-3 md:hidden">
                {visibleLeads.map((lead) => {
                  const whatsappMobile = normalizeIndianMobile(lead.mobile);
                  const isUpdating = isPending && pendingLeadId === lead.id;

                  return (
                    <div key={lead.id} className="rounded-2xl border bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-950">{lead.name}</p>
                          <p className="mt-1 font-mono text-sm text-slate-600">{lead.mobile}</p>
                        </div>
                        <span className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-bold ring-1", statusClasses[lead.status])}>
                          {statusLabels[lead.status]}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-medium text-slate-700">{lead.service}</p>
                      <p className="mt-2 font-mono text-xs text-slate-500">{formatLeadDate(lead.created_at)}</p>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={isUpdating || lead.status === "completed"}
                          onClick={() => updateLeadStatus(lead.id, "completed")}
                          className="px-3"
                        >
                          {isUpdating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          Done
                        </Button>
                        <Select value={lead.status} onValueChange={(value) => updateLeadStatus(lead.id, value as LeadStatus)}>
                          <SelectTrigger className="h-11 rounded-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                        <a
                          href={`tel:${lead.mobile}`}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-full border bg-white px-4 text-sm font-medium text-slate-900"
                        >
                          <Phone className="h-4 w-4" />
                          Call
                        </a>
                        <a
                          href={`https://wa.me/${whatsappMobile}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-medium text-white"
                        >
                          <Send className="h-4 w-4" />
                          WhatsApp
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>
      </div>
    </main>
  );
}
