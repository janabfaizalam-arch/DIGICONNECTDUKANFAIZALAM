"use client";

import Image from "next/image";
import { type ChangeEvent, type FormEvent, type ReactNode, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  ImagePlus,
  FileCheck,
  Layers,
  LoaderCircle,
  MessageSquareQuote,
  Pencil,
  Settings2,
  Star,
  Table2,
  Trash2,
  Wallet,
} from "lucide-react";

import { AdminEmptyState } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  PARTNER_MOBILE_BANNER_SIZE_HINT,
  partnerMobileBannerRatioWarning,
  readImageDimensions,
} from "@/lib/ap/partner-banner-aspect";
import { ITR_LANDING_PATH, ITR_SECTION_KEYS } from "@/lib/itr/constants";
import type {
  ItrBanner,
  ItrCmsPayload,
  ItrComparisonRow,
  ItrDocumentItem,
  ItrFaq,
  ItrPageSettings,
  ItrPricingPlan,
  ItrRelatedService,
  ItrReview,
  ItrSection,
} from "@/lib/itr/types";
import { cn } from "@/lib/utils";

type TabId =
  | "settings"
  | "sections"
  | "banners"
  | "pricing"
  | "faqs"
  | "reviews"
  | "comparison"
  | "related"
  | "documents";

type ManagerProps = {
  initialCms: ItrCmsPayload;
};

const TABS: { id: TabId; label: string; icon: typeof Layers }[] = [
  { id: "settings", label: "Settings", icon: Settings2 },
  { id: "sections", label: "Sections", icon: Layers },
  { id: "banners", label: "Banners", icon: ImagePlus },
  { id: "pricing", label: "Pricing", icon: Wallet },
  { id: "faqs", label: "FAQs", icon: MessageSquareQuote },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "comparison", label: "Comparison", icon: Table2 },
  { id: "related", label: "Related", icon: ExternalLink },
  { id: "documents", label: "Documents", icon: FileCheck },
];

export function AdminItrCmsManager({ initialCms }: ManagerProps) {
  const [cms, setCms] = useState(initialCms);
  const [tab, setTab] = useState<TabId>("settings");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function refresh() {
    const res = await fetch("/api/admin/itr/sections");
    const data = await readJsonSafe(res);
    if (!res.ok) return;

    const [
      bannersRes,
      pricingRes,
      faqsRes,
      reviewsRes,
      comparisonRes,
      relatedRes,
      documentsRes,
    ] = await Promise.all([
      fetch("/api/admin/itr/banners"),
      fetch("/api/admin/itr/pricing"),
      fetch("/api/admin/itr/faqs"),
      fetch("/api/admin/itr/reviews"),
      fetch("/api/admin/itr/comparison"),
      fetch("/api/admin/itr/related"),
      fetch("/api/admin/itr/documents"),
    ]);

    const [bannersData, pricingData, faqsData, reviewsData, comparisonData, relatedData, documentsData] =
      await Promise.all([
      readJsonSafe(bannersRes),
      readJsonSafe(pricingRes),
      readJsonSafe(faqsRes),
      readJsonSafe(reviewsRes),
      readJsonSafe(comparisonRes),
      readJsonSafe(relatedRes),
      readJsonSafe(documentsRes),
    ]);

    setCms((prev) => ({
      ...prev,
      sections: Array.isArray(data.sections) ? (data.sections as ItrSection[]) : prev.sections,
      banners: Array.isArray(bannersData.banners) ? (bannersData.banners as ItrBanner[]) : prev.banners,
      pricing: Array.isArray(pricingData.pricing) ? (pricingData.pricing as ItrPricingPlan[]) : prev.pricing,
      faqs: Array.isArray(faqsData.faqs) ? (faqsData.faqs as ItrFaq[]) : prev.faqs,
      reviews: Array.isArray(reviewsData.reviews) ? (reviewsData.reviews as ItrReview[]) : prev.reviews,
      comparison: Array.isArray(comparisonData.comparison)
        ? (comparisonData.comparison as ItrComparisonRow[])
        : prev.comparison,
      related: Array.isArray(relatedData.related) ? (relatedData.related as ItrRelatedService[]) : prev.related,
      documents: Array.isArray(documentsData.documents)
        ? (documentsData.documents as ItrDocumentItem[])
        : prev.documents,
    }));
  }

  async function runAction(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  function tabClass(id: TabId) {
    return cn(
      "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition",
      tab === id
        ? "border-slate-900 bg-slate-900 text-white shadow-sm"
        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
    );
  }

  return (
    <div className="space-y-5">
      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}
      {message ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={tabClass(id)}>
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === "sections" ? (
        <SectionsTab
          sections={cms.sections}
          busy={busy}
          onSave={(sections) =>
            runAction(async () => {
              const res = await fetch("/api/admin/itr/sections", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sections }),
              });
              const data = await readJsonSafe(res);
              if (!res.ok) throw new Error(apiErrorMessage(data, "Save failed"));
              setCms((prev) => ({
                ...prev,
                sections: Array.isArray(data.sections) ? (data.sections as ItrSection[]) : sections,
              }));
              setMessage("Sections saved.");
            })
          }
        />
      ) : null}

      {tab === "banners" ? (
        <BannersTab
          banners={cms.banners}
          busy={busy}
          onRefresh={refresh}
          onError={setError}
          onMessage={setMessage}
          setBusy={setBusy}
        />
      ) : null}

      {tab === "pricing" ? (
        <PricingTab
          plans={cms.pricing}
          busy={busy}
          onRefresh={refresh}
          runAction={runAction}
          setMessage={setMessage}
        />
      ) : null}

      {tab === "faqs" ? (
        <FaqsTab faqs={cms.faqs} busy={busy} onRefresh={refresh} runAction={runAction} setMessage={setMessage} />
      ) : null}

      {tab === "reviews" ? (
        <ReviewsTab reviews={cms.reviews} busy={busy} onRefresh={refresh} runAction={runAction} setMessage={setMessage} />
      ) : null}

      {tab === "comparison" ? (
        <ComparisonTab
          rows={cms.comparison}
          busy={busy}
          onRefresh={refresh}
          runAction={runAction}
          setMessage={setMessage}
        />
      ) : null}

      {tab === "related" ? (
        <RelatedTab items={cms.related} busy={busy} onRefresh={refresh} runAction={runAction} setMessage={setMessage} />
      ) : null}

      {tab === "documents" ? (
        <DocumentsTab
          documents={cms.documents}
          busy={busy}
          onRefresh={refresh}
          runAction={runAction}
          setMessage={setMessage}
        />
      ) : null}

      {tab === "settings" ? (
        <SettingsTab
          settings={cms.settings}
          busy={busy}
          onSave={(settings) =>
            runAction(async () => {
              const res = await fetch("/api/admin/itr/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
              });
              const data = await readJsonSafe(res);
              if (!res.ok) throw new Error(apiErrorMessage(data, "Save failed"));
              setCms((prev) => ({
                ...prev,
                settings: (data.settings as ItrPageSettings) ?? settings,
              }));
              setMessage("Settings saved.");
            })
          }
        />
      ) : null}
    </div>
  );
}

function SectionsTab({
  sections,
  busy,
  onSave,
}: {
  sections: ItrSection[];
  busy: boolean;
  onSave: (sections: ItrSection[]) => void;
}) {
  const [draft, setDraft] = useState(sections);

  function updateSection(index: number, patch: Partial<ItrSection>) {
    setDraft((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function moveSection(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= draft.length) return;
    const copy = [...draft];
    [copy[index], copy[next]] = [copy[next], copy[index]];
    setDraft(copy.map((s, i) => ({ ...s, sortOrder: (i + 1) * 10 })));
  }

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900">Landing sections</h2>
          <p className="text-xs text-slate-500">Toggle visibility, reorder, and edit headings / CTAs.</p>
        </div>
        <Button type="button" disabled={busy} onClick={() => onSave(draft)}>
          {busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save sections
        </Button>
      </div>

      <div className="space-y-3">
        {draft.map((section, index) => (
          <div key={section.sectionKey} className="rounded-xl border border-slate-100 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={section.enabled}
                    onChange={(e) => updateSection(index, { enabled: e.target.checked })}
                  />
                  {section.sectionKey}
                </label>
                <span className="text-xs text-slate-400">sort {section.sortOrder}</span>
              </div>
              <div className="flex gap-1">
                <Button type="button" variant="outline" className="h-8 px-2" onClick={() => moveSection(index, -1)} disabled={index === 0}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 px-2"
                  onClick={() => moveSection(index, 1)}
                  disabled={index === draft.length - 1}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs font-bold text-slate-600">Heading</span>
                <Input value={section.heading ?? ""} onChange={(e) => updateSection(index, { heading: e.target.value })} />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold text-slate-600">Sort order</span>
                <Input
                  type="number"
                  value={section.sortOrder}
                  onChange={(e) => updateSection(index, { sortOrder: Number(e.target.value) || 0 })}
                />
              </label>
              <label className="grid gap-1 md:col-span-2">
                <span className="text-xs font-bold text-slate-600">Description</span>
                <Textarea
                  value={section.description ?? ""}
                  onChange={(e) => updateSection(index, { description: e.target.value })}
                  rows={2}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold text-slate-600">CTA label</span>
                <Input value={section.ctaLabel ?? ""} onChange={(e) => updateSection(index, { ctaLabel: e.target.value })} />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold text-slate-600">CTA URL</span>
                <Input value={section.ctaUrl ?? ""} onChange={(e) => updateSection(index, { ctaUrl: e.target.value })} />
              </label>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function BannersTab({
  banners,
  busy,
  onRefresh,
  onError,
  onMessage,
  setBusy,
}: {
  banners: ItrBanner[];
  busy: boolean;
  onRefresh: () => Promise<void>;
  onError: (msg: string) => void;
  onMessage: (msg: string) => void;
  setBusy: (v: boolean) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createFormKey, setCreateFormKey] = useState(0);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    onError("");
    try {
      const res = await fetch("/api/admin/itr/banners", { method: "POST", body: new FormData(form) });
      const data = await readJsonSafe(res);
      if (!res.ok) throw new Error(apiErrorMessage(data, "Create failed"));
      form.reset();
      setCreateFormKey((k) => k + 1);
      await onRefresh();
      onMessage("Banner created.");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function onUpdate(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    onError("");
    try {
      const res = await fetch(`/api/admin/itr/banners/${id}`, { method: "PATCH", body: new FormData(form) });
      const data = await readJsonSafe(res);
      if (!res.ok) throw new Error(apiErrorMessage(data, "Update failed"));
      setEditingId(null);
      await onRefresh();
      onMessage("Banner updated.");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm("Delete this banner?")) return;
    setBusy(true);
    onError("");
    try {
      const res = await fetch(`/api/admin/itr/banners/${id}`, { method: "DELETE" });
      const data = await readJsonSafe(res);
      if (!res.ok) throw new Error(apiErrorMessage(data, "Delete failed"));
      await onRefresh();
      onMessage("Banner deleted.");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-slate-900">
          <ImagePlus className="h-4 w-4 text-blue-700" />
          Create section banner
        </h2>
        <form key={createFormKey} onSubmit={onCreate} className="grid gap-4">
          <BannerFields disabled={busy} />
          <Button type="submit" disabled={busy} className="w-fit">
            {busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create banner
          </Button>
        </form>
      </Card>

      {!banners.length ? (
        <AdminEmptyState title="No ITR banners yet" description="Upload desktop and optional mobile images for section banners." />
      ) : (
        <div className="space-y-4">
          {banners.map((banner) => (
            <Card key={banner.id} className="overflow-hidden p-0">
              <div className="grid gap-4 md:grid-cols-[240px_1fr]">
                <div className="relative min-h-[140px] bg-slate-100">
                  <Image src={banner.imageUrl} alt={banner.altText || banner.title || "Banner"} fill className="object-cover" sizes="240px" />
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-900">{banner.title || "Untitled banner"}</p>
                      <p className="text-xs text-slate-500">{banner.sectionKey}</p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {banner.isActive ? "Active" : "Inactive"} · sort {banner.sortOrder}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => setEditingId(editingId === banner.id ? null : banner.id)}>
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button type="button" variant="outline" onClick={() => onDelete(banner.id)} disabled={busy}>
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                  {editingId === banner.id ? (
                    <form onSubmit={(e) => onUpdate(e, banner.id)} className="grid gap-4 border-t pt-4">
                      <BannerFields banner={banner} disabled={busy} />
                      <Button type="submit" disabled={busy} className="w-fit">
                        Save changes
                      </Button>
                    </form>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function BannerFields({ banner, disabled }: { banner?: ItrBanner; disabled?: boolean }) {
  const [desktopRatioWarning, setDesktopRatioWarning] = useState<string | null>(null);
  const [mobileRatioWarning, setMobileRatioWarning] = useState<string | null>(null);

  async function onDesktopImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setDesktopRatioWarning(null);
      return;
    }
    const dims = await readImageDimensions(file);
    if (!dims) {
      setDesktopRatioWarning(null);
      return;
    }
    setDesktopRatioWarning(partnerMobileBannerRatioWarning(dims.width, dims.height));
  }

  async function onMobileImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setMobileRatioWarning(null);
      return;
    }
    const dims = await readImageDimensions(file);
    if (!dims) {
      setMobileRatioWarning(null);
      return;
    }
    setMobileRatioWarning(partnerMobileBannerRatioWarning(dims.width, dims.height));
  }

  return (
    <div className="grid gap-4">
      <label className="grid gap-2">
        <span className="text-sm font-bold text-slate-700">Section key *</span>
        <select
          name="section_key"
          defaultValue={banner?.sectionKey ?? "hero"}
          disabled={disabled}
          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
        >
          {ITR_SECTION_KEYS.map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">Desktop image {banner ? "(optional replace)" : "*"}</span>
          <Input
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required={!banner}
            disabled={disabled}
            onChange={onDesktopImageChange}
          />
          <span className="text-xs text-slate-500">Recommended desktop size: {PARTNER_MOBILE_BANNER_SIZE_HINT}</span>
          {desktopRatioWarning ? (
            <span className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800">
              {desktopRatioWarning}
            </span>
          ) : null}
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">Mobile image</span>
          <Input
            name="mobile_image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={disabled}
            onChange={onMobileImageChange}
          />
          <span className="text-xs text-slate-500">Mobile image recommended size: {PARTNER_MOBILE_BANNER_SIZE_HINT}</span>
          {mobileRatioWarning ? (
            <span className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800">
              {mobileRatioWarning}
            </span>
          ) : null}
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">Title</span>
          <Input name="title" defaultValue={banner?.title ?? ""} disabled={disabled} />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">Sort order</span>
          <Input name="sort_order" type="number" defaultValue={banner?.sortOrder ?? 0} disabled={disabled} />
        </label>
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-bold text-slate-700">Description</span>
        <Input name="description" defaultValue={banner?.description ?? ""} disabled={disabled} />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-bold text-slate-700">Alt text</span>
        <Input name="alt_text" defaultValue={banner?.altText ?? ""} disabled={disabled} />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">Button text</span>
          <Input name="button_text" defaultValue={banner?.buttonText ?? ""} disabled={disabled} />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">Button URL</span>
          <Input name="button_url" defaultValue={banner?.buttonUrl ?? ""} disabled={disabled} />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">Start at</span>
          <Input name="start_at" type="datetime-local" defaultValue={toLocalInput(banner?.startAt)} disabled={disabled} />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">End at</span>
          <Input name="end_at" type="datetime-local" defaultValue={toLocalInput(banner?.endAt)} disabled={disabled} />
        </label>
      </div>

      <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
        <input type="checkbox" name="is_active" defaultChecked={banner?.isActive ?? true} disabled={disabled} />
        Active
      </label>
    </div>
  );
}

function PricingTab({
  plans,
  busy,
  onRefresh,
  runAction,
  setMessage,
}: {
  plans: ItrPricingPlan[];
  busy: boolean;
  onRefresh: () => Promise<void>;
  runAction: (fn: () => Promise<void>) => void;
  setMessage: (msg: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  async function savePlan(body: Record<string, unknown>, id?: string) {
    await runAction(async () => {
      const res = await fetch(id ? `/api/admin/itr/pricing/${id}` : "/api/admin/itr/pricing", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await readJsonSafe(res);
      if (!res.ok) throw new Error(apiErrorMessage(data, "Save failed"));
      setEditingId(null);
      await onRefresh();
      setMessage(id ? "Pricing plan updated." : "Pricing plan created.");
    });
  }

  async function deletePlan(id: string) {
    if (!window.confirm("Delete this pricing plan?")) return;
    await runAction(async () => {
      const res = await fetch(`/api/admin/itr/pricing/${id}`, { method: "DELETE" });
      const data = await readJsonSafe(res);
      if (!res.ok) throw new Error(apiErrorMessage(data, "Delete failed"));
      await onRefresh();
      setMessage("Pricing plan deleted.");
    });
  }

  return (
    <CrudListShell
      title="Pricing plans"
      description="Manage ITR package pricing shown on the landing page."
      emptyTitle="No pricing plans"
      emptyDescription="Add a pricing plan for the ITR landing page."
      items={plans}
      renderItem={(plan) => (
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-bold text-slate-900">
                {plan.name} · ₹{plan.price}
                {plan.isFeatured ? " · Featured" : ""}
              </p>
              <p className="text-xs text-slate-500">{plan.planKey}</p>
            </div>
            <CrudActions
              busy={busy}
              editing={editingId === plan.id}
              onEdit={() => setEditingId(editingId === plan.id ? null : (plan.id ?? null))}
              onDelete={() => plan.id && deletePlan(plan.id)}
            />
          </div>
          {editingId === plan.id ? (
            <PricingForm
              plan={plan}
              busy={busy}
              onSubmit={(body) => savePlan(body, plan.id)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <p className="text-sm text-slate-600">{plan.description}</p>
          )}
        </div>
      )}
      createForm={
        <PricingForm
          busy={busy}
          onSubmit={(body) => savePlan(body)}
          submitLabel="Add pricing plan"
        />
      }
    />
  );
}

function PricingForm({
  plan,
  busy,
  onSubmit,
  onCancel,
  submitLabel = "Save plan",
}: {
  plan?: ItrPricingPlan;
  busy: boolean;
  onSubmit: (body: Record<string, unknown>) => void;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [planKey, setPlanKey] = useState(plan?.planKey ?? "");
  const [name, setName] = useState(plan?.name ?? "");
  const [price, setPrice] = useState(plan?.price ?? 399);
  const [oldPrice, setOldPrice] = useState(plan?.oldPrice ?? "");
  const [description, setDescription] = useState(plan?.description ?? "");
  const [features, setFeatures] = useState((plan?.features ?? []).join("\n"));
  const [eligibleProfiles, setEligibleProfiles] = useState((plan?.eligibleProfiles ?? []).join("\n"));
  const [complexityNotes, setComplexityNotes] = useState(plan?.complexityNotes ?? "");
  const [ctaLabel, setCtaLabel] = useState(plan?.ctaLabel ?? "");
  const [sortOrder, setSortOrder] = useState(plan?.sortOrder ?? 0);
  const [isFeatured, setIsFeatured] = useState(plan?.isFeatured ?? false);
  const [isActive, setIsActive] = useState(plan?.isActive ?? true);

  return (
    <div className="grid gap-3 rounded-xl border border-slate-100 p-4">
      <div className="grid gap-3 md:grid-cols-2">
        {!plan ? (
          <label className="grid gap-1">
            <span className="text-xs font-bold text-slate-600">Plan key *</span>
            <Input value={planKey} onChange={(e) => setPlanKey(e.target.value)} placeholder="basic" />
          </label>
        ) : null}
        <label className="grid gap-1">
          <span className="text-xs font-bold text-slate-600">Name *</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold text-slate-600">Price (₹) *</span>
          <Input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold text-slate-600">Old price (₹)</span>
          <Input value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold text-slate-600">Sort order</span>
          <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold text-slate-600">CTA label</span>
          <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} />
        </label>
      </div>
      <label className="grid gap-1">
        <span className="text-xs font-bold text-slate-600">Description</span>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </label>
      <label className="grid gap-1">
        <span className="text-xs font-bold text-slate-600">Features (one per line)</span>
        <Textarea value={features} onChange={(e) => setFeatures(e.target.value)} rows={4} />
      </label>
      <label className="grid gap-1">
        <span className="text-xs font-bold text-slate-600">Eligible profiles (one per line)</span>
        <Textarea value={eligibleProfiles} onChange={(e) => setEligibleProfiles(e.target.value)} rows={3} />
      </label>
      <label className="grid gap-1">
        <span className="text-xs font-bold text-slate-600">Complexity notes</span>
        <Input value={complexityNotes} onChange={(e) => setComplexityNotes(e.target.value)} />
      </label>
      <div className="flex flex-wrap gap-4">
        <label className="inline-flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
          Featured
        </label>
        <label className="inline-flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          disabled={busy}
          onClick={() =>
            onSubmit({
              planKey: plan?.planKey ?? planKey,
              name,
              price,
              oldPrice: oldPrice === "" ? null : Number(oldPrice),
              description,
              features,
              eligibleProfiles,
              complexityNotes,
              ctaLabel,
              sortOrder,
              isFeatured,
              isActive,
            })
          }
        >
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function FaqsTab({
  faqs,
  busy,
  onRefresh,
  runAction,
  setMessage,
}: {
  faqs: ItrFaq[];
  busy: boolean;
  onRefresh: () => Promise<void>;
  runAction: (fn: () => Promise<void>) => void;
  setMessage: (msg: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  async function saveFaq(body: Record<string, unknown>, id?: string) {
    await runAction(async () => {
      const res = await fetch(id ? `/api/admin/itr/faqs/${id}` : "/api/admin/itr/faqs", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await readJsonSafe(res);
      if (!res.ok) throw new Error(apiErrorMessage(data, "Save failed"));
      setEditingId(null);
      await onRefresh();
      setMessage(id ? "FAQ updated." : "FAQ created.");
    });
  }

  async function deleteFaq(id: string) {
    if (!window.confirm("Delete this FAQ?")) return;
    await runAction(async () => {
      const res = await fetch(`/api/admin/itr/faqs/${id}`, { method: "DELETE" });
      const data = await readJsonSafe(res);
      if (!res.ok) throw new Error(apiErrorMessage(data, "Delete failed"));
      await onRefresh();
      setMessage("FAQ deleted.");
    });
  }

  return (
    <CrudListShell
      title="FAQs"
      description="Questions and answers on the ITR landing page."
      emptyTitle="No FAQs"
      emptyDescription="Add frequently asked questions."
      items={faqs}
      renderItem={(faq) => (
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="font-bold text-slate-900">{faq.question}</p>
            <CrudActions
              busy={busy}
              editing={editingId === faq.id}
              onEdit={() => setEditingId(editingId === faq.id ? null : (faq.id ?? null))}
              onDelete={() => faq.id && deleteFaq(faq.id)}
            />
          </div>
          {editingId === faq.id ? (
            <FaqForm faq={faq} busy={busy} onSubmit={(body) => saveFaq(body, faq.id)} onCancel={() => setEditingId(null)} />
          ) : (
            <p className="text-sm text-slate-600">{faq.answer}</p>
          )}
        </div>
      )}
      createForm={<FaqForm busy={busy} onSubmit={(body) => saveFaq(body)} submitLabel="Add FAQ" />}
    />
  );
}

function FaqForm({
  faq,
  busy,
  onSubmit,
  onCancel,
  submitLabel = "Save FAQ",
}: {
  faq?: ItrFaq;
  busy: boolean;
  onSubmit: (body: Record<string, unknown>) => void;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [question, setQuestion] = useState(faq?.question ?? "");
  const [answer, setAnswer] = useState(faq?.answer ?? "");
  const [sortOrder, setSortOrder] = useState(faq?.sortOrder ?? 0);
  const [isActive, setIsActive] = useState(faq?.isActive ?? true);

  return (
    <div className="grid gap-3 rounded-xl border border-slate-100 p-4">
      <label className="grid gap-1">
        <span className="text-xs font-bold text-slate-600">Question *</span>
        <Input value={question} onChange={(e) => setQuestion(e.target.value)} />
      </label>
      <label className="grid gap-1">
        <span className="text-xs font-bold text-slate-600">Answer *</span>
        <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={3} />
      </label>
      <label className="grid gap-1">
        <span className="text-xs font-bold text-slate-600">Sort order</span>
        <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
      </label>
      <label className="inline-flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Active
      </label>
      <div className="flex gap-2">
        <Button type="button" disabled={busy} onClick={() => onSubmit({ question, answer, sortOrder, isActive })}>
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function ReviewsTab({
  reviews,
  busy,
  onRefresh,
  runAction,
  setMessage,
}: {
  reviews: ItrReview[];
  busy: boolean;
  onRefresh: () => Promise<void>;
  runAction: (fn: () => Promise<void>) => void;
  setMessage: (msg: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  async function saveReview(body: Record<string, unknown>, id?: string) {
    await runAction(async () => {
      const res = await fetch(id ? `/api/admin/itr/reviews/${id}` : "/api/admin/itr/reviews", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await readJsonSafe(res);
      if (!res.ok) throw new Error(apiErrorMessage(data, "Save failed"));
      setEditingId(null);
      await onRefresh();
      setMessage(id ? "Review updated." : "Review created.");
    });
  }

  async function deleteReview(id: string) {
    if (!window.confirm("Delete this review?")) return;
    await runAction(async () => {
      const res = await fetch(`/api/admin/itr/reviews/${id}`, { method: "DELETE" });
      const data = await readJsonSafe(res);
      if (!res.ok) throw new Error(apiErrorMessage(data, "Delete failed"));
      await onRefresh();
      setMessage("Review deleted.");
    });
  }

  return (
    <CrudListShell
      title="Customer reviews"
      description="Testimonials shown on the ITR landing page."
      emptyTitle="No reviews"
      emptyDescription="Add customer reviews."
      items={reviews}
      renderItem={(review) => (
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-bold text-slate-900">
                {review.name} · {review.rating}★
              </p>
              <p className="text-xs text-slate-500">{review.location}</p>
            </div>
            <CrudActions
              busy={busy}
              editing={editingId === review.id}
              onEdit={() => setEditingId(editingId === review.id ? null : (review.id ?? null))}
              onDelete={() => review.id && deleteReview(review.id)}
            />
          </div>
          {editingId === review.id ? (
            <ReviewForm
              review={review}
              busy={busy}
              onSubmit={(body) => saveReview(body, review.id)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <p className="text-sm text-slate-600">{review.text}</p>
          )}
        </div>
      )}
      createForm={<ReviewForm busy={busy} onSubmit={(body) => saveReview(body)} submitLabel="Add review" />}
    />
  );
}

function ReviewForm({
  review,
  busy,
  onSubmit,
  onCancel,
  submitLabel = "Save review",
}: {
  review?: ItrReview;
  busy: boolean;
  onSubmit: (body: Record<string, unknown>) => void;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [name, setName] = useState(review?.name ?? "");
  const [location, setLocation] = useState(review?.location ?? "");
  const [filingCategory, setFilingCategory] = useState(review?.filingCategory ?? "");
  const [rating, setRating] = useState(review?.rating ?? 5);
  const [text, setText] = useState(review?.text ?? "");
  const [sortOrder, setSortOrder] = useState(review?.sortOrder ?? 0);
  const [isVerified, setIsVerified] = useState(review?.isVerified ?? false);
  const [isDemo, setIsDemo] = useState(review?.isDemo ?? false);
  const [isActive, setIsActive] = useState(review?.isActive ?? true);

  return (
    <div className="grid gap-3 rounded-xl border border-slate-100 p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-xs font-bold text-slate-600">Name *</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold text-slate-600">Location</span>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold text-slate-600">Filing category</span>
          <Input value={filingCategory} onChange={(e) => setFilingCategory(e.target.value)} placeholder="salaried" />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold text-slate-600">Rating (1–5)</span>
          <Input type="number" step="0.1" min="1" max="5" value={rating} onChange={(e) => setRating(Number(e.target.value))} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold text-slate-600">Sort order</span>
          <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
        </label>
      </div>
      <label className="grid gap-1">
        <span className="text-xs font-bold text-slate-600">Review text *</span>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} />
      </label>
      <div className="flex flex-wrap gap-4">
        <label className="inline-flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={isVerified} onChange={(e) => setIsVerified(e.target.checked)} />
          Verified
        </label>
        <label className="inline-flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={isDemo} onChange={(e) => setIsDemo(e.target.checked)} />
          Demo
        </label>
        <label className="inline-flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          disabled={busy}
          onClick={() =>
            onSubmit({ name, location, filingCategory, rating, text, sortOrder, isVerified, isDemo, isActive })
          }
        >
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function ComparisonTab({
  rows,
  busy,
  onRefresh,
  runAction,
  setMessage,
}: {
  rows: ItrComparisonRow[];
  busy: boolean;
  onRefresh: () => Promise<void>;
  runAction: (fn: () => Promise<void>) => void;
  setMessage: (msg: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  async function saveRow(body: Record<string, unknown>, id?: string) {
    await runAction(async () => {
      const res = await fetch(id ? `/api/admin/itr/comparison/${id}` : "/api/admin/itr/comparison", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await readJsonSafe(res);
      if (!res.ok) throw new Error(apiErrorMessage(data, "Save failed"));
      setEditingId(null);
      await onRefresh();
      setMessage(id ? "Comparison row updated." : "Comparison row created.");
    });
  }

  async function deleteRow(id: string) {
    if (!window.confirm("Delete this row?")) return;
    await runAction(async () => {
      const res = await fetch(`/api/admin/itr/comparison/${id}`, { method: "DELETE" });
      const data = await readJsonSafe(res);
      if (!res.ok) throw new Error(apiErrorMessage(data, "Delete failed"));
      await onRefresh();
      setMessage("Comparison row deleted.");
    });
  }

  return (
    <CrudListShell
      title="ITR form comparison"
      description="Form codes, typical taxpayers, and self filing vs expert-assisted rows."
      emptyTitle="No comparison rows"
      emptyDescription="Add ITR form comparison rows."
      items={rows}
      renderItem={(row) => (
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-bold text-slate-900">{row.feature}</p>
              <p className="text-xs text-slate-500">{row.formCode || "No form code"}</p>
            </div>
            <CrudActions
              busy={busy}
              editing={editingId === row.id}
              onEdit={() => setEditingId(editingId === row.id ? null : (row.id ?? null))}
              onDelete={() => row.id && deleteRow(row.id)}
            />
          </div>
          {editingId === row.id ? (
            <ComparisonForm row={row} busy={busy} onSubmit={(body) => saveRow(body, row.id)} onCancel={() => setEditingId(null)} />
          ) : (
            <p className="text-sm text-slate-600">
              {row.typicalTaxpayer || "—"} · Expert: {row.digiconnect || "—"} · Self: {row.selfFiling || "—"}
            </p>
          )}
        </div>
      )}
      createForm={<ComparisonForm busy={busy} onSubmit={(body) => saveRow(body)} submitLabel="Add row" />}
    />
  );
}

function ComparisonForm({
  row,
  busy,
  onSubmit,
  onCancel,
  submitLabel = "Save row",
}: {
  row?: ItrComparisonRow;
  busy: boolean;
  onSubmit: (body: Record<string, unknown>) => void;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [feature, setFeature] = useState(row?.feature ?? "");
  const [formCode, setFormCode] = useState(row?.formCode ?? "");
  const [typicalTaxpayer, setTypicalTaxpayer] = useState(row?.typicalTaxpayer ?? "");
  const [commonSources, setCommonSources] = useState(row?.commonSources ?? "");
  const [commonExclusions, setCommonExclusions] = useState(row?.commonExclusions ?? "");
  const [complexity, setComplexity] = useState(row?.complexity ?? "");
  const [suggestedPackage, setSuggestedPackage] = useState(row?.suggestedPackage ?? "");
  const [digiconnect, setDigiconnect] = useState(row?.digiconnect ?? "");
  const [selfFiling, setSelfFiling] = useState(row?.selfFiling ?? "");
  const [sortOrder, setSortOrder] = useState(row?.sortOrder ?? 0);
  const [isActive, setIsActive] = useState(row?.isActive ?? true);

  return (
    <div className="grid gap-3 rounded-xl border border-slate-100 p-4">
      <label className="grid gap-1">
        <span className="text-xs font-bold text-slate-600">Feature / form name *</span>
        <Input value={feature} onChange={(e) => setFeature(e.target.value)} />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-xs font-bold text-slate-600">Form code</span>
          <Input value={formCode} onChange={(e) => setFormCode(e.target.value)} placeholder="ITR-1" />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold text-slate-600">Typical taxpayer</span>
          <Input value={typicalTaxpayer} onChange={(e) => setTypicalTaxpayer(e.target.value)} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold text-slate-600">Common sources</span>
          <Input value={commonSources} onChange={(e) => setCommonSources(e.target.value)} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold text-slate-600">Common exclusions</span>
          <Input value={commonExclusions} onChange={(e) => setCommonExclusions(e.target.value)} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold text-slate-600">Complexity</span>
          <Input value={complexity} onChange={(e) => setComplexity(e.target.value)} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold text-slate-600">Suggested package</span>
          <Input value={suggestedPackage} onChange={(e) => setSuggestedPackage(e.target.value)} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold text-slate-600">Expert-assisted</span>
          <Input value={digiconnect} onChange={(e) => setDigiconnect(e.target.value)} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold text-slate-600">Self filing</span>
          <Input value={selfFiling} onChange={(e) => setSelfFiling(e.target.value)} />
        </label>
      </div>
      <label className="grid gap-1">
        <span className="text-xs font-bold text-slate-600">Sort order</span>
        <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
      </label>
      <label className="inline-flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Active
      </label>
      <div className="flex gap-2">
        <Button
          type="button"
          disabled={busy}
          onClick={() =>
            onSubmit({
              feature,
              formCode,
              typicalTaxpayer,
              commonSources,
              commonExclusions,
              complexity,
              suggestedPackage,
              digiconnect,
              selfFiling,
              sortOrder,
              isActive,
            })
          }
        >
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function RelatedTab({
  items,
  busy,
  onRefresh,
  runAction,
  setMessage,
}: {
  items: ItrRelatedService[];
  busy: boolean;
  onRefresh: () => Promise<void>;
  runAction: (fn: () => Promise<void>) => void;
  setMessage: (msg: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  async function saveItem(body: Record<string, unknown>, id?: string) {
    await runAction(async () => {
      const res = await fetch(id ? `/api/admin/itr/related/${id}` : "/api/admin/itr/related", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await readJsonSafe(res);
      if (!res.ok) throw new Error(apiErrorMessage(data, "Save failed"));
      setEditingId(null);
      await onRefresh();
      setMessage(id ? "Related service updated." : "Related service created.");
    });
  }

  async function deleteItem(id: string) {
    if (!window.confirm("Delete this related service?")) return;
    await runAction(async () => {
      const res = await fetch(`/api/admin/itr/related/${id}`, { method: "DELETE" });
      const data = await readJsonSafe(res);
      if (!res.ok) throw new Error(apiErrorMessage(data, "Delete failed"));
      await onRefresh();
      setMessage("Related service deleted.");
    });
  }

  return (
    <CrudListShell
      title="Related services"
      description="Cross-links to other DigiConnect services."
      emptyTitle="No related services"
      emptyDescription="Add related service links."
      items={items}
      renderItem={(item) => (
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-bold text-slate-900">{item.title || item.serviceSlug}</p>
              <p className="text-xs text-slate-500">/{item.serviceSlug}</p>
            </div>
            <CrudActions
              busy={busy}
              editing={editingId === item.id}
              onEdit={() => setEditingId(editingId === item.id ? null : (item.id ?? null))}
              onDelete={() => item.id && deleteItem(item.id)}
            />
          </div>
          {editingId === item.id ? (
            <RelatedForm item={item} busy={busy} onSubmit={(body) => saveItem(body, item.id)} onCancel={() => setEditingId(null)} />
          ) : (
            <p className="text-sm text-slate-600">{item.description}</p>
          )}
        </div>
      )}
      createForm={<RelatedForm busy={busy} onSubmit={(body) => saveItem(body)} submitLabel="Add related service" />}
    />
  );
}

function RelatedForm({
  item,
  busy,
  onSubmit,
  onCancel,
  submitLabel = "Save",
}: {
  item?: ItrRelatedService;
  busy: boolean;
  onSubmit: (body: Record<string, unknown>) => void;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [serviceSlug, setServiceSlug] = useState(item?.serviceSlug ?? "");
  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [sortOrder, setSortOrder] = useState(item?.sortOrder ?? 0);
  const [isActive, setIsActive] = useState(item?.isActive ?? true);

  return (
    <div className="grid gap-3 rounded-xl border border-slate-100 p-4">
      <label className="grid gap-1">
        <span className="text-xs font-bold text-slate-600">Service slug *</span>
        <Input value={serviceSlug} onChange={(e) => setServiceSlug(e.target.value)} placeholder="msme-registration" />
      </label>
      <label className="grid gap-1">
        <span className="text-xs font-bold text-slate-600">Title</span>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="grid gap-1">
        <span className="text-xs font-bold text-slate-600">Description</span>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </label>
      <label className="grid gap-1">
        <span className="text-xs font-bold text-slate-600">Sort order</span>
        <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
      </label>
      <label className="inline-flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Active
      </label>
      <div className="flex gap-2">
        <Button type="button" disabled={busy} onClick={() => onSubmit({ serviceSlug, title, description, sortOrder, isActive })}>
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function DocumentsTab({
  documents,
  busy,
  onRefresh,
  runAction,
  setMessage,
}: {
  documents: ItrDocumentItem[];
  busy: boolean;
  onRefresh: () => Promise<void>;
  runAction: (fn: () => Promise<void>) => void;
  setMessage: (msg: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  async function saveDocument(body: Record<string, unknown>, id?: string) {
    await runAction(async () => {
      const res = await fetch(id ? `/api/admin/itr/documents/${id}` : "/api/admin/itr/documents", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await readJsonSafe(res);
      if (!res.ok) throw new Error(apiErrorMessage(data, "Save failed"));
      setEditingId(null);
      await onRefresh();
      setMessage(id ? "Document item updated." : "Document item created.");
    });
  }

  async function deleteDocument(id: string) {
    if (!window.confirm("Delete this document item?")) return;
    await runAction(async () => {
      const res = await fetch(`/api/admin/itr/documents/${id}`, { method: "DELETE" });
      const data = await readJsonSafe(res);
      if (!res.ok) throw new Error(apiErrorMessage(data, "Delete failed"));
      await onRefresh();
      setMessage("Document item deleted.");
    });
  }

  return (
    <CrudListShell
      title="Document checklist"
      description="Category-wise documents shown on the ITR landing page."
      emptyTitle="No document items"
      emptyDescription="Add checklist items for taxpayer profiles and income sources."
      items={documents}
      renderItem={(doc) => (
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-bold text-slate-900">{doc.documentLabel}</p>
              <p className="text-xs text-slate-500">
                {doc.categoryLabel} · {doc.documentKey}
                {doc.requiredDefault ? " · Required by default" : ""}
              </p>
            </div>
            <CrudActions
              busy={busy}
              editing={editingId === doc.id}
              onEdit={() => setEditingId(editingId === doc.id ? null : (doc.id ?? null))}
              onDelete={() => doc.id && deleteDocument(doc.id)}
            />
          </div>
          {editingId === doc.id ? (
            <DocumentForm doc={doc} busy={busy} onSubmit={(body) => saveDocument(body, doc.id)} onCancel={() => setEditingId(null)} />
          ) : (
            <p className="text-sm text-slate-600">{doc.helpText || "No help text"}</p>
          )}
        </div>
      )}
      createForm={<DocumentForm busy={busy} onSubmit={(body) => saveDocument(body)} submitLabel="Add document item" />}
    />
  );
}

function DocumentForm({
  doc,
  busy,
  onSubmit,
  onCancel,
  submitLabel = "Save document",
}: {
  doc?: ItrDocumentItem;
  busy: boolean;
  onSubmit: (body: Record<string, unknown>) => void;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [categoryKey, setCategoryKey] = useState(doc?.categoryKey ?? "");
  const [categoryLabel, setCategoryLabel] = useState(doc?.categoryLabel ?? "");
  const [documentKey, setDocumentKey] = useState(doc?.documentKey ?? "");
  const [documentLabel, setDocumentLabel] = useState(doc?.documentLabel ?? "");
  const [taxpayerProfiles, setTaxpayerProfiles] = useState((doc?.taxpayerProfiles ?? []).join("\n"));
  const [incomeSources, setIncomeSources] = useState((doc?.incomeSources ?? []).join("\n"));
  const [helpText, setHelpText] = useState(doc?.helpText ?? "");
  const [sortOrder, setSortOrder] = useState(doc?.sortOrder ?? 0);
  const [requiredDefault, setRequiredDefault] = useState(doc?.requiredDefault ?? false);
  const [isActive, setIsActive] = useState(doc?.isActive ?? true);

  return (
    <div className="grid gap-3 rounded-xl border border-slate-100 p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-xs font-bold text-slate-600">Category key *</span>
          <Input value={categoryKey} onChange={(e) => setCategoryKey(e.target.value)} placeholder="identity" />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold text-slate-600">Category label *</span>
          <Input value={categoryLabel} onChange={(e) => setCategoryLabel(e.target.value)} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold text-slate-600">Document key *</span>
          <Input value={documentKey} onChange={(e) => setDocumentKey(e.target.value)} placeholder="pan_card" />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold text-slate-600">Document label *</span>
          <Input value={documentLabel} onChange={(e) => setDocumentLabel(e.target.value)} />
        </label>
      </div>
      <label className="grid gap-1">
        <span className="text-xs font-bold text-slate-600">Taxpayer profiles (one per line)</span>
        <Textarea value={taxpayerProfiles} onChange={(e) => setTaxpayerProfiles(e.target.value)} rows={2} />
      </label>
      <label className="grid gap-1">
        <span className="text-xs font-bold text-slate-600">Income sources (one per line)</span>
        <Textarea value={incomeSources} onChange={(e) => setIncomeSources(e.target.value)} rows={2} />
      </label>
      <label className="grid gap-1">
        <span className="text-xs font-bold text-slate-600">Help text</span>
        <Textarea value={helpText} onChange={(e) => setHelpText(e.target.value)} rows={2} />
      </label>
      <label className="grid gap-1">
        <span className="text-xs font-bold text-slate-600">Sort order</span>
        <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
      </label>
      <div className="flex flex-wrap gap-4">
        <label className="inline-flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={requiredDefault} onChange={(e) => setRequiredDefault(e.target.checked)} />
          Required by default
        </label>
        <label className="inline-flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          disabled={busy}
          onClick={() =>
            onSubmit({
              categoryKey,
              categoryLabel,
              documentKey,
              documentLabel,
              taxpayerProfiles,
              incomeSources,
              helpText,
              sortOrder,
              requiredDefault,
              isActive,
            })
          }
        >
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function SettingsTab({
  settings,
  busy,
  onSave,
}: {
  settings: ItrPageSettings;
  busy: boolean;
  onSave: (settings: ItrPageSettings) => void;
}) {
  const [draft, setDraft] = useState(settings);

  function patch(partial: Partial<ItrPageSettings>) {
    setDraft((prev) => ({ ...prev, ...partial }));
  }

  return (
    <Card className="space-y-4 p-5">
      <div>
        <h2 className="text-sm font-extrabold text-slate-900">Page settings</h2>
        <p className="text-xs text-slate-500">
          Assessment year, CTAs, contact details, SEO, and disclaimers. Preview at{" "}
          <a href={ITR_LANDING_PATH} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">
            {ITR_LANDING_PATH}
          </a>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 md:col-span-2">
          <span className="text-xs font-bold text-slate-600">Assessment year *</span>
          <Input
            value={draft.assessmentYear}
            onChange={(e) => patch({ assessmentYear: e.target.value })}
            placeholder="AY 2026-27 (FY 2025-26)"
          />
          <span className="text-[11px] text-slate-500">
            Shown across the landing page and apply flow — update here when the filing season changes.
          </span>
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold text-slate-600">Filing open notice</span>
          <Input
            value={draft.filingOpenNotice ?? ""}
            onChange={(e) => patch({ filingOpenNotice: e.target.value || null })}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold text-slate-600">Starting price (₹)</span>
          <Input
            type="number"
            value={draft.startingPrice}
            onChange={(e) => patch({ startingPrice: Number(e.target.value) || 0 })}
          />
        </label>
        <label className="inline-flex items-center gap-2 text-sm font-semibold md:col-span-2">
          <input type="checkbox" checked={draft.isPublished} onChange={(e) => patch({ isPublished: e.target.checked })} />
          Published
        </label>
        <label className="inline-flex items-center gap-2 text-sm font-semibold md:col-span-2">
          <input
            type="checkbox"
            checked={draft.stickyCtaEnabled}
            onChange={(e) => patch({ stickyCtaEnabled: e.target.checked })}
          />
          Sticky mobile CTA enabled
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold text-slate-600">Sticky CTA label</span>
          <Input value={draft.stickyCtaLabel} onChange={(e) => patch({ stickyCtaLabel: e.target.value })} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold text-slate-600">Sticky CTA URL</span>
          <Input value={draft.stickyCtaUrl} onChange={(e) => patch({ stickyCtaUrl: e.target.value })} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold text-slate-600">Video URL</span>
          <Input value={draft.videoUrl ?? ""} onChange={(e) => patch({ videoUrl: e.target.value || null })} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold text-slate-600">Default plan ID</span>
          <Input value={draft.defaultPlanId} onChange={(e) => patch({ defaultPlanId: e.target.value })} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold text-slate-600">WhatsApp number</span>
          <Input value={draft.whatsappNumber} onChange={(e) => patch({ whatsappNumber: e.target.value })} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold text-slate-600">Support phone</span>
          <Input value={draft.supportPhone} onChange={(e) => patch({ supportPhone: e.target.value })} />
        </label>
        <label className="grid gap-1 md:col-span-2">
          <span className="text-xs font-bold text-slate-600">Meta title</span>
          <Input value={draft.metaTitle ?? ""} onChange={(e) => patch({ metaTitle: e.target.value || null })} />
        </label>
        <label className="grid gap-1 md:col-span-2">
          <span className="text-xs font-bold text-slate-600">Meta description</span>
          <Textarea
            value={draft.metaDescription ?? ""}
            onChange={(e) => patch({ metaDescription: e.target.value || null })}
            rows={3}
          />
        </label>
        <label className="grid gap-1 md:col-span-2">
          <span className="text-xs font-bold text-slate-600">Pricing disclaimer</span>
          <Textarea
            value={draft.pricingDisclaimer ?? ""}
            onChange={(e) => patch({ pricingDisclaimer: e.target.value || null })}
            rows={2}
          />
        </label>
        <label className="grid gap-1 md:col-span-2">
          <span className="text-xs font-bold text-slate-600">Customer declaration</span>
          <Textarea
            value={draft.customerDeclaration ?? ""}
            onChange={(e) => patch({ customerDeclaration: e.target.value || null })}
            rows={2}
          />
        </label>
      </div>

      <Button type="button" disabled={busy} onClick={() => onSave(draft)}>
        {busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
        Save settings
      </Button>
    </Card>
  );
}

function CrudListShell<T extends { id?: string }>({
  title,
  description,
  emptyTitle,
  emptyDescription,
  items,
  renderItem,
  createForm,
}: {
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  items: T[];
  renderItem: (item: T) => ReactNode;
  createForm: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h2 className="mb-1 text-sm font-extrabold text-slate-900">{title}</h2>
        <p className="mb-4 text-xs text-slate-500">{description}</p>
        {createForm}
      </Card>
      {!items.length ? (
        <AdminEmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id ?? JSON.stringify(item)} className="p-4">
              {renderItem(item)}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CrudActions({
  busy,
  editing,
  onEdit,
  onDelete,
}: {
  busy: boolean;
  editing: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex gap-2">
      <Button type="button" variant="outline" className="h-8 px-3 text-xs" onClick={onEdit}>
        <Pencil className="mr-1 h-3.5 w-3.5" />
        {editing ? "Close" : "Edit"}
      </Button>
      <Button type="button" variant="outline" className="h-8 px-3 text-xs" onClick={onDelete} disabled={busy}>
        <Trash2 className="mr-1 h-3.5 w-3.5" />
        Delete
      </Button>
    </div>
  );
}

function toLocalInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function readJsonSafe(res: Response): Promise<Record<string, unknown>> {
  try {
    const data = await res.json();
    return data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function apiErrorMessage(data: Record<string, unknown>, fallback: string) {
  const message = data.message;
  const error = data.error;
  if (typeof message === "string" && message.trim()) return message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}
