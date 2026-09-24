import Link from "next/link";
import { UserPlus } from "lucide-react";

import { partnerInitials } from "@/lib/ap/format";
import type { PartnerHomeRecentCustomer } from "@/lib/ap/home-types";
import { DashboardEmptyState } from "@/components/ap/home/dashboard-empty-state";

type CustomersPanelProps = {
  customers: PartnerHomeRecentCustomer[];
  /** Office staff see assigned customers; everyone else sees their own. */
  variant?: "own" | "assigned";
};

/**
 * Recent customers — the one place they are listed.
 *
 * The old page showed this list twice, once in the operations footer and again
 * in the office-work block, with different headings over the same rows.
 */
export function CustomersPanel({ customers, variant = "own" }: CustomersPanelProps) {
  const heading = variant === "assigned" ? "Assigned customers" : "Recent customers";

  return (
    <section aria-label={heading} className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="dcp-h2">{heading}</h2>
        <Link href="/ap/customers" className="text-[11.5px] font-bold text-[var(--dcp-brand)] hover:underline">
          All customers
        </Link>
      </div>

      {!customers.length ? (
        <DashboardEmptyState
          title={variant === "assigned" ? "Nothing assigned yet" : "No customers yet"}
          description={
            variant === "assigned"
              ? "Work assigned to you will appear here."
              : "Add your first customer to get started."
          }
        />
      ) : (
        <ul className="divide-y divide-[var(--dcp-line)] overflow-hidden dcp-card">
          {customers.map((customer) => (
            <li key={customer.id}>
              <Link
                href={customer.href}
                className="flex items-center gap-3 px-3.5 py-3 transition duration-150 hover:bg-[var(--dcp-surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1268e8]"
              >
                <span
                  aria-hidden
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eff6ff] text-[11px] font-bold text-[#0d4795]"
                >
                  {partnerInitials(customer.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-[var(--dcp-ink)]">{customer.name}</span>
                  <span className="block truncate font-mono text-[11px] font-medium text-[var(--dcp-ink-4)]">
                    {customer.mobile}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {variant === "own" ? (
        <Link
          href="/ap/customers/new"
          className="dcp-btn dcp-btn-quiet"
        >
          <UserPlus className="h-3.5 w-3.5" aria-hidden />
          New customer
        </Link>
      ) : null}
    </section>
  );
}
