import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { validateFileSignature } from "@/lib/file-validation";
import { ingestLead } from "@/lib/crm/leads";
import { normalizeLeadMobile } from "@/lib/crm/leads-core";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const allowedFileTypes = ["application/pdf", "image/jpeg", "image/png"];
const maxFileSize = 5 * 1024 * 1024;

function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message, message }, { status });
}

function devLog(message: string, details?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development") {
    console.log(message, details ?? {});
  }
}

export async function POST(request: Request) {
  try {
    const rate = checkRateLimit(`public-lead:${getClientIp(request)}`, 20, 60_000);
    if (!rate.ok) return rateLimitResponse(rate.retryAfter);

    devLog("[api/lead] POST request received");
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      console.error("[api/lead] Missing SUPABASE_SERVICE_ROLE_KEY or Supabase URL");
      return jsonError("Supabase service role key is missing on the server.", 500);
    }

    const formData = await request.formData();
    const name = String(formData.get("name") ?? "").trim();
    const mobile = String(formData.get("mobile") ?? "").trim();
    const service = String(formData.get("service") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();
    const file = formData.get("file");

    devLog("[api/lead] Parsed payload", {
      hasName: Boolean(name),
      mobile: `${normalizeLeadMobile(mobile).slice(0, 2)}******`,
      service,
      hasFile: file instanceof File && file.size > 0,
    });

    if (!name || !mobile || !service) {
      console.error("[api/lead] Validation failed: missing required field");
      return jsonError("Name, mobile number, and service are required.", 400);
    }

    let fileMetadata: {
      file_name: string | null;
      file_url: string | null;
      file_type: string | null;
      storage_path: string | null;
    } = {
      file_name: null,
      file_url: null,
      file_type: null,
      storage_path: null,
    };

    if (file instanceof File && file.size > 0) {
      const validationResult = await validateFileSignature(file, allowedFileTypes);
      if (!validationResult.valid) {
        console.error("[api/lead] Invalid file type or signature", { type: file.type, error: validationResult.error });
        return jsonError(validationResult.error || "File must be uploaded in PDF, JPG, or PNG format.", 400);
      }

      if (file.size > maxFileSize) {
        console.error("[api/lead] File too large", { size: file.size });
        return jsonError("File must be smaller than 5MB.", 400);
      }

      const storagePath = `public-leads/${Date.now()}-${cleanFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

      if (uploadError) {
        console.error("[api/lead] Storage upload failed", uploadError);
        return jsonError(uploadError.message, 500);
      }

      const { data } = supabase.storage.from("documents").getPublicUrl(storagePath);

      fileMetadata = {
        file_name: file.name,
        file_url: data.publicUrl,
        file_type: file.type,
        storage_path: storagePath,
      };
    }

    const ingested = await ingestLead({
      source: "website",
      name,
      mobile,
      service,
      message,
    });

    if (!ingested.ok) {
      return jsonError(ingested.error, ingested.status);
    }

    if (fileMetadata.storage_path) {
      await supabase.from("leads").update(fileMetadata).eq("id", ingested.leadId);
    }

    devLog("[api/lead] Lead ingested", { leadId: ingested.leadId, deduped: ingested.deduped });
    return NextResponse.json({
      message: "Thank you. Our team will contact you shortly.",
      ok: true,
      leadId: ingested.leadId,
      deduped: ingested.deduped,
    });
  } catch (error) {
    console.error("[api/lead] Unhandled error", error);
    return jsonError(error instanceof Error ? error.message : "Lead submission failed.", 500);
  }
}
