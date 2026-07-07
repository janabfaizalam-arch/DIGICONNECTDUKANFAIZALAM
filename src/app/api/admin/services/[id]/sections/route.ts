import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
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

  const { data, error } = await supabase
    .from("service_sections")
    .select("*")
    .eq("service_id", id)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

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
  const { sections } = await request.json();

  if (!Array.isArray(sections)) {
    return NextResponse.json({ message: "sections must be an array." }, { status: 400 });
  }

  // Delete current sections for this service to reload/upsert them
  const { error: deleteError } = await supabase
    .from("service_sections")
    .delete()
    .eq("service_id", id);

  if (deleteError) {
    return NextResponse.json({ message: deleteError.message }, { status: 500 });
  }

  if (sections.length === 0) {
    return NextResponse.json({ message: "Sections cleared successfully." });
  }

  const rowsToInsert = sections.map((sec, idx) => ({
    service_id: id,
    section_type: sec.section_type,
    title: sec.title || null,
    subtitle: sec.subtitle || null,
    content: sec.content || {},
    sort_order: sec.sort_order !== undefined ? sec.sort_order : (idx + 1) * 10,
    is_active: sec.is_active !== false,
  }));

  const { data, error } = await supabase
    .from("service_sections")
    .insert(rowsToInsert)
    .select();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Sections saved successfully.", data });
}
