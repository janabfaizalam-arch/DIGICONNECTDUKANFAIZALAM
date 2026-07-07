"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, CheckCircle2, FileCheck2, HelpCircle, MessageCircle, ShieldCheck, Star, UserCheck } from "lucide-react";

import { ServicePrice } from "@/components/service-card";
import type { DbService, DbServiceSection, DbServiceVariant } from "@/lib/services";
import { serviceFromDb } from "@/lib/services";
import { buildServiceWhatsAppMessage, buildWhatsAppUrl, isCibilOrFinanceService } from "@/lib/whatsapp";
import { ShareServiceMenu } from "@/components/share-service-menu";
import { ServiceVariantSelector } from "@/components/services/service-variant-selector";
import { ServiceComparisonTabs } from "@/components/services/service-comparison-tabs";
import { ServicePackageCrossSell } from "@/components/services/service-package-cross-sell";
import { AIServiceHelper } from "@/components/services/ai-service-helper";
import { CommandPalette } from "@/components/ui/command-palette";
import { safeCurrency } from "@/lib/admin-format";

function stringItems(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function sanitizeHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

function legacySections(service: ReturnType<typeof serviceFromDb>): DbServiceSection[] {
  return [
    { id: "overview", service_id: service.slug, section_type: "overview", title: "Overview", subtitle: null, content: { text: service.overview }, sort_order: 20, is_active: true },
    { id: "benefits", service_id: service.slug, section_type: "benefits", title: "Benefits", subtitle: null, content: { items: service.benefits }, sort_order: 30, is_active: true },
    { id: "documents", service_id: service.slug, section_type: "documents", title: "Documents Required", subtitle: null, content: { items: service.documents }, sort_order: 40, is_active: true },
    { id: "process", service_id: service.slug, section_type: "process", title: "Step-by-step Process", subtitle: null, content: { items: service.process }, sort_order: 50, is_active: true },
    { id: "testimonials", service_id: service.slug, section_type: "testimonials", title: "Reviews", subtitle: null, content: { items: service.reviews }, sort_order: 60, is_active: true },
    { id: "faq", service_id: service.slug, section_type: "faq", title: "FAQ", subtitle: null, content: { items: service.faqs }, sort_order: 70, is_active: true },
    { id: "rich-text", service_id: service.slug, section_type: "rich_text", title: `Complete Guide for ${service.title}`, subtitle: null, content: { text: service.blogContent }, sort_order: 80, is_active: Boolean(service.blogContent) },
  ];
}

const cibilExpertWhatsAppNumber = "918287002983";

function serviceWhatsAppNumber(slug: string, title?: string) {
  return isCibilOrFinanceService(slug, title) ? cibilExpertWhatsAppNumber : undefined;
}

function ServiceHero({
  row,
  isLoggedIn,
  selectedVariant,
  service,
}: {
  row: DbService;
  isLoggedIn: boolean;
  selectedVariant: DbServiceVariant | null;
  service: ReturnType<typeof serviceFromDb>;
}) {
  const isCibilOrFinance = isCibilOrFinanceService(service.slug, service.title);
  const whatsappHref = buildWhatsAppUrl(
    buildServiceWhatsAppMessage({ serviceName: service.title, category: service.category, action: service.ctaType === "apply" ? "apply" : "enquiry", page: `/services/${service.slug}` }),
    serviceWhatsAppNumber(service.slug, service.title),
  );
  const heroImage = row.hero_image_url;
  const applyHref = selectedVariant
    ? `/apply/${service.slug}?variant=${selectedVariant.slug}`
    : `/apply/${service.slug}`;

  return (
    <section className="mt-4 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
      <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white/78 p-6 shadow-[0_8px_30px_rgba(15,23,42,0.03)] backdrop-blur-sm md:p-9">
        <Link href={`/services?category=${service.categorySlug}`} className="inline-flex items-center gap-2 text-xs font-extrabold text-blue-700">
          <ArrowLeft className="h-4 w-4" />
          Back to {service.category}
        </Link>
        <div className="mt-4">
          <span className="inline-flex rounded-full bg-orange-50 px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-orange-700">
            {service.category}
          </span>
        </div>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 md:text-4.5xl leading-tight">{service.title}</h1>
        <p className="mt-4 text-sm font-semibold leading-relaxed text-slate-500 md:text-base">{service.shortDescription}</p>
        <div className="mt-5 border-t border-slate-100 pt-4">
          <ServicePrice service={service} />
        </div>
        {isCibilOrFinance && (
          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-orange-50/70 to-amber-50/60 border border-orange-100/50 p-3 shadow-sm max-w-sm">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm shadow-orange-500/20">
              <UserCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-orange-600/80">Assigned Consultant</p>
              <p className="text-xs font-black text-slate-800">
                CIBIL & Finance Expert: <a href="tel:+918287002983" className="text-orange-600 hover:underline">+91 8287002983</a>
              </p>
            </div>
          </div>
        )}
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          {service.ctaType === "apply" ? (
            <Link href={applyHref} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 px-6 text-sm font-extrabold text-white shadow-md shadow-blue-500/10 transition duration-150 active:scale-[0.98] sm:min-w-44">
              {isLoggedIn ? "Apply Now" : "Login to Apply"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 px-6 text-sm font-extrabold text-white shadow-md shadow-blue-500/10 transition duration-150 active:scale-[0.98] sm:min-w-44">
              {row.cta_primary_label || "Enquiry Now"}
              <MessageCircle className="h-4 w-4" />
            </a>
          )}
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-700 transition duration-150 active:scale-[0.98]">
            <MessageCircle className="h-4 w-4 text-emerald-600" />
            {row.cta_secondary_label || "WhatsApp Help"}
          </a>
          <ShareServiceMenu serviceName={service.title} serviceSlug={service.slug} />
        </div>
      </div>

      {heroImage ? (
        <div className="relative min-h-[260px] overflow-hidden rounded-3xl border border-slate-100 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.02)] md:min-h-[380px]">
          <Image
            src={heroImage}
            alt={service.title}
            fill
            priority
            sizes="(min-width: 1024px) 46vw, 100vw"
            className="object-contain"
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-white/50 bg-white/72 backdrop-blur-xl shadow-soft p-6 md:p-8 flex flex-col justify-between">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 shadow-sm">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="mt-6 text-lg font-black text-slate-900">Secure Professional Processing</h3>
            <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500">
              Your data is secured using standard encryption, and submission is handled directly by certified professionals.
            </p>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-2.5">
            {["Online Apply", "Document Help", "Real Verification"].map((item) => (
              <div key={item} className="rounded-xl bg-slate-50 border border-slate-100/60 p-3 text-center shadow-sm">
                <p className="text-[10px] font-black text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function RenderSection({ section, service }: { section: DbServiceSection; service: ReturnType<typeof serviceFromDb> }) {
  const content = section.content ?? {};
  const title = section.title || undefined;
  const subtitle = section.subtitle || undefined;
  const items = stringItems(content.items);

  if (section.section_type === "overview" || section.section_type === "rich_text") {
    const text = typeof content.text === "string" ? content.text : "";
    if (!text) return null;
    return (
      <div className="rounded-3xl border border-slate-100 bg-white/78 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.02)] backdrop-blur-sm md:p-8">
        {title ? <h2 className="text-xl font-extrabold text-slate-950 md:text-2xl">{title}</h2> : null}
        {subtitle ? <p className="mt-1 text-xs font-semibold text-slate-500">{subtitle}</p> : null}
        <div className="mt-4 whitespace-pre-line text-sm font-semibold leading-relaxed text-slate-600">{text}</div>
      </div>
    );
  }

  if (section.section_type === "benefits" || section.section_type === "trust_badges") {
    return (
      <div className="rounded-3xl border border-slate-100 bg-white/78 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.02)] backdrop-blur-sm md:p-8">
        <h2 className="text-xl font-extrabold text-slate-950 md:text-2xl">{title || "Key Benefits"}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-2xl bg-blue-50/40 border border-blue-50/50 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
              <p className="text-sm font-semibold leading-normal text-slate-700">{item}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (section.section_type === "documents") {
    return (
      <div className="rounded-3xl border border-slate-100 bg-white/78 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.02)] backdrop-blur-sm md:p-8">
        <h2 className="text-xl font-extrabold text-slate-950 md:text-2xl">{title || "Documents Required"}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_4px_16px_rgba(0,0,0,0.01)]">
              <FileCheck2 className="h-5 w-5 shrink-0 text-orange-600" />
              <p className="text-sm font-extrabold text-slate-800">{item}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (section.section_type === "process") {
    return (
      <div className="rounded-3xl border border-slate-100 bg-white/78 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.02)] backdrop-blur-sm md:p-8">
        <h2 className="text-xl font-extrabold text-slate-950 md:text-2xl">{title || "Step-by-step Process"}</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          {items.map((item, index) => (
            <div key={item} className="rounded-2xl bg-slate-50 border border-slate-100/50 p-5 relative overflow-hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-blue-700 to-indigo-600 text-xs font-extrabold text-white shadow-md shadow-blue-500/15">{index + 1}</div>
              <h3 className="mt-4 text-sm font-extrabold text-slate-950">{item}</h3>
              <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500">Our team handles submissions, filing, and follow-ups with instant status tracking.</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (section.section_type === "faq") {
    const faqs = Array.isArray(content.items) && content.items.length ? content.items : service.faqs;
    return (
      <div className="rounded-3xl border border-slate-100 bg-white/78 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.02)] backdrop-blur-sm md:p-8">
        <h2 className="text-xl font-extrabold text-slate-950 md:text-2xl">{title || "Frequently Asked Questions"}</h2>
        <div className="mt-4 space-y-3">
          {faqs.map((faq) => {
            const item = typeof faq === "object" && faq ? (faq as { question?: string; answer?: string }) : { question: String(faq), answer: "" };
            return (
              <div key={item.question} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.01)] transition duration-150 hover:border-slate-200">
                <div className="flex gap-3">
                  <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-950">{item.question}</h3>
                    <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500">{item.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (section.section_type === "testimonials") {
    const reviews = service.reviews;
    return (
      <div className="rounded-3xl border border-slate-100 bg-white/78 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.02)] backdrop-blur-sm md:p-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-extrabold text-slate-950 md:text-2xl">{title || "Customer Reviews"}</h2>
          <div className="flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-orange-600">
            {[1, 2, 3, 4, 5].map((item) => <Star key={item} className="h-3.5 w-3.5 fill-orange-400 text-orange-400" />)}
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {reviews.map((review) => (
            <article key={`${review.name}-${review.text}`} className="rounded-2xl bg-slate-50 border border-slate-100/50 p-5">
              <p className="text-xs font-semibold leading-relaxed text-slate-500">&ldquo;{review.text}&rdquo;</p>
              <p className="mt-3 text-xs font-extrabold text-slate-950">— {review.name}</p>
            </article>
          ))}
        </div>
      </div>
    );
  }

  if (section.section_type === "gallery") {
    const images = stringItems(content.images);
    return (
      <section>
        {title ? <h2 className="text-xl font-extrabold text-slate-950 md:text-2xl">{title}</h2> : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image) => (
            <div key={image} className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-100 bg-white">
              <Image
                src={image}
                alt={title || service.title}
                fill
                sizes="(min-width: 1024px) 31vw, (min-width: 640px) 48vw, 100vw"
                className="object-contain"
              />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (section.section_type === "pricing") {
    return (
      <div className="rounded-3xl border border-orange-100 bg-orange-50/20 p-5 md:p-8">
        <h2 className="text-xl font-extrabold text-slate-950 md:text-2xl">{title || "Pricing Structure"}</h2>
        <div className="mt-4 rounded-2xl bg-orange-50 border border-orange-100 p-4">
          <ServicePrice service={service} />
          <p className="mt-2 text-xs font-bold text-blue-700">Receive 20% cashback rewards in your wallet upon completion.</p>
        </div>
      </div>
    );
  }

  if (section.section_type === "custom_html") {
    const html = typeof content.html === "string" ? sanitizeHtml(content.html) : "";
    return html ? <div className="rounded-3xl border border-slate-100 bg-white p-5 text-sm font-semibold text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} /> : null;
  }

  if (section.section_type === "video") {
    const url = typeof content.url === "string" ? content.url : "";
    return url ? (
      <div className="overflow-hidden rounded-3xl border border-slate-950 bg-black shadow-lg">
        <iframe src={url} title={title || service.title} className="aspect-video w-full border-0" loading="lazy" allowFullScreen />
      </div>
    ) : null;
  }

  const text = typeof content.text === "string" ? content.text : items.join("\n");
  return text ? (
    <section className="rounded-3xl border border-white/50 bg-white/72 backdrop-blur-xl shadow-soft p-6 md:p-8 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(37,99,235,0.06),transparent_35%)]" />
      {title ? <h2 className="text-xl font-black text-slate-900 relative z-10">{title}</h2> : null}
      <p className="mt-3 whitespace-pre-line text-xs font-semibold leading-relaxed text-slate-650 relative z-10">{text}</p>
    </section>
  ) : null;
}

export function DynamicServicePage({ row, isLoggedIn = false }: { row: DbService; isLoggedIn?: boolean }) {
  const [selectedVariant, setSelectedVariant] = useState<DbServiceVariant | null>(null);

  useEffect(() => {
    if (row.service_variants && row.service_variants.length > 0) {
      setSelectedVariant(row.service_variants[0]);
    } else {
      setSelectedVariant(null);
    }
  }, [row]);

  // Track page view to analytics API
  useEffect(() => {
    fetch("/api/services/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_slug: row.slug,
        click_type: "view",
      }),
    }).catch((err) => console.error("Tracking view failed", err));
  }, [row.slug]);

  const baseService = serviceFromDb(row);
  const service = selectedVariant ? {
    ...baseService,
    oldPrice: selectedVariant.original_price ? safeCurrency(selectedVariant.original_price) : baseService.oldPrice,
    offerPrice: selectedVariant.offer_price ? safeCurrency(selectedVariant.offer_price) : baseService.offerPrice,
    amount: selectedVariant.offer_price || selectedVariant.selling_price || baseService.amount,
    priceLabel: selectedVariant.name,
    documents: selectedVariant.required_documents ? (selectedVariant.required_documents as Array<{ name: string }>).map((d) => d.name) : baseService.documents,
  } : baseService;

  const sections = (row.service_sections?.length ? row.service_sections : legacySections(service))
    .filter((section) => section.is_active && section.section_type !== "hero")
    .sort((a, b) => a.sort_order - b.sort_order);

  const whatsappHref = buildWhatsAppUrl(
    buildServiceWhatsAppMessage({ serviceName: service.title, category: service.category, action: "support", page: `/services/${service.slug}` }),
    serviceWhatsAppNumber(service.slug, service.title),
  );

  const applyHref = selectedVariant
    ? `/apply/${service.slug}?variant=${selectedVariant.slug}`
    : `/apply/${service.slug}`;

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        "name": service.title,
        "description": service.shortDescription,
        "provider": {
          "@type": "GovernmentService",
          "name": "DigiConnect Dukan",
          "url": "https://digiconnectdukan.com"
        },
        "areaServed": "IN",
        "offers": {
          "@type": "Offer",
          "price": service.amount,
          "priceCurrency": "INR"
        }
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://digiconnectdukan.com"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Services",
            "item": "https://digiconnectdukan.com/services"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": service.title,
            "item": `https://digiconnectdukan.com/services/${service.slug}`
          }
        ]
      },
      ...(service.faqs && service.faqs.length > 0 ? [{
        "@type": "FAQPage",
        "mainEntity": service.faqs.map((faq) => ({
          "@type": "Question",
          "name": faq.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": faq.answer
          }
        }))
      }] : [])
    ]
  };

  return (
    <main className="min-h-screen px-3 py-6 md:px-8 md:py-10 bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)]">
      {/* SEO Engine Schemas */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Search command palette & AI floating widget */}
      <CommandPalette />
      <AIServiceHelper service={row} />

      <div className="mx-auto max-w-5xl space-y-8">
        <ServiceHero row={row} isLoggedIn={isLoggedIn} selectedVariant={selectedVariant} service={service} />
        
        {/* Variants selector if available */}
        {row.service_variants && row.service_variants.length > 0 && (
          <ServiceVariantSelector
            variants={row.service_variants}
            selectedVariant={selectedVariant}
            onSelect={setSelectedVariant}
          />
        )}

        {/* Packages bundle cross-sell */}
        <ServicePackageCrossSell currentServiceSlug={service.slug} />

        <div className="grid gap-6">
          {sections.map((section) => <RenderSection key={section.id} section={section} service={service} />)}
        </div>

        {/* Comparisons tab if available */}
        {row.service_comparisons && row.service_comparisons.length > 0 && (
          <ServiceComparisonTabs comparisons={row.service_comparisons} />
        )}
        
        {/* Streamlined Visual Footer Apply Card */}
        <section className="overflow-hidden rounded-3xl border border-white/60 bg-white/72 backdrop-blur-xl shadow-soft p-6 md:p-8 relative">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_80%,rgba(249,115,22,0.06),transparent_35%)]" />
          <div className="relative z-10 grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Apply for {service.title}</h2>
              <p className="mt-2 text-xs font-semibold text-slate-500 leading-relaxed">
                Connect with our dedicated support desk, submit details securely, and receive real-time updates.
              </p>
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              {service.ctaType === "apply" ? (
                <Link href={applyHref} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-blue-600 px-6 text-sm font-extrabold text-white shadow-md hover:bg-blue-700 transition duration-150 active:scale-[0.98]">
                  {isLoggedIn ? "Apply Now" : "Login to Apply"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-700 hover:bg-slate-50 transition duration-150 active:scale-[0.98]">
                WhatsApp Support
                <MessageCircle className="h-4 w-4 text-emerald-600" />
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
