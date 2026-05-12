import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileCheck2, ShieldCheck, Sparkles } from "lucide-react";

import { CreditCardVisual } from "@/components/credit-card-visual";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { creditCards, getCreditCardBySlug } from "@/lib/credit-cards";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const disclaimer =
  "Credit card approval is subject to bank eligibility, verification, credit score, and bank terms. DigiConnect Dukan only provides assistance/link access and does not guarantee approval.";

export function generateStaticParams() {
  return creditCards.map((card) => ({
    slug: card.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const card = getCreditCardBySlug(slug);

  if (!card) {
    return {
      title: "Credit Card Not Found | DigiConnect Dukan",
    };
  }

  return {
    title: `${card.name} | DigiConnect Dukan`,
    description: `${card.name} details, benefits, eligibility, documents, fees note, and apply link through DigiConnect Dukan.`,
    alternates: {
      canonical: `/credit-cards/${card.slug}`,
    },
    openGraph: {
      title: `${card.name} | DigiConnect Dukan`,
      description: card.overview,
      type: "article",
      url: `/credit-cards/${card.slug}`,
    },
  };
}

export default async function CreditCardDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const card = getCreditCardBySlug(slug);

  if (!card) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-white px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/#credit-card-offers" className="inline-flex items-center gap-2 text-sm font-extrabold text-blue-700">
          <ArrowLeft className="h-4 w-4" />
          Back to offers
        </Link>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.72fr] lg:items-stretch">
          <div className="rounded-3xl border border-blue-100 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_52%,#fff7ed_100%)] p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)] md:p-8">
            <p className="inline-flex rounded-full bg-blue-50 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-blue-700">
              {card.bankName} • {card.cardNetwork}
            </p>
            <h1 className="mt-4 text-3xl font-bold leading-tight text-slate-950 md:text-5xl">{card.name}</h1>
            <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-slate-600 md:text-lg md:leading-8">{card.overview}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["View details first", "Bank verification", "External apply link"].map((item) => (
                <span key={item} className="inline-flex rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-700">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <Card className="rounded-3xl border-blue-100 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)] md:p-6">
            <div className="transition md:[transform:perspective(1000px)_rotateX(3deg)_rotateY(-4deg)]">
              <CreditCardVisual card={card} size="large" />
            </div>
            <div className="mt-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-slate-950">Ready to apply?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Review eligibility, documents, fees note, and disclaimer before opening the bank application link.
            </p>
            <a href={card.applyUrl} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: "lg", className: "mt-6 w-full" })}>
              Apply Now
              <ExternalLink className="h-4 w-4" />
            </a>
          </Card>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <Card className="rounded-3xl border-blue-100 p-5 md:p-6">
            <h2 className="text-2xl font-bold text-slate-950">Benefits</h2>
            <div className="mt-4 grid gap-3">
              {card.benefits.map((benefit) => (
                <div key={benefit} className="flex gap-3 rounded-2xl bg-blue-50/70 p-4">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                  <p className="text-sm font-semibold leading-6 text-slate-700">{benefit}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-3xl border-blue-100 p-5 md:p-6">
            <h2 className="text-2xl font-bold text-slate-950">Eligibility</h2>
            <div className="mt-4 grid gap-3">
              {card.eligibility.map((item) => (
                <div key={item} className="rounded-2xl bg-orange-50/70 p-4 text-sm font-semibold leading-6 text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.85fr]">
          <Card className="rounded-3xl border-blue-100 p-5 md:p-6">
            <h2 className="text-2xl font-bold text-slate-950">Documents Required</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {card.documents.map((document) => (
                <div key={document} className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-white p-4">
                  <FileCheck2 className="h-5 w-5 shrink-0 text-orange-600" />
                  <p className="text-sm font-bold text-slate-800">{document}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-3xl border-blue-100 p-5 md:p-6">
            <h2 className="text-2xl font-bold text-slate-950">Fees and Charges</h2>
            <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-semibold leading-7 text-slate-700">{card.feesNote}</p>
          </Card>
        </section>

        <section className="mt-6 rounded-3xl border border-orange-100 bg-orange-50/70 p-5 md:p-6">
          <h2 className="text-xl font-bold text-slate-950">Important Disclaimer</h2>
          <p className="mt-3 text-sm font-semibold leading-7 text-slate-700">{disclaimer}</p>
        </section>
      </div>
    </main>
  );
}
