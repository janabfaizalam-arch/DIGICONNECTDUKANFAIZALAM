"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

import { createClient } from "@/lib/supabase/browser";
import { serviceCategories, servicesData, type ServiceCategorySlug } from "@/lib/services-data";
import { ButtonSpinner } from "@/components/ui/loading";

type ServiceCategory = "All" | ServiceCategorySlug;

type ServiceSelectionModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const categories: ServiceCategory[] = ["All", ...serviceCategories.map((category) => category.slug)];
const categoryLabels = new Map<ServiceCategory, string>([
  ["All", "All"],
  ...serviceCategories.map((category) => [category.slug, category.title] as const),
]);

async function getApplyHref(slug: string) {
  const applyPath = `/apply/${slug}`;
  const supabase = createClient();

  if (!supabase) {
    return `/login/customer?redirect=${encodeURIComponent(applyPath)}`;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.user ? applyPath : `/login/customer?redirect=${encodeURIComponent(applyPath)}`;
}

export function ServiceSelectionModal({ open, onOpenChange }: ServiceSelectionModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory>("All");

  useEffect(() => {
    if (!open || typeof document === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange, open]);

  const filteredServices = useMemo(() => {
    const search = query.trim().toLowerCase();

    return servicesData.filter((service) => {
      const categoryMatches = selectedCategory === "All" || service.categorySlug === selectedCategory;
      const searchMatches = !search || `${service.title} ${service.shortDescription}`.toLowerCase().includes(search);

      return categoryMatches && searchMatches;
    });
  }, [query, selectedCategory]);

  function handleServiceClick(slug: string) {
    router.push(`/apply/${slug}`);
    onOpenChange(false);
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center md:justify-center md:p-6">
      <button type="button" aria-label="Close service selection" className="absolute inset-0 bg-slate-950/45" onClick={() => onOpenChange(false)} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="service-selection-title"
        onClick={(event) => event.stopPropagation()}
        className="relative z-[101] flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl md:max-h-[85vh] md:max-w-3xl md:rounded-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b p-4 md:p-5">
          <div className="min-w-0">
            <h2 id="service-selection-title" className="text-xl font-bold text-slate-950 md:text-2xl">
              Choose a Service
            </h2>
            <p className="mt-1 text-sm text-slate-600">Select a service to start your application.</p>
          </div>
          <button type="button" onClick={() => onOpenChange(false)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </button>
        </header>

        <div className="shrink-0 space-y-3 border-b p-4 md:p-5">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search service..."
              className="h-11 w-full rounded-xl border bg-white pl-11 pr-4 text-sm outline-none focus:border-[var(--primary)]"
            />
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`h-9 shrink-0 rounded-full px-3 text-xs font-bold ${
                  selectedCategory === category ? "bg-[var(--primary)] text-white" : "border bg-white text-slate-700"
                }`}
              >
                {categoryLabels.get(category)}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 overscroll-contain md:p-5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {filteredServices.map(({ title, slug, shortDescription, icon: Icon }) => (
              <button
                key={`${title}-${slug}`}
                type="button"
                onClick={() => handleServiceClick(slug)}
                className="flex min-w-0 items-center gap-3 rounded-xl border bg-white p-3 text-left transition hover:border-blue-600 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[var(--primary)]">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-950">{title}</span>
                  <span className="block truncate text-xs text-slate-600">{shortDescription}</span>
                </span>
              </button>
            ))}
          </div>
          {!filteredServices.length ? (
            <p className="rounded-xl bg-slate-50 p-5 text-center text-sm font-semibold text-slate-600">No services found.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ApplyServiceTrigger({
  children,
  serviceSlug,
  className,
}: {
  children: ReactNode;
  serviceSlug?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    if (loading) {
      return;
    }

    if (!serviceSlug) {
      setOpen(true);
      return;
    }

    setLoading(true);
    const href = await getApplyHref(serviceSlug);
    router.push(href);
  }

  return (
    <>
      <button type="button" onClick={() => void handleClick()} disabled={loading} className={className} aria-busy={loading}>
        {loading ? (
          <span className="inline-flex items-center justify-center gap-2">
            <ButtonSpinner className="h-4 w-4" />
            Opening...
          </span>
        ) : (
          children
        )}
      </button>
      <ServiceSelectionModal open={open} onOpenChange={setOpen} />
    </>
  );
}
