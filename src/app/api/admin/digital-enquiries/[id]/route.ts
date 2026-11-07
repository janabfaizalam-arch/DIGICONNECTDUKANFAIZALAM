import { NextResponse } from "next/server";

import { readJson, requireAdmin } from "@/lib/digital-plans/admin-auth";
import { enquiryUpdateSchema } from "@/lib/digital-plans/schema";
import { getEnquiry, updateEnquiry } from "@/lib/digital-plans/store";

type Context = { params: Promise<{ id: string }> };

/**
 * Status and notes. "Approved" is the customer's to give, through their
 * quotation link; an admin cannot set it for them.
 */
export async function PATCH(request: Request, context: Context) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const parsed = enquiryUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  const enquiry = await getEnquiry(id);
  if (!enquiry) return NextResponse.json({ error: "Enquiry not found." }, { status: 404 });

  const status = parsed.data.status;
  if (status === "approved" || status === "declined") {
    return NextResponse.json({ error: "Only the customer can approve or decline, from their quotation link." }, { status: 400 });
  }
  if (status === "quoted") {
    return NextResponse.json({ error: "Save a quotation to mark the enquiry as quoted." }, { status: 400 });
  }
  if (status === "won" && enquiry.status !== "approved") {
    return NextResponse.json({ error: "Mark as an active client only after the customer has approved the quotation." }, { status: 400 });
  }

  const result = await updateEnquiry(id, parsed.data);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
