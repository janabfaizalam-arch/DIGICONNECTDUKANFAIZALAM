import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth-v2/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customerId = session.payload.sub;
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json({ error: "Database misconfigured" }, { status: 500 });
    }

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("name, wallet_balance, mobile")
      .eq("id", customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Try fetching recent applications if the applications table exists.
    // We wrap this in try/catch or ignore error if table missing for V2 prototype.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let recentApplications: any[] = [];
    const { data: apps, error: appsError } = await supabase
      .from("applications")
      .select("id, service_name, status, created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(5);
      
    if (!appsError && apps) {
      recentApplications = apps;
    }

    return NextResponse.json({
      customer,
      recentApplications
    });

  } catch (error) {
    console.error("[Auth V2] Dashboard API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
