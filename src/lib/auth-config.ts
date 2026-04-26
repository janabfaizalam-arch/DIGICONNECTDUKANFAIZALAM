export function getAuthRedirectUrl() {
  const siteUrl =
    typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const redirectPath = process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_PATH || "/auth/callback";

  return new URL(redirectPath, siteUrl).toString();
}
