import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const expected = process.env.CRON_SECRET;

    if (!expected) {
      return NextResponse.json({ message: "CRON_SECRET is not configured." }, { status: 500 });
    }

    if (authHeader !== `Bearer ${expected}`) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ message: "Supabase service role key is missing." }, { status: 500 });
    }

    // Identify files older than 24 hours
    const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: files, error: fetchError } = await supabase
      .from("print_job_files")
      .select("id, job_id, storage_path, file_name")
      .lt("created_at", threshold);

    if (fetchError) {
      console.error("[cron/cleanup-prints] Error querying expired files:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ message: "No expired print files found.", deleted_count: 0 });
    }

    console.info(`[cron/cleanup-prints] Found ${files.length} expired files. Purging...`);

    const deletedPaths: string[] = [];
    const fileRecordIds: string[] = [];

    for (const file of files) {
      // Delete from Supabase Storage
      const { error: deleteStorageError } = await supabase.storage
        .from("print-jobs")
        .remove([file.storage_path]);

      if (deleteStorageError) {
        console.error(`[cron/cleanup-prints] Failed to delete file ${file.storage_path} from storage:`, deleteStorageError);
      } else {
        deletedPaths.push(file.storage_path);
        fileRecordIds.push(file.id);

        // Add log entry in print_job_logs
        await supabase.from("print_job_logs").insert({
          job_id: file.job_id,
          action: "file_purged",
          actor: "cron",
          details: {
            reason: "24-hour retention limit exceeded",
            file_name: file.file_name,
          },
        });
      }
    }

    // Purge records from print_job_files table
    if (fileRecordIds.length > 0) {
      const { error: deleteRecordsError } = await supabase
        .from("print_job_files")
        .delete()
        .in("id", fileRecordIds);

      if (deleteRecordsError) {
        console.error("[cron/cleanup-prints] Failed to delete file database records:", deleteRecordsError);
      }
    }

    return NextResponse.json({
      message: `Successfully purged ${deletedPaths.length} file(s).`,
      deleted_files: deletedPaths,
    });
  } catch (error) {
    console.error("[cron/cleanup-prints] Unexpected error:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
