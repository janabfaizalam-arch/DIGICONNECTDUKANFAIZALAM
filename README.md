# DigiConnect Dukan

Modern, mobile-first and SEO-friendly portal for DigiConnect Dukan, powered by RNoS India Pvt Ltd.

## Stack

- Next.js App Router
- Tailwind CSS
- shadcn/ui style component structure
- Supabase lead storage
<<<<<<< HEAD
- Supabase Google Auth with protected dashboard
=======
>>>>>>> 9e4f100b0d1b7a3cfda460f7911ae8bc35f188d2
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
<<<<<<< HEAD
- `NEXT_PUBLIC_SUPABASE_REDIRECT_PATH`
=======
>>>>>>> 9e4f100b0d1b7a3cfda460f7911ae8bc35f188d2

## Supabase

Run [supabase/schema.sql](/c:/Users/ASUS/Desktop/digiconnectdukanfaizalam/supabase/schema.sql) in your Supabase SQL editor to create the `leads` table.

The lead form posts to `/api/leads`. If Supabase env vars are missing, the UI still works and returns a setup message instead of failing silently.

<<<<<<< HEAD
## Google Auth setup

1. In Supabase Auth, enable the Google provider.
2. Add your Google OAuth client credentials in Supabase.
3. Add these redirect URLs in Supabase and Google Cloud:
   - `http://localhost:3000/auth/callback`
   - `https://your-domain.com/auth/callback`
4. Visit `/login` for Google sign-in and `/dashboard` for the protected account page.

=======
>>>>>>> 9e4f100b0d1b7a3cfda460f7911ae8bc35f188d2
## Deployment

Deploy to Vercel with the same environment variables added in project settings.
