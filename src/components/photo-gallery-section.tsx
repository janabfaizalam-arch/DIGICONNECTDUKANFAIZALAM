import Link from "next/link";
import { ArrowRight, BadgeCheck, FileImage, ImageIcon, Sparkles } from "lucide-react";
import Image from "next/image";

import { getActiveGalleryImages } from "@/lib/gallery";

const placeholders = [
  { title: "Document Assistance", description: "Clean document checks and application support.", icon: BadgeCheck },
  { title: "Digital Service Desk", description: "PAN, Aadhaar, GST, certificates, and licences.", icon: FileImage },
  { title: "Customer Updates", description: "Call and WhatsApp follow-up for service progress.", icon: Sparkles },
];

export async function PhotoGallerySection() {
  const galleryItems = await getActiveGalleryImages(6);

  return (
    <section id="gallery" className="section-pad bg-white/25">
      <div className="container-shell space-y-8">
        <div className="reveal-on-scroll flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Gallery</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950 md:text-4xl">DigiConnect Dukan gallery preview</h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              Public gallery photos from the admin panel appear here automatically when available.
            </p>
          </div>
          <Link href="/#gallery" className="premium-button premium-button-white">
            View Gallery
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {galleryItems.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {galleryItems.map((item) => (
              <figure key={item.id} className="liquid-card reveal-on-scroll overflow-hidden rounded-[1.35rem] p-2 transition-transform duration-200 md:hover:-translate-y-1">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[1rem] bg-slate-100">
                  <Image
                    src={item.image_url}
                    alt={item.title || "DigiConnect Dukan gallery photo"}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <figcaption className="px-2 pb-2 pt-3 text-sm font-bold text-slate-900">
                  {item.title || "DigiConnect Dukan service photo"}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {placeholders.map(({ title, description, icon: Icon }) => (
              <div key={title} className="liquid-card reveal-on-scroll min-h-48 rounded-[1.35rem] p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-5 text-lg font-bold text-slate-950">{title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            ))}
            <div className="sr-only">
              <ImageIcon className="h-4 w-4" />
              Gallery photos will appear here soon.
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
