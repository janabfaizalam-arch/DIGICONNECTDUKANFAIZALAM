import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user || !isAdminRole(role)) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const formData = await request.formData();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const mobile = String(formData.get("mobile") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!fullName || !mobile) {
    return NextResponse.json({ message: "Name and mobile are required." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json({ message: "Supabase service role key is missing." }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({
      full_name: fullName,
      mobile,
      email,
      address,
      notes,
      source: "offline",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ message: error?.message ?? "Customer could not be created." }, { status: 500 });
  }

  return NextResponse.json({ message: "Customer added.", customerId: data.id });
}
