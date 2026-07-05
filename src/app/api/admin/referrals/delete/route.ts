import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    const role = await getCurrentUserRole(user);

    if (!user || !isAdminRole(role)) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Referral ID is required." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Database configuration error." }, { status: 500 });
    }

    // Perform deletion
    const { error: deleteError } = await supabase
      .from("service_referrals")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("[admin/referrals/delete] Deletion error:", deleteError);
      return NextResponse.json({ error: "Failed to delete referral record." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Referral record deleted successfully."
    });
  } catch (error) {
    console.error("[admin/referrals/delete] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
