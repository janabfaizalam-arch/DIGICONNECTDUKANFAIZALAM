import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole, isSuperAdminRole } from "@/lib/auth";
import { postWalletTransaction } from "@/lib/rewards-wallet";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user || !isAdminRole(role)) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  if (!isSuperAdminRole(role)) {
    return NextResponse.json({ message: "Super admin access required for wallet adjustments." }, { status: 403 });
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

    await supabase.rpc("create_reward_wallet_if_missing", { p_user_id: userId });

    if (typeof body.frozen === "boolean") {
      updates.frozen = body.frozen;
    }

    if (typeof body.suspicious === "boolean") {
      updates.suspicious = body.suspicious;
    }

    const { error } = await supabase.from("reward_wallets").update(updates).eq("user_id", userId);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Wallet status updated." });
  }

  if (!Number.isFinite(amount) || amount === 0) {
    return NextResponse.json({ message: "Customer and non-zero amount are required." }, { status: 400 });
  }

  const note = String(body.note ?? "").trim();

  if (!note) {
    return NextResponse.json({ message: "A reason/note is required for admin wallet adjustments." }, { status: 400 });
  }

  await postWalletTransaction({
    userId,
    type: "admin_adjustment",
    direction: amount > 0 ? "credit" : "debit",
    amount: Math.abs(amount),
    idempotencyKey: `admin_adjustment:${user.id}:${userId}:${Date.now()}`,
    note,
    metadata: {
      source: "admin_panel",
      closed_loop: true,
      transactionType: body.transactionType ?? "admin_bonus",
    },
    createdBy: user.id,
  });

  await supabase.from("reward_audit_logs").insert({
    actor_id: user.id,
    user_id: userId,
    action: amount > 0 ? "wallet_admin_credit" : "wallet_admin_debit",
    metadata: { amount: Math.abs(amount), note },
  });

  await supabase.from("notifications").insert({
    user_id: userId,
    title: amount > 0 ? "DigiWallet bonus credited" : "DigiWallet adjusted",
    message:
      amount > 0
        ? `Rs ${Math.abs(amount).toLocaleString("en-IN")} has been added to your DigiWallet.`
        : `Rs ${Math.abs(amount).toLocaleString("en-IN")} has been adjusted from your DigiWallet.`,
  });

  return NextResponse.json({ message: "Wallet updated successfully." });
}
