import { NextResponse } from "next/server";
import { validateFileSignature } from "@/lib/file-validation";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import {
  getChangesDiff,
  revalidateServicePaths,
  servicePayload,
  syncServiceBuilderRows,
  syncServiceCatalogAndAgentPortal,
  writeServiceAuditLog,
} from "@/lib/service-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const allowedMediaTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

async function uploadHeroImage<T extends ReturnType<typeof servicePayload>>(formData: FormData, slug: string, payload: T) {
  const file = formData.get("heroImage");
  if (!(file instanceof File) || file.size <= 0) return payload;
  if (!allowedMediaTypes.has(file.type)) throw new Error("Hero image must be JPG, PNG, or WEBP.");

  const check = await validateFileSignature(file, Array.from(allowedMediaTypes));
  if (!check.valid) throw new Error(check.error || "Hero image is invalid.");

  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase service role key is missing.");

  const extension = file.name.split(".").pop()?.toLowerCase() || "webp";
  const storagePath = `${slug}/${Date.now()}-hero.${extension}`;
  const { error } = await supabase.storage.from("service-media").upload(storagePath, file, {
    contentType: file.type,
    upsert: true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from("service-media").getPublicUrl(storagePath);
  return {
    ...payload,
    hero_image_url: data.publicUrl,
    hero_image_storage_path: storagePath,
  };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) return NextResponse.json({ message: "Admin access required." }, { status: 403 });

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ message: "Supabase service role key is missing." }, { status: 500 });

  const { id } = await params;
  const formData = await request.formData();
  let payload: ReturnType<typeof servicePayload> & { updated_at: string; updated_by?: string; metadata?: Record<string, unknown> | null } = { ...servicePayload(formData), updated_at: new Date().toISOString() };
  if (!payload.title || !payload.slug) return NextResponse.json({ message: "Service name is required." }, { status: 400 });

  try {
    payload = await uploadHeroImage(formData, payload.slug, payload);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Hero image upload failed." }, { status: 400 });
  }

  const { data: duplicate } = await supabase.from("services").select("id").eq("slug", payload.slug).neq("id", id).maybeSingle();
  if (duplicate) return NextResponse.json({ message: "A service with this slug already exists." }, { status: 409 });

  // Get current old values for diff comparison
  const { data: oldService, error: fetchError } = await supabase.from("services").select("*").eq("id", id).maybeSingle();
  if (fetchError || !oldService) {
    return NextResponse.json({ message: fetchError?.message ?? "Service not found." }, { status: 404 });
  }

  // Get Wizard specific pricing/commissions
  const customerFee = Number(formData.get("customerFee") || payload.sale_price || payload.base_price || 0);
  const agentPayout = Number(formData.get("agentPayout") || 0);
  const payoutType = (formData.get("payoutType") === "percentage" ? "percentage" : "fixed") as "fixed" | "percentage";
  const payoutPercentage = Number(formData.get("payoutPercentage") || 0);
  const categorySlug = formData.get("categorySlug") ? String(formData.get("categorySlug")).trim() : payload.category;

  payload.updated_by = user.id;
  payload.metadata = {
    ...(oldService.metadata || {}),
    ...(payload.metadata || {}),
    customer_fee: customerFee,
    agent_payout: agentPayout,
    payout_type: payoutType,
    payout_percentage: payoutPercentage,
    tat_hours: Number(formData.get("tatHours") || oldService.metadata?.tat_hours || 48),
    auto_assignment: formData.get("autoAssignment") !== null ? formData.get("autoAssignment") === "true" : oldService.metadata?.auto_assignment,
    notification_rules: formData.get("notificationRules") !== null ? formData.get("notificationRules") === "true" : oldService.metadata?.notification_rules,
    whatsapp_rules: formData.get("whatsappRules") !== null ? formData.get("whatsappRules") === "true" : oldService.metadata?.whatsapp_rules,
    status_rules: formData.get("statusRules") !== null ? formData.get("statusRules") === "true" : oldService.metadata?.status_rules,
  };

  const { error } = await supabase.from("services").update(payload).eq("id", id);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  try {
    await syncServiceBuilderRows(supabase, id, formData);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Service builder content could not be saved." }, { status: 500 });
  }

  // Sync to other models
  try {
    await syncServiceCatalogAndAgentPortal(supabase, payload.slug, {
      title: payload.title,
      description: payload.short_description || "",
      category: categorySlug,
      customer_fee: customerFee,
      agent_payout: agentPayout,
      payout_type: payoutType,
      payout_percentage: payoutPercentage,
      required_documents: payload.documents || [],
      is_active: payload.status === "published",
      sort_order: payload.sort_order || 0,
    });
  } catch (syncError) {
    console.error("[PATCH] Syncing failed after update:", syncError);
  }

  // Compute diff and log audit log
  const changes = getChangesDiff(oldService, payload);
  if (Object.keys(changes).length > 0) {
    await writeServiceAuditLog(supabase, id, user.id, "edit", changes);
  }

  revalidateServicePaths(payload.slug);
  return NextResponse.json({ message: "Service updated." });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) return NextResponse.json({ message: "Admin access required." }, { status: 403 });

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ message: "Supabase service role key is missing." }, { status: 500 });

  const { id } = await params;
  const { data: service } = await supabase.from("services").select("*").eq("id", id).maybeSingle();
  if (!service) return NextResponse.json({ message: "Service not found." }, { status: 404 });

  const { error } = await supabase
    .from("services")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  // Sync archived status
  try {
    await supabase.from("service_catalog").update({ active: false }).eq("slug", service.slug);
    await supabase.from("agent_services").update({ is_active: false }).eq("slug", service.slug);
  } catch (syncError) {
    console.error("[DELETE] Disabling synced items failed:", syncError);
  }

  // Log action
  await writeServiceAuditLog(supabase, id, user.id, "archive", { status: { old: service.status, new: "archived" } });

  revalidateServicePaths(service.slug);
  return NextResponse.json({ message: "Service archived." });
}

