import { NextResponse } from "next/server";

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

async function uploadHeroImage(formData: FormData, slug: string, payload: ReturnType<typeof servicePayload>) {
  const file = formData.get("heroImage");
  if (!(file instanceof File) || file.size <= 0) return payload;
  if (!allowedMediaTypes.has(file.type)) throw new Error("Hero image must be JPG, PNG, or WEBP.");

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
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ message: "Supabase service role key is missing." }, { status: 500 });

  const formData = await request.formData();
  let payload = servicePayload(formData);
  if (!payload.title || !payload.slug) return NextResponse.json({ message: "Service name is required." }, { status: 400 });
  try {
    payload = await uploadHeroImage(formData, payload.slug, payload);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Hero image upload failed." }, { status: 400 });
  }

  const { data: duplicate } = await supabase.from("services").select("id").eq("slug", payload.slug).maybeSingle();
  if (duplicate) return NextResponse.json({ message: "A service with this slug already exists." }, { status: 409 });

  const { data, error } = await supabase.from("services").insert(payload).select("id, slug").single();
  if (error || !data) return NextResponse.json({ message: error?.message ?? "Service could not be saved." }, { status: 500 });

  try {
    await syncServiceBuilderRows(supabase, data.id, formData);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Service builder content could not be saved." }, { status: 500 });
  }

  revalidateServicePaths(data.slug);
  return NextResponse.json({ message: "Service saved.", serviceId: data.id });
}
