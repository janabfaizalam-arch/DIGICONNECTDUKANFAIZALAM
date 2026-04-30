import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAgentRole } from "@/lib/auth";
import { calculateCommission, cleanFileName, createInvoiceForApplication } from "@/lib/crm";
import { createInvoiceNumber } from "@/lib/portal-data";
import type { PortalUser, ServiceCatalogItem } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const allowedFileTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const maxFileSize = 5 * 1024 * 1024;

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

function validateFile(file: File, label: string) {
  if (!allowedFileTypes.includes(file.type)) {
    return `${label} must be PDF, JPG, PNG, or WEBP.`;
  }

  if (file.size > maxFileSize) {
    return `${label} must be smaller than 5MB.`;
  }

  return null;
}

async function uploadFile(applicationId: string, ownerId: string, file: File, folder: string) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase service role key is missing.");
  }

  const path = `${ownerId}/${applicationId}/${folder}/${Date.now()}-${cleanFileName(file.name)}`;
  const bytes = await file.arrayBuffer();
  const { error } = await supabase.storage.from("documents").upload(path, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from("documents").getPublicUrl(path);

  return {
    file_name: file.name,
    file_url: data.publicUrl,
    file_type: file.type,
    storage_path: path,
  };
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const role = await getCurrentUserRole(user);

    if (!user || !isAgentRole(role)) {
      return jsonError("Agent access required.", 403);
    }

    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return jsonError("Supabase service role key is missing.", 500);
    }

    const formData = await request.formData();
    const customerId = String(formData.get("customerId") ?? "").trim();
    const serviceId = String(formData.get("serviceId") ?? "").trim();
    const customerName = String(formData.get("customerName") ?? "").trim();
    const mobile = String(formData.get("mobile") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const city = String(formData.get("city") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();
    const paymentScreenshot = formData.get("paymentScreenshot");
    const documentFiles = formData.getAll("documents").filter((value): value is File => value instanceof File && value.size > 0);

    if (!serviceId) {
      return jsonError("Service is required.", 400);
    }

    if (!customerId && (!customerName || !mobile)) {
      return jsonError("Customer name and mobile are required.", 400);
    }

    if (!(paymentScreenshot instanceof File) || paymentScreenshot.size === 0) {
      return jsonError("Payment screenshot is required.", 400);
    }

    const paymentValidation = validateFile(paymentScreenshot, "Payment screenshot");

    if (paymentValidation) {
      return jsonError(paymentValidation, 400);
    }

    for (const file of documentFiles) {
      const validation = validateFile(file, file.name);

      if (validation) {
        return jsonError(validation, 400);
      }
    }

    const { data: service } = await supabase
      .from("service_catalog")
      .select("id, slug, name, description, amount, commission_amount, commission_rate, required_documents, active")
      .eq("id", serviceId)
      .single();

    if (!service) {
      return jsonError("Service not found.", 404);
    }

    let resolvedCustomerId = customerId;
    let customer = null as { id: string; full_name: string; mobile: string; email: string | null; city: string | null } | null;

    if (resolvedCustomerId) {
      const { data } = await supabase
        .from("customers")
        .select("id, full_name, mobile, email, city")
        .eq("id", resolvedCustomerId)
        .single();
      customer = data;
    } else {
      const { data, error } = await supabase
        .from("customers")
        .insert({
          full_name: customerName,
          mobile,
          email,
          city,
          source: "agent_pos",
          created_by: user.id,
          assigned_agent_id: user.id,
        })
        .select("id, full_name, mobile, email, city")
        .single();

      if (error || !data) {
        return jsonError("Customer could not be created.", 500);
      }

      customer = data;
      resolvedCustomerId = data.id;
    }

    if (!customer) {
      return jsonError("Customer not found.", 404);
    }

    const { data: agent } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url, role, mobile, commission_rate, active")
      .eq("id", user.id)
      .maybeSingle();
    const commissionAmount = calculateCommission(service as ServiceCatalogItem, agent as PortalUser | null);
    const invoiceNumber = createInvoiceNumber();

    const { data: application, error: applicationError } = await supabase
      .from("applications")
      .insert({
        customer_id: resolvedCustomerId,
        created_by: user.id,
        assigned_agent_id: user.id,
        service_id: service.id,
        service_slug: service.slug,
        service_name: service.name,
        amount: service.amount,
        form_data: {
          name: customer.full_name,
          mobile: customer.mobile,
          email: customer.email ?? "",
          city: customer.city ?? "",
          message,
          invoiceNumber,
        },
        status: "new",
        payment_status: "pending",
        source: "agent_pos",
        commission_amount: commissionAmount,
        submitted_by_role: role,
      })
      .select("id")
      .single();

    if (applicationError || !application) {
      return jsonError("Application could not be created.", 500);
    }

    const uploadedPayment = await uploadFile(application.id, user.id, paymentScreenshot, "payments");
    await supabase
      .from("applications")
      .update({
        payment_screenshot_url: uploadedPayment.file_url,
        payment_screenshot_path: uploadedPayment.storage_path,
      })
      .eq("id", application.id);

    if (documentFiles.length > 0) {
      const uploadedDocuments = await Promise.all(
        documentFiles.map(async (file) => ({
          ...(await uploadFile(application.id, user.id, file, "documents")),
          application_id: application.id,
          uploaded_by: user.id,
          document_type: "Customer Document",
        })),
      );

      await supabase.from("application_documents").insert(uploadedDocuments);
    }

    await supabase.from("payments").insert({
      application_id: application.id,
      user_id: user.id,
      amount: service.amount,
      status: "pending",
      screenshot_url: uploadedPayment.file_url,
      storage_path: uploadedPayment.storage_path,
    });

    const invoice = await createInvoiceForApplication({
      applicationId: application.id,
      customerId: resolvedCustomerId,
      customerName: customer.full_name,
      customerEmail: customer.email,
      customerMobile: customer.mobile,
      serviceName: service.name,
      amount: service.amount,
      paymentStatus: "pending",
    });

    await supabase.from("commissions").insert({
      application_id: application.id,
      agent_id: user.id,
      service_id: service.id,
      amount: commissionAmount,
      status: "pending",
    });

    await supabase.from("status_logs").insert({
      application_id: application.id,
      changed_by: user.id,
      new_status: "new",
      note: "Application created by agent.",
    });

    return NextResponse.json({
      message: "Application created successfully.",
      applicationId: application.id,
      invoiceId: invoice?.id,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Application could not be created.", 500);
  }
}
