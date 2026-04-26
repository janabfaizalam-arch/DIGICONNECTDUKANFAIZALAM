# DigiConnect Dukan

Modern, mobile-first and SEO-friendly portal for DigiConnect Dukan, powered by RNoS India Pvt Ltd.

## Stack

- Next.js App Router
- Tailwind CSS
- shadcn/ui style component structure
- Supabase lead storage
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

## Deployment

Deploy to Vercel with the same environment variables added in project settings.
