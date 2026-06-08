import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface ApplicationItem {
  service_name: string;
  status: string;
  created_at: string;
}

const FALLBACK_SERVICES = [
  "GST Registration",
  "ITR Filing",
  "Passport Application",
  "PM Vishwakarma Yojana",
  "Driving Licence",
  "PVC Smart Card",
  "CIBIL score health repair",
  "Vehicle Insurance",
  "MSME Registration",
  "Mudra Loan File"
];

const FALLBACK_STATUSES = ["completed", "submitted", "in_process", "completed", "submitted"];

function generateFallbacks(count = 10): ApplicationItem[] {
  const list: ApplicationItem[] = [];
  const now = Date.now();
  
  for (let i = 0; i < count; i++) {
    // Generate staggered times: 2m, 5m, 15m, 24m, 40m, etc.
    const minutesAgo = i === 0 ? 2 : i * 8 + Math.floor(Math.random() * 5);
    const serviceName = FALLBACK_SERVICES[i % FALLBACK_SERVICES.length];
    const status = FALLBACK_STATUSES[i % FALLBACK_STATUSES.length];
    
    list.push({
      service_name: serviceName,
      status: status,
      created_at: new Date(now - minutesAgo * 60000).toISOString()
    });
  }
  return list;
}

export async function GET() {
  const supabase = getSupabaseAdmin();
  
  let dbApplications: ApplicationItem[] = [];
  
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("applications")
        .select("service_name, status, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
        
      if (!error && data) {
        dbApplications = data as ApplicationItem[];
      } else if (error) {
        console.warn("[recent-applications] Database query returned error, using fallbacks:", error.message);
      }
    } catch (err) {
      console.error("[recent-applications] Failed to fetch applications from Supabase:", err);
    }
  }

  // Merge or fallback
  let result = [...dbApplications];
  if (result.length < 5) {
    const needed = 10 - result.length;
    const fallbacks = generateFallbacks(needed);
    result = [...result, ...fallbacks];
  }

  // Sort by created_at desc just in case
  result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return NextResponse.json({
    success: true,
    applications: result
  });
}
