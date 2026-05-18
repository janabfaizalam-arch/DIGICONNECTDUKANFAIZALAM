import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { message: "Standalone agent customer creation has been removed. Create the customer inside a new application." },
    { status: 410 },
  );
}
