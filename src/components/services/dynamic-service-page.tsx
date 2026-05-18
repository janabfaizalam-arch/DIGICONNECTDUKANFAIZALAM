import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, CheckCircle2, FileCheck2, HelpCircle, MessageCircle, ShieldCheck, Star } from "lucide-react";

import { ServicePrice } from "@/components/service-card";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { DbService, DbServiceSection } from "@/lib/services";
import { serviceFromDb } from "@/lib/services";
import { createServiceWhatsAppMessage } from "@/lib/services-data";
import { generateWhatsAppLink } from "@/lib/whatsapp";

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

function ServiceHero({ row }: { row: DbService }) {
  const service = serviceFromDb(row);
  const Icon = service.icon;
  const whatsappHref = generateWhatsAppLink("917007595931", createServiceWhatsAppMessage(service.title));
  const heroImage = row.hero_image_url;

  return (
    <section className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
      <div className="glass-panel overflow-hidden rounded-2xl p-5 md:p-8">
        <Link href={`/services/${service.categorySlug}`} className="inline-flex items-center gap-2 text-sm font-extrabold text-blue-700">
          <ArrowLeft className="h-4 w-4" />
          Back to {service.category}
        </Link>
        <p className="mt-5 inline-flex rounded-full bg-white/70 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-orange-600">
          {service.category}
        </p>
        <h1 className="mt-5 text-3xl font-bold leading-tight text-slate-950 md:text-5xl">{service.title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">{service.shortDescription}</p>
        <div className="mt-5">
          <ServicePrice service={service} />
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {service.ctaType === "apply" ? (
            <Link href={row.cta_primary_url || `/apply/${service.slug}`} className={buttonVariants({ size: "lg" })}>
              {row.cta_primary_label || "Apply Now"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <a href={whatsappHref} target="_blank" rel="noreferrer" className={buttonVariants({ size: "lg" })}>
              {row.cta_primary_label || "Enquiry Now"}
              <MessageCircle className="h-4 w-4" />
            </a>
          )}
          <a href={row.cta_secondary_url || whatsappHref} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "secondary", size: "lg" })}>
            <MessageCircle className="h-4 w-4" />
            {row.cta_secondary_label || "WhatsApp"}
          </a>
        </div>
      </div>

      {heroImage ? (
        <div className="relative min-h-[260px] overflow-hidden rounded-2xl border bg-white shadow-sm md:min-h-[420px]">
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
        <Card className="overflow-hidden rounded-2xl p-0">
          <div className="bg-[linear-gradient(135deg,#2563eb_0%,#0b1f3a_58%,#f97316_140%)] p-7 text-white md:p-9">
            <Icon className="h-12 w-12 text-orange-200" />
            <p className="mt-8 text-sm font-semibold text-white/65">Price</p>
            <p className="mt-2 text-4xl font-bold">{service.priceLabel}</p>
            <p className="mt-4 text-sm leading-7 text-white/75">Apply online with guided document assistance and WhatsApp support.</p>
          </div>
          <div className="grid gap-3 bg-white p-5 sm:grid-cols-3">
            {["Online Apply", "Document Help", "WhatsApp Support"].map((item) => (
              <div key={item} className="rounded-xl bg-blue-50/70 p-4">
                <ShieldCheck className="h-5 w-5 text-blue-700" />
                <p className="mt-3 text-sm font-bold text-slate-950">{item}</p>
              </div>
            ))}
          </div>
        </Card>
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
      <Card className="rounded-2xl p-5 md:p-7">
        {title ? <h2 className="text-2xl font-bold text-slate-950">{title}</h2> : null}
        {subtitle ? <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p> : null}
        <div className="mt-4 whitespace-pre-line text-base leading-8 text-slate-600">{text}</div>
      </Card>
    );
  }

  if (section.section_type === "benefits" || section.section_type === "trust_badges") {
    return (
      <Card className="rounded-2xl p-5 md:p-7">
        <h2 className="text-2xl font-bold text-slate-950">{title || "Benefits"}</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-xl bg-blue-50/70 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
              <p className="text-sm font-semibold leading-6 text-slate-700">{item}</p>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (section.section_type === "documents") {
    return (
      <Card className="rounded-2xl p-5 md:p-7">
        <h2 className="text-2xl font-bold text-slate-950">{title || "Documents Required"}</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-xl border bg-white p-4">
              <FileCheck2 className="h-5 w-5 shrink-0 text-orange-600" />
              <p className="text-sm font-bold text-slate-800">{item}</p>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (section.section_type === "process") {
    return (
      <Card className="rounded-2xl p-5 md:p-7">
        <h2 className="text-2xl font-bold text-slate-950">{title || "Process"}</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {items.map((item, index) => (
            <div key={item} className="rounded-xl bg-slate-50 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">{index + 1}</div>
              <h3 className="mt-4 font-bold text-slate-950">{item}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Our team guides you and shares updates through dashboard, call, or WhatsApp.</p>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (section.section_type === "faq") {
    const faqs = Array.isArray(content.items) && content.items.length ? content.items : service.faqs;
    return (
      <Card className="rounded-2xl p-5 md:p-7">
        <h2 className="text-2xl font-bold text-slate-950">{title || "FAQ"}</h2>
        <div className="mt-5 space-y-3">
          {faqs.map((faq) => {
            const item = typeof faq === "object" && faq ? (faq as { question?: string; answer?: string }) : { question: String(faq), answer: "" };
            return (
              <div key={item.question} className="rounded-xl border bg-white p-5">
                <div className="flex gap-3">
                  <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
                  <div>
                    <h3 className="font-bold text-slate-950">{item.question}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  }

  if (section.section_type === "testimonials") {
    const reviews = service.reviews;
    return (
      <Card className="rounded-2xl p-5 md:p-7">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-slate-950">{title || "Reviews"}</h2>
          <div className="flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1.5 text-orange-600">
            {[1, 2, 3, 4, 5].map((item) => <Star key={item} className="h-4 w-4 fill-orange-400 text-orange-400" />)}
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {reviews.map((review) => (
            <article key={`${review.name}-${review.text}`} className="rounded-xl bg-slate-50 p-5">
              <p className="text-sm leading-6 text-slate-700">{review.text}</p>
              <p className="mt-3 text-sm font-bold text-slate-950">{review.name}</p>
            </article>
          ))}
        </div>
      </Card>
    );
  }

  if (section.section_type === "gallery") {
    const images = stringItems(content.images);
    return (
      <section>
        {title ? <h2 className="text-2xl font-bold text-slate-950">{title}</h2> : null}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image) => (
            <div key={image} className="relative aspect-[4/3] overflow-hidden rounded-xl border bg-white">
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
      <Card className="rounded-2xl border-orange-100 p-5 md:p-7">
        <h2 className="text-2xl font-bold text-slate-950">{title || "Pricing"}</h2>
        <div className="mt-5 rounded-xl bg-orange-50 p-5">
          <ServicePrice service={service} />
          <p className="mt-3 text-sm font-semibold leading-6 text-blue-700">Rewards are credited after verified payment and service completion.</p>
        </div>
      </Card>
    );
  }

  if (section.section_type === "custom_html") {
    const html = typeof content.html === "string" ? sanitizeHtml(content.html) : "";
    return html ? <div className="rounded-2xl border bg-white p-5" dangerouslySetInnerHTML={{ __html: html }} /> : null;
  }

  if (section.section_type === "video") {
    const url = typeof content.url === "string" ? content.url : "";
    return url ? (
      <div className="overflow-hidden rounded-2xl border bg-black">
        <iframe src={url} title={title || service.title} className="aspect-video w-full" loading="lazy" allowFullScreen />
      </div>
    ) : null;
  }

  const text = typeof content.text === "string" ? content.text : items.join("\n");
  return text ? (
    <section className="rounded-2xl bg-[linear-gradient(135deg,#0b1f3a,#2563eb_68%,#f97316_135%)] p-6 text-white md:p-8">
      {title ? <h2 className="text-2xl font-bold">{title}</h2> : null}
      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-white/80">{text}</p>
    </section>
  ) : null;
}

export function DynamicServicePage({ row }: { row: DbService }) {
  const service = serviceFromDb(row);
  const sections = (row.service_sections?.length ? row.service_sections : legacySections(service))
    .filter((section) => section.is_active && section.section_type !== "hero")
    .sort((a, b) => a.sort_order - b.sort_order);
  const whatsappHref = generateWhatsAppLink("917007595931", createServiceWhatsAppMessage(service.title));

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl">
        <ServiceHero row={row} />
        <div className="mt-8 grid gap-6">
          {sections.map((section) => <RenderSection key={section.id} section={section} service={service} />)}
        </div>
        <section className="mt-8 overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#0b1f3a,#2563eb_62%,#f97316_135%)] p-6 text-white md:p-9">
          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="text-3xl font-bold">Aaj hi apply karein</h2>
              <p className="mt-3 text-sm leading-7 text-white/75">Documents, process, aur next step ke liye DigiConnect Dukan team se connect karein.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              {service.ctaType === "apply" ? (
                <Link href={`/apply/${service.slug}`} className="premium-button premium-button-white">
                  Apply Now
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}
              <a href={whatsappHref} target="_blank" rel="noreferrer" className="premium-button premium-button-whatsapp">
                WhatsApp
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
