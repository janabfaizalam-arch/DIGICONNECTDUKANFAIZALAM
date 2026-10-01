"use client";

/**
 * Search and partner-type filter for the DC Partner directory.
 *
 * This was a `<form>` that submitted the page: every keystroke-then-Enter was
 * a full navigation, and the admin lost the filter on any route change. The
 * shared controls write the same query params the server page already reads
 * (`q`, `type`), debounced, so the URL stays the thing that describes the view
 * and nothing about the server contract changed.
 */

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  FilterBar,
  FilterSelect,
  SearchInput,
  type FilterOption,
} from "@/components/admin/primitives/controls";

export function PartnerFilters({ partnerTypes }: { partnerTypes: FilterOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeCount = ["q", "type"].filter((key) => searchParams.get(key)).length;

  return (
    <FilterBar
      activeCount={activeCount}
      onReset={() => router.replace(pathname, { scroll: false })}
      className="w-full"
    >
      <SearchInput
        paramKey="q"
        placeholder="Search partner name, mobile, email, shop name, or code…"
        className="min-w-56"
      />
      <FilterSelect
        paramKey="type"
        label="Filter by partner type"
        options={partnerTypes}
        allLabel="All partner types"
      />
    </FilterBar>
  );
}
