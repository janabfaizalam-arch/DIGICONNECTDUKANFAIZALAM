import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { createOrUpdateCrmCustomerFromOfflineInvoice, getOfflineInvoices, normalizeOfflineInvoicePayload, validateOfflineInvoicePayload } from "@/lib/offline-invoices";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

async function requireAdmin() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) return { user: null, error: NextResponse.json({ message: "Admin access required." }, { status: 403 }) };
  return { user, error: null };
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const invoices = await getOfflineInvoices({
    query: url.searchParams.get("q") ?? "",
    status: url.searchParams.get("status") ?? "all",
  });

  return NextResponse.json({ invoices });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ message: "Supabase service role key is missing." }, { status: 500 });

  const input = (await request.json()) as Record<string, unknown>;
  const payload = normalizeOfflineInvoicePayload(input, auth.user?.id);
  const validationError = validateOfflineInvoicePayload(payload);
  if (validationError) return NextResponse.json({ message: validationError }, { status: 400 });

  const customerSync = await createOrUpdateCrmCustomerFromOfflineInvoice(payload);
  if (!customerSync.ok) return NextResponse.json({ message: customerSync.message ?? "CRM customer could not be synced." }, { status: 500 });

  const { data, error } = await supabase.from("offline_invoices").insert(payload).select("id, invoice_number").single();
  if (error || !data) return NextResponse.json({ message: error?.message ?? "Offline invoice could not be saved." }, { status: 500 });

  revalidatePath("/admin/offline-invoices");
  revalidatePath(`/admin/offline-invoices/${data.id}`);
  return NextResponse.json({ message: "Offline invoice generated.", invoiceId: data.id, invoiceNumber: data.invoice_number });
}
