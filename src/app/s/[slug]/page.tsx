"use client";

import { useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function ServiceReferralTrackerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const refToken = searchParams.get("ref");
    
    const recordClickAndRedirect = async () => {
      if (refToken) {
        try {
          await fetch("/api/referrals/click", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: refToken,
              utmSource: searchParams.get("utm_source"),
              utmMedium: searchParams.get("utm_medium"),
              utmCampaign: searchParams.get("utm_campaign"),
              utmTerm: searchParams.get("utm_term"),
              utmContent: searchParams.get("utm_content"),
            }),
          });
        } catch (err) {
          console.error("Failed to track click:", err);
        }
      }
      
      // Redirect to Customer Application Wizard
      const refParam = refToken ? `?ref=${encodeURIComponent(refToken)}` : "";
      router.replace(`/apply/${slug}${refParam}`);
    };

    recordClickAndRedirect();
  }, [slug, searchParams, router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-slate-600 font-medium">Connecting to service...</p>
      </div>
    </div>
  );
}
