import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const EVENT_SCORES: Record<string, number> = {
  page_visit: 5,
  calculator_usage: 10,
  expert_talk_click: 20,
  apply_click: 30,
  application_started: 50,
  payment_success: 100,
  smart_chat_interaction: 15,
};

const failed = () => NextResponse.json({ error: "CRM event tracking failed." }, { status: 500 });

/**
 * Lead-scoring events from the public site.
 *
 * Public by design (visitors are not signed in), so it is rate-limited, takes
 * only known event names and bounded strings, never overwrites a name staff
 * already have on a lead, and answers without lead ids or database errors.
 */
export async function POST(request: Request) {
  try {
    const rate = checkRateLimit(`crm-event:${getClientIp(request)}`, 30, 60_000);
    if (!rate.ok) return rateLimitResponse(rate.retryAfter);

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const mobile = body?.mobile;
    const name = typeof body?.name === "string" ? body.name.trim().slice(0, 80) : "";
    const service = typeof body?.service === "string" ? body.service.trim().slice(0, 120) : "";
    const event = typeof body?.event === "string" ? body.event : "";

    if (!mobile || !service || !event) {
      return NextResponse.json({ error: "Mobile, service, and event are required." }, { status: 400 });
    }
    if (!Object.hasOwn(EVENT_SCORES, event)) {
      return NextResponse.json({ error: "Unknown event." }, { status: 400 });
    }

    const cleanMobile = String(mobile).replace(/\D/g, "").slice(-10);
    if (cleanMobile.length !== 10) {
      return NextResponse.json({ error: "Invalid mobile number." }, { status: 400 });
    }

    const scoreToAdd = EVENT_SCORES[event] || 5;

    // Check if lead already exists for this mobile & service
    const { data: existingLead, error: selectError } = await supabase
      .from("leads")
      .select("id, name, notes, message")
      .eq("mobile", cleanMobile)
      .eq("service", service)
      .maybeSingle();

    if (selectError) {
      console.error("[crm-event] select_failed", { code: selectError.code });
      return failed();
    }

    let updatedNotes = "";
    let finalScore = scoreToAdd;
    let eventsList = [event];

    if (existingLead) {
      let parsedNotes: { score?: number; events?: string[] } = {};
      try {
        if (existingLead.notes) {
          parsedNotes = JSON.parse(existingLead.notes);
        }
      } catch {
        // If not JSON, treat it as raw notes string
      }

      const currentScore = typeof parsedNotes.score === "number" ? parsedNotes.score : 5;
      const currentEvents = Array.isArray(parsedNotes.events) ? parsedNotes.events : [];

      // Only add score if event has not been tracked before (to prevent double scoring on same page refresh)
      if (!currentEvents.includes(event) || event === "calculator_usage" || event === "expert_talk_click") {
        finalScore = currentScore + scoreToAdd;
        eventsList = [...currentEvents, event];
      } else {
        finalScore = currentScore;
        eventsList = currentEvents;
      }

      updatedNotes = JSON.stringify({ score: finalScore, events: eventsList });

      const { error: updateError } = await supabase
        .from("leads")
        .update({
          notes: updatedNotes,
          // An anonymous caller may fill in a missing name, never replace one.
          name: existingLead.name || name || "Customer",
        })
        .eq("id", existingLead.id);

      if (updateError) {
        console.error("[crm-event] update_failed", { code: updateError.code });
        return failed();
      }

      return NextResponse.json({ ok: true });
    } else {
      // Create new lead
      updatedNotes = JSON.stringify({ score: finalScore, events: eventsList });
      const { data: newLead, error: insertError } = await supabase
        .from("leads")
        .insert({
          name: name || "Anonymous Lead",
          mobile: cleanMobile,
          service,
          status: "new",
          source: "website",
          notes: updatedNotes,
          message: `Lead created on ${event} event.`,
        })
        .select("id")
        .single();

      if (insertError || !newLead) {
        console.error("[crm-event] insert_failed", { code: insertError?.code });
        return failed();
      }

      return NextResponse.json({ ok: true });
    }
  } catch (error) {
    console.error("[crm-event] failed", error instanceof Error ? error.message : "unknown");
    return failed();
  }
}
