import { NextResponse } from "next/server";

import { syncUserProfile } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://digiconnectdukanfaizalam.vercel.app";
  const siteOrigin = new URL(siteUrl).origin;
  const code = requestUrl.searchParams.get("code");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const errorCode = requestUrl.searchParams.get("error");
  const callbackError = requestUrl.searchParams.get("error_code");

  const sendPopupResponse = (type: "supabase-auth-success" | "supabase-auth-error", message?: string) =>
    new NextResponse(
      `<script>
        if (window.opener) {
          window.opener.postMessage(
            ${JSON.stringify(message ? { type, message } : { type })},
            ${JSON.stringify(siteOrigin)}
          );
          window.close();
        } else {
          window.location.href = ${JSON.stringify(
            type === "supabase-auth-success" ? `${siteUrl}/dashboard` : `${siteUrl}/login${message ? `?error=${encodeURIComponent(message)}` : ""}`,
          )};
        }
      </script>`,
      {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      },
    );

  if (errorCode || callbackError) {
    const message = errorDescription ?? "Login failed. Please try again.";
    return sendPopupResponse("supabase-auth-error", message);
  }

  if (!code) {
    return sendPopupResponse("supabase-auth-error", "OAuth state error. Please try login again.");
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return sendPopupResponse("supabase-auth-error", "Supabase environment variables are missing.");
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return sendPopupResponse("supabase-auth-error", error?.message ?? "OAuth state error. Please try login again.");
  }

  await syncUserProfile(data.user);

  return sendPopupResponse("supabase-auth-success");
}
