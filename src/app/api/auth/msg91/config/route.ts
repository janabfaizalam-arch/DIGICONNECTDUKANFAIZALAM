import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const widgetId = process.env.MSG91_WIDGET_ID?.trim() || process.env.NEXT_PUBLIC_MSG91_WIDGET_ID?.trim() || "";
  const tokenAuth = process.env.MSG91_WIDGET_TOKEN?.trim() || process.env.NEXT_PUBLIC_MSG91_WIDGET_TOKEN?.trim() || "";

  return NextResponse.json({
    configured: Boolean(widgetId && tokenAuth),
    widgetId,
    tokenAuth,
  });
}
