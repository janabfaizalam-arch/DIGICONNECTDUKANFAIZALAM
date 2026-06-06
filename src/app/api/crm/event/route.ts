import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const EVENT_SCORES: Record<string, number> = {
  page_visit: 5,
  calculator_usage: 10,
  expert_talk_click: 20,
  apply_click: 30,
  application_started: 50,
  payment_success: 100,
};

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase admin key missing." }, { status: 500 });
    }

    const body = await request.json();
    const { mobile, name, service, event } = body;

    if (!mobile || !service || !event) {
      return NextResponse.json({ error: "Mobile, service, and event are required." }, { status: 400 });
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
      return NextResponse.json({ error: selectError.message }, { status: 500 });
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
      } catch (e) {
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
          name: name || existingLead.name || "Customer",
        })
        .eq("id", existingLead.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, leadId: existingLead.id, score: finalScore });
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

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, leadId: newLead.id, score: finalScore });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "CRM event tracking failed." },
      { status: 500 }
    );
  }
}
