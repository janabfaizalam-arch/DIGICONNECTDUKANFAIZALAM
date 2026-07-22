import { NextResponse } from "next/server";

import { getCurrentUser, getCurrentUserRole, isAdminRole } from "@/lib/auth";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type SearchGroup = {
  type: "applications" | "customers" | "partners" | "payments" | "invoices";
  label: string;
  results: { id: string; title: string; subtitle: string; href: string }[];
};

function sanitize(q: string) {
  return q.replace(/[%_,]/g, " ").trim().slice(0, 80);
}

export async function GET(request: Request) {
  const rate = checkRateLimit(`admin-search:${getClientIp(request)}`, 40, 60_000);
  if (!rate.ok) return rateLimitResponse(rate.retryAfter);

  const user = await getCurrentUser();
  const role = await getCurrentUserRole(user);
  if (!user || !isAdminRole(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const raw = sanitize(String(searchParams.get("q") ?? ""));
  if (raw.length < 2) {
    return NextResponse.json({ groups: [] as SearchGroup[], query: raw });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const like = `%${raw}%`;
  const digits = raw.replace(/\D/g, "");

  const [applications, customers, partners, payments, invoices] = await Promise.all([
    supabase
      .from("applications")
      .select("id, service_name, customer_name, customer_mobile, status")
      .or(
        [
          `id.eq.${raw}`,
          `service_name.ilike.${like}`,
          `customer_name.ilike.${like}`,
          digits.length >= 4 ? `customer_mobile.ilike.%${digits}%` : null,
        ]
          .filter(Boolean)
          .join(","),
      )
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("customers")
      .select("id, name, mobile, email")
      .or(
        [
          `name.ilike.${like}`,
          `email.ilike.${like}`,
          digits.length >= 4 ? `mobile.ilike.%${digits}%` : null,
        ]
          .filter(Boolean)
          .join(","),
      )
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("agency_partners")
      .select("id, full_name, partner_code, mobile, email, status")
      .or(
        [
          `full_name.ilike.${like}`,
          `partner_code.ilike.${like}`,
          `email.ilike.${like}`,
          digits.length >= 4 ? `mobile.ilike.%${digits}%` : null,
        ]
          .filter(Boolean)
          .join(","),
      )
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("payments")
      .select("id, application_id, amount, status, razorpay_order_id, razorpay_payment_id")
      .or(
        [
          `id.eq.${raw}`,
          `razorpay_order_id.ilike.${like}`,
          `razorpay_payment_id.ilike.${like}`,
          `application_id.eq.${raw}`,
        ].join(","),
      )
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("offline_invoices")
      .select("id, invoice_number, customer_name, customer_mobile, total_amount, payment_status")
      .or(
        [
          `invoice_number.ilike.${like}`,
          `customer_name.ilike.${like}`,
          digits.length >= 4 ? `customer_mobile.ilike.%${digits}%` : null,
        ]
          .filter(Boolean)
          .join(","),
      )
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const groups: SearchGroup[] = [];

  if (applications.data?.length) {
    groups.push({
      type: "applications",
      label: "Applications",
      results: applications.data.map((row) => ({
        id: row.id,
        title: row.service_name || "Application",
        subtitle: `${row.customer_name || "Customer"} · ${row.status || ""}`,
        href: `/admin/applications/${row.id}`,
      })),
    });
  }

  if (customers.data?.length) {
    groups.push({
      type: "customers",
      label: "Customers",
      results: customers.data.map((row) => ({
        id: row.id,
        title: row.name || "Customer",
        subtitle: row.mobile || row.email || "",
        href: `/admin/customers/${row.id}`,
      })),
    });
  }

  if (partners.data?.length) {
    groups.push({
      type: "partners",
      label: "Digi Partners",
      results: partners.data.map((row) => ({
        id: row.id,
        title: row.full_name || "Digi Partner",
        subtitle: `${row.partner_code || ""} · ${row.status || ""}`,
        href: `/admin/agency-partners/${row.id}`,
      })),
    });
  }

  if (payments.data?.length) {
    groups.push({
      type: "payments",
      label: "Payments",
      results: payments.data.map((row) => ({
        id: row.id,
        title: `₹${Math.round(Number(row.amount ?? 0)).toLocaleString("en-IN")}`,
        subtitle: `${row.status || ""} · ${row.razorpay_payment_id || row.razorpay_order_id || row.id.slice(0, 8)}`,
        href: row.application_id ? `/admin/applications/${row.application_id}` : "/admin/payments",
      })),
    });
  }

  if (!invoices.error && invoices.data?.length) {
    groups.push({
      type: "invoices",
      label: "Invoices",
      results: invoices.data.map((row) => ({
        id: row.id,
        title: row.invoice_number || "Invoice",
        subtitle: `${row.customer_name || ""} · ${row.payment_status || ""}`,
        href: `/admin/offline-invoices/${row.id}`,
      })),
    });
  }

  return NextResponse.json({ query: raw, groups });
}
