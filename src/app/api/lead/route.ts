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
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return jsonError("Supabase service role key is missing on the server.", 500);
    }

    const formData = await request.formData();
    const name = String(formData.get("name") ?? "").trim();
    const mobile = String(formData.get("mobile") ?? "").trim();
    const service = String(formData.get("service") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();
    const file = formData.get("file");

    if (!name || !mobile || !service) {
      return jsonError("Name, mobile aur service required hai.", 400);
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
        return jsonError("File PDF, JPG ya PNG format me upload karein.", 400);
      }

      if (file.size > maxFileSize) {
        return jsonError("File 5MB se chhoti honi chahiye.", 400);
      }

      const storagePath = `public-leads/${Date.now()}-${cleanFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

      if (uploadError) {
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
      return jsonError(error.message, 500);
    }

    return NextResponse.json({
      message: "Thank you. Hamari team aapse jaldi contact karegi.",
      ok: true,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Lead submit nahi ho paya.", 500);
  }
}
