import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeLeadMobile } from "@/lib/crm/leads-core";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type CustomerProfileSummary = {
  id: string;
  fullName: string;
  mobile: string;
  email: string | null;
  city: string | null;
  address: string | null;
  createdAt: string;
};

export async function findCustomerByMobile(
  rawMobile: string,
  supabaseOverride?: SupabaseClient | null,
): Promise<CustomerProfileSummary | null> {
  const supabase = supabaseOverride ?? getSupabaseAdmin();
  if (!supabase) return null;

  const normalized = normalizeLeadMobile(rawMobile);
  if (!normalized) return null;

  const { data, error } = await supabase
    .from("customers")
    .select("id, name, full_name, mobile, email, city, address, created_at")
    .or(`mobile.eq.${normalized},mobile.eq.91${normalized},mobile.eq.+91${normalized}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: String(data.id),
    fullName: String(data.name || data.full_name || "Customer"),
    mobile: String(data.mobile),
    email: data.email ? String(data.email) : null,
    city: data.city ? String(data.city) : null,
    address: data.address ? String(data.address) : null,
    createdAt: String(data.created_at ?? ""),
  };
}

export async function searchCustomersForInbox(
  query: string,
  supabaseOverride?: SupabaseClient | null,
): Promise<CustomerProfileSummary[]> {
  const supabase = supabaseOverride ?? getSupabaseAdmin();
  if (!supabase) return [];

  const clean = query.trim().replace(/[%_]/g, "");
  if (!clean || clean.length < 2) return [];

  const { data, error } = await supabase
    .from("customers")
    .select("id, name, full_name, mobile, email, city, address, created_at")
    .or(`name.ilike.%${clean}%,full_name.ilike.%${clean}%,mobile.ilike.%${clean}%,email.ilike.%${clean}%`)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error || !data) return [];

  return (data as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    fullName: String(r.name || r.full_name || "Customer"),
    mobile: String(r.mobile),
    email: r.email ? String(r.email) : null,
    city: r.city ? String(r.city) : null,
    address: r.address ? String(r.address) : null,
    createdAt: String(r.created_at ?? ""),
  }));
}

export async function createOrLinkCustomerFromInbox(input: {
  conversationId: string;
  name: string;
  mobile: string;
  email?: string | null;
  city?: string | null;
  address?: string | null;
  actorId?: string;
  supabaseOverride?: SupabaseClient | null;
}): Promise<
  | { ok: true; customer: CustomerProfileSummary; createdNew: boolean }
  | { ok: false; error: string; status: number }
> {
  const supabase = input.supabaseOverride ?? getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Database unavailable", status: 503 };

  const normalizedMobile = normalizeLeadMobile(input.mobile);
  if (!normalizedMobile || normalizedMobile.length !== 10) {
    return { ok: false, error: "Valid 10-digit mobile number required", status: 400 };
  }

  const nameTrimmed = input.name.trim();
  if (!nameTrimmed || nameTrimmed.length < 2) {
    return { ok: false, error: "Customer name must be at least 2 characters", status: 400 };
  }

  // 1. Check for duplicate customer mobile to guarantee NO duplicate records are created
  const existing = await findCustomerByMobile(normalizedMobile, supabase);

  let targetCustomer: CustomerProfileSummary;
  let createdNew = false;

  if (existing) {
    targetCustomer = existing;
  } else {
    // Insert new customer record
    const insertPayload = {
      name: nameTrimmed,
      full_name: nameTrimmed,
      mobile: normalizedMobile,
      email: input.email ? input.email.trim().toLowerCase() : null,
      city: input.city ? input.city.trim() : null,
      address: input.address ? input.address.trim() : null,
      is_active: true,
      source: "whatsapp",
    };

    const { data: created, error: insertErr } = await supabase
      .from("customers")
      .insert(insertPayload)
      .select("id, name, full_name, mobile, email, city, address, created_at")
      .single();

    if (insertErr || !created) {
      // In case of concurrent race on mobile, fetch existing
      const raceExisting = await findCustomerByMobile(normalizedMobile, supabase);
      if (raceExisting) {
        targetCustomer = raceExisting;
      } else {
        return { ok: false, error: "Failed to create customer profile", status: 500 };
      }
    } else {
      createdNew = true;
      targetCustomer = {
        id: String(created.id),
        fullName: String(created.name || created.full_name || nameTrimmed),
        mobile: String(created.mobile),
        email: created.email ? String(created.email) : null,
        city: created.city ? String(created.city) : null,
        address: created.address ? String(created.address) : null,
        createdAt: String(created.created_at ?? ""),
      };
    }
  }

  // 2. Link conversation to customer profile
  const now = new Date().toISOString();
  await supabase
    .from("whatsapp_conversations")
    .update({
      customer_id: targetCustomer.id,
      customer_name: targetCustomer.fullName,
      updated_at: now,
    })
    .eq("id", input.conversationId);

  // 3. Link existing messages for this conversation to customer_id
  await supabase
    .from("whatsapp_messages")
    .update({ customer_id: targetCustomer.id })
    .eq("conversation_id", input.conversationId);

  return { ok: true, customer: targetCustomer, createdNew };
}

export async function linkExistingCustomerToConversation(input: {
  conversationId: string;
  customerId: string;
  supabaseOverride?: SupabaseClient | null;
}): Promise<
  | { ok: true; customer: CustomerProfileSummary }
  | { ok: false; error: string; status: number }
> {
  const supabase = input.supabaseOverride ?? getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Database unavailable", status: 503 };

  const { data: customer, error } = await supabase
    .from("customers")
    .select("id, name, full_name, mobile, email, city, address, created_at")
    .eq("id", input.customerId)
    .maybeSingle();

  if (error || !customer) {
    return { ok: false, error: "Customer not found", status: 404 };
  }

  const summary: CustomerProfileSummary = {
    id: String(customer.id),
    fullName: String(customer.name || customer.full_name || "Customer"),
    mobile: String(customer.mobile),
    email: customer.email ? String(customer.email) : null,
    city: customer.city ? String(customer.city) : null,
    address: customer.address ? String(customer.address) : null,
    createdAt: String(customer.created_at ?? ""),
  };

  const now = new Date().toISOString();
  await supabase
    .from("whatsapp_conversations")
    .update({
      customer_id: summary.id,
      customer_name: summary.fullName,
      updated_at: now,
    })
    .eq("id", input.conversationId);

  await supabase
    .from("whatsapp_messages")
    .update({ customer_id: summary.id })
    .eq("conversation_id", input.conversationId);

  return { ok: true, customer: summary };
}
