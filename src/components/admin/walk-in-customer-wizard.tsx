"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { CheckCircle2, Search, UserPlus } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormSubmitButton } from "@/components/ui/loading";

type LookupCustomer = {
  id: string;
  fullName: string;
  mobile: string;
  email: string | null;
  address: string | null;
  pincode: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
};

type RecentApp = {
  id: string;
  serviceName: string | null;
  status: string | null;
  createdAt: string | null;
};

type CreatedResult = {
  customerId: string;
  temporaryPin: string;
  mobile: string;
  next: {
    selectServiceHref: string;
    customerHref: string;
    applicationsHref: string;
  };
};

function digits(value: string, max: number) {
  return value.replace(/\D/g, "").slice(0, max);
}

export function WalkInCustomerWizard() {
  const { success, error: toastError } = useToast();
  const mobileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [mobile, setMobile] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [found, setFound] = useState<LookupCustomer | null>(null);
  const [recentApplications, setRecentApplications] = useState<RecentApp[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [formError, setFormError] = useState("");
  const [created, setCreated] = useState<CreatedResult | null>(null);

  const [fullName, setFullName] = useState("");
  const [alternateMobile, setAlternateMobile] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [stateName, setStateName] = useState("");
  const [referralSource, setReferralSource] = useState("Walk-in");

  useEffect(() => {
    mobileRef.current?.focus();
  }, []);

  useEffect(() => {
    if (pincode.length !== 6) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/pincode?pincode=${pincode}`, { signal: controller.signal });
        const data = (await response.json()) as {
          ok?: boolean;
          city?: string;
          district?: string;
          state?: string;
        };
        if (!response.ok || !data.ok) return;
        if (data.city) setCity((prev) => prev || data.city || "");
        if (data.district) setDistrict((prev) => prev || data.district || "");
        if (data.state) setStateName((prev) => prev || data.state || "");
      } catch {
        // Manual entry remains available.
      }
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [pincode]);

  async function runLookup() {
    setFormError("");
    setCreated(null);
    setFound(null);
    setNotFound(false);
    setRecentApplications([]);

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setFormError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    setLookupLoading(true);
    try {
      const response = await fetch(`/api/admin/customers/lookup?mobile=${encodeURIComponent(mobile)}`);
      const data = (await response.json()) as {
        error?: string;
        found?: boolean;
        customer?: LookupCustomer | null;
        recentApplications?: RecentApp[];
      };
      if (!response.ok) throw new Error(data.error || "Lookup failed.");

      if (data.found && data.customer) {
        setFound(data.customer);
        setRecentApplications(data.recentApplications || []);
        success("Existing customer found.");
      } else {
        setNotFound(true);
        success("No customer found. Enter details to create.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lookup failed.";
      setFormError(message);
      toastError(message);
    } finally {
      setLookupLoading(false);
    }
  }

  function createCustomer() {
    if (isPending) return;
    setFormError("");
    setCreated(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/customers/walk-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName,
            mobile,
            alternateMobile: alternateMobile || null,
            address,
            pincode,
            city,
            district,
            state: stateName,
            referralSource,
          }),
        });
        const data = (await response.json()) as CreatedResult & { error?: string };
        if (!response.ok || !data.customerId) {
          throw new Error(data.error || "Customer could not be created.");
        }
        setCreated(data);
        setNotFound(false);
        success("Walk-in customer created.");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Create failed.";
        setFormError(message);
        toastError(message);
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 md:p-6">
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--primary)]">Step 1 · Mobile</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">Find or create walk-in customer</h2>
          <p className="mt-1 text-sm text-slate-600">Mobile field is focused first. Existing customers are loaded automatically.</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="grid flex-1 gap-2">
            <span className="text-sm font-bold text-slate-700">WhatsApp / Mobile</span>
            <Input
              ref={mobileRef}
              inputMode="numeric"
              autoComplete="tel"
              placeholder="10-digit mobile"
              value={mobile}
              onChange={(event) => setMobile(digits(event.target.value, 10))}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void runLookup();
                }
              }}
            />
          </label>
          <div className="flex items-end">
            <FormSubmitButton
              type="button"
              loading={lookupLoading}
              loadingText="Searching..."
              icon={<Search className="h-4 w-4" />}
              className="w-full sm:w-auto"
              onClick={() => void runLookup()}
            >
              Search
            </FormSubmitButton>
          </div>
        </div>
      </Card>

      {found ? (
        <Card className="space-y-4 border-emerald-200 bg-emerald-50/40 p-4 md:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Existing customer</p>
            <h3 className="mt-1 text-xl font-bold text-slate-900">{found.fullName}</h3>
            <p className="text-sm text-slate-700">+91 {found.mobile}</p>
            <p className="mt-2 text-sm text-slate-600">
              {[found.address, found.city, found.district, found.state, found.pincode].filter(Boolean).join(" · ") || "Address not on file"}
            </p>
          </div>

          {recentApplications.length ? (
            <div>
              <p className="text-sm font-bold text-slate-800">Recent applications</p>
              <ul className="mt-2 space-y-2">
                {recentApplications.map((app) => (
                  <li key={app.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                    <Link href={`/admin/applications/${app.id}`} className="font-semibold text-[var(--primary)] underline">
                      {app.serviceName || "Application"}
                    </Link>
                    <span className="text-slate-500"> · {app.status || "—"}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-slate-600">No previous applications.</p>
          )}

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/admin/offline-invoices/new?customerId=${encodeURIComponent(found.id)}`}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white"
            >
              Continue to service / invoice
            </Link>
            <Link
              href={`/admin/customers/${encodeURIComponent(found.id)}`}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800"
            >
              Open customer 360
            </Link>
          </div>
        </Card>
      ) : null}

      {notFound ? (
        <Card className="space-y-4 p-4 md:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--primary)]">Step 2 · New customer</p>
            <h3 className="mt-1 text-lg font-bold text-slate-900">Create walk-in profile</h3>
            <p className="mt-1 text-sm text-slate-600">PIN-compatible login will be created. Share the temporary PIN privately once.</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-2 md:col-span-2">
              <span className="text-sm font-bold text-slate-700">Full name</span>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required autoComplete="name" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700">Alternate mobile</span>
              <Input
                inputMode="numeric"
                value={alternateMobile}
                onChange={(e) => setAlternateMobile(digits(e.target.value, 10))}
                placeholder="Optional"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700">Referral source</span>
              <Input value={referralSource} onChange={(e) => setReferralSource(e.target.value)} />
            </label>
            <label className="grid gap-2 md:col-span-2">
              <span className="text-sm font-bold text-slate-700">Address</span>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} required />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700">PIN code</span>
              <Input
                inputMode="numeric"
                value={pincode}
                onChange={(e) => setPincode(digits(e.target.value, 6))}
                required
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700">City / village / town</span>
              <Input value={city} onChange={(e) => setCity(e.target.value)} required />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700">District</span>
              <Input value={district} onChange={(e) => setDistrict(e.target.value)} required />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700">State</span>
              <Input value={stateName} onChange={(e) => setStateName(e.target.value)} required />
            </label>
          </div>

          <FormSubmitButton
            type="button"
            loading={isPending}
            loadingText="Creating..."
            icon={<UserPlus className="h-4 w-4" />}
            className="w-full md:w-fit"
            onClick={createCustomer}
          >
            Create customer
          </FormSubmitButton>
        </Card>
      ) : null}

      {created ? (
        <Card className="space-y-3 border-emerald-200 bg-emerald-50 p-4 md:p-6 text-emerald-950">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-bold">Customer created</p>
              <p className="mt-1 text-sm">Mobile +91 {created.mobile}</p>
              <p className="mt-2 rounded-xl bg-white/80 px-3 py-2 font-mono text-lg font-bold tracking-widest">
                Temporary PIN: {created.temporaryPin}
              </p>
              <p className="mt-2 text-sm font-semibold text-amber-900">
                Shown once only. Do not store in notes, browser storage, screenshots shared publicly, or URLs.
                Share privately; customer should change PIN after first login at /customer/login.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={created.next.selectServiceHref}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white"
            >
              Continue to service / invoice
            </Link>
            <Link
              href={created.next.customerHref}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-300 bg-white px-4 text-sm font-bold"
            >
              Open customer
            </Link>
          </div>
        </Card>
      ) : null}

      {formError ? (
        <p className="rounded-2xl bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700" role="alert">
          {formError}
        </p>
      ) : null}
    </div>
  );
}
