import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { DEFAULT_RATES, getStationByCode, type PrintStation } from "@/lib/print/stations";
import { settingsFor, smartPrintService, type SmartPrintSettings } from "@/lib/print/smart-print";
import { quote } from "@/lib/print/smart-pricing";

/*
  The platform's own counter's rates.

  A shop's counter does not use these — it charges what the partner set, which
  is the whole point of the product. These remain for the platform's original
  print page, which has no station.
*/
const RATES = {
  A4: { mono: 2.0, color: 10.0 },
  A3: { mono: 5.0, color: 20.0 },
};

/** What one page costs at this counter, in rupees. */
function pageRateFor(
  station: PrintStation | null,
  paperSize: "A4" | "A3",
  colorMode: "mono" | "color",
): number {
  if (!station) return RATES[paperSize][colorMode];
  const key = `${paperSize.toLowerCase()}_${colorMode}` as keyof PrintStation["rates"];
  return Number(station.rates[key]);
}

/**
 * Four digits the customer quotes to collect their pages.
 *
 * Not a security control — it is so two people who ordered within a minute of
 * each other at a busy counter do not walk off with each other's documents.
 */
function pickupPin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

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
  /*
    What the browser thinks the price is.

    Optional, and only ever a confirmation. The server computes the real
    figure from the counter's own rates; this is compared to it so a client
    showing a stale price fails loudly instead of charging the wrong amount.
    A caller that omits it simply gets the server's price.
  */
  amount?: number; // in INR
  /** The counter this was ordered at. Absent for the platform's own page. */
  station_code?: string;
  /** Which Smart Print service this was ordered as. */
  service_type?: string;
  /** Everything the customer chose: paper, colour, finish, quality, counts. */
  settings?: Record<string, unknown>;
  /** Sheets of paper this job puts through the printer. */
  sheet_count?: number;
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
      station_code,
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

    /*
      Which counter, and therefore whose prices.

      Resolved before the amount is checked, because a shop sets its own
      rates: charging the platform's ₹2 against a shop that charges ₹3 would
      reject every order at that counter as a price mismatch.
    */
    const stationCode = String(station_code ?? "").trim();
    const station = stationCode ? await getStationByCode(stationCode) : null;

    if (stationCode && !station) {
      return NextResponse.json({ error: "That counter no longer exists." }, { status: 404 });
    }

    if (station && (!station.accepting_orders || !station.is_active)) {
      // Said before taking money, not after.
      return NextResponse.json(
        { error: "This counter is closed right now. Please ask at the desk." },
        { status: 409 },
      );
    }

    /*
      No printer on the other end, no payment.

      A customer paid two rupees at a live counter and nothing came out: the
      shop's computer was not running the Print Station, so the job simply
      sat in the queue. The screen said "Paid. Printing now." and the first
      anybody knew of it was the customer complaining.

      The shop being open is not the same as the shop being able to print,
      and this is the only place that can tell the difference before the
      money moves. A counter whose computer has not spoken to us in two
      minutes cannot honour an order, so it does not get to take one.
    */
    if (station && !station.agent_connected) {
      return NextResponse.json(
        {
          error:
            "This counter's computer is not responding, so nothing would print. Please ask at the desk before paying.",
        },
        { status: 409 },
      );
    }

    /*
      What this costs.

      A Smart Print order is priced by sheets, because that is what it puts
      through the printer: twelve passport photos and six are the same one
      sheet of glossy paper, and charging per photo would be charging for
      something the shop does not spend. Anything without a service type is
      the old per-page counter page, priced exactly as it was.

      Either way the figure is computed here. The browser shows a price from
      the same function on the same numbers, but a price a browser sends is a
      number a browser can edit.
    */
    const service = smartPrintService(String(body.service_type ?? ""));
    const smartSettings = service
      ? ({ ...settingsFor(service, station?.smart_print_defaults ?? null), ...(body.settings ?? {}) } as SmartPrintSettings)
      : null;

    const sheetCount = Math.max(1, Math.floor(Number(body.sheet_count ?? parsedPages) || 1));

    const expectedAmount = smartSettings
      ? quote(station?.rates ?? DEFAULT_RATES, { ...smartSettings, copies: parsedCopies }, sheetCount).total
      : parsedPages * parsedCopies * pageRateFor(station, paper_size, color_mode);

    /*
      Compare only when the caller offered a figure — and reject a
      non-number outright.

      `Math.abs(undefined - x)` is NaN, and `NaN > 0.01` is false, so the old
      unconditional check silently passed for any request that left the
      amount out. It read like a guard and was not one.
    */
    if (amount !== undefined && amount !== null) {
      const claimed = Number(amount);
      if (!Number.isFinite(claimed) || Math.abs(claimed - expectedAmount) > 0.01) {
        return NextResponse.json(
          { error: `Price mismatch. This counter charges ₹${expectedAmount.toFixed(2)}.` },
          { status: 400 },
        );
      }
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
        service_type: service?.id ?? "document",
        settings: smartSettings ?? {},
        sheet_count: sheetCount,
        payment_status: "pending",
        print_status: "pending",
        /*
          Whose queue this belongs to.

          Without it the job is a platform job, and the shop's own Print
          Station — which asks only for its own station's rows — would never
          see a single order taken at its own counter.
        */
        station_id: station ? station.id : null,
        expires_at: station
          ? new Date(Date.now() + station.auto_delete_minutes * 60_000).toISOString()
          : null,
        pickup_pin: station ? pickupPin() : null,
      })
      .select("id, job_number, price, pickup_pin")
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
      // The customer needs this on their own screen to collect the pages.
      pickup_pin: job.pickup_pin ?? null,
      amount: job.price,
    });
  } catch (error) {
    console.error("[print/create] Error creating print job:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
