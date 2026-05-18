import { NextResponse } from "next/server";

export async function PATCH() {
  return NextResponse.json(
    { message: "Staff workflow has been removed. Use admin assignment or agent processing." },
    { status: 410 },
  );
}
