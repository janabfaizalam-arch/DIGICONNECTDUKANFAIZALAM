import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, MessageCircle, ShieldCheck } from "lucide-react";

import { ServiceApplicationForm } from "@/components/portal/service-application-form";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { portalServices, type ServiceField } from "@/lib/portal-data";
import { getPublicServiceBySlug, getPublicServicesByCategory } from "@/lib/services";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { buildApplicationWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ services?: string; plan?: string }>;
};

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return portalServices.map((service) => ({
    slug: service.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = await getPublicServiceBySlug(slug);

  if (slug === "pvc-card-printing") {
    return {
      title: "PVC Card Print Order | DigiConnect Dukan",
      description: "Order premium PVC card printing online. Convert Aadhaar, PAN, Voter ID, Ayushman, or ABHA card into durable, waterproof, premium PVC smart cards.",
    };
  }

  return {
    title: service ? `Apply for ${service.title} | DigiConnect Dukan` : "Apply | DigiConnect Dukan",
    description: service
      ? `Complete online application form, document upload, secure Razorpay payment, and invoice generation for ${service.title}.`
      : "DigiConnect Dukan application form.",
  };
}

export default async function ApplyPage({ params, searchParams }: PageProps) {
  const [{ slug }, query, user] = await Promise.all([params, searchParams, getCurrentUser()]);
  const service = await getPublicServiceBySlug(slug);

  if (!service || service.ctaType !== "apply") {
    notFound();
  }

  if (!user) {
    const servicesParam = query?.services ? `?services=${encodeURIComponent(query.services)}` : "";
    redirect(`/login/customer?redirect=${encodeURIComponent(`/apply/${slug}${servicesParam}`)}`);
  }

  const supabaseAdmin = getSupabaseAdmin();
  let userProfile = null;
  if (supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("mobile, pincode, city, state")
      .eq("id", user.id)
      .maybeSingle();
    userProfile = data;
  }
  const isProfileIncomplete = !userProfile?.mobile || !userProfile?.pincode || !userProfile?.city || !userProfile?.state;

  const selectedServices = Array.from(new Set([slug, ...(query?.services?.split(",") ?? [])]))
    .map((item) => item.trim())
    .filter(Boolean);
  const relatedServices = await getPublicServicesByCategory(service.categorySlug);
  const selectedPublicServices = selectedServices
    .map((item) => [service, ...relatedServices].find((candidate) => candidate.slug === item))
    .filter((item): item is typeof service => Boolean(item));

  const selectedPublicServicesOverridden = selectedPublicServices.map((item) => {
    if (item.slug === "cibil-report-analysis-and-credit-health-consultation") {
      const isBasic = query?.plan === "basic";
      return {
        ...item,
        title: isBasic ? "Basic CIBIL One Pager Report" : "Premium CIBIL Analysis & Consultation",
        amount: isBasic ? 518 : 2599,
        shortDescription: isBasic
          ? "Latest TransUnion CIBIL Report & One Page Financial History Summary"
          : "Complete CIBIL Report Analysis, score improvement plan, and expert consultation.",
      };
    }
    if (item.slug === "gst-registration") {
      const plan = query?.plan || "basic";
      if (plan === "msme") {
        return {
          ...item,
          title: "GST Registration + MSME",
          amount: 2999,
          shortDescription: "GST Registration, MSME Registration, and Udyam Certificate.",
        };
      } else if (plan === "starter") {
        return {
          ...item,
          title: "GST Business Starter Pack",
          amount: 3999,
          shortDescription: "GST Registration, MSME, Business Consultation, and Compliance Guide.",
        };
      } else if (plan === "premium") {
        return {
          ...item,
          title: "GST Premium",
          amount: 4999,
          shortDescription: "GST Registration, MSME, Compliance Setup, and Dedicated Advisor.",
        };
      } else {
        return {
          ...item,
          title: "Basic GST Registration",
          amount: 2499,
          shortDescription: "GST Registration, ARN Tracking, and Certificate Download.",
        };
      }
    }
    if (item.slug === "gst-return-filing") {
      const plan = query?.plan || "monthly_starter";
      if (plan === "monthly_business") {
        return {
          ...item,
          title: "Business Monthly GST Filing",
          amount: 499,
          shortDescription: "Monthly GSTR-1 & GSTR-3B filings support (Business).",
        };
      } else if (plan === "monthly_premium") {
        return {
          ...item,
          title: "Premium Monthly GST Filing",
          amount: 999,
          shortDescription: "Monthly GSTR-1 & GSTR-3B filings support (Premium).",
        };
      } else if (plan === "quarterly_qrmp") {
        return {
          ...item,
          title: "Quarterly GST QRMP Plan",
          amount: 1499,
          shortDescription: "Quarterly QRMP GSTR compliance and filing package.",
        };
      } else if (plan === "annual") {
        return {
          ...item,
          title: "Annual GST Filing Package",
          amount: 4999,
          shortDescription: "Annual GSTR compliance, audits, and consolidated GSTR-9 filings.",
        };
      } else {
        return {
          ...item,
          title: "Starter Monthly GST Filing",
          amount: 299,
          shortDescription: "Monthly GSTR-1 & GSTR-3B filings support (Starter).",
        };
      }
    }
    return item;
  });

  let serviceTitle = service.slug === "pm-vishwakarma-yojana" ? "PM Vishwakarma Yojana Registration" : service.title;
  let serviceAmount = service.amount;
  let serviceDescription = service.shortDescription;

  if (slug === "cibil-report-analysis-and-credit-health-consultation") {
    const isBasic = query?.plan === "basic";
    serviceTitle = isBasic ? "Basic CIBIL One Pager Report" : "Premium CIBIL Analysis & Consultation";
    serviceAmount = isBasic ? 518 : 2599;
    serviceDescription = isBasic
      ? "Latest TransUnion CIBIL Report & One Page Financial History Summary"
      : "Complete CIBIL Report Analysis, score improvement plan, and expert consultation.";
  }
  if (slug === "gst-registration") {
    const plan = query?.plan || "basic";
    if (plan === "msme") {
      serviceTitle = "GST Registration + MSME";
      serviceAmount = 2999;
      serviceDescription = "GST Registration, MSME Registration, and Udyam Certificate.";
    } else if (plan === "starter") {
      serviceTitle = "GST Business Starter Pack";
      serviceAmount = 3999;
      serviceDescription = "GST Registration, MSME, Business Consultation, and Compliance Guide.";
    } else if (plan === "premium") {
      serviceTitle = "GST Premium";
      serviceAmount = 4999;
      serviceDescription = "GST Registration, MSME, Compliance Setup, and Dedicated Advisor.";
    } else {
      serviceTitle = "Basic GST Registration";
      serviceAmount = 2499;
      serviceDescription = "GST Registration, ARN Tracking, and Certificate Download.";
    }
  }
  if (slug === "gst-return-filing") {
    const plan = query?.plan || "monthly_starter";
    if (plan === "monthly_business") {
      serviceTitle = "Business Monthly GST Filing";
      serviceAmount = 499;
      serviceDescription = "Monthly GSTR-1 & GSTR-3B filings support (Business).";
    } else if (plan === "monthly_premium") {
      serviceTitle = "Premium Monthly GST Filing";
      serviceAmount = 999;
      serviceDescription = "Monthly GSTR-1 & GSTR-3B filings support (Premium).";
    } else if (plan === "quarterly_qrmp") {
      serviceTitle = "Quarterly GST QRMP Plan";
      serviceAmount = 1499;
      serviceDescription = "Quarterly QRMP GSTR compliance and filing package.";
    } else if (plan === "annual") {
      serviceTitle = "Annual GST Filing Package";
      serviceAmount = 4999;
      serviceDescription = "Annual GSTR compliance, audits, and consolidated GSTR-9 filings.";
    } else {
      serviceTitle = "Starter Monthly GST Filing";
      serviceAmount = 299;
      serviceDescription = "Monthly GSTR-1 & GSTR-3B filings support (Starter).";
    }
  }
  const whatsappUrl = buildWhatsAppUrl(
    buildApplicationWhatsAppMessage({
      action: "apply_help",
      serviceName: service.title,
    }),
  );

  function fieldsFor(categorySlug: string, serviceSlug: string): ServiceField[] {
    if (serviceSlug === "pm-vishwakarma-yojana") return [];
    if (serviceSlug === "cm-yuva-entrepreneur-loan-assistance") return [];
    if (categorySlug === "tax-business") return [{ name: "businessName", label: "Business Name", required: false }, { name: "panNumber", label: "PAN", required: false }];
    if (categorySlug === "insurance") return [{ name: "vehicleNumber", label: "Vehicle Number", required: false }, { name: "previousPolicy", label: "Previous Policy Details", type: "textarea", required: false }];
    if (categorySlug === "finance-banking") return [{ name: "loanPurpose", label: "Loan / Banking Requirement", type: "textarea", required: false }, { name: "monthlyIncome", label: "Monthly Income / Turnover", required: false }];
    return [];
  }

  return (
    <main className="min-h-screen px-4 pb-10 pt-5 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl">
        <Link href={`/services/${service.slug}`} className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)]">
          <ArrowLeft className="h-4 w-4" />
          Back to service
        </Link>

        <div className="mt-5 grid gap-6 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
          {service.slug === "cm-yuva-entrepreneur-loan-assistance" ? (
            <Card className="rounded-2xl p-4 lg:p-5 shadow-sm border border-blue-50/50 bg-white/90 backdrop-blur-sm">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[var(--primary)] shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-blue-600">Secure Submission</p>
                  <h1 className="text-base lg:text-lg font-black text-slate-950 mt-0.5">
                    Apply for CM YUVA Assistance
                  </h1>
                </div>
              </div>
              
              <p className="mt-3 text-xs leading-relaxed text-slate-500 font-semibold">
                Fill details, upload documents, and complete secure payment.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] sm:text-xs font-bold text-slate-700 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-blue-500 text-white text-[9px]">✓</span>
                  <span>Fill applicant details</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-blue-500 text-white text-[9px]">✓</span>
                  <span>Upload 4 documents</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-blue-500 text-white text-[9px]">✓</span>
                  <span>Pay securely</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-blue-500 text-white text-[9px]">✓</span>
                  <span>Track updates</span>
                </div>
              </div>
              
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition">
                <MessageCircle className="h-3.5 w-3.5" />
                Get WhatsApp Help
              </a>
            </Card>
          ) : (
            <Card className="rounded-2xl p-5 md:p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[var(--primary)]">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <p className="mt-6 text-sm font-medium uppercase tracking-[0.18em] text-[var(--secondary)]">
                Secure Application
              </p>
              <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-950 md:text-5xl">
                {service.slug === "pvc-card-printing" ? "PVC Card Print Order" : `Apply for ${service.title}`}
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-slate-600">
                Fill in your details, upload documents, and pay securely with Razorpay. Our team will share updates through your dashboard, call, or WhatsApp.
              </p>
              <div className="mt-6 space-y-3 text-sm font-medium text-slate-700">
                <p>1. Fill in your details</p>
                <p>2. Upload required documents</p>
                <p>3. Pay securely with Razorpay</p>
                <p>4. Receive invoice and updates</p>
              </div>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-bold text-white">
                <MessageCircle className="h-4 w-4" />
                Get WhatsApp Help
              </a>
            </Card>
          )}

          <ServiceApplicationForm
            service={{
              title: serviceTitle,
              slug: service.slug,
              amount: serviceAmount,
              description: serviceDescription,
              documents: service.documents,
              fields: fieldsFor(service.categorySlug, service.slug),
            }}
            services={selectedPublicServicesOverridden.map((item) => ({
              title: item.title,
              slug: item.slug,
              amount: item.amount,
              description: item.shortDescription,
              documents: item.documents,
              fields: fieldsFor(item.categorySlug, item.slug),
            }))}
            isProfileIncompleteInitial={isProfileIncomplete}
            initialProfileFields={{
              mobile: userProfile?.mobile ?? "",
              pincode: userProfile?.pincode ?? "",
              city: userProfile?.city ?? "",
              state: userProfile?.state ?? "",
            }}
          />
        </div>
      </div>
    </main>
  );
}
