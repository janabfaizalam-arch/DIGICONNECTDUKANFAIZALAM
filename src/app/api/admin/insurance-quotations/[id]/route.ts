import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { buildInsuranceQuotationPayload } from "@/lib/insurance-quotations";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message, message }, { status });
}

async function requireAdminJson() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) return { error: jsonError("Please log in before managing insurance quotations.", 401) };
  if (!isAdminRole(role)) return { error: jsonError("You do not have permission to manage insurance quotations.", 403) };

  return { error: null };
}

function friendlySupabaseError(message: string) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("insurance_quotations") || lowerMessage.includes("relation") || lowerMessage.includes("does not exist")) {
    return "Insurance quotations database table is not available yet. Please apply the Supabase migration.";
  }

  return message;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminJson();
    if (auth.error) return auth.error;

    const { id } = await context.params;
    const supabase = getSupabaseAdmin();
    if (!supabase) return jsonError("Insurance quotations are not configured on the server.", 500);

    const { data: quotation, error } = await supabase.from("insurance_quotations").select("*").eq("id", id).maybeSingle();

    if (error) return jsonError(friendlySupabaseError(error.message), 500);
    if (!quotation) return jsonError("Insurance quotation was not found.", 404);

    return NextResponse.json({ quotation });
  } catch (error) {
    console.error("[api/admin/insurance-quotations] Read failed", error);
    return jsonError("Insurance quotation could not be loaded.", 500);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminJson();
    if (auth.error) return auth.error;

    const { id } = await context.params;
    const supabase = getSupabaseAdmin();
    if (!supabase) return jsonError("Insurance quotation update is not configured on the server.", 500);

    const formData = await request.formData();
    const { error: payloadError, payload } = buildInsuranceQuotationPayload(formData);

    if (payloadError || !payload) {
      return jsonError(payloadError || "Insurance quotation details are invalid.", 400);
    }

    const { data: quotation, error } = await supabase
      .from("insurance_quotations")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();

    if (error) return jsonError(friendlySupabaseError(error.message), 500);

    revalidatePath("/admin/insurance-quotations");
    revalidatePath(`/insurance-quotation/${quotation.public_token}`);

    return NextResponse.json({ quotation, message: "Insurance quotation updated successfully." });
  } catch (error) {
    console.error("[api/admin/insurance-quotations] Update failed", error);
    return jsonError("Insurance quotation could not be updated. Please try again.", 500);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminJson();
    if (auth.error) return auth.error;

    const { id } = await context.params;
    const supabase = getSupabaseAdmin();
    if (!supabase) return jsonError("Insurance quotation delete is not configured on the server.", 500);

    const { data: quotation } = await supabase.from("insurance_quotations").select("public_token").eq("id", id).maybeSingle();
    const { error } = await supabase.from("insurance_quotations").delete().eq("id", id);

    if (error) return jsonError(friendlySupabaseError(error.message), 500);

    revalidatePath("/admin/insurance-quotations");
    if (quotation?.public_token) revalidatePath(`/insurance-quotation/${quotation.public_token}`);

    return NextResponse.json({ message: "Insurance quotation deleted successfully." });
  } catch (error) {
    console.error("[api/admin/insurance-quotations] Delete failed", error);
    return jsonError("Insurance quotation could not be deleted. Please try again.", 500);
  }
}
