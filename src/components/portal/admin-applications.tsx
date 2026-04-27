import { FileText, ShieldCheck } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Lead } from "@/lib/portal-types";
import { cn } from "@/lib/utils";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));
}

const statusClasses: Record<Lead["status"], string> = {
  new: "bg-blue-50 text-blue-700 ring-blue-100",
  in_progress: "bg-orange-50 text-orange-700 ring-orange-100",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-100",
};

const statusLabels: Record<Lead["status"], string> = {
  new: "New",
  in_progress: "In Progress",
  completed: "Completed",
};

export function AdminApplications({ leads }: { leads: Lead[] }) {
  const newCount = leads.filter((lead) => lead.status === "new").length;
  const withFilesCount = leads.filter((lead) => Boolean(lead.file_url)).length;

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--secondary)]">Admin Panel</p>
          <h1 className="mt-3 text-3xl font-black text-slate-950 md:text-5xl">Public Leads Control Room</h1>
          <p className="mt-3 text-slate-600">Website form se aaye leads, customer details aur uploaded files yahan manage karein.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-2xl p-5">
            <p className="text-sm font-semibold text-slate-500">Total Leads</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{leads.length}</p>
          </Card>
          <Card className="rounded-2xl p-5">
            <p className="text-sm font-semibold text-slate-500">New</p>
            <p className="mt-2 text-3xl font-black text-blue-700">{newCount}</p>
          </Card>
          <Card className="rounded-2xl p-5">
            <p className="text-sm font-semibold text-slate-500">With Files</p>
            <p className="mt-2 text-3xl font-black text-emerald-600">{withFilesCount}</p>
          </Card>
        </div>

        <Card className="rounded-2xl p-4 md:p-6">
          {leads.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-blue-50/60 p-8 text-center">
              <ShieldCheck className="mx-auto h-8 w-8 text-[var(--primary)]" />
              <p className="mt-3 text-lg font-black text-slate-950">No leads yet</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Storage Path</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-bold text-slate-950">{lead.name}</TableCell>
                      <TableCell className="font-mono text-sm text-slate-700">{lead.mobile}</TableCell>
                      <TableCell className="font-semibold text-slate-700">{lead.service}</TableCell>
                      <TableCell className="max-w-[260px] text-sm text-slate-600">{lead.message || "-"}</TableCell>
                      <TableCell>
                        <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1", statusClasses[lead.status])}>
                          {statusLabels[lead.status]}
                        </span>
                      </TableCell>
                      <TableCell>
                        {lead.file_url ? (
                          <a
                            href={lead.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-4 text-sm font-bold text-white"
                            title={`${lead.file_name ?? "Uploaded file"} ${lead.file_type ? `(${lead.file_type})` : ""}`}
                          >
                            <FileText className="h-4 w-4" />
                            View File
                          </a>
                        ) : (
                          <span className="text-sm text-slate-400">No file</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[220px] break-all font-mono text-xs text-slate-500">
                        {lead.storage_path || "-"}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">{formatDate(lead.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
