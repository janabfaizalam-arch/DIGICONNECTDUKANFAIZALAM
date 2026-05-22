"use client";

import Image from "next/image";
import { FormEvent, useRef, useState } from "react";
import { ImageIcon, ImagePlus, LoaderCircle, Pencil, Trash2 } from "lucide-react";

import { AdminEmptyState } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AboutPageImage } from "@/lib/about-page-images";
import { cn } from "@/lib/utils";

const maxImageSize = 8 * 1024 * 1024;

type ApiResponse = {
  image?: AboutPageImage;
  message?: string;
  error?: string;
};

function sortImages(images: AboutPageImage[]) {
  return [...images].sort((a, b) => a.sort_order - b.sort_order || Date.parse(b.created_at) - Date.parse(a.created_at));
}

function getMessage(data: ApiResponse, fallback: string) {
  return data.error || data.message || fallback;
}

function validateImage(file: FormDataEntryValue | null, required: boolean) {
  if (!(file instanceof File) || file.size === 0) return required ? "Please choose an About page image." : "";
  if (!file.type.startsWith("image/")) return "About page media must be an image.";
  if (file.size > maxImageSize) return "About page image must be smaller than 8MB.";
  return "";
}

function ImageFields({ image, disabled }: { image?: AboutPageImage; disabled?: boolean }) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-[1fr_8rem]">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">Title</span>
          <Input name="title" defaultValue={image?.title ?? ""} placeholder="Optional showcase title" disabled={disabled} />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">Sort order</span>
          <Input name="sort_order" type="number" defaultValue={image?.sort_order ?? 0} disabled={disabled} />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">Alt text</span>
          <Input name="alt_text" defaultValue={image?.alt_text ?? ""} placeholder="Describe the image for accessibility" disabled={disabled} />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">Image</span>
          <Input name="image" type="file" accept="image/jpeg,image/png,image/webp" required={!image} disabled={disabled} />
        </label>
      </div>
      <label className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/45 px-4 py-3 text-sm font-bold text-slate-700">
        <input name="is_active" type="checkbox" value="true" defaultChecked={image?.is_active ?? true} disabled={disabled} className="h-4 w-4 accent-blue-700" />
        Active on About page
      </label>
      <input type="hidden" name="is_active" value="false" />
    </div>
  );
}

export function AdminAboutPageImagesManager({ initialImages }: { initialImages: AboutPageImage[] }) {
  const [images, setImages] = useState(sortImages(initialImages));
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

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
      const response = await fetch("/api/admin/about-page-images", { method: "POST", body: formData });
      const data = (await response.json()) as ApiResponse;
      if (!response.ok || !data.image) {
        setError(getMessage(data, "About page image could not be uploaded."));
        return;
      }

      setImages((current) => sortImages([data.image!, ...current]));
      setMessage(data.message || "About page image uploaded.");
      formRef.current?.reset();
    } catch {
      setError("About page image could not be uploaded.");
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>, image: AboutPageImage) {
    event.preventDefault();
    setMessage("");
    setError("");
    const formData = new FormData(event.currentTarget);
    const imageError = validateImage(formData.get("image"), false);
    if (imageError) {
      setError(imageError);
      return;
    }
    formData.set("id", image.id);
    setBusyId(image.id);

    try {
      const response = await fetch("/api/admin/about-page-images", { method: "PATCH", body: formData });
      const data = (await response.json()) as ApiResponse;
      if (!response.ok || !data.image) {
        setError(getMessage(data, "About page image could not be updated."));
        return;
      }

      setImages((current) => sortImages(current.map((item) => (item.id === image.id ? data.image! : item))));
      setMessage(data.message || "About page image updated.");
    } catch {
      setError("About page image could not be updated.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(image: AboutPageImage) {
    if (!window.confirm("Delete this About page image?")) return;
    setMessage("");
    setError("");
    setBusyId(image.id);

    try {
      const response = await fetch("/api/admin/about-page-images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: image.id }),
      });
      const data = (await response.json()) as ApiResponse;
      if (!response.ok) {
        setError(getMessage(data, "About page image could not be deleted."));
        return;
      }

      setImages((current) => current.filter((item) => item.id !== image.id));
      setMessage(data.message || "About page image deleted.");
    } catch {
      setError("About page image could not be deleted.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-blue-100 p-4 shadow-sm md:p-6">
        <div className="mb-5 flex items-start gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><ImagePlus className="h-5 w-5" /></span>
          <div>
            <h2 className="text-lg font-bold text-slate-950">Upload showcase image</h2>
            <p className="mt-1 text-sm text-slate-600">Images appear in the public About gallery after activation.</p>
          </div>
        </div>
        <form ref={formRef} onSubmit={(event) => void handleCreate(event)} className="space-y-5">
          <ImageFields disabled={creating} />
          <Button type="submit" disabled={creating}>{creating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}Upload Image</Button>
        </form>
        {message ? <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
      </Card>

      {images.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {images.map((image) => (
            <Card key={image.id} className="overflow-hidden border-blue-100 p-0 shadow-sm">
              <div className="relative aspect-[16/10] bg-slate-100">
                <Image src={image.image_url} alt={image.alt_text || image.title || "About page preview"} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
              </div>
              <div className="space-y-4 p-4 md:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <span className={cn("rounded-full px-3 py-1 text-xs font-extrabold", image.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600")}>{image.is_active ? "Active" : "Inactive"}</span>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">Order {image.sort_order}</span>
                  </div>
                  <Button type="button" variant="outline" className="text-red-600" disabled={busyId === image.id} onClick={() => void handleDelete(image)}>
                    <Trash2 className="h-4 w-4" />Delete
                  </Button>
                </div>
                <form onSubmit={(event) => void handleUpdate(event, image)} className="space-y-5">
                  <ImageFields image={image} disabled={busyId === image.id} />
                  <Button type="submit" variant="outline" disabled={busyId === image.id}>{busyId === image.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}Save Changes</Button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div>
          <div className="mb-4 flex justify-center"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><ImageIcon className="h-5 w-5" /></span></div>
          <AdminEmptyState title="No About page images yet" description="Upload the first image for the public About gallery." />
        </div>
      )}
    </div>
  );
}
