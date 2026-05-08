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
    frozen?: boolean;
    suspicious?: boolean;
  };

  const userId = String(body.userId ?? "").trim();
  const amount = Number(body.amount ?? 0);

  if (!userId) {
    return NextResponse.json({ message: "Customer is required." }, { status: 400 });
  }

  if (typeof body.frozen === "boolean" || typeof body.suspicious === "boolean") {
    const updates: Record<string, boolean | string> = { updated_at: new Date().toISOString() };

    await supabase.rpc("refresh_reward_wallet_summary", { p_user_id: userId });

    if (typeof body.frozen === "boolean") {
      updates.frozen = body.frozen;
    }

    if (typeof body.suspicious === "boolean") {
      updates.suspicious = body.suspicious;
    }

    const { error } = await supabase.from("wallets").update(updates).eq("user_id", userId);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Wallet status updated." });
  }

  if (!Number.isFinite(amount) || amount === 0) {
    return NextResponse.json({ message: "Customer and non-zero amount are required." }, { status: 400 });
  }

  const { error } = await supabase.rpc("admin_adjust_reward_wallet", {
    p_user_id: userId,
    p_amount: amount,
    p_note: body.note ?? "Admin wallet adjustment.",
    p_created_by: user.id,
    p_expiry_months: Math.max(1, Math.round(Number(body.expiryDays ?? 180) / 30)),
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
