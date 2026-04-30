import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

const allowedFileTypes = ["application/pdf", "image/jpeg", "image/png"];
const maxFileSize = 5 * 1024 * 1024;

function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message, message }, { status });
}

export async function POST(request: Request) {
  try {
    console.log("[api/lead] POST request received");
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

    console.log("[api/lead] Parsed payload", {
      hasName: Boolean(name),
      mobile,
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
      if (!allowedFileTypes.includes(file.type)) {
        console.error("[api/lead] Invalid file type", { type: file.type });
        return jsonError("File must be uploaded in PDF, JPG, or PNG format.", 400);
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

    const { error } = await supabase.from("leads").insert({
      name,
      mobile,
      service,
      message,
      status: "new",
      ...fileMetadata,
    });

    if (error) {
      console.error("[api/lead] Lead insert failed", error);
      return jsonError(error.message, 500);
    }

    console.log("[api/lead] Lead inserted successfully", { mobile, service });
    return NextResponse.json({
      message: "Thank you. Our team will contact you shortly.",
      ok: true,
    });
  } catch (error) {
    console.error("[api/lead] Unhandled error", error);
    return jsonError(error instanceof Error ? error.message : "Lead submission failed.", 500);
  }
}
