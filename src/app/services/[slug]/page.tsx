import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, FileCheck2, HelpCircle, MessageCircle, ShieldCheck, Star } from "lucide-react";

import { CategoryServicesPage } from "@/components/category-services-page";
import { ServicePrice } from "@/components/service-card";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { generateWhatsAppLink } from "@/lib/whatsapp";
import {
  createServiceWhatsAppMessage,
  servicesData,
  type ServiceItem,
} from "@/lib/services-data";
import { getPublicCategoryBySlug, getPublicServiceBySlug, getPublicServicesByCategory } from "@/lib/services";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return servicesData.map((service) => ({
    slug: service.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getPublicCategoryBySlug(slug);

  if (category) {
    return {
      title: `${category.title} | DigiConnect Dukan`,
      description: category.description,
      alternates: { canonical: `/services/${category.slug}` },
    };
  }

  const service = await getPublicServiceBySlug(slug);

  if (!service) {
    return {
      title: "Service Not Found | DigiConnect Dukan",
    };
  }

  return {
    title: service.seoTitle,
    description: service.seoDescription,
    keywords: service.seoKeywords,
    alternates: {
      canonical: `/services/${service.slug}`,
    },
    openGraph: {
      title: service.seoTitle,
      description: service.seoDescription,
      type: "article",
      url: `/services/${service.slug}`,
    },
  };
}

function buildSchemas(service: ServiceItem) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: "DigiConnect Dukan",
      legalName: "RNOS India Pvt Ltd",
      telephone: "+91 7007595931",
      areaServed: "IN",
      priceRange: service.priceLabel,
      url: "https://www.rnos.in",
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: service.title,
      description: service.seoDescription,
      provider: {
        "@type": "LocalBusiness",
        name: "DigiConnect Dukan",
      },
      serviceType: service.category,
      areaServed: "India",
      offers: {
        "@type": "Offer",
        price: service.amount || undefined,
        priceCurrency: service.amount ? "INR" : undefined,
        availability: "https://schema.org/InStock",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: service.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
  ];
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const categoryPage = await getPublicCategoryBySlug(slug);

  if (categoryPage) {
    const services = await getPublicServicesByCategory(categoryPage.slug);
    return <CategoryServicesPage category={categoryPage} services={services} />;
  }

  const service = await getPublicServiceBySlug(slug);

  if (!service) {
    notFound();
  }

  const Icon = service.icon;
  const whatsappHref = generateWhatsAppLink("917007595931", createServiceWhatsAppMessage(service.title));

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl">
        <Link href={`/services/${service.categorySlug}`} className="inline-flex items-center gap-2 text-sm font-extrabold text-blue-700">
          <ArrowLeft className="h-4 w-4" />
          Back to {service.category}
        </Link>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div className="glass-panel overflow-hidden rounded-[1.75rem] p-6 md:p-9">
            <div className="relative z-10">
              <p className="inline-flex rounded-full bg-white/70 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-orange-600">
                {service.category}
              </p>
              <h1 className="mt-5 text-3xl font-bold leading-tight text-slate-950 md:text-5xl">{service.title}</h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">{service.shortDescription}</p>
              <div className="mt-5">
                <ServicePrice service={service} />
              </div>
              <p className="mt-4 inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-extrabold text-blue-700">
                Fast Service - Same Day Process Available
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                {service.ctaType === "apply" ? (
                  <Link href={`/apply/${service.slug}`} className={buttonVariants({ size: "lg" })}>
                    Apply Now
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <a href={whatsappHref} target="_blank" rel="noreferrer" className={buttonVariants({ size: "lg" })}>
                    Enquiry Now
                    <MessageCircle className="h-4 w-4" />
                  </a>
                )}
                <a href={whatsappHref} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "secondary", size: "lg" })}>
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              </div>
            </div>
          </div>

          <Card className="overflow-hidden rounded-[1.75rem] p-0">
            <div className="bg-[linear-gradient(135deg,#2563eb_0%,#0b1f3a_58%,#f97316_140%)] p-7 text-white md:p-9">
              <Icon className="h-12 w-12 text-orange-200" />
              <p className="mt-8 text-sm font-semibold text-white/65">Price</p>
              <p className="mt-2 text-4xl font-bold">{service.priceLabel}</p>
              <p className="mt-4 text-sm leading-7 text-white/75">Apply Now, Enquiry Now, Call / WhatsApp Now, and get guided document assistance from DigiConnect Dukan.</p>
            </div>
            <div className="grid gap-3 bg-white p-5 sm:grid-cols-3">
              {["Online Apply", "Document Help", "WhatsApp Support"].map((item) => (
                <div key={item} className="rounded-2xl bg-blue-50/70 p-4">
                  <ShieldCheck className="h-5 w-5 text-blue-700" />
                  <p className="mt-3 text-sm font-bold text-slate-950">{item}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <Card className="rounded-[1.35rem] p-6 lg:col-span-2">
            <h2 className="text-2xl font-bold text-slate-950">Overview</h2>
            <p className="mt-4 text-base leading-8 text-slate-600">{service.overview}</p>
            <h3 className="mt-7 text-xl font-bold text-slate-950">Who needs it?</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              This service is useful for customers who want reliable online apply support, clear document assistance, and professional follow-up for {service.title} in India.
            </p>
          </Card>

          <Card className="rounded-[1.35rem] p-6">
            <h2 className="text-xl font-bold text-slate-950">Pricing</h2>
            <div className="mt-5 rounded-2xl bg-orange-50 p-5">
              {service.oldPrice ? <p className="text-sm font-bold text-slate-400 line-through">Old Price: {service.oldPrice}</p> : null}
              <p className="mt-1 text-2xl font-extrabold text-orange-600">{service.offerPrice ? `Offer Price: ${service.offerPrice}` : "Enquiry Now"}</p>
            </div>
            <a href={whatsappHref} target="_blank" rel="noreferrer" className="premium-button premium-button-whatsapp mt-5">
              Call / WhatsApp Now
              <MessageCircle className="h-4 w-4" />
            </a>
          </Card>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card className="rounded-[1.35rem] p-6">
            <h2 className="text-2xl font-bold text-slate-950">Benefits</h2>
            <div className="mt-5 grid gap-3">
              {service.benefits.map((benefit) => (
                <div key={benefit} className="flex items-start gap-3 rounded-2xl bg-blue-50/70 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                  <p className="text-sm font-semibold leading-6 text-slate-700">{benefit}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-[1.35rem] p-6">
            <h2 className="text-2xl font-bold text-slate-950">Documents Required</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {service.documents.map((document) => (
                <div key={document} className="flex items-center gap-3 rounded-2xl border bg-white p-4">
                  <FileCheck2 className="h-5 w-5 shrink-0 text-orange-600" />
                  <p className="text-sm font-bold text-slate-800">{document}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="mt-8">
          <Card className="rounded-[1.35rem] p-6">
            <h2 className="text-2xl font-bold text-slate-950">Step-by-step Process</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              {service.process.map((step, index) => (
                <div key={step} className="rounded-2xl bg-slate-50 p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">{index + 1}</div>
                  <h3 className="mt-4 font-bold text-slate-950">{step}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Our team guides you and shares updates through call, dashboard, or WhatsApp.</p>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="rounded-[1.35rem] p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-slate-950">Reviews</h2>
              <div className="flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1.5 text-orange-600">
                {[1, 2, 3, 4, 5].map((item) => (
                  <Star key={item} className="h-4 w-4 fill-orange-400 text-orange-400" />
                ))}
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {service.reviews.map((review) => (
                <article key={`${review.name}-${review.location}`} className="rounded-2xl bg-slate-50 p-5">
                  <p className="text-sm leading-6 text-slate-700">{review.text}</p>
                  <p className="mt-3 text-sm font-bold text-slate-950">{review.name}</p>
                  <p className="text-xs font-semibold text-slate-500">{review.location}</p>
                </article>
              ))}
            </div>
          </Card>

          <Card className="rounded-[1.35rem] p-6">
            <h2 className="text-2xl font-bold text-slate-950">FAQ</h2>
            <div className="mt-5 space-y-3">
              {service.faqs.map((faq) => (
                <div key={faq.question} className="rounded-2xl border bg-white p-5">
                  <div className="flex gap-3">
                    <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
                    <div>
                      <h3 className="font-bold text-slate-950">{faq.question}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{faq.answer}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="mt-8">
          <Card className="rounded-[1.35rem] p-6 md:p-8">
            <h2 className="text-2xl font-bold text-slate-950">Complete Guide for {service.title}</h2>
            <div className="mt-5 whitespace-pre-line text-base leading-8 text-slate-600">{service.blogContent}</div>
          </Card>
        </section>

        <section className="mt-8 overflow-hidden rounded-[1.5rem] bg-[linear-gradient(135deg,#0b1f3a,#2563eb_62%,#f97316_135%)] p-6 text-white md:p-9">
          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="text-3xl font-bold">Aaj hi apply karein</h2>
              <p className="mt-3 text-sm leading-7 text-white/75">Call karein ya WhatsApp par message bhejein. DigiConnect Dukan team aapko documents, process, aur next step bata degi.</p>
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
      {buildSchemas(service).map((schema, index) => (
        <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}
    </main>
  );
}
