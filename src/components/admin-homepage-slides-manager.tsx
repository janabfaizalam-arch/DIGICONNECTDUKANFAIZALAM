"use client";

import Image from "next/image";
import { FormEvent, useRef, useState } from "react";
import { ImageIcon, ImagePlus, LoaderCircle, Pencil, Trash2 } from "lucide-react";

import { AdminEmptyState } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { homepageSlideCtaPositions, type HomepageSlide, type HomepageSlideCtaPosition } from "@/lib/homepage-slides";
import { cn } from "@/lib/utils";

const maxImageSize = 8 * 1024 * 1024;

type ApiResponse = {
  slide?: HomepageSlide;
  message?: string;
  error?: string;
};

type AdminHomepageSlidesManagerProps = {
  initialSlides: HomepageSlide[];
};

function getResponseMessage(data: ApiResponse, fallback: string) {
  return data.error || data.message || fallback;
}

function validateImage(file: FormDataEntryValue | null, required: boolean) {
  if (!(file instanceof File) || file.size === 0) {
    return required ? "Please choose a desktop poster image." : "";
  }

  if (!file.type.startsWith("image/")) {
    return "Poster must be an image file.";
  }

  if (file.size > maxImageSize) {
    return "Poster images must be smaller than 8MB.";
  }

  return "";
}

function formatDateForInput(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 16);
}

function SlideFields({
  slide,
  mode,
  disabled,
}: {
  slide?: HomepageSlide;
  mode: "create" | "edit";
  disabled?: boolean;
}) {
  const defaultPosition: HomepageSlideCtaPosition = slide?.cta_position ?? "bottom-right";

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">Title</span>
          <Input name="title" defaultValue={slide?.title ?? ""} maxLength={120} placeholder="Optional poster heading" disabled={disabled} />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">Sort order</span>
          <Input name="sort_order" type="number" defaultValue={slide?.sort_order ?? 0} disabled={disabled} />
        </label>
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-bold text-slate-700">Subtitle</span>
        <Textarea name="subtitle" defaultValue={slide?.subtitle ?? ""} placeholder="Optional supporting copy" disabled={disabled} />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">Desktop poster image</span>
          <Input name="image" type="file" accept="image/jpeg,image/png,image/webp" required={mode === "create"} disabled={disabled} />
          <span className="text-xs text-slate-500">Recommended: 1920x720. JPG, PNG, or WebP.</span>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">Mobile poster image</span>
          <Input name="mobile_image" type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} />
          <span className="text-xs text-slate-500">Optional. Recommended: 900x1200 or 1080x1350.</span>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">Primary CTA label</span>
          <Input name="cta_primary_label" defaultValue={slide?.cta_primary_label ?? ""} placeholder="Apply now" disabled={disabled} />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">Primary CTA URL</span>
          <Input name="cta_primary_url" defaultValue={slide?.cta_primary_url ?? ""} placeholder="/services or https://..." disabled={disabled} />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">Secondary CTA label</span>
          <Input name="cta_secondary_label" defaultValue={slide?.cta_secondary_label ?? ""} placeholder="Learn more" disabled={disabled} />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">Secondary CTA URL</span>
          <Input name="cta_secondary_url" defaultValue={slide?.cta_secondary_url ?? ""} placeholder="/contact or https://..." disabled={disabled} />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">CTA position</span>
          <select
            name="cta_position"
            defaultValue={defaultPosition}
            disabled={disabled}
            className="h-12 rounded-2xl border bg-white px-4 text-sm text-slate-900 outline-none focus:border-[var(--primary)]"
          >
            {homepageSlideCtaPositions.map((position) => (
              <option key={position} value={position}>
                {position}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">Start date</span>
          <Input name="starts_at" type="datetime-local" defaultValue={formatDateForInput(slide?.starts_at ?? null)} disabled={disabled} />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">End date</span>
          <Input name="ends_at" type="datetime-local" defaultValue={formatDateForInput(slide?.ends_at ?? null)} disabled={disabled} />
        </label>
      </div>

      <label className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/40 px-4 py-3 text-sm font-bold text-slate-700">
        <input
          name="is_active"
          type="checkbox"
          value="true"
          defaultChecked={slide?.is_active ?? true}
          disabled={disabled}
          className="h-4 w-4 rounded border-slate-300 text-blue-700"
        />
        Active on homepage
      </label>
      <input type="hidden" name="is_active" value="false" />
    </div>
  );
}

export function AdminHomepageSlidesManager({ initialSlides }: AdminHomepageSlidesManagerProps) {
  const [slides, setSlides] = useState(initialSlides);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    const formData = new FormData(event.currentTarget);
    const validationError = validateImage(formData.get("image"), true) || validateImage(formData.get("mobile_image"), false);

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch("/api/admin/homepage-slides", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.slide) {
        setErrorMessage(getResponseMessage(data, "Homepage slide could not be created."));
        return;
      }

      setSlides((currentSlides) =>
        [data.slide as HomepageSlide, ...currentSlides].sort((a, b) => a.sort_order - b.sort_order || Date.parse(b.created_at) - Date.parse(a.created_at)),
      );
      setSuccessMessage(data.message || "Homepage slide created successfully.");
      formRef.current?.reset();
    } catch (error) {
      console.error("[admin/homepage-slides] Create failed", error);
      setErrorMessage("Homepage slide could not be created. Please try again.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>, slide: HomepageSlide) {
    event.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    const formData = new FormData(event.currentTarget);
    const validationError = validateImage(formData.get("image"), false) || validateImage(formData.get("mobile_image"), false);

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setEditingId(slide.id);

    try {
      const response = await fetch(`/api/admin/homepage-slides/${slide.id}`, {
        method: "PATCH",
        body: formData,
      });
      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.slide) {
        setErrorMessage(getResponseMessage(data, "Homepage slide could not be updated."));
        return;
      }

      setSlides((currentSlides) =>
        currentSlides
          .map((item) => (item.id === slide.id ? data.slide! : item))
          .sort((a, b) => a.sort_order - b.sort_order || Date.parse(b.created_at) - Date.parse(a.created_at)),
      );
      setSuccessMessage(data.message || "Homepage slide updated successfully.");
    } catch (error) {
      console.error("[admin/homepage-slides] Update failed", error);
      setErrorMessage("Homepage slide could not be updated. Please try again.");
    } finally {
      setEditingId(null);
    }
  }

  async function handleDelete(slide: HomepageSlide) {
    if (!window.confirm("Delete this homepage slide and its poster images?")) {
      return;
    }

    setSuccessMessage("");
    setErrorMessage("");
    setDeletingId(slide.id);

    try {
      const response = await fetch(`/api/admin/homepage-slides/${slide.id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        setErrorMessage(getResponseMessage(data, "Homepage slide could not be deleted."));
        return;
      }

      setSlides((currentSlides) => currentSlides.filter((item) => item.id !== slide.id));
      setSuccessMessage(data.message || "Homepage slide deleted successfully.");
    } catch (error) {
      console.error("[admin/homepage-slides] Delete failed", error);
      setErrorMessage("Homepage slide could not be deleted. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-blue-100 p-4 shadow-sm md:p-6">
        <div className="mb-5 flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <ImagePlus className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-slate-950">Create slide</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">Upload a desktop poster, optionally add a mobile poster, and control CTA buttons without code changes.</p>
          </div>
        </div>

        <form ref={formRef} onSubmit={(event) => void handleCreate(event)} className="space-y-5">
          <SlideFields mode="create" disabled={isCreating} />
          <Button type="submit" className="h-12" disabled={isCreating}>
            {isCreating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {isCreating ? "Creating..." : "Create Slide"}
          </Button>
        </form>

        {successMessage ? <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{successMessage}</p> : null}
        {errorMessage ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{errorMessage}</p> : null}
      </Card>

      <div className="space-y-4">
        {slides.length ? (
          slides.map((slide) => (
            <Card key={slide.id} className="overflow-hidden border-blue-100 p-0 shadow-sm">
              <div className="grid gap-0 lg:grid-cols-[22rem_1fr]">
                <div className="relative aspect-[16/9] bg-slate-100 lg:aspect-auto lg:min-h-full">
                  <Image
                    src={slide.image_url}
                    alt={slide.title || "Homepage slide poster"}
                    fill
                    sizes="(min-width: 1024px) 22rem, 100vw"
                    className="object-cover"
                  />
                </div>

                <div className="space-y-5 p-4 md:p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-extrabold",
                            slide.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600",
                          )}
                        >
                          {slide.is_active ? "Active" : "Inactive"}
                        </span>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">Order {slide.sort_order}</span>
                        {slide.cta_primary_label ? <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-extrabold text-orange-700">{slide.cta_primary_label}</span> : null}
                        {slide.cta_secondary_label ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-700">{slide.cta_secondary_label}</span> : null}
                      </div>
                      <h3 className="mt-3 truncate text-xl font-bold text-slate-950">{slide.title || "Untitled poster"}</h3>
                      <p className="mt-1 text-sm text-slate-500">Created {new Date(slide.created_at).toLocaleDateString("en-IN")}</p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="text-red-600"
                      disabled={deletingId === slide.id}
                      onClick={() => {
                        void handleDelete(slide);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      {deletingId === slide.id ? "Deleting..." : "Delete"}
                    </Button>
                  </div>

                  <form onSubmit={(event) => void handleUpdate(event, slide)} className="space-y-5">
                    <SlideFields slide={slide} mode="edit" disabled={editingId === slide.id} />
                    <Button type="submit" variant="outline" className="w-full md:w-auto" disabled={editingId === slide.id}>
                      {editingId === slide.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                      {editingId === slide.id ? "Saving..." : "Save Changes"}
                    </Button>
                  </form>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div>
            <div className="mb-4 flex justify-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <ImageIcon className="h-5 w-5" />
              </span>
            </div>
            <AdminEmptyState title="No homepage slides yet" description="Create the first promotional poster slide from the form above." />
          </div>
        )}
      </div>
    </div>
  );
}
