import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import {
  ADMIN_FINAL_SIGNED_URL_TTL_SECONDS,
  createFinalDocumentSignedUrl,
  resolveDocumentStorageBucket,
} from "@/lib/documents/final-document-storage";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isMissingColumnError } from "@/lib/supabase/schema-compat";

type FinalDocRow = {
  id: string;
  application_id: string;
  storage_path: string | null;
  storage_bucket?: string | null;
  file_name: string | null;
  document_name: string | null;
  is_final: boolean | null;
  document_type: string | null;
  metadata: Record<string, unknown> | null;
};

/**
 * On-demand admin preview/download URL for final documents.
 * Does not persist the signed URL.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const { id: applicationId } = await params;
  const documentId = new URL(request.url).searchParams.get("documentId");
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ message: "Storage unavailable." }, { status: 500 });
  }

  const fullSelect =
    "id, application_id, storage_path, storage_bucket, file_name, document_name, is_final, document_type, metadata";
  const legacySelect = "id, application_id, storage_path, file_name, document_name, is_final, document_type, metadata";

  let document: FinalDocRow | null = null;

  if (documentId) {
    const primary = await supabase
      .from("application_documents")
      .select(fullSelect)
      .eq("application_id", applicationId)
      .eq("id", documentId)
      .maybeSingle();
    if (primary.error && isMissingColumnError(primary.error)) {
      const legacy = await supabase
        .from("application_documents")
        .select(legacySelect)
        .eq("application_id", applicationId)
        .eq("id", documentId)
        .maybeSingle();
      document = (legacy.data as FinalDocRow | null) ?? null;
    } else {
      document = (primary.data as FinalDocRow | null) ?? null;
    }
  } else {
    const primary = await supabase
      .from("application_documents")
      .select(fullSelect)
      .eq("application_id", applicationId)
      .or("is_final.eq.true,document_type.eq.final_document")
      .order("created_at", { ascending: false })
      .limit(1);
    if (primary.error && isMissingColumnError(primary.error)) {
      const legacy = await supabase
        .from("application_documents")
        .select(legacySelect)
        .eq("application_id", applicationId)
        .or("is_final.eq.true,document_type.eq.final_document")
        .order("created_at", { ascending: false })
        .limit(1);
      document = ((legacy.data as FinalDocRow[] | null)?.[0] ?? null);
    } else {
      document = ((primary.data as FinalDocRow[] | null)?.[0] ?? null);
    }
  }

  if (!document?.storage_path) {
    const { data: application } = await supabase
      .from("applications")
      .select("id, final_document_path, completed_document_storage_path, final_document_name")
      .eq("id", applicationId)
      .maybeSingle();
    const legacyPath = application?.final_document_path || application?.completed_document_storage_path;
    if (!legacyPath) {
      return NextResponse.json({ message: "Final document not found." }, { status: 404 });
    }
    const signed = await createFinalDocumentSignedUrl({
      bucket: resolveDocumentStorageBucket({
        storage_path: String(legacyPath),
        is_final: true,
        document_type: "final_document",
      }),
      storagePath: String(legacyPath),
      expiresInSeconds: ADMIN_FINAL_SIGNED_URL_TTL_SECONDS,
    });
    if (!signed.ok) {
      return NextResponse.json({ message: signed.error }, { status: 500 });
    }
    return NextResponse.json({
      url: signed.signedUrl,
      expiresInSeconds: signed.expiresInSeconds,
      fileName: application?.final_document_name || "final-document.pdf",
    });
  }

  const isFinal = Boolean(document.is_final) || document.document_type === "final_document";
  if (!isFinal) {
    return NextResponse.json({ message: "Document is not a final document." }, { status: 400 });
  }

  const bucket = resolveDocumentStorageBucket(document);
  let signed = await createFinalDocumentSignedUrl({
    bucket,
    storagePath: document.storage_path,
    expiresInSeconds: ADMIN_FINAL_SIGNED_URL_TTL_SECONDS,
  });

  if (!signed.ok && bucket !== "documents") {
    signed = await createFinalDocumentSignedUrl({
      bucket: "documents",
      storagePath: document.storage_path,
      expiresInSeconds: ADMIN_FINAL_SIGNED_URL_TTL_SECONDS,
    });
  }

  if (!signed.ok) {
    return NextResponse.json({ message: signed.error }, { status: 500 });
  }

  return NextResponse.json({
    url: signed.signedUrl,
    expiresInSeconds: signed.expiresInSeconds,
    fileName: document.document_name || document.file_name || "final-document.pdf",
    documentId: document.id,
  });
}
