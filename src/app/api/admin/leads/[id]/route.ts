import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { scheduleCrmSync } from "@/lib/crmSync";
import { calculateCommission, getAgents, getServiceCatalog } from "@/lib/crm";
import { getServiceBySlug, portalServices } from "@/lib/portal-data";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const leadStatuses = ["new", "contacted", "converted", "closed", "lead_submitted", "payment_pending", "payment_verified", "documents_under_review", "documents_required", "application_processing", "submitted_to_department", "under_government_review", "rejected", "cancelled"] as const;

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
      .select("id, name, mobile, service, message, notes, status, file_name, file_url, file_type, storage_path, address, agent_id, payment_status, payment_amount, payment_method, payment_reference, payment_proof_url, payment_proof_path, documents, created_at")
      .eq("id", id)
      .single();

    if (!lead) {
      return NextResponse.json({ message: "Lead not found." }, { status: 404 });
    }

    const service = getServiceBySlug(slugify(lead.service)) ?? portalServices.find((item) => item.title.toLowerCase() === String(lead.service).toLowerCase());
    const serviceCatalog = await getServiceCatalog();
    const catalogService = serviceCatalog.find((item) => item.slug === service?.slug || item.name.toLowerCase() === String(lead.service).toLowerCase());
    const agents = lead.agent_id ? await getAgents() : [];
    const agent = agents.find((item) => item.id === lead.agent_id);
    const { data: customer } = await supabase
      .from("customers")
      .insert({
        full_name: lead.name,
        mobile: lead.mobile,
        email: "",
        address: lead.address ?? "",
        notes: lead.notes ?? lead.message ?? "",
        source: lead.agent_id ? "agent_pos" : "offline",
        created_by: auth.user?.id ?? null,
        assigned_agent_id: lead.agent_id ?? null,
      })
      .select("id")
      .single();

    const { data: application, error: applicationError } = await supabase
      .from("applications")
      .insert({
        user_id: null,
        customer_id: customer?.id ?? null,
        created_by: auth.user?.id ?? null,
        agent_id: lead.agent_id ?? null,
        assigned_agent_id: lead.agent_id ?? null,
        service_slug: service?.slug ?? slugify(lead.service),
        service_name: lead.service,
        amount: service?.amount ?? 0,
        form_data: {
          name: lead.name,
          mobile: lead.mobile,
          address: lead.address ?? "",
          message: lead.notes ?? lead.message ?? "",
          sourceLeadId: lead.id,
        },
        source: lead.agent_id ? "agent_pos" : "offline",
        status: lead.payment_status === "verified" ? "payment_verified" : "lead_submitted",
        payment_status: lead.payment_status ?? "pending",
        payment_screenshot_url: lead.payment_proof_url ?? null,
        payment_screenshot_path: lead.payment_proof_path ?? null,
        commission_amount: catalogService ? calculateCommission(catalogService, agent) : 0,
      })
      .select("id, customer_id")
      .single();

    if (applicationError || !application) {
      return NextResponse.json({ message: "Lead could not be converted." }, { status: 500 });
    }

    const leadDocuments = Array.isArray(lead.documents)
      ? lead.documents.filter((item): item is { name?: string; type?: string | null; path?: string; url?: string } => Boolean(item && typeof item === "object"))
      : [];
    const documentsToInsert = leadDocuments.length
      ? leadDocuments.map((document) => ({
          application_id: application.id,
          user_id: lead.agent_id ?? auth.user?.id,
          document_type: "agent_uploaded_document",
          file_name: document.name ?? "Lead document",
          file_url: document.url,
          file_type: document.type ?? null,
          storage_path: document.path,
          review_status: "pending",
        }))
      : lead.file_url
        ? [{
        application_id: application.id,
        user_id: lead.agent_id ?? auth.user?.id,
        document_type: "agent_uploaded_document",
        file_name: lead.file_name ?? "Lead document",
        file_url: lead.file_url,
        file_type: lead.file_type,
        storage_path: lead.storage_path,
        review_status: "pending",
      }]
        : [];

    if (documentsToInsert.length) {
      await supabase.from("application_documents").insert(documentsToInsert);
    }

    await supabase
      .from("leads")
      .update({ status: "converted", converted_application_id: application.id, updated_at: new Date().toISOString() })
      .eq("id", id);

    await scheduleCrmSync(application.id, "application_created", { customerId: application.customer_id });

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
