"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Bell,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileCheck2,
  FileText,
  Gift,
  MessageCircle,
  Phone,
  Plus,
  ReceiptText,
  Share2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UploadCloud,
  UserRound,
  WalletCards,
} from "lucide-react";

import { CustomerDocumentUpload } from "@/components/portal/customer-document-upload";
import { PaymentBadge, StatusBadge } from "@/components/portal/status-badge";
import { Card } from "@/components/ui/card";
import type { Application, NotificationItem } from "@/lib/portal-types";
import { formatCurrency } from "@/lib/portal-data";
import { contactDetails } from "@/lib/constants";
import { generateWhatsAppLink } from "@/lib/whatsapp";
import type { WalletSnapshot } from "@/lib/wallet";
import { getRewardDirection } from "@/lib/wallet";

const ServiceSelectionModal = dynamic(
  () => import("@/components/service-selection-modal").then((mod) => mod.ServiceSelectionModal),
  { ssr: false },
);

type CustomerDashboardProps = {
  applications: Application[];
  notifications: NotificationItem[];
  walletSnapshot: WalletSnapshot;
  profile: {
    name: string;
    email: string;
    avatarUrl: string;
  };
  profileCompletion: {
    complete: boolean;
    percent: number;
  };
};

const featureCards = [
  { title: "Apply services online", description: "Choose services and start applications from your account.", icon: Plus },
  { title: "Track application status", description: "Follow every request from submission to completion.", icon: ClipboardCheck },
  { title: "Upload documents securely", description: "Submit pending files directly from your dashboard.", icon: UploadCloud },
  { title: "Download invoices", description: "Open receipts and invoices whenever available.", icon: ReceiptText },
  { title: "Get WhatsApp support", description: "Reach the team quickly for guidance and updates.", icon: MessageCircle },
  { title: "Save profile faster", description: "Complete details once and apply faster next time.", icon: UserRound },
];

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));
}

function scrollToApplications() {
  document.getElementById("my-applications")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function getRewardStatusLabel(status: string) {
  if (status === "active") {
    return "credited";
  }

  if (status === "used") {
    return "used";
  }

  return status.replace(/_/g, " ");
}

export function CustomerDashboard({ applications, notifications, walletSnapshot, profileCompletion }: CustomerDashboardProps) {
  const [servicesOpen, setServicesOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const completed = applications.filter((application) => application.status === "completed").length;
  const pending = applications.length - completed;
  const firstInvoice = applications.flatMap((application) => application.invoices ?? [])[0];
  const walletBalance = Number(walletSnapshot.wallet?.balance_points ?? walletSnapshot.wallet?.balance ?? 0);
  const cashbackEarned = Number(walletSnapshot.cashbackEarned ?? 0);
  const cashbackUsed = Number(walletSnapshot.cashbackUsed ?? 0);
  const expiringSoonAmount = Number(walletSnapshot.expiringSoonAmount ?? 0);
  const usagePercent = cashbackEarned > 0 ? Math.min(100, Math.round((cashbackUsed / cashbackEarned) * 100)) : 0;
  const referral = walletSnapshot.referralSummary;
  function openServices() {
    setActionMessage(null);
    setServicesOpen(true);
  }

  function handleUploadDocuments() {
    if (!applications.length) {
      setActionMessage("Apply for a service first.");
      openServices();
      return;
    }

    scrollToApplications();
  }

  function handleDownloadInvoice() {
    if (firstInvoice) {
      window.location.assign(`/invoice/${firstInvoice.id}`);
      return;
    }

    setActionMessage("Invoice will appear once your application is processed.");
    scrollToApplications();
  }

  async function copyReferralLink() {
    if (!referral?.link) {
      return;
    }

    await navigator.clipboard.writeText(referral.link);
    setActionMessage("Referral link copied.");
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden px-4 pb-10 pt-6 md:px-8 md:py-10">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_14%_0%,rgba(37,99,235,0.14),transparent_24rem),radial-gradient(circle_at_90%_8%,rgba(249,115,22,0.1),transparent_20rem),linear-gradient(180deg,#fbfdff_0%,#eef6ff_52%,#f8fbff_100%)]" />
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="glass-panel overflow-hidden rounded-[1.75rem] border border-white/15 p-5 md:rounded-[2rem] md:p-8">
          <div className="grid gap-7 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--secondary)]">Customer Dashboard</p>
              <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-950 md:text-5xl">Welcome to DigiConnect Dukan</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                Apply, track and manage your digital services from one secure dashboard.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={openServices} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-700 to-sky-500 px-5 text-sm font-bold text-white shadow-md shadow-blue-600/15 transition-transform md:hover:-translate-y-0.5">
                  <Plus className="h-4 w-4" />
                  Apply New Service
                </button>
                <button type="button" onClick={scrollToApplications} className="inline-flex h-12 items-center justify-center gap-2 rounded-full border bg-white/70 px-5 text-sm font-bold text-slate-900 transition-colors hover:bg-white">
                  <ClipboardCheck className="h-4 w-4" />
                  My Applications
                </button>
                <a href={generateWhatsAppLink()} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border bg-emerald-50 px-5 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp Support
                </a>
              </div>
            </div>

            <div className="relative min-h-[21rem]">
              <div className="absolute inset-4 rounded-[2rem] bg-[radial-gradient(circle_at_25%_20%,rgba(37,99,235,0.18),transparent_30%),radial-gradient(circle_at_80%_80%,rgba(249,115,22,0.14),transparent_28%)]" />
              <div className="liquid-card absolute left-0 top-4 w-[84%] rounded-[1.5rem] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">Application Tracking</p>
                <h2 className="mt-2 text-xl font-bold text-slate-950">{applications.length || "Start"} service request{applications.length === 1 ? "" : "s"}</h2>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-2xl bg-white/55 p-3">
                    <p className="text-xs text-slate-500">Pending</p>
                    <p className="text-xl font-bold text-orange-600">{pending}</p>
                  </div>
                  <div className="rounded-2xl bg-white/55 p-3">
                    <p className="text-xs text-slate-500">Done</p>
                    <p className="text-xl font-bold text-emerald-600">{completed}</p>
                  </div>
                  <div className="rounded-2xl bg-white/55 p-3">
                    <p className="text-xs text-slate-500">Profile</p>
                    <p className="text-xl font-bold text-blue-700">{profileCompletion.percent}%</p>
                  </div>
                </div>
              </div>
              <div className="liquid-card absolute bottom-6 right-0 w-[78%] rounded-[1.5rem] p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-950">Verified document support</p>
                    <p className="text-xs text-slate-600">Secure profile and processing updates</p>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white">
                  Processing status stays visible here
                </div>
              </div>
              <div className="absolute right-6 top-0 rounded-full border border-white/15 bg-white/70 px-4 py-2 text-xs font-bold text-orange-600 shadow-sm">
                Secure Profile Badge
              </div>
            </div>
          </div>
        </section>

        {actionMessage ? (
          <p className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-700">{actionMessage}</p>
        ) : null}

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="glass-panel overflow-hidden rounded-[1.75rem] border border-white/15 p-5 md:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-blue-700">
                  <WalletCards className="h-4 w-4 text-orange-500" />
                  Reward Wallet
                </div>
                <h2 className="mt-4 text-3xl font-bold text-slate-950 md:text-4xl">{formatCurrency(walletBalance)}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Rewards can be used only on DigiConnect Dukan services and cannot be withdrawn as cash.
                </p>
              </div>
              <div className="grid min-w-0 gap-3 sm:grid-cols-3 md:w-[25rem]">
                <div className="rounded-2xl bg-white/60 p-4">
                  <Gift className="h-5 w-5 text-orange-500" />
                  <p className="mt-3 text-xs font-bold text-slate-500">Earned</p>
                  <p className="text-lg font-bold text-slate-950">{formatCurrency(cashbackEarned)}</p>
                </div>
                <div className="rounded-2xl bg-white/60 p-4">
                  <TrendingUp className="h-5 w-5 text-blue-700" />
                  <p className="mt-3 text-xs font-bold text-slate-500">Used</p>
                  <p className="text-lg font-bold text-slate-950">{formatCurrency(cashbackUsed)}</p>
                </div>
                <div className="rounded-2xl bg-white/60 p-4">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  <p className="mt-3 text-xs font-bold text-slate-500">Validity</p>
                  <p className="text-sm font-bold text-slate-950">{walletSnapshot.wallet?.nearest_expiry_at ? formatDate(walletSnapshot.wallet.nearest_expiry_at) : "No expiry"}</p>
                </div>
              </div>
            </div>
            {expiringSoonAmount > 0 ? (
              <p className="mt-5 rounded-2xl border border-orange-200 bg-orange-50/85 px-4 py-3 text-sm font-bold text-orange-700">
                {formatCurrency(expiringSoonAmount)} is expiring soon. Use it on your next eligible service.
              </p>
            ) : null}
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span>Wallet usage progress</span>
                <span>{usagePercent}% redeemed</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/70">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-700 to-orange-500" style={{ width: `${usagePercent}%` }} />
              </div>
            </div>
          </div>

          <Card className="rounded-[1.5rem] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-600">Transactions</p>
                <h2 className="mt-2 text-xl font-bold text-slate-950">Wallet history</h2>
              </div>
              <Sparkles className="h-5 w-5 text-blue-700" />
            </div>
            <div className="mt-4 space-y-3">
              {walletSnapshot.transactions.length ? (
                walletSnapshot.transactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-950">{transaction.description || transaction.type.replace(/_/g, " ")}</p>
                      <p className="text-xs text-slate-500">{formatDate(transaction.created_at)} - {getRewardStatusLabel(transaction.status)}</p>
                    </div>
                    <p className={`shrink-0 text-sm font-extrabold ${getRewardDirection(transaction.type) === "credit" ? "text-emerald-700" : "text-orange-700"}`}>
                      {getRewardDirection(transaction.type) === "credit" ? "+" : "-"}{formatCurrency(Number(transaction.amount))}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Reward credits will appear here after email verification or verified payments.</p>
              )}
            </div>
          </Card>
        </section>

        {referral ? (
          <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <Card className="rounded-[1.5rem] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Refer & Earn Rs 100</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-950">{referral.code || "Code generating"}</h2>
                </div>
                <Gift className="h-6 w-6 text-orange-500" />
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">Invite a friend. They get Rs 500 on signup, you earn Rs 100 when they join, and another Rs 100 after their first completed paid service.</p>
              <p className="mt-3 break-all rounded-2xl bg-slate-50 p-3 font-mono text-xs font-bold text-slate-700">
                {referral.link || "Your referral link will appear after profile sync."}
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={copyReferralLink} disabled={!referral.link} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-4 text-sm font-bold text-white disabled:opacity-50">
                  <ClipboardCheck className="h-4 w-4" />
                  Copy Link
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Join DigiConnect Dukan using my referral link: ${referral.link}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 text-sm font-bold text-white"
                >
                  <Share2 className="h-4 w-4" />
                  WhatsApp Share
                </a>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Total</p>
                  <p className="text-xl font-bold text-slate-950">{referral.total}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Pending</p>
                  <p className="text-xl font-bold text-orange-600">{referral.pending}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Earned</p>
                  <p className="text-xl font-bold text-emerald-600">{formatCurrency(referral.rewardEarned)}</p>
                </div>
              </div>
            </Card>

            <Card className="rounded-[1.5rem] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-600">Referral History</p>
              <div className="mt-4 space-y-3">
                {referral.referrals.length ? (
                  referral.referrals.slice(0, 6).map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3">
                      <div>
                        <p className="font-mono text-xs font-bold text-slate-500">{item.referred_user_id.slice(0, 8)}</p>
                        <p className="text-sm font-bold text-slate-950">{item.status.replace(/_/g, " ")}</p>
                      </div>
                      <p className="text-sm font-extrabold text-emerald-700">{formatCurrency(Number(item.reward_amount))}</p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Friend joined, first service status, and referrer reward status will appear here.</p>
                )}
              </div>
            </Card>
          </section>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {[
            { title: "Apply New Service", description: "Choose from all services.", icon: Plus, action: openServices },
            { title: "Track Application", description: "Jump to your status list.", icon: ClipboardCheck, action: scrollToApplications },
            { title: "Upload Documents", description: "Complete pending files.", icon: UploadCloud, action: handleUploadDocuments },
            { title: "My Profile", description: "Manage saved details.", icon: UserRound, href: "/customer/profile" },
            { title: "Download Invoice", description: "Open receipt if available.", icon: Download, action: handleDownloadInvoice },
            { title: "Contact Support", description: "Talk on WhatsApp.", icon: MessageCircle, href: generateWhatsAppLink() },
          ].map(({ title, description, icon: Icon, action, href }) =>
            href ? (
              <a key={title} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined} className="liquid-card rounded-2xl p-4">
                <Icon className="h-5 w-5 text-[var(--primary)]" />
                <p className="mt-3 text-sm font-bold text-slate-950">{title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{description}</p>
              </a>
            ) : (
              <button key={title} type="button" onClick={() => action?.()} className="liquid-card rounded-2xl p-4 text-left">
                <Icon className="h-5 w-5 text-[var(--primary)]" />
                <p className="mt-3 text-sm font-bold text-slate-950">{title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{description}</p>
              </button>
            ),
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card id="my-applications" className="scroll-mt-24 rounded-[1.5rem] p-4 md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">My Applications</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950">Track every service request</h2>
                <p className="mt-1 text-sm text-slate-600">Submitted, review, processing and completed statuses in one place.</p>
              </div>
              <button type="button" onClick={openServices} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-4 text-sm font-bold text-white">
                <Plus className="h-4 w-4" />
                Explore Services
              </button>
            </div>

            {applications.length === 0 ? (
              <div className="mt-6 rounded-[1.35rem] border border-dashed border-blue-200 bg-blue-50/70 p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
                  <FileCheck2 className="h-7 w-7" />
                </div>
                <p className="mt-4 text-xl font-bold text-slate-950">Your service journey starts here.</p>
                <p className="mt-2 text-sm text-slate-600">Choose a service and submit your first application today.</p>
                <button type="button" onClick={openServices} className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[var(--primary)] px-5 text-sm font-bold text-white">
                  Explore Services
                </button>
              </div>
            ) : (
              <div className="mt-6 grid gap-4">
                {applications.map((application) => {
                  const payment = application.payments?.[0];
                  const invoice = application.invoices?.[0];
                  const paymentStatus = payment?.status ?? application.payment_status ?? "pending";
                  const documents = application.documents?.filter((document) => !(document.is_final || document.document_type === "final_document")) ?? [];
                  const finalDocument = application.documents?.find((document) => document.is_final || document.document_type === "final_document");
                  const finalDocumentUrl = application.final_document_url || finalDocument?.file_url || "";

                  return (
                    <article key={application.id} className="rounded-2xl border bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-lg font-bold text-slate-950">{application.service_name}</p>
                          <p className="mt-1 font-mono text-xs text-slate-500">Application ID: {application.id}</p>
                          <p className="mt-1 text-xs font-medium text-slate-500">Submitted: {formatDate(application.created_at)}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge status={application.status} />
                          <PaymentBadge status={paymentStatus} />
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-xs font-bold uppercase text-slate-500">Invoice</p>
                          {invoice ? (
                            <Link href={`/invoice/${invoice.id}`} className="mt-2 inline-flex h-9 items-center gap-2 rounded-full bg-blue-600 px-3 text-xs font-bold text-white">
                              <ReceiptText className="h-4 w-4" />
                              Open Invoice
                            </Link>
                          ) : (
                            <p className="mt-2 text-sm font-semibold text-slate-600">Not generated yet</p>
                          )}
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-xs font-bold uppercase text-slate-500">Documents</p>
                          <p className="mt-2 text-sm font-semibold text-slate-700">{documents.length ? `${documents.length} uploaded` : "No documents uploaded"}</p>
                          {application.status === "documents_required" ? <CustomerDocumentUpload applicationId={application.id} /> : null}
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-xs font-bold uppercase text-slate-500">Final Document</p>
                          {finalDocumentUrl ? (
                            <a href={finalDocumentUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex h-9 items-center gap-2 rounded-full bg-emerald-600 px-3 text-xs font-bold text-white">
                              <Download className="h-4 w-4" />
                              Open
                            </a>
                          ) : (
                            <p className="mt-2 text-sm font-semibold text-slate-600">Not uploaded yet</p>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link href={`/dashboard/applications/${application.id}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-full border bg-white px-4 text-sm font-bold text-slate-900">
                          <FileText className="h-4 w-4" />
                          View Details
                        </Link>
                        <a href={generateWhatsAppLink(undefined, `I need support for my ${application.service_name} application ${application.id}.`)} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-bold text-white">
                          <MessageCircle className="h-4 w-4" />
                          Support WhatsApp
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </Card>

          <div className="grid gap-6">
            <Card className="rounded-[1.5rem] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Profile Completion</p>
              <h2 className="mt-2 text-xl font-bold text-slate-950">
                {profileCompletion.complete ? "Profile Complete" : "Complete your profile to apply faster"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Complete your profile once and apply faster next time.</p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-700 to-orange-500" style={{ width: `${profileCompletion.percent}%` }} />
              </div>
              <p className="mt-2 text-sm font-bold text-slate-700">{profileCompletion.percent}% complete</p>
              <Link href="/customer/profile" className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-4 text-sm font-bold text-white">
                <UserRound className="h-4 w-4" />
                Complete Profile
              </Link>
            </Card>

            <Card className="rounded-[1.5rem] p-5">
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

        <section>
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Customer Account</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">What you can do here</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featureCards.map(({ title, description, icon: Icon }) => (
              <div key={title} className="liquid-card rounded-2xl p-5">
                <Icon className="h-5 w-5 text-orange-500" />
                <h3 className="mt-4 text-lg font-bold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-panel rounded-[1.75rem] border border-white/15 p-5 md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--secondary)]">Support</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950">Need help with any service? Our support team is ready.</h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a href={generateWhatsAppLink()} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 text-sm font-bold text-white">
                <MessageCircle className="h-4 w-4" />
                WhatsApp Support
              </a>
              <a href={`tel:+91${contactDetails.primaryPhone}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border bg-white/70 px-5 text-sm font-bold text-slate-900">
                <Phone className="h-4 w-4" />
                Call Support
              </a>
            </div>
          </div>
        </section>
      </div>

      <ServiceSelectionModal open={servicesOpen} onOpenChange={setServicesOpen} />
    </main>
  );
}
