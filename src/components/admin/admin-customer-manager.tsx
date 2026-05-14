"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState, useTransition } from "react";
import { Download, ExternalLink, LoaderCircle, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/providers/toast-provider";
import { AdminEmptyState } from "@/components/admin/admin-shell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { safeCurrency, safeDate } from "@/lib/admin-format";

const PAGE_SIZE = 30;

export type AdminCustomerRow = {
  id: string;
  customerId: string | null;
  userId: string | null;
  full_name: string;
  mobile: string;
  email: string | null;
  role: string;
  source: string;
  created_at: string;
  applicationsCount: number;
  lastStatus: string;
  walletBalance: number;
  cashbackBalance: number;
  referralCount: number;
  canOpenDetails: boolean;
};

function formatDate(date: string) {
  return safeDate(date);
}

function displayValue(value: string | null | undefined) {
  return value?.trim() || "Not provided";
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
  const [formOpen, setFormOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const visibleCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return customers.filter((customer) => {
      if (!query) return true;
      return `${customer.full_name} ${customer.mobile} ${customer.email ?? ""} ${customer.role}`.toLowerCase().includes(query);
    });
  }, [customers, search]);
  const pagedCustomers = visibleCustomers.slice(0, visibleCount);

  function updateSearch(value: string) {
    setSearch(value);
    setVisibleCount(PAGE_SIZE);
  }

  function downloadCsv() {
    const headers = [
      "Customer Name",
      "Mobile",
      "Email",
      "Wallet Balance",
      "Cashback Balance",
      "Referral Count",
      "Applications Count",
      "Joined Date",
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

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const mobile = String(formData.get("mobile") ?? "").trim();

    if (!/^\d{10}$/.test(mobile)) {
      toastError("Enter a valid 10 digit mobile number.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/customers", {
          method: "POST",
          body: formData,
        });
        const result = (await response.json()) as { message?: string };

        if (!response.ok) throw new Error(result.message ?? "Customer could not be added.");

        success(result.message ?? "Customer added.");
        form.reset();
        setFormOpen(false);
        router.refresh();
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Customer could not be added.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm md:p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={(event) => updateSearch(event.target.value)} placeholder="Search name, mobile, email..." className="h-11 pl-11" />
          </label>
          <button type="button" onClick={downloadCsv} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-bold text-white">
            <Download className="h-4 w-4" />
            Download Excel
          </button>
          <button type="button" onClick={() => setFormOpen((open) => !open)} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-bold text-white">
            <Plus className="h-4 w-4" />
            Add Customer
          </button>
        </div>

        {formOpen ? (
          <form onSubmit={submit} className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-2">
            <Input name="fullName" placeholder="Name" required />
            <Input name="mobile" placeholder="10 digit mobile" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} required />
            <Input name="email" placeholder="Email optional" type="email" />
            <Input name="address" placeholder="Address optional" />
            <Textarea name="notes" placeholder="Notes optional" className="md:col-span-2" />
            <button type="submit" disabled={isPending} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-orange-500 px-4 text-sm font-bold text-white md:w-fit">
              {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {isPending ? "Saving..." : "Save Customer"}
            </button>
          </form>
        ) : null}
      </div>

      <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm md:p-5">
        {!visibleCustomers.length ? <AdminEmptyState title="No customers found" description="Try a different search or add a customer manually." /> : null}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {pagedCustomers.map((customer) => (
            <article key={customer.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-950">{displayValue(customer.full_name)}</p>
                  <p className="mt-1 font-mono text-sm text-slate-600">{displayValue(customer.mobile)}</p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold capitalize text-blue-700">{displayValue(customer.role).replace(/_/g, " ")}</span>
              </div>
              <div className="mt-4 grid gap-2 text-sm text-slate-600">
                <p>Email: <span className="font-semibold text-slate-800">{displayValue(customer.email)}</span></p>
                <p>Source: <span className="font-semibold capitalize text-slate-800">{displayValue(customer.source).replace(/_/g, " ")}</span></p>
                <p>Wallet: <span className="font-semibold text-slate-800">{safeCurrency(customer.walletBalance)}</span></p>
                <p>Cashback: <span className="font-semibold text-slate-800">{safeCurrency(customer.cashbackBalance)}</span></p>
                <p>Referrals: <span className="font-semibold text-slate-800">{customer.referralCount}</span></p>
                <p>Applications: <span className="font-semibold text-slate-800">{customer.applicationsCount}</span></p>
                <p>Last Status: <span className="font-semibold capitalize text-slate-800">{customer.lastStatus.replace(/_/g, " ") || "Not provided"}</span></p>
                <p>Created: <span className="font-semibold text-slate-800">{formatDate(customer.created_at)}</span></p>
              </div>
              {customer.canOpenDetails && customer.customerId ? (
                <Link
                  href={`/admin/customers/${customer.customerId}`}
                  onClick={() => setOpeningId(customer.id)}
                  className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-bold text-white"
                  aria-disabled={openingId === customer.id}
                >
                  {openingId === customer.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                  {openingId === customer.id ? "Opening..." : "View Details"}
                </Link>
              ) : (
                <span className="mt-4 inline-flex h-10 items-center rounded-full bg-slate-100 px-4 text-sm font-bold text-slate-600">
                  Signed-up user
                </span>
              )}
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
