"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Copy, Download, ExternalLink, LoaderCircle, Search } from "lucide-react";

import { AdminEmptyState } from "@/components/admin/admin-shell";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { safeCurrency, safeDate } from "@/lib/admin-format";
import type { AdminCustomerFilter, AdminCustomerReferralPerson, AdminCustomerRow } from "@/lib/admin-customers";

const PAGE_SIZE = 30;

function formatDate(date: string) {
  return safeDate(date);
}

function displayValue(value: string | null | undefined) {
  return value?.trim() || "Not provided";
}

function displayMobile(value: string | null | undefined) {
  const mobile = value?.trim();
  if (!mobile) return "Not provided";

  const digits = mobile.replace(/\D/g, "");
  if (digits.length < 10) return "Not provided";

  return mobile;
}

function personLabel(person: AdminCustomerReferralPerson | null) {
  if (!person) return "Not referred";
  return [person.name, person.email, person.mobile, person.referralCode].filter(Boolean).join(" / ");
}

function personName(person: AdminCustomerReferralPerson | null) {
  return person?.name?.trim() || "Not provided";
}

function personContact(person: AdminCustomerReferralPerson | null) {
  if (!person) return "Not provided";
  return person.email?.trim() || displayMobile(person.mobile) || person.referralCode?.trim() || "Not provided";
}

function copyToClipboard(value: string) {
  if (!value || typeof navigator === "undefined" || !navigator.clipboard) return;
  void navigator.clipboard.writeText(value);
}

function csvCell(value: unknown) {
  const text = String(value ?? "").replace(/\r?\n/g, " ").trim();
  return `"${text.replace(/"/g, '""')}"`;
}

function todayForFilename() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type SortOption = "newest" | "oldest" | "name-az" | "wallet-high" | "referrals-high" | "applications-high";

const filterOptions: Array<{ value: AdminCustomerFilter; label: string }> = [
  { value: "all", label: "All Users" },
  { value: "with-applications", label: "With Applications" },
  { value: "with-wallet", label: "With Wallet Balance" },
  { value: "with-referrals", label: "With Referrals" },
  { value: "referred-users", label: "Referred Users" },
  { value: "no-mobile", label: "No Mobile" },
  { value: "new-today", label: "New Today" },
];

const sortOptions: Array<{ value: SortOption; label: string }> = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name-az", label: "Name A-Z" },
  { value: "wallet-high", label: "Wallet High-Low" },
  { value: "referrals-high", label: "Referrals High-Low" },
  { value: "applications-high", label: "Applications High-Low" },
];

function isNewToday(value: string) {
  const date = new Date(value);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

export function AdminCustomerManager({ customers, initialFilter = "all" }: { customers: AdminCustomerRow[]; initialFilter?: AdminCustomerFilter }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<AdminCustomerFilter>(initialFilter === "signed-up" ? "all" : initialFilter);
  const [sort, setSort] = useState<SortOption>("newest");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const visibleCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return customers
      .filter((customer) => {
        if (filter === "with-applications") return customer.applicationsCount > 0;
        if (filter === "with-wallet") return customer.walletBalance > 0;
        if (filter === "with-referrals") return customer.referredUsersCount > 0 || customer.referralCount > 0;
        if (filter === "referred-users") return Boolean(customer.referredBy);
        if (filter === "no-mobile") return !customer.mobile;
        if (filter === "new-today") return isNewToday(customer.created_at);
        return true;
      })
      .filter((customer) => {
        if (!query) return true;
        const referralPreview = customer.referredUsersPreview.map(personLabel).join(" ");
        return `${customer.full_name} ${customer.mobile} ${customer.email ?? ""} ${customer.referralCode} ${personLabel(customer.referredBy)} ${referralPreview}`.toLowerCase().includes(query);
      })
      .sort((a, b) => {
        if (sort === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        if (sort === "name-az") return a.full_name.localeCompare(b.full_name);
        if (sort === "wallet-high") return b.walletBalance - a.walletBalance;
        if (sort === "referrals-high") return b.referredUsersCount - a.referredUsersCount || b.referralCount - a.referralCount;
        if (sort === "applications-high") return b.applicationsCount - a.applicationsCount;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [customers, filter, search, sort]);
  const pagedCustomers = visibleCustomers.slice(0, visibleCount);

  function updateSearch(value: string) {
    setSearch(value);
    setVisibleCount(PAGE_SIZE);
  }

  function updateFilter(value: AdminCustomerFilter) {
    setFilter(value);
    setVisibleCount(PAGE_SIZE);
  }

  function updateSort(value: SortOption) {
    setSort(value);
    setVisibleCount(PAGE_SIZE);
  }

  function downloadCsv() {
    const headers = [
      "Name",
      "Mobile",
      "Email",
      "Wallet Balance",
      "Cashback / Lifetime Earned",
      "Referrals Count",
      "Applications Count",
      "Last Application Status",
      "Created Date",
      "Referral Code",
      "Referred By",
      "Referred Users Count",
      "Referred Users Preview",
      "Wallet Source",
    ];
    const lines = [
      headers.map(csvCell).join(","),
      ...visibleCustomers.map((customer) =>
        [
          displayValue(customer.full_name),
          displayValue(customer.mobile),
          displayValue(customer.email),
          safeCurrency(customer.walletBalance),
          safeCurrency(customer.cashbackBalance),
          customer.referralCount,
          customer.applicationsCount,
          customer.lastStatus.replace(/_/g, " ") || "Not provided",
          formatDate(customer.created_at),
          displayValue(customer.referralCode),
          personLabel(customer.referredBy),
          customer.referredUsersCount,
          customer.referredUsersPreview.map(personLabel).join("; ") || "No referrals yet",
          displayValue(customer.walletSource),
        ].map(csvCell).join(","),
      ),
    ];
    const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `digiconnect-customers-${todayForFilename()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm md:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_14rem_14rem_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={(event) => updateSearch(event.target.value)} placeholder="Search name, mobile, email, referral code..." className="h-11 pl-11" />
          </label>
          <Select value={filter} onValueChange={(value) => updateFilter(value as AdminCustomerFilter)}>
            <SelectTrigger className="h-11 rounded-full">
              <SelectValue placeholder="Filter users" />
            </SelectTrigger>
            <SelectContent>
              {filterOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(value) => updateSort(value as SortOption)}>
            <SelectTrigger className="h-11 rounded-full">
              <SelectValue placeholder="Sort users" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button type="button" onClick={downloadCsv} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-bold text-white">
            <Download className="h-4 w-4" />
            Download Excel
          </button>
        </div>
      </div>

      <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm md:p-5">
        {!visibleCustomers.length ? <AdminEmptyState title="No users found" description="Try a different search or filter." /> : null}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {pagedCustomers.map((customer) => (
            <article key={customer.id} className="flex min-h-[25rem] min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-blue-100 hover:shadow-md">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="line-clamp-1 font-bold text-slate-950">{displayValue(customer.full_name)}</p>
                  <p className="mt-1 line-clamp-1 text-xs text-slate-500">{displayValue(customer.email)}</p>
                  <p className="mt-1 truncate text-xs text-slate-600">
                    <span className="font-semibold text-slate-500">Mobile: </span>
                    <span className="font-mono">{displayMobile(customer.mobile)}</span>
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">User</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-500">
                <div className="min-w-0 overflow-hidden rounded-xl bg-slate-50 p-2">
                  <p className="truncate">Wallet</p>
                  <p className="mt-1 font-bold text-slate-900">{safeCurrency(customer.walletBalance)}</p>
                </div>
                <div className="min-w-0 overflow-hidden rounded-xl bg-slate-50 p-2">
                  <p className="truncate">Cashback</p>
                  <p className="mt-1 font-bold text-slate-900">{safeCurrency(customer.cashbackBalance)}</p>
                </div>
                <div className="min-w-0 overflow-hidden rounded-xl bg-slate-50 p-2">
                  <p className="truncate">Referred Users</p>
                  <p className="mt-1 font-bold text-slate-900">{customer.referredUsersCount}</p>
                </div>
                <div className="min-w-0 overflow-hidden rounded-xl bg-slate-50 p-2">
                  <p className="truncate">Applications</p>
                  <p className="mt-1 font-bold text-slate-900">{customer.applicationsCount}</p>
                </div>
              </div>
              <div className="mt-3 grid min-w-0 gap-2 text-xs text-slate-600">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <span className="shrink-0 text-slate-500">Referral code</span>
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="min-w-0 truncate rounded-full bg-blue-50 px-2.5 py-1 font-mono text-[11px] font-bold text-blue-700">
                      {customer.referralCode || "Not provided"}
                    </span>
                    {customer.referralCode ? (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(customer.referralCode)}
                        title="Copy referral code"
                        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:text-blue-700"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="min-w-0 overflow-hidden rounded-xl border border-slate-100 bg-white p-2">
                  <p className="line-clamp-1 font-semibold text-slate-500">
                    Referred by: <span className="font-bold text-slate-900">{personName(customer.referredBy)}</span>
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-slate-500">{personContact(customer.referredBy)}</p>
                </div>
                <div className="min-h-[5.5rem] min-w-0 overflow-hidden rounded-xl bg-slate-50 p-2">
                  <p className="truncate font-semibold text-slate-500">Referred users preview</p>
                  {customer.referredUsersPreview.length ? (
                    <div className="mt-1 space-y-1 overflow-hidden">
                      {customer.referredUsersPreview.slice(0, 2).map((person, index) => (
                        <p key={`${person.name ?? person.email ?? person.mobile ?? "referral"}-${index}`} className="line-clamp-1 min-w-0 text-slate-700">
                          <span className="font-semibold text-slate-900">{personName(person)}</span>
                          <span className="text-slate-400"> - </span>
                          <span className="font-mono text-[11px] text-slate-500">{personContact(person)}</span>
                        </p>
                      ))}
                      {customer.referredUsersPreview.length > 2 ? (
                        <p className="truncate text-[11px] font-bold text-blue-700">+{customer.referredUsersPreview.length - 2} more</p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-1 text-slate-500">No referrals yet</p>
                  )}
                </div>
                <div className="grid min-w-0 grid-cols-[5rem_minmax(0,1fr)] gap-2">
                  <span className="truncate text-slate-500">Last status</span>
                  <span className="truncate font-bold capitalize text-slate-900">{customer.lastStatus.replace(/_/g, " ") || "Not provided"}</span>
                </div>
                <div className="grid min-w-0 grid-cols-[5rem_minmax(0,1fr)] gap-2">
                  <span className="truncate text-slate-500">Created</span>
                  <span className="truncate font-bold text-slate-900">{formatDate(customer.created_at)}</span>
                </div>
              </div>
              <div className="mt-auto pt-4">
                {customer.canOpenDetails && customer.customerId ? (
                  <Link
                    href={`/admin/customers/${customer.customerId}`}
                    onClick={() => setOpeningId(customer.id)}
                    className="inline-flex h-8 items-center gap-2 rounded-full bg-blue-600 px-3 text-xs font-bold text-white transition hover:bg-blue-700"
                    aria-disabled={openingId === customer.id}
                  >
                    {openingId === customer.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                    {openingId === customer.id ? "Opening..." : "View Details"}
                  </Link>
                ) : (
                  <span className="inline-flex h-8 items-center rounded-full bg-slate-100 px-3 text-xs font-bold text-slate-600">
                    Registered user
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
        {visibleCustomers.length > pagedCustomers.length ? (
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900"
            >
              Load More ({visibleCustomers.length - pagedCustomers.length} left)
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
