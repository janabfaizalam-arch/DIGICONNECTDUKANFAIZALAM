"use client";

import Link from "next/link";
import Image from "next/image";
import { Bell, Download, FileText, Plus, RotateCcw } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { CustomerDocumentUpload } from "@/components/portal/customer-document-upload";
import { PaymentBadge, StatusBadge } from "@/components/portal/status-badge";
import { Card } from "@/components/ui/card";
import type { Application, NotificationItem } from "@/lib/portal-types";
import { formatCurrency } from "@/lib/portal-data";
import { generateWhatsAppLink } from "@/lib/whatsapp";

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
    <main className="min-h-screen px-4 pb-10 pt-6 md:px-8 md:py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-4">
            {profile.avatarUrl ? (
              <Image src={profile.avatarUrl} alt={profile.name} width={64} height={64} className="h-16 w-16 rounded-2xl object-cover" unoptimized />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary)] text-2xl font-bold text-white">
                {profile.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--secondary)]">Customer Dashboard</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">Welcome, {profile.name}</h1>
              <p className="mt-1 text-sm text-slate-600">{profile.email}</p>
            </div>
          </div>
          <Link href="/services" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-5 text-sm font-bold text-white">
            <Plus className="h-4 w-4" />
            New Application
          </Link>
          <LogoutButton className="h-12" />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-2xl p-5">
            <p className="text-sm font-medium text-slate-500">Total Applications</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{applications.length}</p>
          </Card>
          <Card className="rounded-2xl p-5">
            <p className="text-sm font-medium text-slate-500">Pending Work</p>
            <p className="mt-2 text-3xl font-bold text-orange-600">{pending}</p>
          </Card>
          <Card className="rounded-2xl p-5">
            <p className="text-sm font-medium text-slate-500">Completed</p>
            <p className="mt-2 text-3xl font-bold text-emerald-600">{completed}</p>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="rounded-2xl p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-950">My Applications</h2>
                <p className="mt-1 text-sm text-slate-600">Track application status, invoices, and final documents here.</p>
              </div>
            </div>

            {applications.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed bg-blue-50/60 p-8 text-center">
                <p className="text-lg font-bold text-slate-950">No application has been submitted yet.</p>
                <p className="mt-2 text-sm text-slate-600">Select a service to start a new request.</p>
                <Link href="/services" className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[var(--primary)] px-5 text-sm font-bold text-white">
                  New Application
                </Link>
              </div>
            ) : (
              <div className="mt-6 grid gap-3">
                {applications.map((application) => {
                  const payment = application.payments?.[0];
                  const invoice = application.invoices?.[0];
                  const latestNotification = notifications.find((notification) => notification.application_id === application.id);
                  const adminMessage = application.customer_message || latestNotification?.message || "No admin message yet.";
                  const paymentStatus = payment?.status ?? application.payment_status ?? "pending";

                  return (
                    <div key={application.id} className="rounded-2xl border bg-white p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-bold text-slate-950">{application.service_name}</p>
                          <p className="mt-1 font-mono text-xs text-slate-500">Application ID: {application.id}</p>
                          <p className="mt-1 text-xs font-medium text-slate-500">Submitted Date: {formatDate(application.created_at)}</p>
                          <p className="mt-2 text-sm font-bold text-slate-700">{formatCurrency(application.amount)}</p>
                          <p className="mt-2 text-sm text-slate-600">
                            <span className="font-bold text-slate-800">Admin Message:</span> {adminMessage}
                          </p>
                          <p className="mt-1 text-xs font-medium text-slate-500">
                            Uploaded documents: {application.documents?.length ?? 0}
                          </p>
                          {application.documents?.length ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {application.documents.slice(0, 3).map((document) => (
                                <a
                                  key={document.id}
                                  href={document.file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex h-8 items-center justify-center rounded-full bg-blue-50 px-3 text-xs font-bold text-[var(--primary)]"
                                >
                                  {document.file_name}
                                </a>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge status={application.status} />
                          <PaymentBadge status={paymentStatus} />
                        </div>
                      </div>
                      {application.status === "documents_pending" ? <CustomerDocumentUpload applicationId={application.id} /> : null}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link href={`/dashboard/applications/${application.id}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-full border bg-white px-4 text-sm font-bold text-slate-900">
                          <FileText className="h-4 w-4" />
                          View
                        </Link>
                        {invoice ? (
                          <Link href={`/invoice/${invoice.id}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-full border bg-white px-4 text-sm font-bold text-slate-900">
                            <Download className="h-4 w-4" />
                            Invoice / Receipt
                          </Link>
                        ) : null}
                        {application.final_document_url ? (
                          <a
                            href={application.final_document_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-bold text-white"
                          >
                            <Download className="h-4 w-4" />
                            Certificate
                          </a>
                        ) : null}
                        <Link href={`/services/${application.service_slug}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-orange-500 px-4 text-sm font-bold text-white">
                          <RotateCcw className="h-4 w-4" />
                          Apply Again
                        </Link>
                        <a
                          href={generateWhatsAppLink(application.service_name)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-10 items-center justify-center rounded-full bg-[#25D366] px-4 text-sm font-bold text-white"
                        >
                          WhatsApp Support
                        </a>
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
              <h2 className="text-lg font-bold text-slate-950">Notifications</h2>
            </div>
            <div className="mt-4 space-y-3">
              {notifications.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Status update notifications will appear here.</p>
              ) : (
                notifications.map((notification) => (
                  <div key={notification.id} className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-950">{notification.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">{notification.message}</p>
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
