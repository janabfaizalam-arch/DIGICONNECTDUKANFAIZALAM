"use client";

import Image from "next/image";
import { FormEvent, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { GalleryImage } from "@/lib/gallery";

const maxImageSize = 5 * 1024 * 1024;

type ApiResponse = {
  image?: GalleryImage;
  message?: string;
  error?: string;
};

type AdminGalleryManagerProps = {
  initialImages: GalleryImage[];
};

function getResponseMessage(data: ApiResponse, fallback: string) {
  return data.error || data.message || fallback;
}

export function AdminGalleryManager({ initialImages }: AdminGalleryManagerProps) {
  const [images, setImages] = useState(initialImages);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    const formData = new FormData(event.currentTarget);
    const file = formData.get("image");

    if (!(file instanceof File) || file.size === 0) {
      setErrorMessage("Please choose a gallery image.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Gallery image must be an image file.");
      return;
    }

    if (file.size > maxImageSize) {
      setErrorMessage("Gallery image must be smaller than 5MB.");
      return;
    }

    setIsUploading(true);

    try {
      const response = await fetch("/api/admin/gallery", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.image) {
        setErrorMessage(getResponseMessage(data, "Gallery upload failed."));
        return;
      }

      setImages((currentImages) => [data.image as GalleryImage, ...currentImages]);
      setSuccessMessage(data.message || "Gallery photo uploaded successfully.");
      formRef.current?.reset();
    } catch (error) {
      console.error("[admin/gallery] Upload failed", error);
      setErrorMessage("Gallery upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(image: GalleryImage) {
    setSuccessMessage("");
    setErrorMessage("");
    setDeletingId(image.id);

    try {
      const response = await fetch("/api/admin/gallery", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: image.id,
          storagePath: image.storage_path,
        }),
      });
      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        setErrorMessage(getResponseMessage(data, "Gallery photo could not be deleted."));
        return;
      }

      setImages((currentImages) => currentImages.filter((item) => item.id !== image.id));
      setSuccessMessage(data.message || "Gallery photo deleted successfully.");
    } catch (error) {
      console.error("[admin/gallery] Delete failed", error);
      setErrorMessage("Gallery photo could not be deleted. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <Card className="p-4 md:p-6">
        <form ref={formRef} onSubmit={handleUpload} className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="grid gap-2">
            <span className="text-sm font-bold text-slate-700">Optional title</span>
            <Input name="title" placeholder="Example: Customer service desk" disabled={isUploading} />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-bold text-slate-700">Gallery image</span>
            <Input name="image" type="file" accept="image/jpeg,image/png,image/webp" required disabled={isUploading} />
          </label>
          <Button type="submit" className="h-12" disabled={isUploading}>
            <ImagePlus className="h-4 w-4" />
            {isUploading ? "Uploading..." : "Upload Photo"}
          </Button>
        </form>

        {successMessage ? (
          <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{successMessage}</p>
        ) : null}
        {errorMessage ? (
          <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{errorMessage}</p>
        ) : null}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {images.length ? (
          images.map((image) => (
            <Card key={image.id} className="overflow-hidden rounded-2xl p-0">
              <div className="relative aspect-[4/3] bg-slate-100">
                <Image
                  src={image.image_url}
                  alt={image.title || "DigiConnect Dukan gallery photo"}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="space-y-4 p-4">
                <div>
                  <p className="font-bold text-slate-950">{image.title || "Untitled gallery photo"}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Uploaded {new Date(image.created_at).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full text-red-600"
                  disabled={deletingId === image.id}
                  onClick={() => {
                    void handleDelete(image);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  {deletingId === image.id ? "Deleting..." : "Delete Photo"}
                </Button>
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-6 sm:col-span-2 lg:col-span-3">
            <p className="text-sm text-slate-600">No gallery photos uploaded yet.</p>
          </Card>
        )}
      </div>
    </>
  );
}
