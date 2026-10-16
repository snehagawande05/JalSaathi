# phases.md — Development Roadmap

> IN WHAT ORDER we build. Tick boxes as work completes. A phase is done only when its completion criteria are met. Tag the repo at the end of each phase.

Target: working demo in about 3 to 4 days.

---

## Phase 1 — Project setup
**Objective:** Empty but connected client, server, and Supabase project.

**Tasks**
- [ ] Create GitHub repo `jalsaathi` with `client/`, `server/`, `docs/` (deferred until end of project)
- [x] Copy the 7 docs into `docs/`
- [x] `create-next-app` in `client` (TypeScript, Tailwind, App Router)
- [x] `npm init` in `server`, install approved server dependencies
- [x] Create Supabase project, enable `postgis` and `pgcrypto`
- [x] Enable Supabase Auth: email and Google
- [x] Add `.env.example` in both apps, `.gitignore` for env files
- [x] Server `/health` route
- [x] Client home page shows "Server connection: Connected"

**Files:** `server/src/index.js`, `server/src/app.js`, `client/app/page.tsx`, `.env.example` files
**Dependencies:** none
**Expected result:** Local client talks to local server.
**Completion criteria:** Connected badge visible; no secrets in git.

---

## Phase 2 — Database and seed data
**Objective:** Schema, functions, and realistic Nagpur sample data.

**Tasks**
- [x] `001_schema.sql`: types, tables, indexes, triggers, RLS, storage bucket
- [x] `002_functions.sql`: `check_duplicate`, `change_issue_status`, `get_hotspots`, `get_priority_issues`, `get_stats`, `assign_ward`
- [x] `003_seed.sql`: wards, demo users, 70 issues, 5 hotspots
- [x] `sanity_checks.sql`: expected values in comments
- [x] Set one demo user as admin (seed sets `admin@jalsaathi.demo`; use the one-liner in `003_seed.sql` for your own account)

**Files:** `server/sql/*`
**Dependencies:** Phase 1
**Expected result:** `select * from get_hotspots()` returns at least 3 rows.
**Completion criteria:** All sanity checks match expected values.

---

## Phase 3 — Backend API
**Objective:** All endpoints from `architecture.md` section 9 working without auth guard first, then guarded.

**Tasks**
- [x] Supabase server client, env validation
- [x] Response helper and central error handler
- [x] `GET /api/issues`, `GET /api/issues/:id`, `GET /api/wards`
- [x] `GET /api/hotspots`
- [x] `POST /api/issues` with multer upload and zod validation
- [x] `POST /api/issues/check-duplicate`
- [x] Upvote add and remove
- [x] Admin: status update, priority, stats
- [x] `helmet`, CORS, rate limiting

**Files:** `server/src/routes/*`, `services/*`, `middleware/*`
**Dependencies:** Phase 2
**Expected result:** Every endpoint tested with a REST client.
**Completion criteria:** Correct data and error codes for each endpoint.

---

## Phase 4 — Authentication
**Objective:** Login, roles, protected routes.

**Tasks**
- [x] Client Supabase auth helpers, `/login` page (email + 1-click Demo logins for Admin & Citizens)
- [x] Server `requireAuth` and `requireRole('admin')`
- [x] `GET /api/me`, `GET /api/me/issues`
- [x] Client route guard for `/report`, `/my-reports`, `/admin`
- [x] Navbar shows user and role-based links

**Files:** `client/app/login`, `client/lib/supabase.ts`, `client/lib/api.ts`, `server/src/middleware/auth.js`
**Dependencies:** Phase 3
**Expected result:** Guest, citizen and admin see different things.
**Completion criteria:** 401 for no token, 403 for citizen on admin routes, admin can access admin routes.

---

## Phase 5 — UI foundation and citizen features
**Objective:** Design system in code and the full citizen journey matching mockups.

**Tasks**
- [x] Tailwind theme tokens from `design.md` and UI mockups
- [x] UI components matching civic mockup designs
- [x] Navbar, Footer with brand identity and active status
- [x] Home: map with status-colored pins, filters, real impact stat cards, list
- [x] Issue detail with timeline and upvote ("Me Too")
- [x] Report page: interactive pin picker, form, duplicate detection alert, photo upload
- [x] My reports page: 2-column split, metric cards, status history timeline
- [x] About page: mission, vision, problem statement, workflow

**Files:** `client/components/*`, `client/app/*`
**Dependencies:** Phase 4
**Expected result:** A citizen can report and track an issue on mobile and desktop.
**Completion criteria:** Citizen journey in PRD works end to end.

---

## Phase 6 — Admin dashboard
**Objective:** Hotspots, priority, and status management.

**Tasks**
- [x] Stat cards (total, open, resolved, avg resolution time)
- [x] Ward breakdown and status distribution
- [x] Hotspot list and map layer (200m red circles with recurrence)
- [x] Priority table with score breakdown (upvotes + age + cluster)
- [x] Status update modal with remark
- [x] Reject fake report action

**Files:** `client/app/admin/*`, `client/components/admin/*`
**Dependencies:** Phase 5
**Expected result:** Admin journey in PRD works.
**Completion criteria:** Status change appears on the citizen's timeline.

---

## Phase 7 — Testing and polish
**Objective:** Stable, accessible, demo-ready app.

**Tasks**
- [ ] Walk through all user journeys
- [ ] Test 401, 403, validation errors, rate limit
- [ ] Loading, empty, error states everywhere
- [ ] Mobile test at 360 px
- [ ] Accessibility pass (labels, contrast, alt text)
- [ ] `/about` page: method, formula, limitations, ethics
- [ ] Fix known bugs from `memory.md`

**Dependencies:** Phase 6
**Expected result:** No blocking bugs.
**Completion criteria:** Demo script runs twice without errors.

---

## Phase 8 — Deployment and demo
**Objective:** Live URLs and presentation.

**Tasks**
- [ ] Deploy server on Render, set env vars, health check `/health`
- [ ] Deploy client on Vercel, set `NEXT_PUBLIC_*` env vars
- [ ] Set `CLIENT_ORIGIN` on Render and redeploy
- [ ] Uptime pinger on `/health`
- [ ] Add Vercel domain to Supabase Auth redirect URLs
- [ ] Final demo deck mapped to the judging rubric
- [ ] Prepare answers for mentor checklist (logic, datasets, limitations, ethics)
- [ ] Record a backup demo video

**Dependencies:** Phase 7
**Expected result:** Public working demo.
**Completion criteria:** Deployed client shows live data; login works in production.

---

## Demo script (reference)
1. Citizen reports a pipe leak, duplicate suggestion appears.
2. Map shows a recurring hotspot near the report.
3. Admin dashboard ranks that hotspot at the top.
4. Admin moves the issue to Resolved with a remark.
5. Citizen sees the update in My reports.
