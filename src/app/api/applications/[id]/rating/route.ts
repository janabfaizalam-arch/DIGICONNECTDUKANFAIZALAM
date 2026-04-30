import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { rating, feedback } = (await request.json()) as { rating?: number; feedback?: string };

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ message: "Please select rating between 1 and 5." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json({ message: "Supabase service role key is missing." }, { status: 500 });
    }

    const { data: application } = await supabase
      .from("applications")
      .select("id, user_id, status")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!application) {
      return NextResponse.json({ message: "Application not found." }, { status: 404 });
    }

    if (application.status !== "completed") {
      return NextResponse.json({ message: "Rating is allowed only after completion." }, { status: 400 });
    }

    const { error } = await supabase.from("ratings").upsert(
      {
        application_id: id,
        user_id: user.id,
        rating,
        feedback: feedback ?? "",
      },
      { onConflict: "application_id,user_id" },
    );

    if (error) {
      return NextResponse.json({ message: "Rating could not be saved." }, { status: 500 });
    }

    return NextResponse.json({ message: "Thank you. Your feedback has been saved." });
  } catch {
    return NextResponse.json({ message: "Something went wrong. Please try again." }, { status: 500 });
  }
}
