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

## Supabase

Run [supabase/schema.sql](/c:/Users/ASUS/Desktop/digiconnectdukanfaizalam/supabase/schema.sql) in your Supabase SQL editor to create the `leads` table.

The lead form posts to `/api/leads`. If Supabase env vars are missing, the UI still works and returns a setup message instead of failing silently.

## Google Auth setup

1. In Supabase Auth, enable the Google provider.
2. Add your Google OAuth client credentials in Supabase.
3. Set `NEXT_PUBLIC_SUPABASE_URL` in your app environment to your Supabase project URL.
4. Add the Supabase provider callback URL in Google Cloud and Supabase provider settings.
5. Add `${NEXT_PUBLIC_SITE_URL}/auth/callback` in Supabase Auth URL configuration.
6. Visit `/login` for Google sign-in and `/dashboard` for the protected account page.
## Deployment

Deploy to Vercel with the same environment variables added in project settings.
