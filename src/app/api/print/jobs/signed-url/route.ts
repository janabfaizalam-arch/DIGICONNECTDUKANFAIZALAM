import { NextResponse } from "next/server";

import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type SignedUrlBody = {
  job_id?: string;
};

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const isAdmin = isAdminUser(user);

    if (!user || !isAdmin) {
      return NextResponse.json({ error: "Unauthorized. Admin privileges required." }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as SignedUrlBody | null;
    const jobId = String(body?.job_id ?? "").trim();

    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase service role configuration is missing" }, { status: 500 });
    }

    // Fetch print job file details
    const { data: file, error: fileError } = await supabase
      .from("print_job_files")
      .select("*")
      .eq("job_id", jobId)
      .maybeSingle();

    if (fileError || !file) {
      console.error("[print/signed-url] File not found:", fileError);
      return NextResponse.json({ error: "Print job file not found or already purged" }, { status: 404 });
    }

    // Generate signed URL (valid for 5 minutes / 300 seconds)
    const { data: signedData, error: signedError } = await supabase.storage
      .from("print-jobs")
      .createSignedUrl(file.storage_path, 300);

    if (signedError || !signedData?.signedUrl) {
      console.error("[print/signed-url] Failed to create signed URL:", signedError);
      return NextResponse.json({ error: "Failed to generate secure download link" }, { status: 500 });
    }

    return NextResponse.json({
      signed_url: signedData.signedUrl,
      file_name: file.file_name,
    });
  } catch (error) {
    console.error("[print/signed-url] Unexpected error:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
