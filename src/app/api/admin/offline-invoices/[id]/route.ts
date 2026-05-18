import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { createOrUpdateCrmCustomerFromOfflineInvoice, getOfflineInvoice, normalizeOfflineInvoicePayload, validateOfflineInvoicePayload } from "@/lib/offline-invoices";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

async function requireAdmin() {
  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  return null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { id } = await params;
  const invoice = await getOfflineInvoice(id);
  if (!invoice) return NextResponse.json({ message: "Offline invoice not found." }, { status: 404 });

  return NextResponse.json({ invoice });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ message: "Supabase service role key is missing." }, { status: 500 });

  const { id } = await params;
  const input = (await request.json()) as Record<string, unknown>;
  const payload = normalizeOfflineInvoicePayload(input);
  const validationError = validateOfflineInvoicePayload(payload);
  if (validationError) return NextResponse.json({ message: validationError }, { status: 400 });

  const existingInvoice = await getOfflineInvoice(id);
  const customerSync = await createOrUpdateCrmCustomerFromOfflineInvoice({ ...payload, created_by: existingInvoice?.created_by ?? null });
  if (!customerSync.ok) return NextResponse.json({ message: customerSync.message ?? "CRM customer could not be synced." }, { status: 500 });

  const { error } = await supabase.from("offline_invoices").update(payload).eq("id", id);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  revalidatePath("/admin/offline-invoices");
  revalidatePath(`/admin/offline-invoices/${id}`);
  return NextResponse.json({ message: "Offline invoice updated." });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ message: "Supabase service role key is missing." }, { status: 500 });

  const { id } = await params;
  const { error } = await supabase.from("offline_invoices").delete().eq("id", id);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  revalidatePath("/admin/offline-invoices");
  return NextResponse.json({ message: "Offline invoice deleted." });
}
