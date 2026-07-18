import { goneResponse } from "@/lib/http/gone";

export const dynamic = "force-dynamic";

/**
 * Customer JWT v2 APIs are retired. Canonical customer auth is Supabase Auth
 * via /login/customer and /api/auth/*.
 */
function gone() {
  return goneResponse(
    "Customer Auth V2 has been retired. Please use /login/customer (Supabase Auth).",
    "CUSTOMER_AUTH_V2_GONE",
  );
}

export async function GET() {
  return gone();
}
export async function POST() {
  return gone();
}
export async function PUT() {
  return gone();
}
export async function PATCH() {
  return gone();
}
export async function DELETE() {
  return gone();
}
