import { NextResponse } from "next/server";
import { validateFileSignature } from "@/lib/file-validation";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { revalidateServicePaths, servicePayload, syncServiceBuilderRows } from "@/lib/service-admin";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

async function requireAdmin() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  return null;
}

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
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ message: "Supabase service role key is missing." }, { status: 500 });

  const { id } = await params;
  const formData = await request.formData();
  let payload = { ...servicePayload(formData), updated_at: new Date().toISOString() };
  if (!payload.title || !payload.slug) return NextResponse.json({ message: "Service name is required." }, { status: 400 });
  try {
    payload = await uploadHeroImage(formData, payload.slug, payload);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Hero image upload failed." }, { status: 400 });
  }

  const { data: duplicate } = await supabase.from("services").select("id").eq("slug", payload.slug).neq("id", id).maybeSingle();
  if (duplicate) return NextResponse.json({ message: "A service with this slug already exists." }, { status: 409 });

  const { error } = await supabase.from("services").update(payload).eq("id", id);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  try {
    await syncServiceBuilderRows(supabase, id, formData);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Service builder content could not be saved." }, { status: 500 });
  }

  revalidateServicePaths(payload.slug);
  return NextResponse.json({ message: "Service updated." });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ message: "Supabase service role key is missing." }, { status: 500 });

  const { id } = await params;
  const { data: service } = await supabase.from("services").select("slug").eq("id", id).maybeSingle();
  const { error } = await supabase
    .from("services")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  revalidateServicePaths(service?.slug);
  return NextResponse.json({ message: "Service archived." });
}
