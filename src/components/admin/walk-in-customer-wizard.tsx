"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { CheckCircle2, Search, UserPlus } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormSubmitButton } from "@/components/ui/loading";
import {
  extractSafeApiError,
  isRawJsonParseExceptionMessage,
  parseApiResponse,
} from "@/lib/http/parse-api-response";

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

/** What each step is for, in the operator's terms. */
const STEP_COPY: Record<Step, { title: string; hint: string }> = {
  lookup: {
    title: "Find the customer",
    hint: "Enter the WhatsApp or mobile number. If they already exist, we reuse that profile — no duplicates.",
  },
  confirm: {
    title: "Confirm the customer",
    hint: "This number is already registered. Check the details match the person at the counter.",
  },
  create: {
    title: "New customer details",
    hint: "This number is not registered yet. Fill in the details to create the profile.",
  },
  service: {
    title: "Choose the service",
    hint: "Pick the service the customer is here for. Prices come from the live catalogue.",
  },
  review: {
    title: "Confirm and create",
    hint: "Check the amount and required documents, then create the application.",
  },
  success: {
    title: "Application created",
    hint: "Share the reference with the customer, or start another walk-in.",
  },
};

function digits(value: string, max: number) {
  return value.replace(/\D/g, "").slice(0, max);
}

function newIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `walkin-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function toSuccessResult(data: Record<string, unknown>, selectedService?: CrmService | null): SuccessResult | null {
  const applicationId = data.applicationId ? String(data.applicationId) : "";
  const customerId = data.customerId ? String(data.customerId) : "";
  if (!applicationId) return null;
  const next =
    data.next && typeof data.next === "object"
      ? (data.next as SuccessResult["next"])
      : {
          applicationHref: `/admin/applications/${encodeURIComponent(applicationId)}`,
          customerHref: customerId
            ? `/admin/customers/${encodeURIComponent(customerId)}`
            : "/admin/customers",
          unassignedHref: "/admin/applications?agent=unassigned",
          anotherHref: "/admin/customers/walk-in",
        };

  return {
    deduped: Boolean(data.deduped || data.idempotentReplay),
    customerId,
    applicationId,
    workId: data.workId ? String(data.workId) : data.referenceNumber ? String(data.referenceNumber) : null,
    customerName: data.customerName ? String(data.customerName) : "Customer",
    mobileMasked: data.mobileMasked ? String(data.mobileMasked) : "**********",
    serviceName: data.serviceName ? String(data.serviceName) : selectedService?.title || "Service",
    amount: data.amount != null ? Number(data.amount) : selectedService?.customerFee || 0,
    paymentStatus: data.paymentStatus ? String(data.paymentStatus) : "pending",
    status: data.status ? String(data.status) : "submitted",
    estimatedCompletion: data.estimatedCompletion
      ? String(data.estimatedCompletion)
      : selectedService?.processingTime || null,
    assignmentLabel: data.assignmentLabel ? String(data.assignmentLabel) : "Awaiting assignment",
    whatsapp: data.whatsapp
      ? String(data.whatsapp)
      : data.notificationStatus
        ? String(data.notificationStatus)
        : "configuration_required",
    temporaryPin: data.temporaryPin ? String(data.temporaryPin) : undefined,
    temporaryPinShownOnce: Boolean(data.temporaryPinShownOnce),
    next,
  };
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
  /** Correlation id from the failed create — the only handle support has on the server log. */
  const [errorCorrelationId, setErrorCorrelationId] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<SuccessResult | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [showStatusAction, setShowStatusAction] = useState(false);
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
        const parsed = await parseApiResponse<{
          ok?: boolean;
          city?: string;
          district?: string;
          state?: string;
        }>(response);
        if (!parsed.ok || !parsed.data?.ok) return;
        if (parsed.data.city) setCity((prev) => prev || parsed.data?.city || "");
        if (parsed.data.district) setDistrict((prev) => prev || parsed.data?.district || "");
        if (parsed.data.state) setStateName((prev) => prev || parsed.data?.state || "");
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
        const parsed = await parseApiResponse<{ services?: CrmService[]; error?: string }>(response);
        if (!parsed.ok) {
          throw new Error(extractSafeApiError(parsed).message);
        }
        if (!cancelled) setServices(parsed.data?.services || []);
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Could not load services.";
          setFormError(isRawJsonParseExceptionMessage(message) ? "Could not load services." : message);
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

  async function recoverByIdempotencyKey(key: string): Promise<SuccessResult | null> {
    const response = await fetch(
      `/api/admin/crm/walk-in-application?idempotencyKey=${encodeURIComponent(key)}`,
    );
    const parsed = await parseApiResponse<Record<string, unknown>>(response);
    if (!parsed.ok || !parsed.data) return null;
    if (parsed.data.recoveryStatus !== "succeeded") return null;
    return toSuccessResult(parsed.data, selectedService);
  }

  async function runLookup() {
    setFormError("");
    setSuccessResult(null);
    setOneTimePin(null);
    setFound(null);
    setRecentApplications([]);
    setSelectedService(null);
    setShowStatusAction(false);

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setFormError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    setLookupLoading(true);
    try {
      const response = await fetch(`/api/admin/customers/lookup?mobile=${encodeURIComponent(mobile)}`);
      const parsed = await parseApiResponse<{
        error?: string;
        found?: boolean;
        customer?: LookupCustomer | null;
        recentApplications?: RecentApp[];
      }>(response);
      if (!parsed.ok) throw new Error(extractSafeApiError(parsed).message);

      if (parsed.data?.found && parsed.data.customer) {
        setFound(parsed.data.customer);
        setRecentApplications(parsed.data.recentApplications || []);
        setStep("confirm");
        success("Existing customer found.");
      } else {
        setStep("create");
        success("No customer found. Enter details, then select a service.");
      }
    } catch (error) {
      const raw = error instanceof Error ? error.message : "Lookup failed.";
      const message = isRawJsonParseExceptionMessage(raw) ? "Lookup failed." : raw;
      setFormError(message);
      toastError(message);
    } finally {
      setLookupLoading(false);
    }
  }

  function goToServiceFromExisting() {
    if (!found) return;
    setOneTimePin(null);
    setShowStatusAction(false);
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
    setShowStatusAction(false);
    setIdempotencyKey(newIdempotencyKey());
    setStep("service");
  }

  function applySuccess(data: SuccessResult) {
    if (data.temporaryPin) {
      setOneTimePin(data.temporaryPin);
    }
    setSuccessResult(data);
    setStep("success");
    setShowStatusAction(false);
    success(data.deduped ? "Already created (idempotent replay)." : "Application created.");
    setIdempotencyKey(newIdempotencyKey());
  }

  function submitApplication() {
    if (isPending || submitLock.current || checkingStatus || !selectedService) return;
    setFormError("");
    setErrorCorrelationId(null);
    submitLock.current = true;

    startTransition(async () => {
      const activeKey = idempotencyKey;
      try {
        const payload: Record<string, unknown> = {
          idempotencyKey: activeKey,
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
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload),
        });
        const parsed = await parseApiResponse<Record<string, unknown>>(response);
        const safeError = extractSafeApiError(parsed);
        const responseCorrelationId =
          typeof parsed.data?.correlationId === "string" ? parsed.data.correlationId : null;
        setErrorCorrelationId(responseCorrelationId);

        if (parsed.ok && parsed.data?.ok !== false && parsed.data?.applicationId) {
          const successData = toSuccessResult(parsed.data, selectedService);
          if (successData) {
            if (parsed.data.customerId && !found) {
              setFound({
                id: String(parsed.data.customerId),
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
            applySuccess(successData);
            return;
          }
        }

        if (!parsed.ok && parsed.data?.customerId && !found) {
          setFound({
            id: String(parsed.data.customerId),
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

        if (safeError.ambiguous || safeError.authRequired) {
          setShowStatusAction(true);
          setCheckingStatus(true);
          try {
            const recovered = await recoverByIdempotencyKey(activeKey);
            if (recovered) {
              applySuccess(recovered);
              return;
            }
          } finally {
            setCheckingStatus(false);
          }
          // Keep the same idempotency key — do not mint a new key on ambiguous failure.
          const message = safeError.authRequired
            ? safeError.message
            : "We could not confirm the create response. Application was not found yet — you can safely retry once.";
          setFormError(message);
          toastError(message);
          return;
        }

        throw new Error(safeError.message);
      } catch (error) {
        const raw = error instanceof Error ? error.message : "Create failed.";
        const message = isRawJsonParseExceptionMessage(raw)
          ? "Application create response could not be read. Check status before retrying."
          : raw;
        setShowStatusAction(true);
        setCheckingStatus(true);
        try {
          const recovered = await recoverByIdempotencyKey(activeKey);
          if (recovered) {
            applySuccess(recovered);
            return;
          }
        } catch {
          // Ignore recovery transport errors; show friendly create message.
        } finally {
          setCheckingStatus(false);
        }
        setFormError(message);
        toastError(message);
      } finally {
        submitLock.current = false;
      }
    });
  }

  async function checkApplicationStatus() {
    if (checkingStatus || !idempotencyKey) return;
    setCheckingStatus(true);
    setFormError("");
    try {
      const recovered = await recoverByIdempotencyKey(idempotencyKey);
      if (recovered) {
        applySuccess(recovered);
        return;
      }
      setFormError("No application found for this request yet. You can safely retry Create.");
      setShowStatusAction(true);
    } catch {
      setFormError("Could not check application status. Please try again.");
    } finally {
      setCheckingStatus(false);
    }
  }

  function resetWizard() {
    setStep("lookup");
    setFound(null);
    setRecentApplications([]);
    setSelectedService(null);
    setSuccessResult(null);
    setOneTimePin(null);
    setNotes("");
    setShowStatusAction(false);
    setIdempotencyKey(newIdempotencyKey());
    setFormError("");
    mobileRef.current?.focus();
  }

  const createBusy = isPending || checkingStatus;

  return (
    <div className="space-y-4">
      <Card className="p-4 md:p-6">
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--primary)]">
            Walk-in ·{" "}
            {step === "lookup"
              ? "1 · Mobile"
              : step === "confirm" || step === "create"
                ? "2 · Customer"
                : step === "service" || step === "review"
                  ? "3 · Service"
                  : "4 · Done"}
          </p>
          {/* The page header already states the whole workflow — repeating it here
              told the operator nothing about where they are. Name the current
              step and what it needs instead. */}
          <h2 className="mt-1 text-lg font-bold text-slate-900">{STEP_COPY[step].title}</h2>
          <p className="mt-1 text-sm text-slate-600">{STEP_COPY[step].hint}</p>
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
                      <span className="text-sm font-semibold text-slate-700">
                        ₹{Number(service.customerFee).toLocaleString("en-IN")}
                      </span>
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
              Amount ₹{Number(selectedService.customerFee).toLocaleString("en-IN")} · Status{" "}
              {selectedService.customerInitialStatus}
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
            Assignment defaults to the Unassigned queue unless a later rule/assignee is configured. WhatsApp runs after save
            and cannot block creation.
          </p>

          <div className="flex flex-wrap gap-3">
            <FormSubmitButton
              type="button"
              loading={createBusy}
              loadingText={checkingStatus ? "Confirming…" : "Creating…"}
              disabled={createBusy}
              className="w-full md:w-fit"
              onClick={submitApplication}
            >
              Create application
            </FormSubmitButton>
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 disabled:opacity-60"
              onClick={() => setStep("service")}
              disabled={createBusy}
            >
              Change service
            </button>
            {showStatusAction || formError ? (
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 disabled:opacity-60"
                onClick={() => void checkApplicationStatus()}
                disabled={createBusy}
              >
                Check application status
              </button>
            ) : null}
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
                Shown once only on this screen. Not stored in browser storage, URL, or logs. Customer should change PIN after
                first login.
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
        <div className="rounded-2xl bg-orange-50 px-4 py-3 text-orange-700" role="alert">
          <p className="text-sm font-semibold">{formError}</p>
          {errorCorrelationId ? (
            <p className="mt-1 font-mono text-xs text-orange-600">
              Reference: {errorCorrelationId}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
