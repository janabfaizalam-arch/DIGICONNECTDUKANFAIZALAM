"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  Building2,
  CarFront,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileCheck2,
  FileText,
  Fingerprint,
  HeartPulse,
  IdCard,
  Landmark,
  MessageCircle,
  Phone,
  Plus,
  ReceiptText,
  RotateCcw,
  Search,
  ShieldCheck,
  Store,
  UploadCloud,
  UserRound,
  Utensils,
  WalletCards,
  X,
} from "lucide-react";

import { CustomerDocumentUpload } from "@/components/portal/customer-document-upload";
import { PaymentBadge, StatusBadge } from "@/components/portal/status-badge";
import { Card } from "@/components/ui/card";
import type { Application, NotificationItem } from "@/lib/portal-types";
import { formatCurrency } from "@/lib/portal-data";
import { contactDetails } from "@/lib/constants";
import { generateWhatsAppLink } from "@/lib/whatsapp";

type CustomerDashboardProps = {
  applications: Application[];
  notifications: NotificationItem[];
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

type ServiceCategory = "All" | "Government" | "Certificates" | "Business" | "Licenses";

const serviceItems = [
  { title: "PAN Card", slug: "pan-card", benefit: "Apply, correct or reprint PAN details.", category: "Government", icon: FileCheck2 },
  { title: "Aadhaar Update", slug: "aadhaar-update", benefit: "Update Aadhaar demographic details.", category: "Government", icon: Fingerprint },
  { title: "Voter ID", slug: "voter-id", benefit: "New voter ID and correction support.", category: "Government", icon: IdCard },
  { title: "Ration Card", slug: "ration-card", benefit: "Family ration card assistance.", category: "Government", icon: WalletCards },
  { title: "Income Certificate", slug: "income-caste-domicile-certificate", benefit: "Certificate form and document guidance.", category: "Certificates", icon: FileText },
  { title: "Caste Certificate", slug: "income-caste-domicile-certificate", benefit: "Document support for caste certificate.", category: "Certificates", icon: BadgeCheck },
  { title: "Domicile Certificate", slug: "income-caste-domicile-certificate", benefit: "Residence certificate application help.", category: "Certificates", icon: Landmark },
  { title: "GST Registration", slug: "gst-registration", benefit: "Start GST registration for your business.", category: "Business", icon: Building2 },
  { title: "MSME Certificate", slug: "msme", benefit: "Udyam/MSME registration support.", category: "Business", icon: BriefcaseBusiness },
  { title: "Passport Assistance", slug: "passport-assistance", benefit: "Passport form and appointment help.", category: "Government", icon: ShieldCheck },
  { title: "Driving Licence", slug: "driving-licence", benefit: "Learner, permanent and renewal support.", category: "Licenses", icon: CarFront },
  { title: "Ayushman Card", slug: "ayushman-card", benefit: "Eligibility and card print support.", category: "Government", icon: HeartPulse },
  { title: "Labour Card", slug: "labour-card-e-shram-card", benefit: "Labour and e-Shram card assistance.", category: "Government", icon: ClipboardCheck },
  { title: "Food License", slug: "food-license", benefit: "FSSAI food license support.", category: "Licenses", icon: Utensils },
  { title: "Trade License", slug: "trade-license", benefit: "Trade license and shop act support.", category: "Licenses", icon: Store },
] satisfies Array<{
  title: string;
  slug: string;
  benefit: string;
  category: Exclude<ServiceCategory, "All">;
  icon: typeof FileCheck2;
}>;

const categories: ServiceCategory[] = ["All", "Government", "Certificates", "Business", "Licenses"];

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

function getTrackerStep(status: string) {
  if (status === "completed") {
    return 3;
  }

  if (status === "processing" || status === "documents_pending") {
    return 2;
  }

  if (status === "under_review" || status === "in_review" || status === "pending") {
    return 1;
  }

  return 0;
}

export function CustomerDashboard({ applications, notifications, profile, profileCompletion }: CustomerDashboardProps) {
  const [servicesOpen, setServicesOpen] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory>("All");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const completed = applications.filter((application) => application.status === "completed").length;
  const pending = applications.length - completed;
  const firstInvoice = applications.flatMap((application) => application.invoices ?? [])[0];
  const filteredServices = useMemo(() => {
    const query = serviceSearch.trim().toLowerCase();

    return serviceItems.filter((service) => {
      const matchesCategory = selectedCategory === "All" || service.category === selectedCategory;
      const matchesSearch = !query || `${service.title} ${service.benefit}`.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, serviceSearch]);
  const displayName = profile.name || "Customer";

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

  return (
    <main className="relative isolate min-h-screen overflow-hidden px-4 pb-10 pt-6 md:px-8 md:py-10">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_14%_0%,rgba(37,99,235,0.14),transparent_24rem),radial-gradient(circle_at_90%_8%,rgba(249,115,22,0.1),transparent_20rem),linear-gradient(180deg,#fbfdff_0%,#eef6ff_52%,#f8fbff_100%)]" />
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="glass-panel overflow-hidden rounded-[1.75rem] border border-white/15 p-5 md:rounded-[2rem] md:p-8">
          <div className="grid gap-7 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--secondary)]">Assalamualaikum, {displayName}</p>
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
                  const latestNotification = notifications.find((notification) => notification.application_id === application.id);
                  const adminMessage = application.customer_message || latestNotification?.message || "No admin message yet.";
                  const paymentStatus = payment?.status ?? application.payment_status ?? "pending";
                  const trackerStep = getTrackerStep(application.status);

                  return (
                    <article key={application.id} className="rounded-[1.35rem] border bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-lg font-bold text-slate-950">{application.service_name}</p>
                          <p className="mt-1 font-mono text-xs text-slate-500">Application ID: {application.id}</p>
                          <p className="mt-1 text-xs font-medium text-slate-500">Submitted Date: {formatDate(application.created_at)}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge status={application.status} />
                          <PaymentBadge status={paymentStatus} />
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-4 gap-2">
                        {["Submitted", "Review", "Processing", "Completed"].map((step, index) => (
                          <div key={step} className="min-w-0">
                            <div className={`h-2 rounded-full ${index <= trackerStep ? "bg-gradient-to-r from-blue-700 to-orange-500" : "bg-slate-200"}`} />
                            <p className="mt-2 truncate text-[0.68rem] font-bold text-slate-600">{step}</p>
                          </div>
                        ))}
                      </div>

                      <p className="mt-4 text-sm text-slate-600">
                        <span className="font-bold text-slate-800">Admin Message:</span> {adminMessage}
                      </p>
                      <p className="mt-2 text-sm font-bold text-slate-700">{formatCurrency(application.amount)}</p>
                      {application.status === "documents_pending" ? <CustomerDocumentUpload applicationId={application.id} /> : null}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link href={`/dashboard/applications/${application.id}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-full border bg-white px-4 text-sm font-bold text-slate-900">
                          <FileText className="h-4 w-4" />
                          View Details
                        </Link>
                        {invoice ? (
                          <Link href={`/invoice/${invoice.id}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-full border bg-white px-4 text-sm font-bold text-slate-900">
                            <Download className="h-4 w-4" />
                            Invoice
                          </Link>
                        ) : null}
                        {application.final_document_url ? (
                          <a href={application.final_document_url} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-bold text-white">
                            <Download className="h-4 w-4" />
                            Certificate
                          </a>
                        ) : null}
                        <Link href={`/services/${application.service_slug}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-orange-500 px-4 text-sm font-bold text-white">
                          <RotateCcw className="h-4 w-4" />
                          Apply Again
                        </Link>
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

      {servicesOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/45 p-0 backdrop-blur-sm md:items-center md:justify-center md:p-6">
          <div className="max-h-[88vh] w-full overflow-hidden rounded-t-[1.75rem] border border-white/20 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.22)] md:max-w-5xl md:rounded-[1.75rem]">
            <div className="flex items-start justify-between gap-4 border-b p-5">
              <div>
                <h2 className="text-2xl font-bold text-slate-950">Choose a Service</h2>
                <p className="mt-1 text-sm text-slate-600">Select the service you want to apply for.</p>
              </div>
              <button type="button" onClick={() => setServicesOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                <X className="h-5 w-5" />
                <span className="sr-only">Close services popup</span>
              </button>
            </div>
            <div className="grid gap-3 border-b p-5 md:grid-cols-[1fr_auto] md:items-center">
              <label className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={serviceSearch}
                  onChange={(event) => setServiceSearch(event.target.value)}
                  placeholder="Search service..."
                  className="h-12 w-full rounded-2xl border bg-white pl-11 pr-4 text-sm outline-none focus:border-[var(--primary)]"
                />
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={`h-10 shrink-0 rounded-full px-4 text-sm font-bold ${
                      selectedCategory === category ? "bg-[var(--primary)] text-white" : "border bg-white text-slate-700"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
            <div className="max-h-[52vh] overflow-y-auto p-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredServices.map(({ title, slug, benefit, icon: Icon }) => (
                  <Link key={`${title}-${slug}`} href={slug ? `/services/${slug}` : "/services"} className="rounded-2xl border bg-white p-4 shadow-sm transition-transform md:hover:-translate-y-0.5">
                    <div className="flex items-start gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[var(--primary)]">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 className="font-bold text-slate-950">{title}</h3>
                        <p className="mt-1 text-sm leading-5 text-slate-600">{benefit}</p>
                      </div>
                    </div>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)]">
                      Apply now
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                ))}
              </div>
              {!filteredServices.length ? (
                <p className="rounded-2xl bg-slate-50 p-5 text-center text-sm font-semibold text-slate-600">No services found.</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
