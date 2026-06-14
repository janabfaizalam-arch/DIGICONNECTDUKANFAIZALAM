import { NextResponse } from "next/server";

export async function GET() {
  const keys = Object.keys(process.env).filter(k => k.includes("SUPABASE") || k.includes("URL") || k.includes("PORT") || k.includes("KEY"));
  return NextResponse.json({
    keys,
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
  });
}
