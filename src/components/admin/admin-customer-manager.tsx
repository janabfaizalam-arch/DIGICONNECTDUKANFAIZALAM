"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Download, ExternalLink, LoaderCircle, Search } from "lucide-react";

import { AdminEmptyState } from "@/components/admin/admin-shell";
import { Input } from "@/components/ui/input";
import { safeCurrency, safeDate } from "@/lib/admin-format";
import type { AdminCustomerRow } from "@/lib/admin-customers";

const PAGE_SIZE = 30;

function formatDate(date: string) {
  return safeDate(date);
}

function displayValue(value: string | null | undefined) {
  return value?.trim() || "Not provided";
}

function displayMobile(value: string | null | undefined) {
  return value?.trim() || "Mobile not provided";
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

export function AdminCustomerManager({ customers }: { customers: AdminCustomerRow[] }) {
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const visibleCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return customers.filter((customer) => {
      if (!query) return true;
      return `${customer.full_name} ${customer.mobile} ${customer.email ?? ""}`.toLowerCase().includes(query);
    });
  }, [customers, search]);
  const pagedCustomers = visibleCustomers.slice(0, visibleCount);

  function updateSearch(value: string) {
    setSearch(value);
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
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={(event) => updateSearch(event.target.value)} placeholder="Search name, mobile, email..." className="h-11 pl-11" />
          </label>
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
            <article key={customer.id} className="flex min-h-[19rem] flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-blue-100 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-950">{displayValue(customer.full_name)}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{displayValue(customer.email)}</p>
                  <p className="mt-1 font-mono text-xs text-slate-600">{displayMobile(customer.mobile)}</p>
                </div>
                <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">User</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-500">
                <div className="rounded-xl bg-slate-50 p-2">
                  <p>Wallet</p>
                  <p className="mt-1 font-bold text-slate-900">{safeCurrency(customer.walletBalance)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-2">
                  <p>Cashback</p>
                  <p className="mt-1 font-bold text-slate-900">{safeCurrency(customer.cashbackBalance)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-2">
                  <p>Referrals</p>
                  <p className="mt-1 font-bold text-slate-900">{customer.referralCount}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-2">
                  <p>Applications</p>
                  <p className="mt-1 font-bold text-slate-900">{customer.applicationsCount}</p>
                </div>
              </div>
              <div className="mt-3 grid gap-1.5 text-xs text-slate-600">
                <p className="flex items-center justify-between gap-3">
                  <span>Last status</span>
                  <span className="truncate font-bold capitalize text-slate-900">{customer.lastStatus.replace(/_/g, " ") || "Not provided"}</span>
                </p>
                <p className="flex items-center justify-between gap-3">
                  <span>Created</span>
                  <span className="font-bold text-slate-900">{formatDate(customer.created_at)}</span>
                </p>
              </div>
              <div className="mt-auto pt-4">
                {customer.canOpenDetails && customer.customerId ? (
                  <Link
                    href={`/admin/customers/${customer.customerId}`}
                    onClick={() => setOpeningId(customer.id)}
                    className="inline-flex h-9 items-center gap-2 rounded-full bg-blue-600 px-3 text-xs font-bold text-white transition hover:bg-blue-700"
                    aria-disabled={openingId === customer.id}
                  >
                    {openingId === customer.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                    {openingId === customer.id ? "Opening..." : "View Details"}
                  </Link>
                ) : (
                  <span className="inline-flex h-9 items-center rounded-full bg-slate-100 px-3 text-xs font-bold text-slate-600">
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
