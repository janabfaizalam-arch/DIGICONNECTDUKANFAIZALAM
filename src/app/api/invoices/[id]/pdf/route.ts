import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { verifyInvoiceLinkToken } from "@/lib/invoices/invoice-link";
import { buildApplicationInvoicePdf } from "@/lib/invoices/invoice-pdf";
import type { Invoice } from "@/lib/portal-types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Invoice PDF. Opens with the signed `t` token from the WhatsApp invoice
 * message (no login), or for the signed-in owner of the invoice or an admin.
 * Anything else gets the same 404, so a guessed id says nothing.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notFound = NextResponse.json({ message: "Invoice not found." }, { status: 404 });
  if (!UUID.test(id)) return notFound;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ message: "Service unavailable." }, { status: 503 });

  const token = new URL(request.url).searchParams.get("t");
  let allowed = verifyInvoiceLinkToken(id, token);

  const { data } = await supabase.from("invoices").select("*").eq("id", id).maybeSingle();
  if (!data) return notFound;
  const invoice = data as Invoice;

  if (!allowed) {
    const user = await getCurrentUser();
    if (user) {
      const role = await getCurrentUserRole(user);
      allowed = isAdminRole(role) || invoice.user_id === user.id;
    }
  }
  if (!allowed) return notFound;

  const pdf = await buildApplicationInvoicePdf(invoice);
  const filename = `${invoice.invoice_number.replace(/[^A-Za-z0-9_-]/g, "") || "invoice"}.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
