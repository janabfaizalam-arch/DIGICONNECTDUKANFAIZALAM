import { NextResponse } from "next/server";

import { syncUserProfile } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const errorCode = requestUrl.searchParams.get("error");

  if (errorCode) {
    const message = errorDescription ?? "Login failed. Please try again.";
    return new NextResponse(
      `<script>
        if (window.opener) {
          window.opener.postMessage({ type: 'supabase-auth-error', message: ${JSON.stringify(message)} }, window.location.origin);
          window.close();
        } else {
          window.location.href = '/login?error=${encodeURIComponent(message)}';
        }
      </script>`,
      {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      },
    );
  }

  if (code) {
    const supabase = await getSupabaseServerClient();

    if (supabase) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error && data.user) {
        await syncUserProfile(data.user);
      }
    }
  }

  return new NextResponse(
    `<script>
      if (window.opener) {
        window.opener.postMessage({ type: 'supabase-auth-success' }, window.location.origin);
        window.close();
      } else {
        window.location.href = '/dashboard';
      }
    </script>`,
    {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
}
