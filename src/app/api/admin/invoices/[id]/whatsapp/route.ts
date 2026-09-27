import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { sendInvoiceWhatsApp } from "@/lib/invoices/invoice-whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin: (re)send an invoice to the customer's WhatsApp. Recipient and template are server-side only. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const { id } = await params;
  const result = await sendInvoiceWhatsApp(id, { manual: true });

  if (!result.ok) {
    const status = result.code === "invoice_not_found" ? 404 : result.code === "invalid_mobile" ? 400 : 200;
    return NextResponse.json(
      { message: result.error, code: result.code, whatsappOk: false, queued: "queued" in result ? result.queued ?? false : false },
      { status },
    );
  }

  revalidatePath("/admin/applications");
  return NextResponse.json({ message: "Invoice sent on WhatsApp.", whatsappOk: true, messageId: result.messageId });
}
