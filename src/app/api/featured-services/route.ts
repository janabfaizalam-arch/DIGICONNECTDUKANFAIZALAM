import { NextResponse } from "next/server";
import { getAgentServiceBySlug } from "@/lib/agent-services";

export const dynamic = "force-dynamic";

const slugs = [
  "gst-registration",
  "itr-filing",
  "driving-licence",
  "passport",
  "pm-vishwakarma-yojana",
  "cibil-report-analysis-and-credit-health-consultation",
  "pvc-card",
  "eshram-card-registration",
  "credit-cards",
  "insurance"
];

export async function GET() {
  try {
    const servicesDataResolved = await Promise.all(
      slugs.map(async (slug) => {
        try {
          const dbService = await getAgentServiceBySlug(slug);
          if (dbService) return dbService;
        } catch (err) {
          console.warn(`Failed to fetch agent service ${slug}:`, err);
        }
        return null;
      })
    );

    const services = servicesDataResolved
      .filter(Boolean)
      .map((s) => {
        if (!s) return null;
        return {
          title: s.title,
          slug: s.slug,
          category: s.category || "",
          categorySlug: s.category || "",
          shortDescription: s.description || "",
          amount: s.customer_fee || 0,
          badge: s.popular ? "Popular" : ""
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      success: true,
      services
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({
      success: false,
      error: message,
      services: []
    }, { status: 500 });
  }
}
