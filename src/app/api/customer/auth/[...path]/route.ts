import { goneResponse } from "@/lib/http/gone";

export const dynamic = "force-dynamic";

/**
 * Customer JWT v1 APIs are retired. WhatsApp OTP (when enabled) uses
 * /api/auth/send-whatsapp-otp and /api/auth/verify-whatsapp-otp with
 * Supabase sessions — not parallel JWT cookies.
 */
function gone() {
  return goneResponse(
    "Customer JWT Auth V1 has been retired. Please use /login/customer (Supabase Auth).",
    "CUSTOMER_AUTH_V1_GONE",
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
