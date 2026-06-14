import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { revalidateServicePaths } from "@/lib/service-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ message: "Supabase service role key is missing." }, { status: 500 });
  }

  const { id } = await params;
  
  try {
    const body = await request.json();
    const { base_customer_fee, tat_hours, metadata, fields, workflows } = body;

    // Update main service columns
    const { data: serviceData, error: serviceUpdateError } = await supabase
      .from("services")
      .update({
        base_customer_fee: Number(base_customer_fee ?? 0),
        tat_hours: Number(tat_hours ?? 48),
        metadata: metadata || {},
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select("slug")
      .maybeSingle();

    if (serviceUpdateError) {
      console.error("[admin-engine-save] Service update error:", serviceUpdateError);
      return NextResponse.json({ message: serviceUpdateError.message }, { status: 500 });
    }

    // Delete existing service fields and workflows first
    const { error: deleteFieldsError } = await supabase
      .from("service_fields")
      .delete()
      .eq("service_id", id);

    if (deleteFieldsError) {
      console.error("[admin-engine-save] Delete fields error:", deleteFieldsError);
      return NextResponse.json({ message: deleteFieldsError.message }, { status: 500 });
    }

    const { error: deleteWorkflowsError } = await supabase
      .from("service_workflows")
      .delete()
      .eq("service_id", id);

    if (deleteWorkflowsError) {
      console.error("[admin-engine-save] Delete workflows error:", deleteWorkflowsError);
      return NextResponse.json({ message: deleteWorkflowsError.message }, { status: 500 });
    }

    // Insert new service fields if provided
    if (Array.isArray(fields) && fields.length > 0) {
      const fieldsToInsert = fields.map((f: { field_key?: string; label?: string; field_type?: string; sort_order?: number; validation_chains?: unknown[]; default_value?: string | null }, index: number) => ({
        service_id: id,
        field_key: String(f.field_key || "").trim(),
        label: String(f.label || "").trim(),
        field_type: f.field_type,
        sort_order: typeof f.sort_order === "number" ? f.sort_order : index,
        validation_chains: Array.isArray(f.validation_chains) ? f.validation_chains : [],
        default_value: f.default_value === null ? null : String(f.default_value ?? "").trim() || null
      }));

      const { error: fieldsInsertError } = await supabase
        .from("service_fields")
        .insert(fieldsToInsert);

      if (fieldsInsertError) {
        console.error("[admin-engine-save] Fields insert error:", fieldsInsertError);
        return NextResponse.json({ message: fieldsInsertError.message }, { status: 500 });
      }
    }

    // Insert new service workflows if provided
    if (Array.isArray(workflows) && workflows.length > 0) {
      const workflowsToInsert = workflows.map((w: { step_key?: string; label?: string; sort_order?: number; allowed_transitions?: string[] }, index: number) => ({
        service_id: id,
        step_key: String(w.step_key || "").trim(),
        label: String(w.label || "").trim(),
        sort_order: typeof w.sort_order === "number" ? w.sort_order : index,
        allowed_transitions: Array.isArray(w.allowed_transitions) ? w.allowed_transitions : []
      }));

      const { error: workflowsInsertError } = await supabase
        .from("service_workflows")
        .insert(workflowsToInsert);

      if (workflowsInsertError) {
        console.error("[admin-engine-save] Workflows insert error:", workflowsInsertError);
        return NextResponse.json({ message: workflowsInsertError.message }, { status: 500 });
      }
    }

    if (serviceData?.slug) {
      revalidateServicePaths(serviceData.slug);
    }

    return NextResponse.json({ message: "Engine configuration saved successfully." });
  } catch (error) {
    console.error("[admin-engine-save] Exception:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
