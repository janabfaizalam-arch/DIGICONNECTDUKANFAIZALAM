import Link from "next/link";
import { Eye, ShieldCheck } from "lucide-react";

import { PaymentBadge, StatusBadge } from "@/components/portal/status-badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/portal-data";
import type { Application } from "@/lib/portal-types";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));
}

export function AdminApplications({ applications }: { applications: Application[] }) {
  const newCount = applications.filter((application) => application.status === "new").length;
  const completedCount = applications.filter((application) => application.status === "completed").length;

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--secondary)]">Admin Panel</p>
          <h1 className="mt-3 text-3xl font-black text-slate-950 md:text-5xl">Applications Control Room</h1>
          <p className="mt-3 text-slate-600">New orders, payment proofs, documents aur team status yahan manage karein.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-2xl p-5">
            <p className="text-sm font-semibold text-slate-500">Total Applications</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{applications.length}</p>
          </Card>
          <Card className="rounded-2xl p-5">
            <p className="text-sm font-semibold text-slate-500">New</p>
            <p className="mt-2 text-3xl font-black text-blue-700">{newCount}</p>
          </Card>
          <Card className="rounded-2xl p-5">
            <p className="text-sm font-semibold text-slate-500">Completed</p>
            <p className="mt-2 text-3xl font-black text-emerald-600">{completedCount}</p>
          </Card>
        </div>

        <Card className="rounded-2xl p-4 md:p-6">
          {applications.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-blue-50/60 p-8 text-center">
              <ShieldCheck className="mx-auto h-8 w-8 text-[var(--primary)]" />
              <p className="mt-3 text-lg font-black text-slate-950">No applications yet</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Work</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((application) => {
                    const payment = application.payments?.[0];

                    return (
                      <TableRow key={application.id}>
                        <TableCell>
                          <p className="font-bold text-slate-950">{application.form_data.name ?? application.users?.full_name ?? "Customer"}</p>
                          <p className="text-xs text-slate-500">{application.form_data.mobile ?? application.users?.email}</p>
                        </TableCell>
                        <TableCell className="font-semibold text-slate-700">{application.service_name}</TableCell>
                        <TableCell>{formatCurrency(application.amount)}</TableCell>
                        <TableCell><StatusBadge status={application.status} /></TableCell>
                        <TableCell>{payment ? <PaymentBadge status={payment.status} /> : null}</TableCell>
                        <TableCell className="font-mono text-xs text-slate-500">{formatDate(application.created_at)}</TableCell>
                        <TableCell>
                          <Link href={`/admin/applications/${application.id}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-4 text-sm font-bold text-white">
                            <Eye className="h-4 w-4" />
                            Open
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
