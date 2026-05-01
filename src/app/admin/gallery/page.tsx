import { revalidatePath } from "next/cache";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ImagePlus, Trash2 } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { galleryBucketName, getAllGalleryImages } from "@/lib/gallery";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
const maxImageSize = 5 * 1024 * 1024;

function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

async function requireAdmin() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) {
    redirect("/login");
  }

  if (!isAdminRole(role)) {
    redirect("/dashboard");
  }

  return user;
}

async function uploadGalleryImage(formData: FormData) {
  "use server";

  await requireAdmin();
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase service role key is missing on the server.");
  }

  const title = String(formData.get("title") ?? "").trim();
  const file = formData.get("image");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Please choose a gallery image.");
  }

  if (!allowedImageTypes.includes(file.type)) {
    throw new Error("Gallery image must be JPG, PNG, or WebP.");
  }

  if (file.size > maxImageSize) {
    throw new Error("Gallery image must be smaller than 5MB.");
  }

  const storagePath = `homepage/${Date.now()}-${cleanFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage.from(galleryBucketName).upload(storagePath, file, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from(galleryBucketName).getPublicUrl(storagePath);
  const { error: insertError } = await supabase.from("gallery_images").insert({
    title: title || null,
    image_url: data.publicUrl,
    storage_path: storagePath,
    active: true,
  });

  if (insertError) {
    await supabase.storage.from(galleryBucketName).remove([storagePath]);
    throw new Error(insertError.message);
  }

  revalidatePath("/");
  revalidatePath("/admin/gallery");
}

async function deleteGalleryImage(formData: FormData) {
  "use server";

  await requireAdmin();
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase service role key is missing on the server.");
  }

  const id = String(formData.get("id") ?? "");
  const storagePath = String(formData.get("storagePath") ?? "");

  if (!id || !storagePath) {
    throw new Error("Gallery image details are missing.");
  }

  await supabase.storage.from(galleryBucketName).remove([storagePath]);
  const { error } = await supabase.from("gallery_images").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/admin/gallery");
}

export default async function AdminGalleryPage() {
  await requireAdmin();
  const images = await getAllGalleryImages();

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--secondary)]">Admin Gallery</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950 md:text-5xl">Gallery Management</h1>
            <p className="mt-3 max-w-2xl text-slate-600">
              Upload, review, and delete homepage gallery photos. Published images automatically appear on the public homepage.
            </p>
          </div>
          <LogoutButton className="h-11 w-full md:w-auto" />
        </div>

        <Card className="p-4 md:p-6">
          <form action={uploadGalleryImage} className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700">Optional title</span>
              <Input name="title" placeholder="Example: Customer service desk" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700">Gallery image</span>
              <Input name="image" type="file" accept="image/jpeg,image/png,image/webp" required />
            </label>
            <Button type="submit" className="h-12">
              <ImagePlus className="h-4 w-4" />
              Upload Photo
            </Button>
          </form>
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
                  <form action={deleteGalleryImage}>
                    <input type="hidden" name="id" value={image.id} />
                    <input type="hidden" name="storagePath" value={image.storage_path} />
                    <Button type="submit" variant="outline" className="w-full text-red-600">
                      <Trash2 className="h-4 w-4" />
                      Delete Photo
                    </Button>
                  </form>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-6 sm:col-span-2 lg:col-span-3">
              <p className="text-sm text-slate-600">No gallery photos uploaded yet.</p>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
