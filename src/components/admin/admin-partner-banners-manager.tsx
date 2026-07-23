"use client";

import Image from "next/image";
import { type ChangeEvent, FormEvent, useState } from "react";
import { ImagePlus, LoaderCircle, Pencil, Trash2 } from "lucide-react";

import { AdminEmptyState } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AP_PARTNER_TYPE_LABELS, DIGI_PARTNER_TYPE_VALUES } from "@/lib/ap/partner-type";
import {
  PARTNER_MOBILE_BANNER_SIZE_HINT,
  partnerMobileBannerRatioWarning,
  readImageDimensions,
} from "@/lib/ap/partner-banner-aspect";
import type { PartnerAnnouncementBanner } from "@/lib/ap/home-types";

type ManagerProps = {
  initialBanners: PartnerAnnouncementBanner[];
};

export function AdminPartnerBannersManager({ initialBanners }: ManagerProps) {
  const [banners, setBanners] = useState(initialBanners);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createFormKey, setCreateFormKey] = useState(0);

  async function refresh() {
    const res = await fetch("/api/admin/partner-banners");
    const data = await readJsonSafe(res);
    if (res.ok && Array.isArray(data.banners)) {
      setBanners(data.banners as PartnerAnnouncementBanner[]);
    }
  }

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setError("");
    try {
      const body = new FormData(form);
      const res = await fetch("/api/admin/partner-banners", { method: "POST", body });
      const data = await readJsonSafe(res);
      if (!res.ok) {
        throw new Error(apiErrorMessage(data, `Create failed (${res.status})`));
      }
      // Capture form before await; only reset after success so failures keep input values.
      resetCreateForm(form);
      setCreateFormKey((key) => key + 1);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function onUpdate(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setError("");
    try {
      const body = new FormData(form);
      const res = await fetch(`/api/admin/partner-banners/${id}`, { method: "PATCH", body });
      const data = await readJsonSafe(res);
      if (!res.ok) {
        throw new Error(apiErrorMessage(data, `Update failed (${res.status})`));
      }
      setEditingId(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm("Delete this banner?")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/partner-banners/${id}`, { method: "DELETE" });
      const data = await readJsonSafe(res);
      if (!res.ok) {
        throw new Error(apiErrorMessage(data, `Delete failed (${res.status})`));
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      <Card className="p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-slate-900">
          <ImagePlus className="h-4 w-4 text-blue-700" />
          Create Digi Partner banner
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
        <AdminEmptyState title="No partner banners yet" description="Create an announcement banner for the Digi Partner home slider." />
      ) : (
        <div className="space-y-4">
          {banners.map((banner) => (
            <Card key={banner.id} className="overflow-hidden p-0">
              <div className="grid gap-4 md:grid-cols-[240px_1fr]">
                <div className="relative min-h-[140px] bg-slate-100">
                  <Image src={banner.image_url} alt={banner.title || "Banner"} fill className="object-cover" sizes="240px" />
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-900">{banner.title || "Untitled banner"}</p>
                      <p className="text-xs text-slate-500">{banner.description || "No description"}</p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {banner.is_active ? "Active" : "Inactive"} · sort {banner.sort_order}
                        {banner.partner_types?.length
                          ? ` · ${banner.partner_types.map((t) => AP_PARTNER_TYPE_LABELS[t]).join(", ")}`
                          : " · All partner types"}
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
                    <form onSubmit={(event) => onUpdate(event, banner.id)} className="grid gap-4 border-t pt-4">
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

function BannerFields({
  banner,
  disabled,
}: {
  banner?: PartnerAnnouncementBanner;
  disabled?: boolean;
}) {
  const [mobileRatioWarning, setMobileRatioWarning] = useState<string | null>(null);

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
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">Desktop image {banner ? "(optional replace)" : "*"}</span>
          <Input name="image" type="file" accept="image/jpeg,image/png,image/webp" required={!banner} disabled={disabled} />
          <span className="text-xs text-slate-500">Recommended: ~1920×823 px (21:9) for desktop.</span>
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
          <span className="text-xs text-slate-500">
            Mobile image recommended size: {PARTNER_MOBILE_BANNER_SIZE_HINT}
          </span>
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
          <Input name="sort_order" type="number" defaultValue={banner?.sort_order ?? 0} disabled={disabled} />
        </label>
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-bold text-slate-700">Description</span>
        <Input name="description" defaultValue={banner?.description ?? ""} disabled={disabled} />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">Button text</span>
          <Input name="button_text" defaultValue={banner?.button_text ?? ""} disabled={disabled} />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">Button URL</span>
          <Input name="button_url" defaultValue={banner?.button_url ?? ""} placeholder="/ap/applications or https://..." disabled={disabled} />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">Start at</span>
          <Input name="start_at" type="datetime-local" defaultValue={toLocalInput(banner?.start_at)} disabled={disabled} />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">End at</span>
          <Input name="end_at" type="datetime-local" defaultValue={toLocalInput(banner?.end_at)} disabled={disabled} />
        </label>
      </div>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-bold text-slate-700">Visible partner types</legend>
        <p className="text-xs text-slate-500">Leave all unchecked to show for every Digi Partner type.</p>
        <div className="flex flex-wrap gap-3">
          {DIGI_PARTNER_TYPE_VALUES.map((type) => (
            <label key={type} className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                name="partner_types"
                value={type}
                defaultChecked={Boolean(banner?.partner_types?.includes(type))}
                disabled={disabled}
              />
              {AP_PARTNER_TYPE_LABELS[type]}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
        <input type="checkbox" name="is_active" defaultChecked={banner?.is_active ?? true} disabled={disabled} />
        Active
      </label>
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

/** Reset create form after success — never call after a failed request. */
function resetCreateForm(form: HTMLFormElement) {
  form.reset();

  const desktopImage = form.elements.namedItem("image");
  if (desktopImage instanceof HTMLInputElement) desktopImage.value = "";

  const mobileImage = form.elements.namedItem("mobile_image");
  if (mobileImage instanceof HTMLInputElement) mobileImage.value = "";

  const sortOrder = form.elements.namedItem("sort_order");
  if (sortOrder instanceof HTMLInputElement) sortOrder.value = "0";

  const active = form.elements.namedItem("is_active");
  if (active instanceof HTMLInputElement) active.checked = true;

  for (const type of DIGI_PARTNER_TYPE_VALUES) {
    const boxes = form.querySelectorAll<HTMLInputElement>(`input[name="partner_types"][value="${type}"]`);
    boxes.forEach((box) => {
      box.checked = false;
    });
  }
}
