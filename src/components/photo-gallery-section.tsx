import { ImageIcon } from "lucide-react";
import Image from "next/image";

import { SectionHeading } from "@/components/section-heading";
import { getActiveGalleryImages } from "@/lib/gallery";

export async function PhotoGallerySection() {
  const galleryItems = await getActiveGalleryImages();

  return (
    <section id="gallery" className="section-pad">
      <div className="container-shell space-y-8">
        <SectionHeading
          eyebrow="Gallery"
          title="DigiConnect Dukan service gallery"
          description="Photos uploaded from the admin panel appear here automatically for public visitors."
        />
        {galleryItems.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {galleryItems.map((item) => (
              <figure key={item.id} className="overflow-hidden rounded-2xl border bg-white shadow-soft">
                <div className="relative aspect-[4/3] bg-slate-100">
                  <Image
                    src={item.image_url}
                    alt={item.title || "DigiConnect Dukan gallery photo"}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                    unoptimized
                  />
                </div>
                {item.title ? (
                  <figcaption className="px-4 py-3 text-sm font-bold text-slate-900">{item.title}</figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        ) : (
          <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed bg-white/75 p-6 text-center shadow-soft">
            <ImageIcon className="h-10 w-10 text-[var(--primary)]" />
            <p className="mt-4 text-base font-bold text-slate-950">Gallery photos will appear here soon</p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600">
              Admin uploaded gallery images are displayed automatically after publishing.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
