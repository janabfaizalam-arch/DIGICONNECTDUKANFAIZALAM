import { NextResponse } from "next/server";

import { getCurrentUser, isActiveAgent } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const leadStatuses = ["new", "contacted", "converted", "closed", "in_progress", "completed", "lead_submitted", "payment_pending", "payment_verified", "documents_under_review", "documents_required", "application_processing", "submitted_to_department", "under_government_review", "rejected", "cancelled"] as const;

function jsonError(message: string, status: number) {
  return NextResponse.json({ message, error: message }, { status });
}

function normalizeMobile(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

async function uploadAgentFile(supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>, agentId: string, file: File, folder: string) {
  const path = `${agentId}/agent-leads/${folder}/${Date.now()}-${cleanFileName(file.name)}`;
  const bytes = await file.arrayBuffer();
  const { error } = await supabase.storage.from("documents").upload(path, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });

  if (error) throw error;

  const { data } = supabase.storage.from("documents").getPublicUrl(path);
  return {
    name: file.name,
    type: file.type || null,
    path,
    url: data.publicUrl,
  };
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user || !(await isActiveAgent(user))) {
      return jsonError("Agent access required.", 403);
    }

    const supabase = getSupabaseAdmin();

    if (!supabase) {
      console.error("[agent-leads] Supabase service role key is missing.");
      return jsonError("Customer could not be added right now.", 500);
    }

    const formData = await request.formData();
    const customerName = String(formData.get("customerName") ?? "").trim();
    const mobile = normalizeMobile(String(formData.get("mobile") ?? ""));
    const service = String(formData.get("service") ?? "").trim();
    const city = String(formData.get("city") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();
    const paymentAmount = Number(formData.get("paymentAmount") ?? 0);
    const paymentMethod = String(formData.get("paymentMethod") ?? "").trim();
    const paymentReference = String(formData.get("paymentReference") ?? "").trim();
    const documentFiles = formData.getAll("documents").filter((file): file is File => file instanceof File && file.size > 0);
    const paymentProof = formData.get("paymentProof");

    if (!customerName || !mobile || !service) {
      return jsonError("Customer name, mobile number, and service are required.", 400);
    }

    if (!/^\d{10}$/.test(mobile)) {
      return jsonError("Enter a valid 10 digit mobile number.", 400);
    }

    let uploadedDocuments: Awaited<ReturnType<typeof uploadAgentFile>>[] = [];
    let uploadedPaymentProof: Awaited<ReturnType<typeof uploadAgentFile>> | null = null;

    try {
      uploadedDocuments = await Promise.all(documentFiles.map((file) => uploadAgentFile(supabase, user.id, file, "documents")));
      if (paymentProof instanceof File && paymentProof.size > 0) {
        uploadedPaymentProof = await uploadAgentFile(supabase, user.id, paymentProof, "payments");
      }
    } catch (uploadError) {
      console.error("[agent-leads] File upload failed.", uploadError);
      return jsonError("Files could not be uploaded.", 500);
    }

    const paymentStatus = uploadedPaymentProof || paymentReference || paymentAmount > 0 ? "submitted" : "pending";
    const firstDocument = uploadedDocuments[0] ?? null;

    const { error: leadError } = await supabase.from("leads").insert({
      name: customerName,
      customer_name: customerName,
      mobile,
      service,
      city,
      address,
      message: notes,
      notes,
      status: "lead_submitted",
      payment_status: paymentStatus,
      payment_amount: Number.isFinite(paymentAmount) ? paymentAmount : 0,
      payment_method: paymentMethod || null,
      payment_reference: paymentReference || null,
      payment_proof_url: uploadedPaymentProof?.url ?? null,
      payment_proof_path: uploadedPaymentProof?.path ?? null,
      documents: uploadedDocuments,
      file_name: firstDocument?.name ?? null,
      file_url: firstDocument?.url ?? null,
      file_type: firstDocument?.type ?? null,
      storage_path: firstDocument?.path ?? null,
      agent_id: user.id,
    });

    if (leadError) {
      console.error("[agent-leads] Lead insert failed.", leadError.message);
      return jsonError("Customer could not be added.", 500);
    }

    const { error: customerError } = await supabase.from("customers").insert({
      full_name: customerName,
      mobile,
      email: null,
      city,
      address: address || city,
      notes: notes || service,
      source: "agent_pos",
      created_by: user.id,
      assigned_agent_id: user.id,
    });

    if (customerError) {
      console.error("[agent-leads] Customer insert failed.", customerError.message);
    }

    return NextResponse.json({ message: "Customer added successfully." });
  } catch (error) {
    console.error("[agent-leads] Lead create failed.", error);
    return jsonError("Customer could not be added.", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user || !(await isActiveAgent(user))) {
      return jsonError("Agent access required.", 403);
    }

    const supabase = getSupabaseAdmin();

    if (!supabase) {
      console.error("[agent-leads] Supabase service role key is missing.");
      return jsonError("Lead status could not be updated.", 500);
    }

    const body = (await request.json()) as { id?: string; status?: string };

    if (!body.id || !body.status || !leadStatuses.includes(body.status as never)) {
      return jsonError("Invalid lead status update.", 400);
    }

    const { error } = await supabase
      .from("leads")
      .update({ status: body.status })
      .eq("id", body.id)
      .eq("agent_id", user.id);

    if (error) {
      console.error("[agent-leads] Status update failed.", error.message);
      return jsonError("Lead status could not be updated.", 500);
    }

    return NextResponse.json({ message: "Lead status updated successfully." });
  } catch (error) {
    console.error("[agent-leads] Status update failed.", error);
    return jsonError("Lead status could not be updated.", 500);
  }
}
