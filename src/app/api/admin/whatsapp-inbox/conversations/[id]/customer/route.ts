import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import {
  createOrLinkCustomerFromInbox,
  linkExistingCustomerToConversation,
  searchCustomersForInbox,
} from "@/lib/whatsapp/inbox-crm";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CustomerActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    name: z.string().min(2, "Name must be at least 2 characters").max(100),
    mobile: z.string().min(10, "Valid mobile required").max(15),
    email: z.string().email("Invalid email").optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    address: z.string().max(255).optional().nullable(),
  }),
  z.object({
    action: z.literal("link"),
    customerId: z.string().min(1, "Customer ID required"),
  }),
  z.object({
    action: z.literal("search"),
    query: z.string().min(2, "Query must be at least 2 characters").max(100),
  }),
]);

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const rate = checkRateLimit(`admin-inbox-cust:${getClientIp(request)}`, 60, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: conversationId } = await props.params;
  if (!conversationId) {
    return NextResponse.json({ error: "Missing conversation ID" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CustomerActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = parsed.data;

  try {
    if (data.action === "search") {
      const customers = await searchCustomersForInbox(data.query);
      return NextResponse.json({ ok: true, customers });
    }

    if (data.action === "link") {
      const result = await linkExistingCustomerToConversation({
        conversationId,
        customerId: data.customerId,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return NextResponse.json(result);
    }

    if (data.action === "create") {
      const result = await createOrLinkCustomerFromInbox({
        conversationId,
        name: data.name,
        mobile: data.mobile,
        email: data.email,
        city: data.city,
        address: data.address,
        actorId: user.id,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to process customer action" }, { status: 500 });
  }
}
