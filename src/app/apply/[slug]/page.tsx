import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { ServiceApplicationForm } from "@/components/portal/service-application-form";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getServiceBySlug, portalServices } from "@/lib/portal-data";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ services?: string }>;
};

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return portalServices.map((service) => ({
    slug: service.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = getServiceBySlug(slug);

  return {
    title: service ? `Apply for ${service.title} | DigiConnect Dukan` : "Apply | DigiConnect Dukan",
    description: service
      ? `Complete online application form, document upload, UPI payment, and invoice generation for ${service.title}.`
      : "DigiConnect Dukan application form.",
  };
}

export default async function ApplyPage({ params, searchParams }: PageProps) {
  const [{ slug }, query, user] = await Promise.all([params, searchParams, getCurrentUser()]);
  const service = getServiceBySlug(slug);

  if (!service) {
    notFound();
  }

  if (!user) {
    const servicesParam = query?.services ? `?services=${encodeURIComponent(query.services)}` : "";
    redirect(`/login/customer?redirect=${encodeURIComponent(`/apply/${slug}${servicesParam}`)}`);
  }

  const selectedServices = Array.from(new Set([slug, ...(query?.services?.split(",") ?? [])]))
    .map((item) => getServiceBySlug(item.trim()))
    .filter((item): item is NonNullable<typeof service> => Boolean(item));

  return (
    <main className="min-h-screen px-4 pb-10 pt-5 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl">
        <Link href={`/services/${service.slug}`} className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)]">
          <ArrowLeft className="h-4 w-4" />
          Back to service
        </Link>

        <div className="mt-5 grid gap-6 lg:grid-cols-[0.7fr_1.3fr] lg:items-start">
          <Card className="rounded-2xl p-5 md:p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[var(--primary)]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <p className="mt-6 text-sm font-medium uppercase tracking-[0.18em] text-[var(--secondary)]">
              Secure Application
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-950 md:text-5xl">
              Apply for {service.title}
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Fill in your details, upload documents, and submit UPI payment proof. Our team will share updates through your dashboard, call, or WhatsApp.
            </p>
            <div className="mt-6 space-y-3 text-sm font-medium text-slate-700">
              <p>1. Fill in your details</p>
              <p>2. Upload required documents</p>
              <p>3. Submit UPI payment proof</p>
              <p>4. Receive invoice and updates</p>
            </div>
          </Card>

          <ServiceApplicationForm
            service={{
              title: service.title,
              slug: service.slug,
              amount: service.amount,
              description: service.description,
              documents: service.documents,
              fields: service.fields,
            }}
            services={selectedServices.map((item) => ({
              title: item.title,
              slug: item.slug,
              amount: item.amount,
              description: item.description,
              documents: item.documents,
              fields: item.fields,
            }))}
          />
        </div>
      </div>
    </main>
  );
}
