"use client";

import Image from "next/image";
import { FormEvent, useRef, useState } from "react";
import { BadgePercent, ImagePlus, LoaderCircle, Pencil, Trash2 } from "lucide-react";

import { AdminEmptyState } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { HomepageOfferBanner, SiteSectionSetting } from "@/lib/homepage-offer-banners";
import { cn } from "@/lib/utils";

const maxImageSize = 8 * 1024 * 1024;

type ApiResponse = {
  banner?: HomepageOfferBanner;
  setting?: SiteSectionSetting;
  message?: string;
  error?: string;
};

function sortBanners(banners: HomepageOfferBanner[]) {
  return [...banners].sort((a, b) => a.sort_order - b.sort_order || Date.parse(b.created_at) - Date.parse(a.created_at));
}

function getMessage(data: ApiResponse, fallback: string) {
  return data.error || data.message || fallback;
}

function validateImage(file: FormDataEntryValue | null, required: boolean) {
  if (!(file instanceof File) || file.size === 0) return required ? "Please choose an offer banner image." : "";
  if (!file.type.startsWith("image/")) return "Offer banner must be an image file.";
  if (file.size > maxImageSize) return "Offer banner must be smaller than 8MB.";
  return "";
}

function BannerFields({ banner, disabled }: { banner?: HomepageOfferBanner; disabled?: boolean }) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-[1fr_8rem]">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">Banner title</span>
          <Input name="title" defaultValue={banner?.title ?? ""} placeholder="Optional admin label" disabled={disabled} />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">Sort order</span>
          <Input name="sort_order" type="number" defaultValue={banner?.sort_order ?? 0} disabled={disabled} />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">Link URL</span>
          <Input name="link_url" defaultValue={banner?.link_url ?? ""} placeholder="/services or https://..." disabled={disabled} />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">Thin banner image</span>
          <Input name="image" type="file" accept="image/jpeg,image/png,image/webp" required={!banner} disabled={disabled} />
        </label>
      </div>
      <label className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/45 px-4 py-3 text-sm font-bold text-slate-700">
        <input name="is_active" type="checkbox" value="true" defaultChecked={banner?.is_active ?? true} disabled={disabled} className="h-4 w-4 accent-blue-700" />
        Active on homepage
      </label>
      <input type="hidden" name="is_active" value="false" />
    </div>
  );
}

export function AdminHomepageOfferStripManager({
  initialBanners,
  initialSetting,
}: {
  initialBanners: HomepageOfferBanner[];
  initialSetting: SiteSectionSetting;
}) {
  const [banners, setBanners] = useState(sortBanners(initialBanners));
  const [title, setTitle] = useState(initialSetting.title);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [savingTitle, setSavingTitle] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  async function handleTitleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setSavingTitle(true);

    try {
      const response = await fetch("/api/admin/homepage-offer-strip", { method: "PATCH", body: new FormData(event.currentTarget) });
      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.setting) {
        setError(getMessage(data, "Offer strip title could not be updated."));
        return;
      }

      setTitle(data.setting.title);
      setMessage(data.message || "Offer strip title updated.");
    } catch {
      setError("Offer strip title could not be updated.");
    } finally {
      setSavingTitle(false);
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    const formData = new FormData(event.currentTarget);
    const imageError = validateImage(formData.get("image"), true);
    if (imageError) {
      setError(imageError);
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/admin/homepage-offer-strip", { method: "POST", body: formData });
      const data = (await response.json()) as ApiResponse;
      if (!response.ok || !data.banner) {
        setError(getMessage(data, "Offer banner could not be created."));
        return;
      }

      setBanners((current) => sortBanners([data.banner!, ...current]));
      setMessage(data.message || "Offer banner created.");
      formRef.current?.reset();
    } catch {
      setError("Offer banner could not be created.");
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>, banner: HomepageOfferBanner) {
    event.preventDefault();
    setMessage("");
    setError("");
    const formData = new FormData(event.currentTarget);
    const imageError = validateImage(formData.get("image"), false);
    if (imageError) {
      setError(imageError);
      return;
    }

    setBusyId(banner.id);
    try {
      const response = await fetch(`/api/admin/homepage-offer-strip/${banner.id}`, { method: "PATCH", body: formData });
      const data = (await response.json()) as ApiResponse;
      if (!response.ok || !data.banner) {
        setError(getMessage(data, "Offer banner could not be updated."));
        return;
      }

      setBanners((current) => sortBanners(current.map((item) => (item.id === banner.id ? data.banner! : item))));
      setMessage(data.message || "Offer banner updated.");
    } catch {
      setError("Offer banner could not be updated.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(banner: HomepageOfferBanner) {
    if (!window.confirm("Delete this offer banner?")) return;
    setMessage("");
    setError("");
    setBusyId(banner.id);

    try {
      const response = await fetch(`/api/admin/homepage-offer-strip/${banner.id}`, { method: "DELETE" });
      const data = (await response.json()) as ApiResponse;
      if (!response.ok) {
        setError(getMessage(data, "Offer banner could not be deleted."));
        return;
      }

      setBanners((current) => current.filter((item) => item.id !== banner.id));
      setMessage(data.message || "Offer banner deleted.");
    } catch {
      setError("Offer banner could not be deleted.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-blue-100 p-4 shadow-sm md:p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600"><BadgePercent className="h-5 w-5" /></span>
          <div>
            <h2 className="text-lg font-bold text-slate-950">Strip title</h2>
            <p className="text-sm text-slate-600">This small title appears above the thin homepage slider.</p>
          </div>
        </div>
        <form onSubmit={(event) => void handleTitleSave(event)} className="flex flex-col gap-3 md:flex-row">
          <Input name="title" defaultValue={title} maxLength={100} required className="md:max-w-xl" />
          <Button type="submit" disabled={savingTitle}>{savingTitle ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}Save Title</Button>
        </form>
      </Card>

      <Card className="border-blue-100 p-4 shadow-sm md:p-6">
        <h2 className="text-lg font-bold text-slate-950">Create banner</h2>
        <p className="mt-1 text-sm text-slate-600">Recommended image shape: a mobile-friendly 2:1 crop that also reads as a slim desktop strip.</p>
        <form ref={formRef} onSubmit={(event) => void handleCreate(event)} className="mt-5 space-y-5">
          <BannerFields disabled={creating} />
          <Button type="submit" disabled={creating}>{creating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}Create Banner</Button>
        </form>
        {message ? <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
      </Card>

      {banners.length ? banners.map((banner) => (
        <Card key={banner.id} className="overflow-hidden border-blue-100 p-0 shadow-sm">
          <div className="grid lg:grid-cols-[18rem_1fr]">
            <div className="relative aspect-[2/1] bg-slate-100 lg:aspect-auto">
              <Image src={banner.image_url} alt={banner.title || "Offer banner preview"} fill sizes="(min-width: 1024px) 18rem, 100vw" className="object-cover" />
            </div>
            <div className="space-y-4 p-4 md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <span className={cn("rounded-full px-3 py-1 text-xs font-extrabold", banner.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600")}>{banner.is_active ? "Active" : "Inactive"}</span>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">Order {banner.sort_order}</span>
                </div>
                <Button type="button" variant="outline" className="text-red-600" disabled={busyId === banner.id} onClick={() => void handleDelete(banner)}>
                  <Trash2 className="h-4 w-4" />Delete
                </Button>
              </div>
              <form onSubmit={(event) => void handleUpdate(event, banner)} className="space-y-5">
                <BannerFields banner={banner} disabled={busyId === banner.id} />
                <Button type="submit" variant="outline" disabled={busyId === banner.id}>{busyId === banner.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}Save Changes</Button>
              </form>
            </div>
          </div>
        </Card>
      )) : <AdminEmptyState title="No offer strip banners yet" description="Create the first thin homepage banner above." />}
    </div>
  );
}
