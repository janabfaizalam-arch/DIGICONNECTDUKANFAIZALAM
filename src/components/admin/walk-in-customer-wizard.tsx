"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
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

type CrmService = {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  customerFee: number;
  processingTime: string | null;
  requiredDocuments: string | null;
  instructions: string | null;
  customerInitialStatus: string;
  internalInitialStatus: string;
};

type SuccessResult = {
  deduped?: boolean;
  customerId: string;
  applicationId: string;
  workId: string | null;
  customerName: string;
  mobileMasked: string;
  serviceName: string;
  amount: number;
  paymentStatus: string;
  status: string;
  estimatedCompletion: string | null;
  assignmentLabel: string;
  whatsapp: string;
  temporaryPin?: string;
  temporaryPinShownOnce?: boolean;
  next: {
    applicationHref: string;
    customerHref: string;
    unassignedHref: string;
    anotherHref: string;
  };
};

type Step = "lookup" | "confirm" | "create" | "service" | "review" | "success";

function digits(value: string, max: number) {
  return value.replace(/\D/g, "").slice(0, max);
}

function newIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `walkin-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function WalkInCustomerWizard({
  initialCustomerId = null,
  initialStep = null,
}: {
  initialCustomerId?: string | null;
  initialStep?: string | null;
}) {
  const { success, error: toastError } = useToast();
  const mobileRef = useRef<HTMLInputElement>(null);
  const serviceSearchId = useId();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>("lookup");
  const [mobile, setMobile] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [found, setFound] = useState<LookupCustomer | null>(null);
  const [recentApplications, setRecentApplications] = useState<RecentApp[]>([]);
  const [formError, setFormError] = useState("");
  const [successResult, setSuccessResult] = useState<SuccessResult | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const submitLock = useRef(false);

  const [fullName, setFullName] = useState("");
  const [alternateMobile, setAlternateMobile] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [stateName, setStateName] = useState("");
  const [referralSource, setReferralSource] = useState("Walk-in");
  const [notes, setNotes] = useState("");

  const [services, setServices] = useState<CrmService[]>([]);
  const [serviceQuery, setServiceQuery] = useState("");
  const [servicesLoading, setServicesLoading] = useState(false);
  const [selectedService, setSelectedService] = useState<CrmService | null>(null);
  const [oneTimePin, setOneTimePin] = useState<string | null>(null);

  useEffect(() => {
    mobileRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!initialCustomerId || initialStep !== "service") return;
    // Continue from Phase 2 create success URL without putting PIN in the query string.
    setFound({
      id: initialCustomerId,
      fullName: "Customer",
      mobile: "",
      email: null,
      address: null,
      pincode: null,
      city: null,
      district: null,
      state: null,
    });
    setStep("service");
  }, [initialCustomerId, initialStep]);

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

  useEffect(() => {
    if (step !== "service" && step !== "review") return;
    let cancelled = false;
    setServicesLoading(true);
    (async () => {
      try {
        const response = await fetch(`/api/admin/crm/services?q=${encodeURIComponent(serviceQuery)}`);
        const data = (await response.json()) as { services?: CrmService[]; error?: string };
        if (!response.ok) throw new Error(data.error || "Could not load services.");
        if (!cancelled) setServices(data.services || []);
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Could not load services.";
          setFormError(message);
        }
      } finally {
        if (!cancelled) setServicesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, serviceQuery]);

  const filteredServices = useMemo(() => services, [services]);

  async function runLookup() {
    setFormError("");
    setSuccessResult(null);
    setOneTimePin(null);
    setFound(null);
    setRecentApplications([]);
    setSelectedService(null);

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
        setStep("confirm");
        success("Existing customer found.");
      } else {
        setStep("create");
        success("No customer found. Enter details, then select a service.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lookup failed.";
      setFormError(message);
      toastError(message);
    } finally {
      setLookupLoading(false);
    }
  }

  function goToServiceFromExisting() {
    if (!found) return;
    setOneTimePin(null);
    setIdempotencyKey(newIdempotencyKey());
    setStep("service");
  }

  function goToServiceFromNewForm() {
    setFormError("");
    if (!fullName.trim() || !address.trim() || !city.trim() || !district.trim() || !stateName.trim()) {
      setFormError("Name, address, city, district, and state are required.");
      return;
    }
    if (!/^\d{6}$/.test(pincode)) {
      setFormError("Enter a valid 6-digit PIN code.");
      return;
    }
    setIdempotencyKey(newIdempotencyKey());
    setStep("service");
  }

  function submitApplication() {
    if (isPending || submitLock.current || !selectedService) return;
    setFormError("");
    submitLock.current = true;

    startTransition(async () => {
      try {
        const payload: Record<string, unknown> = {
          idempotencyKey,
          serviceSlug: selectedService.slug,
          notes: notes || null,
        };

        if (found?.id) {
          payload.customerId = found.id;
        } else {
          payload.newCustomer = {
            fullName,
            mobile,
            alternateMobile: alternateMobile || null,
            address,
            pincode,
            city,
            district,
            state: stateName,
            referralSource,
          };
        }

        const response = await fetch("/api/admin/crm/walk-in-application", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await response.json()) as SuccessResult & {
          error?: string;
          customerId?: string;
          temporaryPin?: string;
        };
        if (!response.ok) {
          if (data.customerId && !found) {
            setFound({
              id: data.customerId,
              fullName,
              mobile,
              email: null,
              address,
              pincode,
              city,
              district,
              state: stateName,
            });
          }
          throw new Error(data.error || "Application could not be created.");
        }

        if (data.temporaryPin) {
          setOneTimePin(data.temporaryPin);
        }
        setSuccessResult(data);
        setStep("success");
        success(data.deduped ? "Already created (idempotent replay)." : "Application created.");
        // Rotate key only after success so retries of same click stay safe.
        setIdempotencyKey(newIdempotencyKey());
      } catch (error) {
        const message = error instanceof Error ? error.message : "Create failed.";
        setFormError(message);
        toastError(message);
      } finally {
        submitLock.current = false;
      }
    });
  }

  function resetWizard() {
    setStep("lookup");
    setFound(null);
    setRecentApplications([]);
    setSelectedService(null);
    setSuccessResult(null);
    setOneTimePin(null);
    setNotes("");
    setIdempotencyKey(newIdempotencyKey());
    setFormError("");
    mobileRef.current?.focus();
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 md:p-6">
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--primary)]">
            Walk-in · {step === "lookup" ? "1 · Mobile" : step === "confirm" || step === "create" ? "2 · Customer" : step === "service" || step === "review" ? "3 · Service" : "4 · Done"}
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">Counter walk-in workflow</h2>
          <p className="mt-1 text-sm text-slate-600">
            Lookup → confirm or create → service → application. Existing customers never create a duplicate profile.
          </p>
        </div>

        {(step === "lookup" || step === "create" || step === "confirm") && (
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="grid flex-1 gap-2">
              <span className="text-sm font-bold text-slate-700">WhatsApp / Mobile</span>
              <Input
                ref={mobileRef}
                inputMode="numeric"
                autoComplete="tel"
                placeholder="10-digit mobile"
                value={mobile}
                disabled={step !== "lookup"}
                onChange={(event) => setMobile(digits(event.target.value, 10))}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && step === "lookup") {
                    event.preventDefault();
                    void runLookup();
                  }
                }}
              />
            </label>
            {step === "lookup" ? (
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
            ) : null}
          </div>
        )}
      </Card>

      {step === "confirm" && found ? (
        <Card className="space-y-4 border-emerald-200 bg-emerald-50/40 p-4 md:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Existing customer</p>
            <h3 className="mt-1 text-xl font-bold text-slate-900">{found.fullName}</h3>
            <p className="text-sm text-slate-700">+91 {found.mobile}</p>
            <p className="mt-2 text-sm text-slate-600">
              {[found.address, found.city, found.district, found.state, found.pincode].filter(Boolean).join(" · ") ||
                "Address not on file"}
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
                    <span className="text-slate-500">
                      {" "}
                      · {app.status || "—"}
                      {app.createdAt ? ` · ${new Date(app.createdAt).toLocaleDateString("en-IN")}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-slate-600">No previous applications.</p>
          )}

          <div className="flex flex-wrap gap-3">
            <FormSubmitButton type="button" className="w-full sm:w-auto" onClick={goToServiceFromExisting}>
              Create application / Select service
            </FormSubmitButton>
            <Link
              href={`/admin/customers/${encodeURIComponent(found.id)}`}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800"
            >
              Edit customer (separate)
            </Link>
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800"
              onClick={resetWizard}
            >
              Different mobile
            </button>
          </div>
        </Card>
      ) : null}

      {step === "create" ? (
        <Card className="space-y-4 p-4 md:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--primary)]">New customer</p>
            <h3 className="mt-1 text-lg font-bold text-slate-900">Details (saved with application)</h3>
            <p className="mt-1 text-sm text-slate-600">
              Customer record is created with the application submit to avoid abandoned profiles. PIN shown once after success.
            </p>
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
              <Input inputMode="numeric" value={pincode} onChange={(e) => setPincode(digits(e.target.value, 6))} required />
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

          <div className="flex flex-wrap gap-3">
            <FormSubmitButton
              type="button"
              icon={<UserPlus className="h-4 w-4" />}
              className="w-full md:w-fit"
              onClick={goToServiceFromNewForm}
            >
              Continue to service
            </FormSubmitButton>
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800"
              onClick={resetWizard}
            >
              Cancel
            </button>
          </div>
        </Card>
      ) : null}

      {(step === "service" || step === "review") && (
        <Card className="space-y-4 p-4 md:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--primary)]">Service selection</p>
            <h3 className="mt-1 text-lg font-bold text-slate-900">Choose an active service</h3>
            <p className="mt-1 text-sm text-slate-600">
              Price comes from the server catalogue (`agent_services`). Inactive services are hidden.
            </p>
          </div>

          <label className="grid gap-2" htmlFor={serviceSearchId}>
            <span className="text-sm font-bold text-slate-700">Search services</span>
            <Input
              id={serviceSearchId}
              value={serviceQuery}
              onChange={(e) => setServiceQuery(e.target.value)}
              placeholder="Name, category, or slug"
              autoComplete="off"
            />
          </label>

          {servicesLoading ? <p className="text-sm text-slate-600">Loading services…</p> : null}

          <ul className="max-h-72 space-y-2 overflow-y-auto" role="listbox" aria-label="Active services">
            {filteredServices.map((service) => {
              const selected = selectedService?.id === service.id;
              return (
                <li key={service.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                      selected ? "border-[var(--primary)] bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                    onClick={() => {
                      setSelectedService(service);
                      setStep("review");
                    }}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-bold text-slate-900">{service.title}</span>
                      <span className="text-sm font-semibold text-slate-700">₹{Number(service.customerFee).toLocaleString("en-IN")}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {[service.category, service.processingTime].filter(Boolean).join(" · ") || service.slug}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>

          {!servicesLoading && !filteredServices.length ? (
            <p className="text-sm text-slate-600">No active services match this search.</p>
          ) : null}
        </Card>
      )}

      {step === "review" && selectedService ? (
        <Card className="space-y-4 p-4 md:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--primary)]">Requirements & confirm</p>
            <h3 className="mt-1 text-lg font-bold text-slate-900">{selectedService.title}</h3>
            <p className="mt-1 text-sm text-slate-600">
              Amount ₹{Number(selectedService.customerFee).toLocaleString("en-IN")} · Status {selectedService.customerInitialStatus}
              {selectedService.processingTime ? ` · ETA ${selectedService.processingTime}` : ""}
            </p>
          </div>

          {selectedService.requiredDocuments ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <p className="font-bold text-slate-800">Required documents</p>
              <p className="mt-1 whitespace-pre-wrap">{selectedService.requiredDocuments}</p>
            </div>
          ) : null}

          {selectedService.instructions ? (
            <div className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
              <p className="font-bold text-slate-800">Notes for staff</p>
              <p className="mt-1 whitespace-pre-wrap">{selectedService.instructions}</p>
            </div>
          ) : null}

          <label className="grid gap-2">
            <span className="text-sm font-bold text-slate-700">Internal note (optional)</span>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Counter note" />
          </label>

          <p className="text-xs text-slate-500">
            Assignment defaults to the Unassigned queue unless a later rule/assignee is configured. WhatsApp runs after save and cannot
            block creation.
          </p>

          <div className="flex flex-wrap gap-3">
            <FormSubmitButton
              type="button"
              loading={isPending}
              loadingText="Creating..."
              className="w-full md:w-fit"
              onClick={submitApplication}
            >
              Create application
            </FormSubmitButton>
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800"
              onClick={() => setStep("service")}
            >
              Change service
            </button>
          </div>
        </Card>
      ) : null}

      {step === "success" && successResult ? (
        <Card className="space-y-4 border-emerald-200 bg-emerald-50 p-4 md:p-6 text-emerald-950">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="space-y-1">
              <p className="font-bold">Application created</p>
              <p className="text-sm">{successResult.customerName}</p>
              <p className="text-sm">Mobile {successResult.mobileMasked}</p>
              <p className="text-sm">
                Ref {successResult.workId || successResult.applicationId.slice(0, 8)} · {successResult.serviceName}
              </p>
              <p className="text-sm">
                Amount ₹{Number(successResult.amount).toLocaleString("en-IN")} · Payment {successResult.paymentStatus}
              </p>
              <p className="text-sm">
                {successResult.assignmentLabel} · Status {successResult.status}
                {successResult.estimatedCompletion ? ` · ETA ${successResult.estimatedCompletion}` : ""}
              </p>
              <p className="text-sm">WhatsApp: {successResult.whatsapp.replace(/_/g, " ")}</p>
            </div>
          </div>

          {oneTimePin ? (
            <div className="rounded-xl bg-white/90 px-3 py-3">
              <p className="font-mono text-lg font-bold tracking-widest">Temporary PIN: {oneTimePin}</p>
              <p className="mt-2 text-sm font-semibold text-amber-900">
                Shown once only on this screen. Not stored in browser storage, URL, or logs. Customer should change PIN after first login.
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white"
              onClick={resetWizard}
            >
              Create another application
            </button>
            <Link
              href={successResult.next.applicationHref}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-300 bg-white px-4 text-sm font-bold"
              onClick={() => setOneTimePin(null)}
            >
              View application
            </Link>
            {successResult.assignmentLabel === "Awaiting assignment" ? (
              <Link
                href={successResult.next.unassignedHref}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-300 bg-white px-4 text-sm font-bold"
              >
                Unassigned queue
              </Link>
            ) : null}
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
