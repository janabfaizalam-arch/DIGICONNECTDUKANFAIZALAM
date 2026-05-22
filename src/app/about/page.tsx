import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Headphones, MapPinned, ShieldCheck, Sparkles, UsersRound } from "lucide-react";

import { MarketingFooter } from "@/components/marketing-footer";
import { getActiveAboutPageImages } from "@/lib/about-page-images";

export const metadata: Metadata = {
  title: "About DigiConnect Dukan | RNoS India Pvt. Ltd.",
  description:
    "Learn about DigiConnect Dukan, a digital service platform powered by RNoS India Pvt. Ltd. with PAN India support, secure document handling, and customer guidance.",
  alternates: { canonical: "/about" },
};

export const dynamic = "force-dynamic";

const trustPoints = [
  { title: "Powered by RNoS", text: "DigiConnect Dukan is powered by RNoS India Pvt. Ltd.", icon: Sparkles },
  { title: "PAN India Support", text: "Digital support for customers across India.", icon: MapPinned },
  { title: "Secure Handling", text: "Careful document guidance and responsible processing.", icon: ShieldCheck },
  { title: "Customer Support", text: "Clear help for service selection, documents, and follow-up.", icon: Headphones },
];

export default async function AboutPage() {
  const images = await getActiveAboutPageImages();

  return (
    <>
      <main className="min-h-screen bg-white px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-7xl space-y-10">
          <section className="glass-panel overflow-hidden rounded-[1.75rem] p-6 md:p-10">
            <div className="grid gap-7 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <p className="inline-flex rounded-full bg-white/70 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-blue-700">
                  About DigiConnect Dukan
                </p>
                <h1 className="mt-5 text-3xl font-bold leading-tight text-slate-950 md:text-5xl">
                  A professional digital service platform built for trusted support.
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600 md:text-lg">
                  DigiConnect Dukan, powered by RNoS India Pvt. Ltd., helps customers access digital services with guided forms,
                  document support, and service updates across tax, business, finance, insurance, and government assistance needs.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/services" className="premium-button">
                    Explore Services
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/#support" className="premium-button premium-button-white">
                    Customer Support
                  </Link>
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-white/40 bg-white/55 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <UsersRound className="h-5 w-5" />
                </div>
                <p className="mt-5 text-xl font-bold text-slate-950">Trust matters when documents matter.</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Our workflow focuses on secure document handling, professional customer support, and clear service guidance for
                  PAN India customers.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {trustPoints.map(({ title, text, icon: Icon }) => (
              <article key={title} className="liquid-card rounded-2xl p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <h2 className="mt-4 text-lg font-bold text-slate-950">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </article>
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-orange-600">Showcase</p>
              <h2 className="mt-3 text-2xl font-bold text-slate-950 md:text-3xl">A service experience designed for confidence</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600 md:text-base">
                These images are managed from the admin panel and help customers understand the DigiConnect Dukan brand, support
                environment, and service delivery focus.
              </p>
            </div>
            {images.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {images.map((image, index) => (
                  <figure key={image.id} className={index === 0 ? "sm:col-span-2" : ""}>
                    <div className={`relative overflow-hidden rounded-2xl bg-slate-100 ${index === 0 ? "aspect-[16/8]" : "aspect-[4/3]"}`}>
                      <Image
                        src={image.image_url}
                        alt={image.alt_text || image.title || "DigiConnect Dukan about image"}
                        fill
                        sizes={index === 0 ? "(min-width: 1024px) 60vw, 100vw" : "(min-width: 1024px) 30vw, 50vw"}
                        className="object-cover"
                      />
                    </div>
                    {image.title ? <figcaption className="mt-2 px-1 text-sm font-semibold text-slate-600">{image.title}</figcaption> : null}
                  </figure>
                ))}
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-blue-100 bg-blue-50/45 p-8 text-center">
                <p className="text-base font-bold text-slate-950">About gallery coming soon</p>
                <p className="mt-2 text-sm text-slate-600">Active About page images will appear here after admin upload.</p>
              </div>
            )}
          </section>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
