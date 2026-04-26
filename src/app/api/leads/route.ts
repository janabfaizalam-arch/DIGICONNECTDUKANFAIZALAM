import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase";

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
      source: "website",
      created_at: new Date().toISOString(),
    });

    if (error) {
      return NextResponse.json({ message: "Lead save nahi ho paya. Kripya call ya WhatsApp karein." }, { status: 500 });
    }

    return NextResponse.json({ message: "Thank you. Hamari team aapse jaldi contact karegi." });
  } catch {
    return NextResponse.json({ message: "Something went wrong. Please try again." }, { status: 500 });
  }
}
