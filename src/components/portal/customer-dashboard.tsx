"use client";

import Link from "next/link";
import Image from "next/image";
import { Bell, Download, FileText, Plus, RotateCcw } from "lucide-react";

import { PaymentBadge, StatusBadge } from "@/components/portal/status-badge";
import { Card } from "@/components/ui/card";
import type { Application, NotificationItem } from "@/lib/portal-types";
import { formatCurrency } from "@/lib/portal-data";

type CustomerDashboardProps = {
  applications: Application[];
  notifications: NotificationItem[];
  profile: {
    name: string;
    email: string;
    avatarUrl: string;
  };
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));
}

export function CustomerDashboard({ applications, notifications, profile }: CustomerDashboardProps) {
  const completed = applications.filter((application) => application.status === "completed").length;
  const pending = applications.length - completed;

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-4">
            {profile.avatarUrl ? (
              <Image src={profile.avatarUrl} alt={profile.name} width={64} height={64} className="h-16 w-16 rounded-2xl object-cover" unoptimized />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary)] text-2xl font-black text-white">
                {profile.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--secondary)]">Customer Dashboard</p>
              <h1 className="mt-2 text-3xl font-black text-slate-950">Namaste, {profile.name}</h1>
              <p className="mt-1 text-sm text-slate-600">{profile.email}</p>
            </div>
          </div>
          <Link href="/services" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-5 text-sm font-bold text-white">
            <Plus className="h-4 w-4" />
            New Application
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-2xl p-5">
            <p className="text-sm font-semibold text-slate-500">Total Applications</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{applications.length}</p>
          </Card>
          <Card className="rounded-2xl p-5">
            <p className="text-sm font-semibold text-slate-500">Pending Work</p>
            <p className="mt-2 text-3xl font-black text-orange-600">{pending}</p>
          </Card>
          <Card className="rounded-2xl p-5">
            <p className="text-sm font-semibold text-slate-500">Completed</p>
            <p className="mt-2 text-3xl font-black text-emerald-600">{completed}</p>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="rounded-2xl p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-950">My Applications</h2>
                <p className="mt-1 text-sm text-slate-600">Application status, invoice aur final document yahan milega.</p>
              </div>
            </div>

            {applications.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed bg-blue-50/60 p-8 text-center">
                <p className="text-lg font-black text-slate-950">Abhi koi application nahi hai</p>
                <p className="mt-2 text-sm text-slate-600">Service select karke first request submit karein.</p>
                <Link href="/services" className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[var(--primary)] px-5 text-sm font-bold text-white">
                  Apply Now
                </Link>
              </div>
            ) : (
              <div className="mt-6 grid gap-3">
                {applications.map((application) => {
                  const payment = application.payments?.[0];
                  const invoice = application.invoices?.[0];

                  return (
                    <div key={application.id} className="rounded-2xl border bg-white p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-black text-slate-950">{application.service_name}</p>
                          <p className="mt-1 font-mono text-xs text-slate-500">ID: {application.id.slice(0, 8).toUpperCase()} • {formatDate(application.created_at)}</p>
                          <p className="mt-2 text-sm font-bold text-slate-700">{formatCurrency(application.amount)}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge status={application.status} />
                          {payment ? <PaymentBadge status={payment.status} /> : null}
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link href={`/dashboard/applications/${application.id}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-full border bg-white px-4 text-sm font-bold text-slate-900">
                          <FileText className="h-4 w-4" />
                          View
                        </Link>
                        {invoice ? (
                          <Link href={`/invoice/${invoice.id}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-full border bg-white px-4 text-sm font-bold text-slate-900">
                            <Download className="h-4 w-4" />
                            Invoice
                          </Link>
                        ) : null}
                        <Link href={`/services/${application.service_slug}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-orange-500 px-4 text-sm font-bold text-white">
                          <RotateCcw className="h-4 w-4" />
                          Apply Again
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="rounded-2xl p-5">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-[var(--primary)]" />
              <h2 className="text-lg font-black text-slate-950">Notifications</h2>
            </div>
            <div className="mt-4 space-y-3">
              {notifications.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Status update notifications yahan aayengi.</p>
              ) : (
                notifications.map((notification) => (
                  <div key={notification.id} className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-black text-slate-950">{notification.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{notification.message}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
