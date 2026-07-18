import { NextResponse } from "next/server";

import { listPublicServices } from "@/lib/services";

export async function GET() {
  const services = await listPublicServices();
  return NextResponse.json({ services });
}
