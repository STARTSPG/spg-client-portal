# Client Portal

Next.js (App Router) + Supabase + Tailwind scaffold for an online PT client portal.

## Setup

1. `cp .env.local.example .env.local` and fill in your Supabase project URL + anon key.
2. `npm install`
3. Run `supabase/schema.sql` in the Supabase SQL editor.
4. `npm run dev`

## Structure

- `app/login` — email/password sign in.
- `app/page.tsx` — role-based redirect (coach → `/admin`, client → `/dashboard`).
- `app/dashboard` — client area (placeholder).
- `app/admin` — coach area (placeholder).
- `middleware.ts` — session refresh + route protection + role gating.
- `lib/supabase/{client,server,middleware}.ts` — Supabase clients for each context.
- `supabase/schema.sql` — tables, triggers, RLS policies.

## Roles

`public.users.role` is `'client'` or `'coach'`. New auth users get a `client` row automatically via trigger. Promote a coach manually in SQL:

```sql
update public.users set role = 'coach' where email = 'coach@example.com';
```
