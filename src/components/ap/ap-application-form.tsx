"use client";

import { type FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, CreditCard, FileUp, Send } from "lucide-react";

import { RazorpayCheckoutButton, type VerifiedRazorpayPayment } from "@/components/payments/razorpay-checkout-button";
import {
  createPmVishwakarmaInitialValues,
  getPmVishwakarmaValidationError,
  isPmVishwakarmaComplete,
  PmVishwakarmaApplicationFields,
  type PmVishwakarmaApplicationValues,
  usePmVishwakarmaPincodeAutofill,
} from "@/components/portal/pm-vishwakarma-application-fields";
import { useToast } from "@/components/providers/toast-provider";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormSubmitButton } from "@/components/ui/loading";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trackApplicationSubmit } from "@/lib/google-analytics";
import { payoutForAgentService, type AgentService } from "@/lib/agent-services";
import { formatCurrency } from "@/lib/portal-data";
import type { Customer } from "@/lib/portal-types";

interface CustomerLookupResult {
  customer: {
    id: string;
    full_name: string;
    mobile: string;
    email?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    address?: string | null;
  };
  previousApplications: Array<{
    id: string;
    service_name: string;
    service_slug: string;
    status: string;
    created_at: string;
  }>;
  duplicateApplication: {
    id: string;
    service_name: string;
    service_slug: string;
    status: string;
    created_at: string;
  } | null;
}

export function APApplicationForm({
  customers,
  services,
  defaultCustomerId,
  defaultServiceId,
  defaultName,
  defaultMobile,
}: {
  customers: Customer[];
  services: AgentService[];
  defaultCustomerId?: string;
  defaultServiceId?: string;
  defaultName?: string;
  defaultMobile?: string;
}) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [customerId, setCustomerId] = useState(defaultCustomerId ?? "");
  const [serviceId, setServiceId] = useState(defaultServiceId ?? services[0]?.id ?? "");
  const [razorpayPayment, setRazorpayPayment] = useState<(VerifiedRazorpayPayment & { amount_paise: number }) | null>(null);
  const [pmVishwakarmaValues, setPmVishwakarmaValues] = useState(() => createPmVishwakarmaInitialValues());
  const [pincodeStatus, setPincodeStatus] = useState("");

  const [mobileLookup, setMobileLookup] = useState(() => {
    if (defaultMobile) return defaultMobile.replace(/\D/g, "").slice(-10);
    if (defaultCustomerId) {
      const cust = customers.find((c) => c.id === defaultCustomerId);
      return cust?.mobile?.replace(/\D/g, "").slice(-10) ?? "";
    }
    return "";
  });
  const [newCustomerMobile, setNewCustomerMobile] = useState(defaultMobile ?? "");
  const [serviceSearch, setServiceSearch] = useState("");

  // Quick Application real-time state variables
  const [lookupResults, setLookupResults] = useState<CustomerLookupResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<CustomerLookupResult | null>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [activeDuplicateApp, setActiveDuplicateApp] = useState<CustomerLookupResult["duplicateApplication"] | null>(null);
  const [recentServiceIds, setRecentServiceIds] = useState<string[]>([]);

  const selectedService = services.find((service) => service.id === serviceId);

  // Load dynamically tracked recent services
  useEffect(() => {
    const saved = localStorage.getItem("ap_recent_services");
    if (saved) {
      try {
        setRecentServiceIds(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse recent services", e);
      }
    }
  }, []);

  const saveRecentService = (id: string) => {
    const updated = [id, ...recentServiceIds.filter((x) => x !== id)].slice(0, 5);
    setRecentServiceIds(updated);
    localStorage.setItem("ap_recent_services", JSON.stringify(updated));
  };

  // Debounced API call for real-time mobile lookup and duplicate detection
  useEffect(() => {
    if (mobileLookup.length < 3) {
      setLookupResults([]);
      return;
    }

    const controller = new AbortController();
    const serviceSlug = selectedService?.slug ?? "";

    const delayDebounce = setTimeout(() => {
      fetch(`/api/ap/customers/lookup?mobile=${encodeURIComponent(mobileLookup)}&serviceSlug=${encodeURIComponent(serviceSlug)}`, {
        signal: controller.signal
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.results) {
            setLookupResults(data.results as CustomerLookupResult[]);
          }
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            console.error("Suggestions fetch failed", err);
          }
        });
    }, 300);

    return () => {
      clearTimeout(delayDebounce);
      controller.abort();
    };
  }, [mobileLookup, selectedService?.slug]);

  const selectCustomerResult = (result: CustomerLookupResult) => {
    const cust = result.customer;
    setCustomerId(cust.id);
    setSelectedResult(result);
    setMobileLookup(cust.mobile?.replace(/\D/g, "").slice(-10) ?? "");
    setLookupResults([]);

    if (result.duplicateApplication) {
      setActiveDuplicateApp(result.duplicateApplication);
      setShowDuplicateWarning(true);
    } else {
      setActiveDuplicateApp(null);
      setShowDuplicateWarning(false);
    }
  };

  const filteredServices = useMemo(() => {
    if (!serviceSearch) return services;
    const lower = serviceSearch.toLowerCase();
    return services.filter(
      (service) =>
        service.title?.toLowerCase().includes(lower) ||
        service.slug?.toLowerCase().includes(lower)
    );
  }, [services, serviceSearch]);

  const handleMobileLookupChange = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 10);
    setMobileLookup(digits);

    if (digits.length === 10) {
      const matched = customers.find(
        (c) => c.mobile && c.mobile.replace(/\D/g, "").slice(-10) === digits
      );
      if (matched) {
        setCustomerId(matched.id);
        success(`Found customer: ${matched.full_name}`);
        // Fetch detailed results manually
        const serviceSlug = selectedService?.slug ?? "";
        fetch(`/api/ap/customers/lookup?mobile=${encodeURIComponent(digits)}&serviceSlug=${encodeURIComponent(serviceSlug)}`)
          .then((res) => res.json())
          .then((data) => {
            const matchedRes = data.results?.find((r: CustomerLookupResult) => r.customer.id === matched.id);
            if (matchedRes) selectCustomerResult(matchedRes);
          })
          .catch(console.error);
      } else {
        setCustomerId("");
        setSelectedResult(null);
        setNewCustomerMobile(digits);
      }
    } else {
      setCustomerId("");
      setSelectedResult(null);
      setNewCustomerMobile(digits);
    }
  };

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === customerId) || selectedResult?.customer,
    [customerId, customers, selectedResult],
  );
  const isPmVishwakarma = selectedService?.slug === "pm-vishwakarma-yojana";
  const payableAmountPaise = Math.round(Number(selectedService?.customer_fee ?? 0) * 100);
  const receiptPrefix = `ap-${selectedService?.slug ?? "service"}`;
  const [paymentReceipt, setPaymentReceipt] = useState(receiptPrefix);
  const selectedPayout = selectedService ? payoutForAgentService(selectedService) : 0;

  useEffect(() => {
    setRazorpayPayment(null);
  }, [payableAmountPaise]);

  useEffect(() => {
    setPaymentReceipt(`${receiptPrefix}-${Date.now()}`);
  }, [receiptPrefix]);

  useEffect(() => {
    if (!isPmVishwakarma || !selectedCustomer) return;

    setPmVishwakarmaValues((current) => ({
      ...current,
      name: selectedCustomer.full_name ?? current.name,
      mobile: (selectedCustomer.mobile ?? current.mobile).replace(/\D/g, "").slice(0, 10),
      email: selectedCustomer.email ?? current.email,
      pincode: (selectedCustomer.pincode ?? current.pincode ?? "").replace(/\D/g, "").slice(0, 6),
      city: selectedCustomer.city ?? current.city,
      state: selectedCustomer.state ?? current.state,
    }));
  }, [isPmVishwakarma, selectedCustomer]);

  useEffect(() => {
    if (selectedCustomer && !selectedResult) {
      const cleanMobile = selectedCustomer.mobile?.replace(/\D/g, "").slice(-10) ?? "";
      setMobileLookup(cleanMobile);
    }
  }, [selectedCustomer, selectedResult]);


  usePmVishwakarmaPincodeAutofill({
    enabled: Boolean(isPmVishwakarma),
    values: pmVishwakarmaValues,
    setValues: setPmVishwakarmaValues,
    setStatus: setPincodeStatus,
  });

  function updatePmVishwakarmaValue<Key extends keyof PmVishwakarmaApplicationValues>(key: Key, value: PmVishwakarmaApplicationValues[Key]) {
    setPmVishwakarmaValues((current) => ({ ...current, [key]: value }));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    if (payableAmountPaise > 0 && !razorpayPayment) {
      toastError("Please complete Razorpay checkout before submitting.");
      return;
    }

    if (isPmVishwakarma) {
      const pmValidationError = getPmVishwakarmaValidationError(pmVishwakarmaValues);
      if (pmValidationError) {
        toastError(pmValidationError);
        return;
      }
    }

    if (razorpayPayment && razorpayPayment.amount_paise !== payableAmountPaise) {
      toastError("Payment amount changed. Please complete Razorpay checkout again.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.set("customerId", customerId);
    formData.set("agentServiceId", serviceId);
    formData.set("serviceId", selectedService?.service_id ?? "");
    formData.set("razorpay_payment_id", razorpayPayment?.razorpay_payment_id ?? "");
    formData.set("razorpay_order_id", razorpayPayment?.razorpay_order_id ?? "");
    formData.set("razorpay_signature", razorpayPayment?.razorpay_signature ?? "");
    formData.set("razorpay_amount_paise", String(razorpayPayment?.amount_paise ?? 0));

    startTransition(async () => {
      try {
        const response = await fetch("/api/ap/applications", {
          method: "POST",
          body: formData,
        });
        const result = (await response.json()) as { message?: string; applicationId?: string };

        if (!response.ok || !result.applicationId) {
          throw new Error(result.message ?? "Application could not be created.");
        }

        success(result.message ?? "Application created.");
        trackApplicationSubmit();
        
        // Track recent service usage
        saveRecentService(serviceId);

        router.push(`/ap/applications/${result.applicationId}`);
        router.refresh();
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Application could not be created.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_340px]" aria-busy={isPending}>
      <fieldset disabled={isPending} className="contents">
        <Card className="border border-white/5 bg-slate-900/30 p-5 md:p-7 rounded-3xl backdrop-blur-xl">
          <div className="grid gap-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-400">Agency Partner POS</p>
              <h1 className="mt-2 text-2xl font-black text-white">Create New Application</h1>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1 relative">
                <label className="text-xs font-bold text-slate-400">🔍 Quick Mobile Lookup</label>
                <Input
                  type="text"
                  placeholder="Enter 10-digit mobile..."
                  value={mobileLookup}
                  onChange={(e) => handleMobileLookupChange(e.target.value)}
                  className="border-white/5 bg-slate-950 text-white rounded-xl h-11"
                  maxLength={10}
                  inputMode="numeric"
                />

                {/* Real-time search suggestions dropdown */}
                {lookupResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-white/10 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-white/5">
                    {lookupResults.map((res) => (
                      <button
                        key={res.customer.id}
                        type="button"
                        onClick={() => selectCustomerResult(res)}
                        className="w-full text-left px-4 py-3 hover:bg-white/5 flex flex-col transition-colors cursor-pointer"
                      >
                        <span className="font-extrabold text-sm text-white">{res.customer.full_name}</span>
                        <span className="text-xs text-indigo-400 font-mono mt-0.5">{res.customer.mobile}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">Select Customer (Alternative)</label>
                <Select value={customerId} onValueChange={(val) => {
                  setCustomerId(val);
                  const cust = customers.find(c => c.id === val);
                  if (cust) {
                    const cleanMobile = cust.mobile?.replace(/\D/g, "").slice(-10) ?? "";
                    setMobileLookup(cleanMobile);

                    // Fetch detailed suggestions/duplicates for selected customer
                    const serviceSlug = selectedService?.slug ?? "";
                    fetch(`/api/ap/customers/lookup?mobile=${encodeURIComponent(cleanMobile)}&serviceSlug=${encodeURIComponent(serviceSlug)}`)
                      .then((res) => res.json())
                      .then((data) => {
                        const matchedRes = data.results?.find((r: CustomerLookupResult) => r.customer.id === val);
                        if (matchedRes) selectCustomerResult(matchedRes);
                      })
                      .catch(console.error);
                  }
                }}>
                  <SelectTrigger className="border-white/5 bg-slate-950 text-white rounded-xl h-11">
                    <SelectValue placeholder="Select existing customer" />
                  </SelectTrigger>
                  <SelectContent className="border-white/5 bg-slate-900 text-white">
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id} className="hover:bg-white/5">
                        {customer.full_name} - {customer.mobile}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isPmVishwakarma ? (
              <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4 text-orange-300">
                <p className="text-sm font-bold">PM Vishwakarma Application Details</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  Fill the same dedicated PM Vishwakarma form used in the customer apply workflow. Email, address, and notes are optional.
                </p>
              </div>
            ) : !selectedCustomer ? (
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-400">New Customer Registration Details</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input name="customerName" defaultValue={defaultName} placeholder="Customer Name" required={!customerId} className="border-white/5 bg-slate-950 text-white rounded-xl h-11" />
                  <Input
                    name="mobile"
                    value={newCustomerMobile}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setNewCustomerMobile(val);
                      setMobileLookup(val);
                      if (val.length === 10) {
                        const matched = customers.find(
                          (c) => c.mobile && c.mobile.replace(/\D/g, "").slice(-10) === val
                        );
                        if (matched) {
                          setCustomerId(matched.id);
                          success(`Found customer: ${matched.full_name}`);
                          const serviceSlug = selectedService?.slug ?? "";
                          fetch(`/api/ap/customers/lookup?mobile=${encodeURIComponent(val)}&serviceSlug=${encodeURIComponent(serviceSlug)}`)
                            .then((res) => res.json())
                            .then((data) => {
                              const matchedRes = data.results?.find((r: CustomerLookupResult) => r.customer.id === matched.id);
                              if (matchedRes) selectCustomerResult(matchedRes);
                            })
                            .catch(console.error);
                        }
                      }
                    }}
                    placeholder="Mobile Number"
                    inputMode="numeric"
                    required={!customerId}
                    className="border-white/5 bg-slate-950 text-white rounded-xl h-11"
                  />
                  <Input name="email" placeholder="Email" type="email" required={!customerId} className="border-white/5 bg-slate-950 text-white rounded-xl h-11" />
                  <Input name="pincode" placeholder="Pincode" inputMode="numeric" required={!customerId} className="border-white/5 bg-slate-950 text-white rounded-xl h-11" />
                  <Input name="city" placeholder="City" required={!customerId} className="border-white/5 bg-slate-950 text-white rounded-xl h-11" />
                  <Input name="state" placeholder="State" required={!customerId} className="border-white/5 bg-slate-950 text-white rounded-xl h-11" />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Duplicate Prevention Alert */}
                {showDuplicateWarning && activeDuplicateApp && (
                  <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-5 text-red-200 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-start gap-3">
                      <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse mt-1.5 shrink-0" />
                      <div className="space-y-2 flex-1">
                        <p className="font-black text-xs text-red-400 uppercase tracking-wider">Duplicate Application Found</p>
                        <p className="text-xs text-slate-350 leading-relaxed">
                          An active application for <strong className="text-white">&quot;{activeDuplicateApp.service_name}&quot;</strong> already exists for this customer with status <span className="bg-red-500/20 border border-red-500/30 px-2 py-0.5 rounded text-[10px] font-mono text-red-400 capitalize">{activeDuplicateApp.status.replace(/_/g, " ")}</span>.
                        </p>
                        <div className="flex gap-2 pt-1.5">
                          <Link
                            href={`/ap/applications/${activeDuplicateApp.id}`}
                            className="px-3.5 py-1.5 bg-red-650 hover:bg-red-600 text-[10px] font-black text-white rounded-xl transition flex items-center gap-1 shrink-0"
                          >
                            Open Existing
                          </Link>
                          <button
                            type="button"
                            onClick={() => setShowDuplicateWarning(false)}
                            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-200 rounded-xl border border-white/5 transition cursor-pointer"
                          >
                            Continue New
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded-3xl border border-white/5 bg-slate-950 p-6 space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Selected Customer Details</p>
                    <p className="mt-2 font-black text-white text-base">{selectedCustomer.full_name}</p>
                    <p className="mt-1 font-mono text-sm text-indigo-400">{selectedCustomer.mobile}</p>
                    <p className="mt-1 text-xs text-slate-400 font-medium leading-relaxed">
                      {selectedCustomer.email || "Email missing"} &bull; {selectedCustomer.pincode || "PIN missing"} &bull; {selectedCustomer.city || "City missing"} &bull; {selectedCustomer.state || "State missing"}
                    </p>
                  </div>

                  {/* Previous Applications list */}
                  {selectedResult && (selectedResult.previousApplications?.length ?? 0) > 0 && (
                    <div className="border-t border-white/5 pt-4 space-y-2.5">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Previous Applications ({selectedResult.previousApplications.length})</p>
                      <div className="grid gap-2 max-h-40 overflow-y-auto pr-1">
                        {selectedResult.previousApplications.map((app: CustomerLookupResult["previousApplications"][number]) => (
                          <div key={app.id} className="flex justify-between items-center bg-slate-900/60 border border-white/5 rounded-2xl px-4 py-2.5 hover:border-white/10 transition-colors">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-extrabold text-slate-200 truncate">{app.service_name}</p>
                              <span className="text-[9px] text-slate-500 font-semibold font-mono">{new Date(app.created_at).toLocaleDateString("en-IN")}</span>
                            </div>
                            <Link
                              href={`/ap/applications/${app.id}`}
                              className="text-[10px] font-black text-indigo-400 hover:underline shrink-0 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20"
                            >
                              View &bull; <span className="capitalize">{app.status.replace(/_/g, " ")}</span>
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Service Suggestions */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Quick Select Services</label>
              <div className="flex flex-wrap gap-2">
                {services.slice(0, 4).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setServiceId(s.id);
                      setServiceSearch("");
                    }}
                    className={`px-3 py-1 text-xs font-bold rounded-xl border transition-all duration-150 cursor-pointer ${
                      serviceId === s.id
                        ? "bg-blue-600/10 border-blue-500 text-blue-400"
                        : "bg-slate-900/40 border-white/5 text-slate-400 hover:border-white/10 hover:text-white"
                    }`}
                  >
                    {s.title.replace("Registration", "").replace("Application", "").trim()}
                  </button>
                ))}
                
                {recentServiceIds.map((id) => {
                  const s = services.find((x) => x.id === id);
                  if (!s || services.slice(0, 4).some(x => x.id === id)) return null;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setServiceId(s.id);
                        setServiceSearch("");
                      }}
                      className={`px-3 py-1 text-xs font-bold rounded-xl border transition-all duration-150 cursor-pointer ${
                        serviceId === s.id
                          ? "bg-blue-600/10 border-blue-500 text-blue-400"
                          : "bg-slate-900/40 border-white/5 text-slate-400 hover:border-white/10 hover:text-white"
                      }`}
                    >
                      🕒 {s.title.replace("Registration", "").replace("Application", "").trim()}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400">Select Service to Apply</label>
              <Input
                type="text"
                placeholder="🔍 Search service by name or keyword..."
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                className="mb-2 border-white/5 bg-slate-950 text-white rounded-xl h-9 text-xs"
              />
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger className="border-white/5 bg-slate-950 text-white rounded-xl h-11">
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent className="border-white/5 bg-slate-900 text-white">
                  {filteredServices.length > 0 ? (
                    filteredServices.map((service) => (
                      <SelectItem key={service.id} value={service.id} className="hover:bg-white/5">
                        {service.title} - {formatCurrency(service.customer_fee)}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-xs text-slate-400 text-center">No services found</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedService ? (
              <div className="grid gap-4 rounded-2xl border border-white/5 bg-slate-950 p-5 text-sm text-slate-300 md:grid-cols-3">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Customer Fee</p>
                  <p className="mt-1 text-lg font-black text-white">{formatCurrency(selectedService.customer_fee)}</p>
                </div>
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">AP Commission Payout</p>
                  <p className="mt-1 text-lg font-black text-emerald-400">{formatCurrency(selectedPayout)}</p>
                </div>
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-400">Processing Time</p>
                  <p className="mt-1 font-extrabold text-white">{selectedService.processing_time || "As per service"}</p>
                </div>
                <div className="md:col-span-3 border-t border-white/5 pt-3">
                  <p className="font-extrabold text-slate-200">Required Documents</p>
                  <p className="mt-1 text-xs text-slate-400 whitespace-pre-line leading-5">{selectedService.required_documents || "Documents will be confirmed during processing."}</p>
                </div>
                {selectedService.instructions ? (
                  <div className="md:col-span-3 border-t border-white/5 pt-3">
                    <p className="font-extrabold text-slate-200">AP Instructions</p>
                    <p className="mt-1 text-xs text-slate-400 whitespace-pre-line leading-5">{selectedService.instructions}</p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {isPmVishwakarma ? (
              <PmVishwakarmaApplicationFields values={pmVishwakarmaValues} onChange={updatePmVishwakarmaValue} pincodeStatus={pincodeStatus} />
            ) : (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">Application Notes / Comments</label>
                <Textarea name="message" placeholder="Enter special requests, references or processing notes..." className="min-h-24 border-white/5 bg-slate-950 text-white rounded-xl" />
              </div>
            )}

            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950 p-4">
              <div className="flex items-center gap-2 font-bold text-slate-200">
                <FileUp className="h-4 w-4 text-blue-400" />
                Upload Documents
              </div>
              <Input name="documents" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" className="mt-3 border-white/5 bg-slate-900 text-white rounded-lg file:bg-slate-800 file:text-white file:border-0 file:rounded-md file:px-3 file:py-1 file:mr-3 cursor-pointer text-xs" />
            </div>

            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950 p-4">
              <div className="flex items-center gap-2 font-bold text-slate-200">
                <CreditCard className="h-4 w-4 text-indigo-400" />
                Payment Integration (Razorpay)
              </div>
              <div className="mt-3">
                <RazorpayCheckoutButton
                  amountPaise={payableAmountPaise}
                  receipt={paymentReceipt}
                  serviceSlug={selectedService?.slug}
                  customer={{
                    name: isPmVishwakarma ? pmVishwakarmaValues.name : selectedCustomer?.full_name,
                    email: isPmVishwakarma ? pmVishwakarmaValues.email || undefined : selectedCustomer?.email ?? undefined,
                    mobile: isPmVishwakarma ? pmVishwakarmaValues.mobile : selectedCustomer?.mobile,
                  }}
                  description={selectedService?.title ?? "Agency Partner POS application"}
                  disabled={isPending || !selectedService || Boolean(isPmVishwakarma && !isPmVishwakarmaComplete(pmVishwakarmaValues))}
                  onVerified={(payment) =>
                    setRazorpayPayment({
                      ...payment,
                      amount_paise: payableAmountPaise,
                    })
                  }
                />
              </div>
              {razorpayPayment ? (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs font-bold text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Transaction verified: {razorpayPayment.razorpay_payment_id}
                </div>
              ) : null}
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="border border-white/5 bg-slate-900/30 p-5 rounded-3xl backdrop-blur-xl space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Selected Service</p>
            <p className="text-lg font-black text-white">{selectedService?.title ?? "Select service"}</p>
            <p className="text-3xl font-black text-blue-400">
              {selectedService ? formatCurrency(selectedService.customer_fee) : "—"}
            </p>
            <p className="text-xs font-semibold text-slate-400">
              Commission Payout: {selectedService ? formatCurrency(selectedPayout) : "—"}
            </p>
          </Card>

          <FormSubmitButton loading={isPending} disabled={!serviceId} loadingText="Submitting..." icon={<Send className="h-4 w-4" />} className="w-full h-12 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-2xl hover:from-blue-600 hover:to-indigo-600 shadow-lg shadow-blue-500/20">
            Submit Application
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
