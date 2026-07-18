import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Debug seed endpoint permanently removed from the product surface.
 * Always 404 — including in development — to prevent accidental catalog rewrites.
 */
export async function GET() {
  return NextResponse.json({ error: "Not found." }, { status: 404 });
}

export async function POST() {
  return NextResponse.json({ error: "Not found." }, { status: 404 });
}
