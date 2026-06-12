import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck, MessageCircle } from "lucide-react";

import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getPublicServiceBySlug } from "@/lib/services";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { buildApplicationWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { CscOlympiadFormClient } from "@/components/portal/csc-olympiad-form-client";

type PageProps = {
  searchParams?: Promise<{ subjects?: string }>;
};

interface Subject {
  id: string;
  name: string;
  icon: string;
  classes: number[];
}

interface CscOlympiadConfig {
  registrationFee?: {
    offerPrice?: number;
    price?: number;
  };
  session?: string;
  subjects?: Subject[];
}

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Apply for CSC Olympiad Registration | DigiConnect Dukan",
    description: "Complete online application form, document upload, secure Razorpay payment, and invoice generation for CSC Olympiad.",
  };
}

export default async function CscOlympiadApplyPage({ searchParams }: PageProps) {
  const [query, user] = await Promise.all([searchParams, getCurrentUser()]);
  const service = await getPublicServiceBySlug("csc-olympiad");

  if (!service) {
    redirect("/services");
  }

  if (!user) {
    const subjectsParam = query?.subjects ? `?subjects=${encodeURIComponent(query.subjects)}` : "";
    redirect(`/login/customer?redirect=${encodeURIComponent(`/services/csc-olympiad/apply${subjectsParam}`)}`);
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

  const whatsappUrl = buildWhatsAppUrl(
    buildApplicationWhatsAppMessage({
      action: "apply_help",
      serviceName: "CSC Olympiad",
    }),
  );

  const initialSubjects = query?.subjects ? query.subjects.split(",").filter(Boolean) : [];

  let dbConfig: CscOlympiadConfig = {};
  if (service.blogContent) {
    try {
      dbConfig = JSON.parse(service.blogContent) as CscOlympiadConfig;
    } catch {
      // not json
    }
  }

  const pricePerSubject = dbConfig.registrationFee?.offerPrice ?? service.amount ?? 100;
  const oldPricePerSubject = dbConfig.registrationFee?.price ?? 150;
  const activeSession = dbConfig.session ?? "2026-2027";
  const subjectsList = dbConfig.subjects ?? [];

  return (
    <main className="min-h-screen px-4 pb-10 pt-5 md:px-8 md:py-10 bg-slate-50/50 noise-bg relative">
      <div className="mx-auto max-w-7xl relative z-10">
        <Link href="/services/csc-olympiad" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)] hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to CSC Olympiad
        </Link>

        <div className="mt-5 grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          
          {/* Info card */}
          <Card className="rounded-2xl p-5 md:p-6 bg-white/80 border border-white/50 backdrop-blur-md shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[var(--primary)] shadow-sm">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <p className="mt-6 text-sm font-black uppercase tracking-[0.18em] text-[var(--secondary)]">
                Secure Registration Facilitation
              </p>
              <h1 className="mt-3 text-3xl font-black leading-tight text-slate-950">
                CSC Olympiad Registration
              </h1>
              <p className="mt-4 text-xs leading-relaxed text-slate-500 font-semibold">
                Submit student details, select subjects, upload verification documents, and pay securely. RNoS India coordinators review files to prevent rejection prior to official exam portal scheduling.
              </p>
              <div className="mt-6 space-y-3 text-xs font-bold text-slate-700 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                <p className="flex items-center gap-2">
                  <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-blue-500 text-white text-[9px]">✓</span>
                  <span>Step-by-step interactive guidance</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-blue-500 text-white text-[9px]">✓</span>
                  <span>Autosave draft & resume anytime</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-blue-500 text-white text-[9px]">✓</span>
                  <span>Redeem up to 50% wallet balance</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-blue-500 text-white text-[9px]">✓</span>
                  <span>Live WhatsApp helper support</span>
                </p>
              </div>
            </div>
            
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-bold text-white shadow-lg hover:bg-emerald-700 transition">
              <MessageCircle className="h-4 w-4" />
              Get WhatsApp Help
            </a>
          </Card>

          {/* Dynamic multi-step wizard component */}
          <CscOlympiadFormClient
            initialProfileFields={{
              mobile: userProfile?.mobile ?? "",
              pincode: userProfile?.pincode ?? "",
              city: userProfile?.city ?? "",
              state: userProfile?.state ?? "",
            }}
            isProfileIncomplete={isProfileIncomplete}
            pricePerSubject={pricePerSubject}
            oldPricePerSubject={oldPricePerSubject}
            activeSession={activeSession}
            subjectsList={subjectsList}
            initialSubjects={initialSubjects}
          />

        </div>
      </div>
    </main>
  );
}
