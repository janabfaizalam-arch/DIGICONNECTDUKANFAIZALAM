"use client";

import React, { useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Check, LoaderCircle, Sparkles } from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AdminService, DbServiceCategory } from "@/lib/services";

interface AdminServiceWizardProps {
  categories: DbServiceCategory[];
  service?: AdminService | null;
  onComplete?: () => void;
}

export function AdminServiceWizard({ categories, service = null, onComplete }: AdminServiceWizardProps) {
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const { success, error: toastError } = useToast();

  // Wizard state values
  const [title, setTitle] = useState(service?.title ?? "");
  const [slug, setSlug] = useState(service?.slug ?? "");
  const [categoryId, setCategoryId] = useState(service?.category_id ?? categories[0]?.id ?? "");
  const [shortDescription, setShortDescription] = useState(service?.short_description ?? "");
  const [fullDescription, setFullDescription] = useState(service?.full_description ?? service?.overview ?? "");
  const [icon, setIcon] = useState(service?.icon ?? "FileText");
  const [sortOrder, setSortOrder] = useState(service?.sort_order ?? 0);

  // Pricing values
  const [customerFee, setCustomerFee] = useState<number>(
    Number(service?.metadata?.customer_fee ?? service?.sale_price ?? service?.offer_price ?? 0)
  );
  const [agentPayout, setAgentPayout] = useState<number>(
    Number(service?.metadata?.agent_payout ?? 0)
  );
  const [payoutType, setPayoutType] = useState<"fixed" | "percentage">(
    (service?.metadata?.payout_type as "fixed" | "percentage") ?? "fixed"
  );
  const [payoutPercentage, setPayoutPercentage] = useState<number>(
    Number(service?.metadata?.payout_percentage ?? 0)
  );
  const [priceLabel, setPriceLabel] = useState(service?.price_label ?? "");
  const [ctaType, setCtaType] = useState<"apply" | "enquiry">(service?.cta_type ?? "apply");

  // Requirements values
  const [documents, setDocuments] = useState<string[]>(
    service?.documents || []
  );
  const [newDoc, setNewDoc] = useState("");
  const [eligibility, setEligibility] = useState(
    (service?.metadata?.eligibility as string) ?? "Standard business or individual check."
  );
  const [tatHours, setTatHours] = useState<number>(
    Number(service?.metadata?.tat_hours ?? service?.tat_hours ?? 48)
  );

  // Automation values
  const [autoAssignment, setAutoAssignment] = useState(
    service?.metadata?.auto_assignment !== false
  );
  const [notificationRules, setNotificationRules] = useState(
    service?.metadata?.notification_rules !== false
  );
  const [whatsappRules, setWhatsappRules] = useState(
    service?.metadata?.whatsapp_rules !== false
  );
  const [statusRules, setStatusRules] = useState(
    service?.metadata?.status_rules !== false
  );

  const [status, setStatus] = useState<"draft" | "published">(
    service?.status === "archived" ? "draft" : (service?.status ?? "draft")
  );

  function addDocument() {
    const doc = newDoc.trim();
    if (doc && !documents.includes(doc)) {
      setDocuments([...documents, doc]);
      setNewDoc("");
    }
  }

  function removeDocument(index: number) {
    setDocuments(documents.filter((_, idx) => idx !== index));
  }

  function slugify(val: string) {
    return val
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
  }

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!service) {
      setSlug(slugify(val));
    }
  };

  const stepsList = [
    { label: "Basic Info", step: 1 },
    { label: "Pricing & Commissions", step: 2 },
    { label: "Requirements & SLAs", step: 3 },
    { label: "Workflow Automation", step: 4 },
    { label: "Review & Publish", step: 5 },
  ];

  async function handleSubmit() {
    const formData = new FormData();
    formData.set("title", title.trim());
    formData.set("slug", slug.trim());
    formData.set("categoryId", categoryId);
    formData.set("categorySlug", categories.find((c) => c.id === categoryId)?.slug ?? "");
    formData.set("shortDescription", shortDescription.trim());
    formData.set("fullDescription", fullDescription.trim());
    formData.set("overview", shortDescription.trim());
    formData.set("icon", icon.trim());
    formData.set("sortOrder", String(sortOrder));

    formData.set("basePrice", String(customerFee));
    formData.set("salePrice", String(customerFee));
    formData.set("priceLabel", priceLabel.trim() || `₹${customerFee}`);
    formData.set("ctaType", ctaType);
    formData.set("isPaid", customerFee > 0 ? "true" : "false");
    formData.set("isActive", status === "published" ? "true" : "false");
    formData.set("status", status);

    formData.set("customerFee", String(customerFee));
    formData.set("agentPayout", String(agentPayout));
    formData.set("payoutType", payoutType);
    formData.set("payoutPercentage", String(payoutPercentage));
    formData.set("tatHours", String(tatHours));

    formData.set("documents", JSON.stringify(documents));
    formData.set("benefits", JSON.stringify([shortDescription.trim()]));
    formData.set("process", JSON.stringify(["Submit documents", "Processing by expert", "Resolution & Payout"]));

    formData.set("autoAssignment", autoAssignment ? "true" : "false");
    formData.set("notificationRules", notificationRules ? "true" : "false");
    formData.set("whatsappRules", whatsappRules ? "true" : "false");
    formData.set("statusRules", statusRules ? "true" : "false");

    startTransition(async () => {
      try {
        const url = service ? `/api/admin/services/${service.id}` : "/api/admin/services";
        const method = service ? "PATCH" : "POST";
        const response = await fetch(url, { method, body: formData });
        const result = (await response.json()) as { message?: string };

        if (!response.ok) {
          throw new Error(result.message ?? "Failed to save service.");
        }

        success(service ? "Service updated successfully." : "Service created successfully.");
        if (onComplete) {
          onComplete();
        } else {
          window.location.href = "/admin/services";
        }
      } catch (err) {
        toastError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="w-full rounded-2xl border border-white/40 bg-white/70 p-5 shadow-xl backdrop-blur-md">
      {/* Steps Indicator */}
      <div className="mb-6 flex flex-wrap justify-between items-center gap-2 border-b border-slate-100 pb-4">
        {stepsList.map((s) => (
          <div key={s.step} className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-200 ${
                step >= s.step
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/15"
                  : "bg-slate-100 text-slate-450 border border-slate-200"
              }`}
            >
              {step > s.step ? <Check className="h-4 w-4" /> : s.step}
            </span>
            <span
              className={`text-xs font-extrabold ${
                step === s.step ? "text-indigo-600 font-extrabold" : "text-slate-500 font-semibold"
              }`}
            >
              {s.label}
            </span>
            {s.step < 5 && <span className="text-slate-300">/</span>}
          </div>
        ))}
      </div>

      {/* Wizard Step Content */}
      <div className="min-h-[280px]">
        {step === 1 && (
          <div className="grid gap-4 animate-in fade-in-50 duration-200">
            <div className="flex items-center gap-2.5 text-indigo-600 mb-2">
              <Sparkles className="h-5 w-5" />
              <h3 className="text-sm font-extrabold">Step 1: Service Basics</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Service Name</label>
                <Input
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. GST Registration"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Service Slug</label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  placeholder="e.g. gst-registration"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Category</label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Icon Identifier</label>
                <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="e.g. FileText, Briefcase" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Sort Order</label>
                <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
              </div>
              <div className="md:col-span-2">
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Short Description</label>
                <Input
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="e.g. Fast tax compliance services for partners in 48 hours."
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Full Overview Description</label>
                <Textarea
                  value={fullDescription}
                  onChange={(e) => setFullDescription(e.target.value)}
                  placeholder="Provide deep overview content displayed on landing page..."
                  className="min-h-[100px]"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 animate-in fade-in-50 duration-200">
            <h3 className="text-sm font-extrabold text-indigo-600 mb-2">Step 2: Pricing & Commissions</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Customer Price / Fee (₹)</label>
                <Input
                  type="number"
                  value={customerFee}
                  onChange={(e) => setCustomerFee(Number(e.target.value))}
                  min="0"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Partner Commission / Payout (₹)</label>
                <Input
                  type="number"
                  value={agentPayout}
                  onChange={(e) => setAgentPayout(Number(e.target.value))}
                  min="0"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Commission Type</label>
                <Select
                  value={payoutType}
                  onValueChange={(val: "fixed" | "percentage") => setPayoutType(val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Flat Payout</SelectItem>
                    <SelectItem value="percentage">Percentage Payout</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Payout Percentage (%)</label>
                <Input
                  type="number"
                  value={payoutPercentage}
                  onChange={(e) => setPayoutPercentage(Number(e.target.value))}
                  disabled={payoutType !== "percentage"}
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Checkout Button Label</label>
                <Input
                  value={priceLabel}
                  onChange={(e) => setPriceLabel(e.target.value)}
                  placeholder="e.g. Buy Now, Get Started"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">CTA Action Type</label>
                <Select value={ctaType} onValueChange={(val: "apply" | "enquiry") => setCtaType(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apply">Standard Paid Application</SelectItem>
                    <SelectItem value="enquiry">Free Lead Enquiry Form</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4 animate-in fade-in-50 duration-200">
            <h3 className="text-sm font-extrabold text-indigo-600 mb-2">Step 3: Requirements & SLA</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Required Documents Checklist</label>
                <div className="flex gap-2">
                  <Input
                    value={newDoc}
                    onChange={(e) => setNewDoc(e.target.value)}
                    placeholder="e.g. PAN Card, Aadhaar Copy"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDocument())}
                  />
                  <Button type="button" onClick={addDocument}>Add</Button>
                </div>
                {documents.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {documents.map((doc, idx) => (
                      <span
                        key={idx}
                        className="flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-bold text-slate-650"
                      >
                        {doc}
                        <button
                          type="button"
                          onClick={() => removeDocument(idx)}
                          className="text-slate-400 hover:text-red-500"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-500 font-semibold italic">No documents added yet.</p>
                )}
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Resolution SLA duration (Hours)</label>
                <Input
                  type="number"
                  value={tatHours}
                  onChange={(e) => setTatHours(Number(e.target.value))}
                  min="1"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Eligibility Criteria Description</label>
                <Textarea
                  value={eligibility}
                  onChange={(e) => setEligibility(e.target.value)}
                  placeholder="e.g. Available for all businesses registered in India..."
                  className="min-h-[80px]"
                />
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="grid gap-4 animate-in fade-in-50 duration-200">
            <h3 className="text-sm font-extrabold text-indigo-600 mb-2">Step 4: Workflow Automation Rules</h3>
            <div className="grid gap-4">
              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4 cursor-pointer hover:bg-slate-50">
                <div>
                  <span className="text-xs font-extrabold text-slate-800 block">Auto Assignment Logic</span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Automatically assign submitted files to default category executive agents.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={autoAssignment}
                  onChange={(e) => setAutoAssignment(e.target.checked)}
                  className="h-4 w-4 rounded text-indigo-600"
                />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4 cursor-pointer hover:bg-slate-50">
                <div>
                  <span className="text-xs font-extrabold text-slate-800 block">Internal Email Alert Notifications</span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Dispatch verification status email update rules on stage changes.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={notificationRules}
                  onChange={(e) => setNotificationRules(e.target.checked)}
                  className="h-4 w-4 rounded text-indigo-600"
                />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4 cursor-pointer hover:bg-slate-50">
                <div>
                  <span className="text-xs font-extrabold text-slate-800 block">WhatsApp API Integration Notifications</span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Trigger real-time transaction updates rules directly to customer&apos;s mobile.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={whatsappRules}
                  onChange={(e) => setWhatsappRules(e.target.checked)}
                  className="h-4 w-4 rounded text-indigo-600"
                />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4 cursor-pointer hover:bg-slate-50">
                <div>
                  <span className="text-xs font-extrabold text-slate-800 block">Strict Transition Constraints</span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Allow only validated stage movements (e.g. Submitted → Under Review → Completed).
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={statusRules}
                  onChange={(e) => setStatusRules(e.target.checked)}
                  className="h-4 w-4 rounded text-indigo-600"
                />
              </label>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="grid gap-4 animate-in fade-in-50 duration-200">
            <h3 className="text-sm font-extrabold text-indigo-600 mb-2">Step 5: Review & Publish</h3>
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2 border-b border-slate-200/60 pb-3">
                <div>
                  <span className="text-slate-450 font-bold block uppercase tracking-wider text-[9px]">Name</span>
                  <span className="font-extrabold text-slate-800 text-sm mt-0.5 block">{title}</span>
                </div>
                <div>
                  <span className="text-slate-450 font-bold block uppercase tracking-wider text-[9px]">Slug</span>
                  <span className="font-mono text-slate-700 mt-0.5 block">{slug}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 border-b border-slate-200/60 pb-3">
                <div>
                  <span className="text-slate-450 font-bold block uppercase tracking-wider text-[9px]">Customer Fee</span>
                  <span className="font-extrabold text-slate-800 mt-0.5 block">₹{customerFee}</span>
                </div>
                <div>
                  <span className="text-slate-450 font-bold block uppercase tracking-wider text-[9px]">Partner payout</span>
                  <span className="font-extrabold text-slate-800 mt-0.5 block">₹{agentPayout}</span>
                </div>
                <div>
                  <span className="text-slate-450 font-bold block uppercase tracking-wider text-[9px]">SLA Duration</span>
                  <span className="font-extrabold text-slate-850 mt-0.5 block">{tatHours} Hours</span>
                </div>
              </div>

              <div>
                <span className="text-slate-450 font-bold block uppercase tracking-wider text-[9px]">Required Documents Checklist</span>
                <p className="font-bold text-slate-750 mt-1">
                  {documents.length > 0 ? documents.join(", ") : "No documents requested."}
                </p>
              </div>

              <div className="border-t border-slate-200/60 pt-3">
                <span className="text-slate-450 font-bold block uppercase tracking-wider text-[9px] mb-2">Publishing Status</span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-750">
                    <input
                      type="radio"
                      name="status"
                      checked={status === "draft"}
                      onChange={() => setStatus("draft")}
                      className="text-indigo-600"
                    />
                    Keep as Draft
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-750">
                    <input
                      type="radio"
                      name="status"
                      checked={status === "published"}
                      onChange={() => setStatus("published")}
                      className="text-indigo-600"
                    />
                    Publish Live immediately
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="mt-8 flex justify-between items-center border-t border-slate-150 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep((prev) => Math.max(1, prev - 1))}
          disabled={step === 1 || isPending}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>

        {step < 5 ? (
          <Button
            type="button"
            onClick={() => setStep((prev) => Math.min(5, prev + 1))}
            disabled={step === 1 && (!title || !slug)}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending && <LoaderCircle className="h-4 w-4 animate-spin mr-1.5" />}
            Save & Complete
          </Button>
        )}
      </div>
    </div>
  );
}
