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

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("document_id");

    if (!documentId) {
      return NextResponse.json({ message: "Missing document_id parameter." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ message: "Database connection failed." }, { status: 500 });
    }

    // Verify document belongs to customer
    const customerId = await resolveCustomerIdForUser(supabase, user).catch((customerError) => {
      console.error("[ocr-get] Customer fetch error:", customerError);
      return null;
    });

    if (!customerId) {
      return NextResponse.json({ message: "Customer profile not found." }, { status: 404 });
    }

    const { data: document, error: docError } = await supabase
      .from("customer_vault_documents")
      .select("id")
      .eq("id", documentId)
      .eq("customer_id", customerId)
      .maybeSingle();

    if (docError || !document) {
      return NextResponse.json({ message: "Document not found or access denied." }, { status: 404 });
    }

    // Fetch the OCR job
    const { data: job, error: jobError } = await supabase
      .from("vault_ocr_jobs")
      .select("*")
      .eq("document_id", documentId)
      .maybeSingle();

    if (jobError) {
      return NextResponse.json({ message: jobError.message }, { status: 500 });
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error("[ocr-get] Exception:", error);
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
      console.error("[ocr-post] Customer fetch error:", customerError);
      return null;
    });

    if (!customerId) {
      return NextResponse.json({ message: "Customer profile not found." }, { status: 404 });
    }

    const body = await request.json();
    const { document_id } = body;

    if (!document_id) {
      return NextResponse.json({ message: "Missing document_id in request body." }, { status: 400 });
    }

    // 2. Verify document and check type
    const { data: docData, error: docError } = await supabase
      .from("customer_vault_documents")
      .select("id, document_type, file_name")
      .eq("id", document_id)
      .eq("customer_id", customerId)
      .maybeSingle();

    if (docError || !docData) {
      return NextResponse.json({ message: "Document not found or access denied." }, { status: 404 });
    }

    // 3. Update job status to 'processing'
    const { data: jobData, error: jobError } = await supabase
      .from("vault_ocr_jobs")
      .update({
        status: "processing",
        updated_at: new Date().toISOString()
      })
      .eq("document_id", document_id)
      .select()
      .maybeSingle();

    if (jobError || !jobData) {
      return NextResponse.json({ message: jobError?.message || "Failed to update OCR job status." }, { status: 500 });
    }

    // 4. Trigger mock OCR simulation background job (5 seconds timeout)
    const documentType = docData.document_type;
    const documentIdVal = docData.id;

    setTimeout(async () => {
      try {
        let mockData = {};
        if (documentType === "aadhaar_front" || documentType === "aadhaar_back") {
          mockData = {
            aadhaar_number: "XXXX-XXXX-8910",
            name: "Faizal Alam",
            gender: "MALE",
            dob: "1994-08-15",
            address: "Ward 12, Main Street, Faizabad, Uttar Pradesh - 224001",
            pincode: "224001",
            city: "Faizabad",
            state: "Uttar Pradesh",
            confidence_score: 95
          };
        } else if (documentType === "pan_card") {
          mockData = {
            pan_number: "ABCDE1234F",
            name: "FAIZAL ALAM",
            father_name: "JANAB ALAM",
            dob: "1994-08-15",
            card_type: "Individual",
            confidence_score: 89
          };
        } else if (documentType === "gst_certificate") {
          mockData = {
            gstin: "09ABCDE1234F1Z5",
            business_name: "DigiConnect Dukan",
            legal_name: "DIGICONNECT DUKAN PVT LTD",
            trade_name: "DigiConnect Dukan",
            date_of_registration: "2024-01-10",
            constitution_of_business: "Private Limited Company",
            confidence_score: 99
          };
        } else {
          mockData = {
            reference_no: `REF-${Math.floor(100000 + Math.random() * 900000)}`,
            extracted_date: new Date().toISOString().split("T")[0],
            raw_text: "Mock OCR data extraction completed successfully. File verified.",
            confidence_score: 98
          };
        }

        // Perform async DB update using admin client
        const asyncSupabase = getSupabaseAdmin();
        if (asyncSupabase) {
          await asyncSupabase
            .from("vault_ocr_jobs")
            .update({
              status: "completed",
              extracted_data: mockData,
              updated_at: new Date().toISOString()
            })
            .eq("document_id", documentIdVal);

          // Add timeline entry
          await asyncSupabase
            .from("entity_timelines")
            .insert({
              entity_type: "customer",
              entity_id: customerId,
              event_title: "Document OCR Complete",
              event_description: `Asynchronous OCR data extraction finished for ${documentType.replace(/_/g, " ")}.`,
              metadata: {
                document_id: documentIdVal,
                document_type: documentType
              }
            });
        }
      } catch (err) {
        console.error("[ocr-async-simulation] Error during mock update:", err);
      }
    }, 5000);

    return NextResponse.json({
      message: "OCR processing initialized.",
      job: jobData
    });
  } catch (error) {
    console.error("[ocr-post] Exception:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
