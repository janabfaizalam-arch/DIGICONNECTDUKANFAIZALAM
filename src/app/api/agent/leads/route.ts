import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { message: "Legacy agent lead flow has been removed. Use /agent/applications/new." },
    { status: 410 },
  );
}

export async function PATCH() {
  return NextResponse.json(
    { message: "Legacy agent lead status updates have been removed. Use the canonical application workflow." },
    { status: 410 },
  );
}
