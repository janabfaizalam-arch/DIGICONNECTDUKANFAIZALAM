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
      const visits = await purgeOldVisits();
      return NextResponse.json({
        message: "No expired print files found.",
        deleted_count: 0,
        visits_pruned: visits,
      });
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

    const visits = await purgeOldVisits();

    return NextResponse.json({
      message: `Successfully purged ${deletedPaths.length} file(s).`,
      deleted_files: deletedPaths,
      visits_pruned: visits,
    });
  } catch (error) {
    console.error("[cron/cleanup-prints] Unexpected error:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}

/**
 * Visit rows older than six months.
 *
 * Riding along on the print cleanup rather than taking a cron slot of its
 * own: both are "delete what nobody needs any more", both run once a day, and
 * a hosting plan's cron allowance is not worth spending twice on that.
 *
 * Six months is long enough to compare this Diwali with the last, and short
 * enough that a table nobody looks at does not grow forever.
 */
async function purgeOldVisits(): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 0;

  const cutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { error, count } = await supabase
    .from("site_visits")
    .delete({ count: "exact" })
    .lt("visit_day", cutoff);

  if (error) {
    // A missing table is not a failure worth failing the whole job for: the
    // migration may simply not have been applied yet.
    console.error("[cron/cleanup-prints] visit prune failed:", error.message);
    return 0;
  }
  return count ?? 0;
}
