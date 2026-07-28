import { NextResponse } from "next/server";
import { z } from "zod";

import {
  authenticateCustomerWithPin,
  createCustomerPinSession,
} from "@/lib/auth/customer-pin-auth";
import { normalizeIndianPhone } from "@/lib/auth/phone";
import { getClientIp, getUserAgent } from "@/lib/auth/request-meta";
import { logAuthSecurityEvent } from "@/lib/auth/security-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  phone: z.string().trim().min(10).max(20),
  pin: z.string(),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const phone = normalizeIndianPhone(body.phone);
    if (!phone.ok) {
      return NextResponse.json({ error: phone.error }, { status: 400 });
    }

    const ip = getClientIp(request);
    const userAgent = getUserAgent(request);

    const auth = await authenticateCustomerWithPin({
      localPhone: phone.local,
      pin: body.pin,
    });

    if (!auth.ok) {
      await logAuthSecurityEvent({
        phone: phone.local,
        eventType: auth.status === 401 ? "login_failed_pin" : "login_failed",
        ip,
        userAgent,
      });
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const session = await createCustomerPinSession({
      customerId: auth.customerId,
      mobile: auth.mobile,
      ipAddress: ip,
      userAgent,
    });

    if (!session.ok) {
      return NextResponse.json({ error: session.error }, { status: 500 });
    }

    console.info("[customer-login]", {
      "customer id": auth.customerId,
      "lookup source": "customers",
      phone: `${phone.local.slice(0, 2)}******${phone.local.slice(-2)}`,
    });

    await logAuthSecurityEvent({
      phone: phone.local,
      eventType: "login_success",
      details: { customerId: auth.customerId },
      ip,
      userAgent,
    });

    return NextResponse.json({ ok: true, redirectTo: "/customer/dashboard" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid login payload" }, { status: 400 });
    }
    console.error("[customer-login]", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
