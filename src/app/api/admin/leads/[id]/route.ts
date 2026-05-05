import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { getServiceBySlug, portalServices } from "@/lib/portal-data";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const leadStatuses = ["new", "contacted", "converted", "closed"] as const;

function slugify(value: string) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
}

async function requireAdmin() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);

  if (!user) return { user: null, error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  if (!isAdminRole(role)) return { user: null, error: NextResponse.json({ message: "Admin access required." }, { status: 403 }) };
  return { user, error: null };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { status?: string; convert?: boolean };
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json({ message: "Supabase service role key is missing." }, { status: 500 });
  }

  if (body.convert) {
    const { data: lead } = await supabase
      .from("leads")
      .select("id, name, mobile, service, message, status, file_name, file_url, file_type, storage_path, created_at")
      .eq("id", id)
      .single();

    if (!lead) {
      return NextResponse.json({ message: "Lead not found." }, { status: 404 });
    }

    const service = getServiceBySlug(slugify(lead.service)) ?? portalServices.find((item) => item.title.toLowerCase() === String(lead.service).toLowerCase());
    const { data: customer } = await supabase
      .from("customers")
      .insert({
        full_name: lead.name,
        mobile: lead.mobile,
        email: "",
        notes: lead.message ?? "",
        source: "offline",
        created_by: auth.user?.id ?? null,
      })
      .select("id")
      .single();

    const { data: application, error: applicationError } = await supabase
      .from("applications")
      .insert({
        user_id: null,
        customer_id: customer?.id ?? null,
        created_by: auth.user?.id ?? null,
        service_slug: service?.slug ?? slugify(lead.service),
        service_name: lead.service,
        amount: service?.amount ?? 0,
        form_data: {
          name: lead.name,
          mobile: lead.mobile,
          message: lead.message ?? "",
          sourceLeadId: lead.id,
        },
        source: "offline",
        status: "new",
        payment_status: "pending",
      })
      .select("id")
      .single();

    if (applicationError || !application) {
      return NextResponse.json({ message: "Lead could not be converted." }, { status: 500 });
    }

    await supabase
      .from("leads")
      .update({ status: "converted", converted_application_id: application.id, updated_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json({ message: "Lead converted to application.", applicationId: application.id });
  }

  if (!body.status || !leadStatuses.includes(body.status as never)) {
    return NextResponse.json({ message: "Invalid lead status." }, { status: 400 });
  }

  const { error } = await supabase
    .from("leads")
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ message: "Lead could not be updated." }, { status: 500 });
  }

  return NextResponse.json({ message: "Lead updated." });
}
