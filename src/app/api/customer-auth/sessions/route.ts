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

    const { data: sessions, error } = await supabase
      .from("customer_sessions")
      .select(`
        id, 
        created_at, 
        expires_at, 
        is_revoked,
        device_id,
        customer_devices (
          device_name,
          ip_address,
          last_active
        )
      `)
      .eq("customer_id", customerId)
      .eq("is_revoked", false)
      .gte("expires_at", new Date().toISOString())
      .order("last_active", { foreignTable: 'customer_devices', ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
    }

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("[Auth V2] Sessions API GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customerId = session.payload.sub;
    const { sessionId, all } = await request.json();
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Database misconfigured" }, { status: 500 });
    }
    if (all) {
      // Logout all devices
      await supabase
        .from("customer_sessions")
        .update({ is_revoked: true })
        .eq("customer_id", customerId);
      
      return NextResponse.json({ success: true, message: "All devices logged out" });
    }

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    // Logout specific device
    await supabase
      .from("customer_sessions")
      .update({ is_revoked: true })
      .eq("id", sessionId)
      .eq("customer_id", customerId);

    return NextResponse.json({ success: true, message: "Device logged out" });
  } catch (error) {
    console.error("[Auth V2] Sessions API DELETE error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
