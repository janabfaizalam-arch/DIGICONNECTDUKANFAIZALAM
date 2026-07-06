import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth-v2/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customerId = session.payload.sub;
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Database misconfigured" }, { status: 500 });
    }

    const { data: customer, error } = await supabase
      .from("customers")
      .select("name, father_or_husband_name, email, photo_url, mobile, house_no, street, landmark, pincode, city, district, state, country")
      .eq("id", customerId)
      .single();

    if (error || !customer) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({ profile: customer });
  } catch (error) {
    console.error("[Auth V2] Profile API GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customerId = session.payload.sub;
    const body = await request.json();
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Database misconfigured" }, { status: 500 });
    }

    // Prevent modifying secure fields like mobile, pin, or id
    const { name, father_or_husband_name, email, photo_url, house_no, street, landmark, pincode, city, district, state } = body;

    const { data: updatedCustomer, error } = await supabase
      .from("customers")
      .update({
        name,
        father_or_husband_name,
        email,
        photo_url,
        house_no,
        street,
        landmark,
        pincode,
        city,
        district,
        state
      })
      .eq("id", customerId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    return NextResponse.json({ success: true, profile: updatedCustomer });
  } catch (error) {
    console.error("[Auth V2] Profile API PUT error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
