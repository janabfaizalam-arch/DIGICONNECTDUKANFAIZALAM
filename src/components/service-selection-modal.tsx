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
  allowMultiSelect?: boolean;
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

async function getApplyHref(slugs: string[]) {
  const selected = Array.from(new Set(slugs)).filter(Boolean);
  const primarySlug = selected[0];

  if (!primarySlug) {
    return null;
  }

  const servicesParam = selected.length > 1 ? `?services=${encodeURIComponent(selected.join(","))}` : "";
  const applyPath = `/apply/${primarySlug}${servicesParam}`;
  const supabase = createClient();

  if (!supabase) {
    return `/login/customer?redirect=${encodeURIComponent(applyPath)}`;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user) {
    return applyPath;
  }

  return `/login/customer?redirect=${encodeURIComponent(applyPath)}`;
}

export function ServiceSelectionModal({
  open,
  onOpenChange,
  allowMultiSelect = true,
  initialSelectedSlugs = [],
}: ServiceSelectionModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory>("All");
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>(initialSelectedSlugs);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedSlugs(initialSelectedSlugs);
    }
  }, [initialSelectedSlugs, open]);

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

  async function continueWith(slugs: string[]) {
    const href = await getApplyHref(slugs);

    if (!href) {
      return;
    }

    setLoading(true);
    router.push(href);
    onOpenChange(false);
  }

  function toggleService(slug: string) {
    if (!allowMultiSelect) {
      void continueWith([slug]);
      return;
    }

    setSelectedSlugs((current) => (current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]));
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/45 p-0 md:items-center md:justify-center md:p-6">
      <button type="button" aria-label="Close service selection" className="absolute inset-0 cursor-default" onClick={() => onOpenChange(false)} />
      <div className="relative max-h-[90vh] w-full overflow-hidden rounded-t-[1.5rem] border border-white/20 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.22)] md:max-w-5xl md:rounded-[1.5rem]">
        <div className="flex items-start justify-between gap-4 border-b p-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">Choose a Service</h2>
            <p className="mt-1 text-sm text-slate-600">Select the service you want to apply for.</p>
          </div>
          <button type="button" onClick={() => onOpenChange(false)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        <div className="grid gap-3 border-b p-5 md:grid-cols-[1fr_auto] md:items-center">
          <label className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
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

        <div className="max-h-[50vh] overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredServices.map(({ title, slug, benefit, icon: Icon }) => {
              const selected = selectedSlugs.includes(slug);

              return (
                <button
                  key={`${title}-${slug}`}
                  type="button"
                  onClick={() => toggleService(slug)}
                  className={`rounded-2xl border p-4 text-left shadow-sm transition-transform md:hover:-translate-y-0.5 ${
                    selected ? "border-blue-500 bg-blue-50/70" : "bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[var(--primary)]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-slate-950">{title}</h3>
                        {selected ? (
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                            <Check className="h-4 w-4" />
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm leading-5 text-slate-600">{benefit}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {!filteredServices.length ? (
            <p className="rounded-2xl bg-slate-50 p-5 text-center text-sm font-semibold text-slate-600">No services found.</p>
          ) : null}
        </div>

        {allowMultiSelect ? (
          <div className="flex flex-col gap-3 border-t bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-slate-700">
              {selectedSlugs.length ? `${selectedSlugs.length} service${selectedSlugs.length === 1 ? "" : "s"} selected` : "Select one or more services"}
            </p>
            <Button type="button" disabled={!selectedSlugs.length || loading} onClick={() => void continueWith(selectedSlugs)} className="h-12">
              {loading ? "Opening..." : selectedSlugs.length > 1 ? "Apply Selected Services" : "Apply Now"}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ApplyServiceTrigger({
  children,
  serviceSlug,
  className,
  allowMultiSelect = true,
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
    const href = await getApplyHref([serviceSlug]);

    if (href) {
      router.push(href);
    }
  }

  return (
    <>
      <button type="button" onClick={() => void handleClick()} disabled={loading} className={className}>
        {loading ? "Opening..." : children}
      </button>
      <ServiceSelectionModal open={open} onOpenChange={setOpen} allowMultiSelect={allowMultiSelect} />
    </>
  );
}
