import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  buildInsuranceQuotationPayload,
  createPublicToken,
  generateInsuranceQuoteNumber,
} from "@/lib/insurance-quotations";
import { createAdminNotification } from "@/lib/admin-notifications";
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

export async function GET() {
  try {
    const auth = await requireAdminJson();
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdmin();
    if (!supabase) return jsonError("Insurance quotations are not configured on the server.", 500);

    const { data: quotations, error } = await supabase
      .from("insurance_quotations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return jsonError(friendlySupabaseError(error.message), 500);

    return NextResponse.json({ quotations: quotations ?? [] });
  } catch (error) {
    console.error("[api/admin/insurance-quotations] List failed", error);
    return jsonError("Insurance quotations could not be loaded.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminJson();
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdmin();
    if (!supabase) return jsonError("Insurance quotation creation is not configured on the server.", 500);

    const formData = await request.formData();
    const { error: payloadError, payload } = buildInsuranceQuotationPayload(formData);

    if (payloadError || !payload) {
      return jsonError(payloadError || "Insurance quotation details are invalid.", 400);
    }

    const { data: quotation, error } = await supabase
      .from("insurance_quotations")
      .insert({
        ...payload,
        quote_number: await generateInsuranceQuoteNumber(),
        public_token: createPublicToken(),
      })
      .select("*")
      .single();

    if (error) return jsonError(friendlySupabaseError(error.message), 500);

    await createAdminNotification(supabase, {
      type: "insurance_quotation",
      title: "Insurance quotation created",
      message: `${quotation.customer_name} received quote ${quotation.quote_number} for ${quotation.insurance_type}.`,
      relatedType: "insurance_quotation",
      relatedId: quotation.id,
    });

    revalidatePath("/admin/insurance-quotations");
    revalidatePath(`/insurance-quotation/${quotation.public_token}`);

    return NextResponse.json({ quotation, message: "Insurance quotation created successfully." });
  } catch (error) {
    console.error("[api/admin/insurance-quotations] Create failed", error);
    return jsonError("Insurance quotation could not be created. Please try again.", 500);
  }
}
