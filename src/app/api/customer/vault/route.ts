import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { resolveCustomerIdForUser } from "@/lib/customer-identity";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ message: "Database connection failed." }, { status: 500 });
    }

    // 1. Get corresponding customer ID
    let customerId: string | null = null;

    try {
      customerId = await resolveCustomerIdForUser(supabase, user);
    } catch (customerError) {
      console.error("[vault-get] Customer fetch error:", customerError);
      return NextResponse.json({ message: "Customer profile lookup failed." }, { status: 500 });
    }

    if (!customerId) {
      // If customer row is missing, check if we have one in profiles or customer_profiles
      return NextResponse.json({ message: "Customer profile not found. Please complete profile first." }, { status: 404 });
    }

    // 2. Check for duplicate query check
    const { searchParams } = new URL(request.url);
    const hashCheck = searchParams.get("hash");

    if (hashCheck) {
      const { data: duplicate, error: duplicateError } = await supabase
        .from("customer_vault_documents")
        .select("id, file_name, file_url, document_type")
        .eq("customer_id", customerId)
        .eq("hash", hashCheck)
        .maybeSingle();

      if (duplicateError) {
        return NextResponse.json({ message: duplicateError.message }, { status: 500 });
      }

      if (duplicate) {
        return NextResponse.json({
          duplicate: true,
          message: "A document with the same content (hash) already exists in your vault.",
          document: duplicate
        });
      }

      return NextResponse.json({ duplicate: false });
    }

    // 3. Fetch all documents & their OCR jobs
    const { data: documents, error: docsError } = await supabase
      .from("customer_vault_documents")
      .select(`
        *,
        vault_ocr_jobs (
          id,
          status,
          extracted_data,
          error_message,
          updated_at
        )
      `)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (docsError) {
      console.error("[vault-get] Documents fetch error:", docsError);
      return NextResponse.json({ message: docsError.message }, { status: 500 });
    }

    return NextResponse.json({ documents: documents || [] });
  } catch (error) {
    console.error("[vault-get] Exception:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ message: "Database connection failed." }, { status: 500 });
    }

    // 1. Get corresponding customer ID
    const customerId = await resolveCustomerIdForUser(supabase, user).catch((customerError) => {
      console.error("[vault-post] Customer fetch error:", customerError);
      return null;
    });

    if (!customerId) {
      return NextResponse.json({ message: "Customer record not found." }, { status: 404 });
    }

    const body = await request.json();
    const { document_type, file_name, file_url, storage_path, file_size, hash, force } = body;

    if (!document_type || !file_name || !file_url || !storage_path || !hash) {
      return NextResponse.json({ message: "Missing required document attributes." }, { status: 400 });
    }

    // 2. Check duplicate hash
    if (!force) {
      const { data: duplicate, error: duplicateError } = await supabase
        .from("customer_vault_documents")
        .select("id, file_name, file_url, document_type")
        .eq("customer_id", customerId)
        .eq("hash", hash)
        .maybeSingle();

      if (duplicateError) {
        return NextResponse.json({ message: duplicateError.message }, { status: 500 });
      }

      if (duplicate) {
        return NextResponse.json({
          duplicate: true,
          message: "A document with the same content (hash) already exists in your vault.",
          document: duplicate
        }, { status: 200 });
      }
    }

    // 3. Insert document record
    const { data: docData, error: docError } = await supabase
      .from("customer_vault_documents")
      .insert({
        customer_id: customerId,
        document_type,
        file_name,
        file_url,
        storage_path,
        file_size: typeof file_size === "number" ? file_size : null,
        hash
      })
      .select()
      .maybeSingle();

    if (docError || !docData) {
      console.error("[vault-post] Insert error:", docError);
      return NextResponse.json({ message: docError?.message || "Failed to register document." }, { status: 500 });
    }

    // 4. Create OCR Job entry in 'uploaded' state
    const { data: ocrJob, error: ocrError } = await supabase
      .from("vault_ocr_jobs")
      .insert({
        document_id: docData.id,
        status: "uploaded",
        extracted_data: {}
      })
      .select()
      .maybeSingle();

    if (ocrError) {
      console.error("[vault-post] OCR job creation error:", ocrError);
      // We don't rollback document insert, but return warning/success
    }

    return NextResponse.json({
      message: "Document successfully uploaded and registered in vault.",
      document: docData,
      ocr_job: ocrJob || null
    }, { status: 201 });
  } catch (error) {
    console.error("[vault-post] Exception:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("id");

    if (!documentId) {
      return NextResponse.json({ message: "Missing document ID." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ message: "Database connection failed." }, { status: 500 });
    }

    // Verify ownership
    const customerId = await resolveCustomerIdForUser(supabase, user).catch((customerError) => {
      console.error("[vault-delete] Customer fetch error:", customerError);
      return null;
    });

    if (!customerId) {
      return NextResponse.json({ message: "Customer profile not found." }, { status: 404 });
    }

    const { data: doc, error: docError } = await supabase
      .from("customer_vault_documents")
      .select("id, storage_path, customer_id")
      .eq("id", documentId)
      .eq("customer_id", customerId)
      .maybeSingle();

    if (docError || !doc) {
      return NextResponse.json({ message: "Document not found or access denied." }, { status: 404 });
    }

    // Delete from storage
    if (doc.storage_path) {
      const { error: storageError } = await supabase.storage
        .from("application-documents")
        .remove([doc.storage_path]);
      if (storageError) {
        console.warn("[vault-delete] Warning: Storage deletion failed:", storageError);
      }
    }

    // Delete row (associated ocr_job is deleted via cascade)
    const { error: deleteError } = await supabase
      .from("customer_vault_documents")
      .delete()
      .eq("id", documentId);

    if (deleteError) {
      console.error("[vault-delete] Delete error:", deleteError);
      return NextResponse.json({ message: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Document deleted successfully." });
  } catch (error) {
    console.error("[vault-delete] Exception:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
