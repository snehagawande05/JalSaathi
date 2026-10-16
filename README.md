# JalSaathi

Community water and sanitation issue tracker. Report problems with a map pin and photo, upvote, and watch admins resolve them. Hotspots and a priority list help maintenance teams act first where it matters.

Stack: Next.js 15 + Tailwind, Node.js/Express, Supabase (Postgres + PostGIS + Storage + Auth), Vercel + Render.

All planning lives in `docs/`: `PRD.md`, `architecture.md`, `database.md`, `rules.md`, `phases.md`, `design.md`, `memory.md`. Read them before changing anything.

## Run locally

```
# 1) API (http://localhost:4000)
cd server
cp .env.example .env      # then fill in Supabase values
npm install
npm run dev

# 2) Web app (http://localhost:3000), in a second terminal
cd client
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000. The "Server connection" card should show Connected.

## Phase 1 checklist (manual steps)

1. GitHub: create repo `jalsaathi`, push this folder.
2. Supabase: new project, then SQL editor: `create extension if not exists postgis; create extension if not exists pgcrypto;`
3. Supabase Auth: enable Email and Google providers.
4. Fill `server/.env` (URL and service role key) and `client/.env.local` (URL and anon key).
5. Verify: client home shows Connected.
6. Tick the boxes in `docs/phases.md`, update `docs/memory.md`, tag `phase-1-done`.

## Phase 2 checklist (database)

In the Supabase SQL editor, run these files in order. Each one is safe to run again.

1. `server/sql/001_schema.sql` (types, tables, indexes, triggers, RLS, storage bucket)
2. `server/sql/002_functions.sql` (hotspots, priority, duplicate check, status changes, stats)
3. `server/sql/003_seed.sql` (6 wards, 4 demo users, 70 sample issues, 5 hotspots)
4. `server/sql/sanity_checks.sql` (Part A: all 34 rows must say PASS. Part B: eight PASS notices)

Demo admin login: `admin@jalsaathi.demo` / `Demo@12345`. To make your own account admin, use the one-liner at the top of `003_seed.sql`. Re-run `003_seed.sql` before a demo so dates stay inside the 30-day window. Tag `phase-2-done` when all checks pass.

Never commit `.env` files or real keys.
