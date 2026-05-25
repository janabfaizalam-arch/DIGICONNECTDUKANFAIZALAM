import { NextResponse } from "next/server";
import { getAdminApplicationDetail } from "@/lib/admin-crm";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * TEMPORARY DEBUG ROUTE — DELETE AFTER VERIFICATION
 *
 * This endpoint performs a live end-to-end document upload test:
 * 1. Creates a test application row
 * 2. Uploads a small test file to Supabase Storage (documents bucket)
 * 3. Inserts a row into application_documents
 * 4. Queries the row back
 * 5. Generates a signed URL for the uploaded file
 * 6. Returns ALL results as JSON
 */
export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin not configured" }, { status: 500 });
  }

  const results: Record<string, unknown> = {};
  const testId = crypto.randomUUID();

  try {
    // Step 1: Create test application
    const { data: app, error: appError } = await supabase
      .from("applications")
      .insert({
        id: testId,
        service_name: "DEBUG_DOC_TEST",
        service_slug: "debug-doc-test",
        status: "payment_pending",
        payment_status: "pending",
        amount: 0,
        total_amount: 0,
        form_data: { name: "Doc Test", mobile: "0000000000", email: "debug@test.local" },
        source: "online",
      })
      .select("id, service_name, status, created_at")
      .single();

    results.step1_create_application = appError
      ? { error: appError.message, code: appError.code }
      : { success: true, application: app };

    if (appError) {
      return NextResponse.json(results, { status: 500 });
    }

    // Step 2: Upload test file to storage
    const testFileContent = new Blob(
      ["%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj\ntest-" + Date.now()],
      { type: "application/pdf" }
    );
    const storagePath = `applications/${testId}/customer-documents/${Date.now()}-0-test-document.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, testFileContent, {
        contentType: "application/pdf",
        upsert: false,
      });

    results.step2_upload_to_storage = uploadError
      ? { error: uploadError.message, storagePath }
      : { success: true, storagePath, bucket: "documents" };

    if (uploadError) {
      // Cleanup app row
      await supabase.from("applications").delete().eq("id", testId);
      return NextResponse.json(results, { status: 500 });
    }

    // Step 3: Generate signed URL for the uploaded file
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("documents")
      .createSignedUrl(storagePath, 60 * 60);

    results.step3_signed_url = signedUrlError
      ? { error: signedUrlError.message }
      : { success: true, signedUrl: signedUrlData?.signedUrl?.slice(0, 120) + "..." };

    // Step 4: Insert into application_documents
    const now = new Date().toISOString();
    const { data: docRow, error: docError } = await supabase
      .from("application_documents")
      .insert({
        application_id: testId,
        document_type: "customer_document",
        document_name: "Test Document",
        file_name: "test-document.pdf",
        file_type: "application/pdf",
        file_size: testFileContent.size,
        storage_path: storagePath,
        file_url: signedUrlData?.signedUrl ?? "",
        status: "pending",
        review_status: "pending",
        uploaded_by_role: "customer",
        is_final: false,
        uploaded_at: now,
        created_at: now,
      })
      .select("id, application_id, file_name, file_url, storage_path, file_type, uploaded_by, created_at, uploaded_at")
      .single();

    results.step4_insert_application_documents = docError
      ? { error: docError.message, code: docError.code }
      : { success: true, row: docRow };

    // Step 5: Query back from application_documents
    const { data: queryRows, error: queryError } = await supabase
      .from("application_documents")
      .select("id, application_id, file_name, file_url, storage_path, file_type, uploaded_by, created_at, uploaded_at")
      .eq("application_id", testId)
      .order("created_at", { ascending: false });

    results.step5_query_application_documents = queryError
      ? { error: queryError.message }
      : {
          success: true,
          row_count: queryRows?.length ?? 0,
          rows: (queryRows ?? []).map((r) => ({
            ...r,
            file_url: r.file_url ? r.file_url.slice(0, 80) + "..." : null,
          })),
        };

    // Step 6: Re-resolve signed URL using the same logic as resolveDocumentUrls
    const bucketCheck = storagePath.startsWith("applications/") ||
                        storagePath.startsWith("application-documents/") ||
                        storagePath.startsWith("final-documents/")
      ? "documents"
      : "application-documents";

    const { data: resolvedUrl, error: resolvedError } = await supabase.storage
      .from(bucketCheck)
      .createSignedUrl(storagePath, 60 * 60);

    results.step6_resolve_document_url = resolvedError
      ? { error: resolvedError.message, bucket: bucketCheck }
      : {
          success: true,
          bucket: bucketCheck,
          resolvedUrl: resolvedUrl?.signedUrl?.slice(0, 120) + "...",
        };

    const adminDetail = await getAdminApplicationDetail(testId);
    results.step7_admin_document_contract = {
      success: Boolean(adminDetail?.documents?.length),
      applicationId: testId,
      documentCount: adminDetail?.documents?.length ?? 0,
      documents: (adminDetail?.documents ?? []).map((document) => ({
        file_name: document.file_name,
        file_type: document.file_type,
        storage_path: document.storage_path,
        has_signed_url: Boolean(document.signed_url || document.file_url),
        source: document.source,
      })),
    };

    await supabase.from("application_documents").delete().eq("application_id", testId);
    await supabase.storage.from("documents").remove([storagePath]);
    await supabase.from("applications").delete().eq("id", testId);
    results.step8_cleanup = { success: true, message: "Test rows and file cleaned up" };

    results.verdict = "ALL_STEPS_PASSED";

  } catch (err) {
    results.unexpected_error = String(err);
    // Best-effort cleanup
    try {
      await supabase.from("application_documents").delete().eq("application_id", testId);
      await supabase.from("applications").delete().eq("id", testId);
    } catch { /* ignore */ }
  }

  return NextResponse.json(results, { status: 200 });
}
