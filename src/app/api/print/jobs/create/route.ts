import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

// Rate pricing: A4/A3 vs Mono/Color
const RATES = {
  A4: { mono: 2.0, color: 10.0 },
  A3: { mono: 5.0, color: 20.0 },
};

type PrintJobCreateBody = {
  customer_mobile: string;
  copies: number;
  pages: number;
  paper_size: "A4" | "A3";
  color_mode: "mono" | "color";
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  amount: number; // in INR
};

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`print-create:${ip}`, 20, 60_000); // 20 requests per min

    if (!rateLimit.ok) {
      return rateLimitResponse(rateLimit.retryAfter);
    }

    const body = (await request.json().catch(() => null)) as PrintJobCreateBody | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const {
      customer_mobile,
      copies,
      pages,
      paper_size,
      color_mode,
      file_name,
      file_size,
      mime_type,
      storage_path,
      amount,
    } = body;

    // Validation
    const cleanMobile = String(customer_mobile || "").trim().replace(/\D/g, "");
    if (cleanMobile.length < 10) {
      return NextResponse.json({ error: "Valid mobile number is required" }, { status: 400 });
    }

    const parsedCopies = Math.round(Number(copies || 1));
    const parsedPages = Math.round(Number(pages || 1));
    if (parsedCopies <= 0 || parsedPages <= 0) {
      return NextResponse.json({ error: "Copies and pages must be greater than zero" }, { status: 400 });
    }

    if (paper_size !== "A4" && paper_size !== "A3") {
      return NextResponse.json({ error: "Invalid paper size. Supported: A4, A3" }, { status: 400 });
    }

    if (color_mode !== "mono" && color_mode !== "color") {
      return NextResponse.json({ error: "Invalid color mode. Supported: mono, color" }, { status: 400 });
    }

    if (!file_name || !storage_path || !file_size || !mime_type) {
      return NextResponse.json({ error: "Uploaded file information is incomplete" }, { status: 400 });
    }

    // Calculate rate
    const pageRate = RATES[paper_size][color_mode];
    const expectedAmount = parsedPages * parsedCopies * pageRate;

    // Check amount mismatch (allowing 0.01 margin for float representation)
    if (Math.abs(amount - expectedAmount) > 0.01) {
      return NextResponse.json(
        { error: `Price mismatch. Server: ₹${expectedAmount.toFixed(2)}, Client: ₹${amount.toFixed(2)}` },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase service role configuration is missing" }, { status: 500 });
    }

    // Start a transaction-like insertion
    // 1. Create the job record
    const { data: job, error: jobError } = await supabase
      .from("print_jobs")
      .insert({
        customer_mobile: cleanMobile,
        copies: parsedCopies,
        pages: parsedPages,
        paper_size,
        color_mode,
        price: expectedAmount,
        payment_status: "pending",
        print_status: "pending",
      })
      .select("id, job_number, price")
      .single();

    if (jobError || !job) {
      console.error("[print/create] Error creating print job:", jobError);
      return NextResponse.json({ error: "Failed to create print job record" }, { status: 500 });
    }

    // 2. Create the file record linked to the job
    const { error: fileError } = await supabase
      .from("print_job_files")
      .insert({
        job_id: job.id,
        file_name,
        file_size,
        mime_type,
        storage_path,
      });

    if (fileError) {
      console.error("[print/create] Error linking print file:", fileError);
      // Clean up the job
      await supabase.from("print_jobs").delete().eq("id", job.id);
      return NextResponse.json({ error: "Failed to link print file record" }, { status: 500 });
    }

    // 3. Create the log
    await supabase.from("print_job_logs").insert({
      job_id: job.id,
      action: "created",
      actor: "customer",
      details: {
        ip,
        customer_mobile: cleanMobile,
        price: expectedAmount,
      },
    });

    return NextResponse.json({
      job_id: job.id,
      job_number: job.job_number,
      amount: job.price,
    });
  } catch (error) {
    console.error("[print/create] Error creating print job:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
