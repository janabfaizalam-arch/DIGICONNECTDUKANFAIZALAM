# DigiConnect Dukan

Modern, mobile-first and SEO-friendly portal for DigiConnect Dukan, powered by RNoS India Pvt Ltd.

## Stack

- Next.js App Router
- Tailwind CSS
- shadcn/ui style component structure
- Supabase lead storage
- Supabase Google Auth with protected dashboard
- Vercel-ready deployment

## Local setup

```bash
npm install
npm run dev
```

Create `.env.local` from `.env.example` and add:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_REDIRECT_PATH`

## Supabase

Run [supabase/schema.sql](/c:/Users/ASUS/Desktop/digiconnectdukanfaizalam/supabase/schema.sql) in your Supabase SQL editor to create the `leads` table.

The lead form posts to `/api/leads`. If Supabase env vars are missing, the UI still works and returns a setup message instead of failing silently.

## Google Auth setup

1. In Supabase Auth, enable the Google provider.
2. Add your Google OAuth client credentials in Supabase.
3. Use this Supabase project URL in your app environment:
   - `https://oqcudhmnsmqwlfzlrvfw.supabase.co`
4. Add this Google OAuth callback URL in Google Cloud and Supabase provider settings:
   - `https://oqcudhmnsmqwlfzlrvfw.supabase.co/auth/v1/callback`
5. Add these app redirect URLs in Supabase Auth URL configuration:
   - `http://localhost:3000/auth/callback`
   - `https://your-domain.com/auth/callback`
6. Visit `/login` for Google sign-in and `/dashboard` for the protected account page.
## Deployment

Deploy to Vercel with the same environment variables added in project settings.
