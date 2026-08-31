import { NextResponse } from "next/server";

import { getApplyFieldsForSlugs } from "@/lib/apply/service-fields";

/**
 * The extra questions for the services currently in the application.
 *
 * Services are chosen in the browser, on step one, so the flow asks for their
 * fields as the selection changes rather than at page load. Public on purpose:
 * these are the questions on a form anyone can open, and no customer data is
 * involved.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slugs = String(searchParams.get("services") ?? "")
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean)
    .slice(0, 12);

  const fields = await getApplyFieldsForSlugs(slugs);

  return NextResponse.json(
    { ok: true, fields },
    { headers: { "Cache-Control": "private, max-age=30" } },
  );
}
