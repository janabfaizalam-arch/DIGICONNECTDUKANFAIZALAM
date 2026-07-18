import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Email verification removed for customers." },
    { status: 410 },
  );
}
