import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user || !isAdminRole(role)) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json({ message: "Supabase service role key is missing." }, { status: 500 });
  }

  const body = (await request.json()) as {
    userId?: string;
    amount?: number;
    transactionType?: "admin_bonus" | "refund_adjustment";
    note?: string;
    expiryDays?: number;
  };

  const userId = String(body.userId ?? "").trim();
  const amount = Number(body.amount ?? 0);

  if (!userId || !Number.isFinite(amount) || amount === 0) {
    return NextResponse.json({ message: "Customer and non-zero amount are required." }, { status: 400 });
  }

  const { error } = await supabase.rpc("admin_adjust_wallet", {
    p_user_id: userId,
    p_amount: amount,
    p_transaction_type: body.transactionType ?? "admin_bonus",
    p_note: body.note ?? "Admin wallet adjustment.",
    p_created_by: user.id,
    p_expiry_days: Number(body.expiryDays ?? 90),
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  await supabase.from("notifications").insert({
    user_id: userId,
    title: amount > 0 ? "DigiWallet bonus credited" : "DigiWallet adjusted",
    message:
      amount > 0
        ? `₹${Math.abs(amount).toLocaleString("en-IN")} has been added to your DigiWallet.`
        : `₹${Math.abs(amount).toLocaleString("en-IN")} has been adjusted from your DigiWallet.`,
  });

  return NextResponse.json({ message: "Wallet updated successfully." });
}
