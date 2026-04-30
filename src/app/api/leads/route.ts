import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const leadStatuses = ["new", "in_progress", "completed"] as const;

type LeadStatus = (typeof leadStatuses)[number];

type LeadPayload = {
  name?: string;
  mobile?: string;
  service?: string;
  message?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LeadPayload;

    if (!body.name || !body.mobile || !body.service) {
      return NextResponse.json({ message: "Please fill all required fields." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json(
        {
          message: "Lead form is configured in UI. Add Supabase env keys to store submissions.",
        },
        { status: 200 },
      );
    }

    const { error } = await supabase.from("leads").insert({
      name: body.name,
      mobile: body.mobile,
      service: body.service,
      message: body.message ?? "",
      status: "new",
      created_at: new Date().toISOString(),
    });

    if (error) {
      return NextResponse.json({ message: "Lead could not be saved. Please call or WhatsApp us." }, { status: 500 });
    }

    return NextResponse.json({ message: "Thank you. Our team will contact you shortly." });
  } catch {
    return NextResponse.json({ message: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { id?: string; status?: LeadStatus };

    if (!body.id || !body.status || !leadStatuses.includes(body.status)) {
      return NextResponse.json({ message: "Invalid lead status update." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json({ message: "Supabase admin keys are missing." }, { status: 500 });
    }

    const { data, error } = await supabase
      .from("leads")
      .update({ status: body.status })
      .eq("id", body.id)
      .select("id, name, mobile, service, message, status, created_at")
      .single();

    if (error) {
      return NextResponse.json({ message: "Lead status could not be updated." }, { status: 500 });
    }

    return NextResponse.json({ lead: data });
  } catch {
    return NextResponse.json({ message: "Something went wrong. Please try again." }, { status: 500 });
  }
}
