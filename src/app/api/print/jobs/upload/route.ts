import crypto from "crypto";
import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { validateFileSignature } from "@/lib/file-validation";

/*
  What a phone actually hands over.

  The counter page promises "PDF, photo or Word", and a photo off a phone is
  very often a .webp — WhatsApp and Android screenshots both produce them. It
  was refused with "Invalid file extension", which reads to a customer as the
  site being broken. The signature validator has understood webp all along;
  only these two lists had not caught up.
*/
const ALLOWED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "webp", "docx"];
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`print-upload:${ip}`, 10, 60_000); // 10 uploads per min

    if (!rateLimit.ok) {
      return rateLimitResponse(rateLimit.retryAfter);
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size exceeds 20MB limit" }, { status: 400 });
    }

    // Validate extension & mime type
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
      return NextResponse.json(
        { error: "That file type cannot be printed. Send a PDF, a photo (JPG, PNG or WEBP), or a Word file." },
        { status: 400 }
      );
    }

    const validationResult = await validateFileSignature(file, ALLOWED_MIME_TYPES);
    if (!validationResult.valid) {
      return NextResponse.json(
        { error: validationResult.error || "Invalid file signature/content type." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase service role configuration is missing" }, { status: 500 });
    }

    const fileId = crypto.randomUUID();
    const storagePath = `uploads/${fileId}/${file.name}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("print-jobs")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[print/upload] Storage upload failed:", uploadError);
      return NextResponse.json({ error: "Failed to upload file to storage" }, { status: 500 });
    }

    // Auto-detect PDF page count
    let detectedPages = 1;
    if (file.type === "application/pdf") {
      try {
        const pdfText = buffer.toString("binary");
        const pageMatches = pdfText.match(/\/Type\s*\/Page\b/g);
        if (pageMatches && pageMatches.length > 0) {
          detectedPages = pageMatches.length;
        }
      } catch (pdfError) {
        console.warn("[print/upload] PDF page count extraction failed:", pdfError);
      }
    }

    return NextResponse.json({
      storage_path: storagePath,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      pages: detectedPages,
    });
  } catch (error) {
    console.error("[print/upload] Error processing request:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
