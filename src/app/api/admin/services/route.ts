import { NextResponse } from "next/server";
import { validateFileSignature } from "@/lib/file-validation";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import {
  revalidateServicePaths,
  servicePayload,
  syncServiceBuilderRows,
  syncServiceCatalogAndAgentPortal,
  writeServiceAuditLog,
} from "@/lib/service-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const allowedMediaTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

async function uploadHeroImage(formData: FormData, slug: string, payload: ReturnType<typeof servicePayload>) {
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

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) return NextResponse.json({ message: "Admin access required." }, { status: 403 });

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ message: "Supabase service role key is missing." }, { status: 500 });

  const formData = await request.formData();
  let payload: ReturnType<typeof servicePayload> & { created_by?: string; updated_by?: string; metadata?: Record<string, unknown> | null } = servicePayload(formData);
  if (!payload.title || !payload.slug) return NextResponse.json({ message: "Service name is required." }, { status: 400 });

  try {
    payload = await uploadHeroImage(formData, payload.slug, payload);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Hero image upload failed." }, { status: 400 });
  }

  const { data: duplicate } = await supabase.from("services").select("id").eq("slug", payload.slug).maybeSingle();
  if (duplicate) return NextResponse.json({ message: "A service with this slug already exists." }, { status: 409 });

  // Get Wizard specific metadata configs
  const customerFee = Number(formData.get("customerFee") || payload.sale_price || payload.base_price || 0);
  const agentPayout = Number(formData.get("agentPayout") || 0);
  const payoutType = (formData.get("payoutType") === "percentage" ? "percentage" : "fixed") as "fixed" | "percentage";
  const payoutPercentage = Number(formData.get("payoutPercentage") || 0);
  const categorySlug = categoriesSlugFromForm(formData, payload.category);

  payload.created_by = user.id;
  payload.updated_by = user.id;
  payload.metadata = {
    ...(payload.metadata || {}),
    customer_fee: customerFee,
    agent_payout: agentPayout,
    payout_type: payoutType,
    payout_percentage: payoutPercentage,
    tat_hours: Number(formData.get("tatHours") || 48),
    auto_assignment: formData.get("autoAssignment") === "true",
    notification_rules: formData.get("notificationRules") === "true",
    whatsapp_rules: formData.get("whatsappRules") === "true",
    status_rules: formData.get("statusRules") === "true",
  };

  const { data, error } = await supabase
    .from("services")
    .insert(payload)
    .select("id, slug, status, sort_order")
    .single();

  if (error || !data) return NextResponse.json({ message: error?.message ?? "Service could not be saved." }, { status: 500 });

  try {
    await syncServiceBuilderRows(supabase, data.id, formData);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Service builder content could not be saved." }, { status: 500 });
  }

  // Synchronize across service_catalog and agent_portal
  try {
    await syncServiceCatalogAndAgentPortal(supabase, data.slug, {
      title: payload.title,
      description: payload.short_description || "",
      category: categorySlug,
      customer_fee: customerFee,
      agent_payout: agentPayout,
      payout_type: payoutType,
      payout_percentage: payoutPercentage,
      required_documents: payload.documents || [],
      is_active: data.status === "published",
      sort_order: data.sort_order || 0,
    });
  } catch (syncError) {
    console.error("[POST] Syncing failed after service insertion:", syncError);
  }

  // Log action
  await writeServiceAuditLog(supabase, data.id, user.id, "create", { new: payload });

  revalidateServicePaths(data.slug);
  return NextResponse.json({ message: "Service saved.", serviceId: data.id });
}

function categoriesSlugFromForm(formData: FormData, fallback: string | null) {
  const categorySlug = formData.get("categorySlug");
  if (categorySlug && typeof categorySlug === "string" && categorySlug.trim()) {
    return categorySlug.trim();
  }
  return fallback;
}

