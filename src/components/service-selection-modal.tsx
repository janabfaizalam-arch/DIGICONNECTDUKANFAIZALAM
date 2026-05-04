"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CarFront,
  Check,
  ClipboardCheck,
  FileBadge2,
  FileCheck2,
  FileSearch,
  Fingerprint,
  HeartPulse,
  IdCard,
  Landmark,
  Search,
  ShieldCheck,
  Tractor,
  WalletCards,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/browser";

type ServiceCategory = "All" | "Government" | "Certificates" | "Business" | "Licenses" | "Finance";

type ServiceSelectionModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSelectedSlugs?: string[];
};

const categories: ServiceCategory[] = ["All", "Government", "Certificates", "Business", "Licenses", "Finance"];

const serviceItems = [
  { title: "PAN Card", slug: "pan-card", benefit: "Apply, correction, reprint", category: "Government", icon: FileCheck2 },
  { title: "Aadhaar Update", slug: "aadhaar-update", benefit: "Demographic update support", category: "Government", icon: Fingerprint },
  { title: "Voter ID", slug: "voter-id", benefit: "New ID and corrections", category: "Government", icon: IdCard },
  { title: "Ration Card", slug: "ration-card", benefit: "Family card assistance", category: "Government", icon: WalletCards },
  { title: "Income Certificate", slug: "income-caste-domicile-certificate", benefit: "Certificate application help", category: "Certificates", icon: FileSearch },
  { title: "Caste Certificate", slug: "income-caste-domicile-certificate", benefit: "Document guidance", category: "Certificates", icon: BadgeCheck },
  { title: "Domicile Certificate", slug: "income-caste-domicile-certificate", benefit: "Residence proof support", category: "Certificates", icon: Landmark },
  { title: "GST Registration", slug: "gst-registration", benefit: "Business GST onboarding", category: "Business", icon: Building2 },
  { title: "MSME Certificate", slug: "msme", benefit: "Udyam/MSME support", category: "Business", icon: BriefcaseBusiness },
  { title: "Passport Assistance", slug: "passport-assistance", benefit: "Form and appointment help", category: "Government", icon: ShieldCheck },
  { title: "Driving Licence", slug: "driving-licence", benefit: "Learner, permanent, renewal", category: "Licenses", icon: CarFront },
  { title: "Ayushman Card", slug: "ayushman-card", benefit: "Eligibility and print support", category: "Government", icon: HeartPulse },
  { title: "Labour Card", slug: "labour-card-e-shram-card", benefit: "Labour and e-Shram card assistance", category: "Government", icon: ClipboardCheck },
  { title: "Food License", slug: "food-license", benefit: "FSSAI food license support", category: "Licenses", icon: FileBadge2 },
  { title: "Trade License", slug: "trade-license", benefit: "Trade license and shop act support", category: "Licenses", icon: BriefcaseBusiness },
  { title: "e-Shram Card", slug: "labour-card-e-shram-card", benefit: "Worker registration support", category: "Government", icon: ClipboardCheck },
  { title: "PM Kisan", slug: "pm-kisan-pension-schemes", benefit: "Scheme application assistance", category: "Finance", icon: Tractor },
  { title: "Pension Schemes", slug: "pm-kisan-pension-schemes", benefit: "Pension and welfare scheme help", category: "Finance", icon: Landmark },
] satisfies Array<{
  title: string;
  slug: string;
  benefit: string;
  category: Exclude<ServiceCategory, "All">;
  icon: typeof FileCheck2;
}>;

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

export function ServiceSelectionModal({ open, onOpenChange, initialSelectedSlugs = [] }: ServiceSelectionModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory>("All");
  const [selectedSlug, setSelectedSlug] = useState(initialSelectedSlugs[0] ?? "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedSlug(initialSelectedSlugs[0] ?? "");
      setLoading(false);
    }
  }, [initialSelectedSlugs, open]);

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

    return serviceItems.filter((service) => {
      const categoryMatches = selectedCategory === "All" || service.category === selectedCategory;
      const searchMatches = !search || `${service.title} ${service.benefit}`.toLowerCase().includes(search);

      return categoryMatches && searchMatches;
    });
  }, [query, selectedCategory]);

  async function continueWithSelected() {
    if (!selectedSlug) {
      return;
    }

    setLoading(true);
    const href = await getApplyHref(selectedSlug);
    onOpenChange(false);
    router.push(href);
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center md:justify-center md:p-6">
      <button type="button" aria-label="Close service selection" className="absolute inset-0 bg-slate-950/45" onClick={() => onOpenChange(false)} />

      <section
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
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 overscroll-contain md:p-5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {filteredServices.map(({ title, slug, benefit, icon: Icon }) => {
              const selected = selectedSlug === slug;

              return (
                <button
                  key={`${title}-${slug}`}
                  type="button"
                  onClick={() => setSelectedSlug(slug)}
                  className={`flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left ${
                    selected ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600" : "bg-white"
                  }`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[var(--primary)]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-slate-950">{title}</span>
                    <span className="block truncate text-xs text-slate-600">{benefit}</span>
                  </span>
                  {selected ? (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                      <Check className="h-4 w-4" />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          {!filteredServices.length ? (
            <p className="rounded-xl bg-slate-50 p-5 text-center text-sm font-semibold text-slate-600">No services found.</p>
          ) : null}
        </div>

        <footer className="flex shrink-0 items-center justify-end gap-2 border-t bg-slate-50 p-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!selectedSlug || loading} onClick={() => void continueWithSelected()}>
            {loading ? "Opening..." : "Continue"}
          </Button>
        </footer>
      </section>
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
  allowMultiSelect?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
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
      <button type="button" onClick={() => void handleClick()} disabled={loading} className={className}>
        {loading ? "Opening..." : children}
      </button>
      <ServiceSelectionModal open={open} onOpenChange={setOpen} />
    </>
  );
}
