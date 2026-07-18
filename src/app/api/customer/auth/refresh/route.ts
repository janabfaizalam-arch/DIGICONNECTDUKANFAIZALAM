import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "This endpoint is retired. Supabase SSR session refresh is used instead." },
    { status: 410 },
  );
}
