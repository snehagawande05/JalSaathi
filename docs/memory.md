# memory.md — Project Memory and Current State

> Update this file after every meaningful change. Read it first in every session.

## Current phase
Phase 7 — Testing, Polish, and Final Project Review

## Current task
Final integration review, mobile test, and preparing demo.

## Completed
- [x] Problem statement selected: PS 05 (Water and Sanitation Issues)
- [x] Tech stack decided
- [x] Auth decided: Supabase Auth, roles in `profiles.role`
- [x] Color palette decided
- [x] Documentation files created (initial versions)
- [x] Phase 1 code: client and server scaffold, `/health`, ServerStatus card (server smoke-tested, client type-checks and renders)
- [x] Phase 2 SQL: `001_schema.sql`, `002_functions.sql`, `003_seed.sql`, `sanity_checks.sql` executed on live Supabase project; 70 issues, 6 wards, 5 hotspots active; storage bucket `issue-photos` verified.
- [x] Phase 3 Backend API:
  - `GET /health`
  - `GET /api/wards`
  - `GET /api/hotspots`
  - `GET /api/issues` (with filters: status, type, ward_id, bbox, limit, offset; coordinates decoded, `reporter_id` concealed)
  - `GET /api/issues/:id` (with status timeline, upvoted_by_me, photo_url)
  - `POST /api/issues/check-duplicate` (RPC check_duplicate)
  - `POST /api/issues` (multipart with multer photo upload, daily 5 report anti-spam rate limit, auto ward assignment)
  - `POST /api/issues/:id/upvote` & `DELETE /api/issues/:id/upvote`
  - `GET /api/me` & `GET /api/me/issues`
  - `GET /api/admin/priority` & `GET /api/admin/stats`
  - `PATCH /api/admin/issues/:id/status` (enforcing valid lifecycle transitions and admin role)
  - All endpoints smoke-tested against live Supabase database with citizen and admin roles.
- [x] Phase 4 Authentication & Client Integration:
  - AuthProvider context (`client/lib/authContext.tsx`) syncing Supabase auth with `/api/me`.
  - `/login` page with standard login and 1-click Demo accounts (Admin and Citizens).
  - Responsive Navbar with role awareness, active indicators, and notifications bell.
- [x] Phase 5 UI Foundation & Citizen Features (Built precisely to match UI mockups in `imgs/`):
  - Home page (`/`): Real Impact stats, Leaflet Nagpur map with status-colored pins and DBSCAN hotspot buffers, top hotspots strip, and recent community reports.
  - Report page (`/report`): Interactive pin picker map with GPS auto-detect, 4 category cards, auto duplicate detection warning, photo upload, and guidance tips.
  - My Reports page (`/my-reports`): 2-column layout with metrics, report history list, and live status resolution timeline.
  - Issue Detail page (`/issues/[id]`): Full issue view, location map, status timeline, and "Me Too" upvote button.
  - About page (`/about`): Problem statement, mission & vision, 4-step workflow, and four core pillars.
- [x] Phase 6 Admin Dashboard (`/admin`):
  - Role-guarded dashboard with priority maintenance queue, DBSCAN hotspots list, ward breakdown analytics, and status update modal.

## Files currently being modified
- None

## Pending
- [ ] Final: Git repository initialization and push to GitHub (deferred per user instruction until project completion)

## Known bugs / current errors
- None

## Important decisions
| Decision | Detail |
|---|---|
| Project | JalSaathi, YCCE NSS hackathon, PS 05 |
| Frontend | Next.js 15 App Router, TypeScript, Tailwind, Leaflet |
| Backend | Node.js + Express |
| Database | Supabase Postgres + PostGIS |
| Auth | Supabase Auth (email + Google); not Clerk |
| Admin | Set manually in `profiles.role` |
| Data access | Only through Express; RLS on with no public policies |
| Hotspot rule | 3 or more same-type reports within 200 m in 30 days |
| Notifications | In-app only for MVP |
| Language | Code and docs in English only |

## Recent changes
- Phase 3 backend implementation completed:
  - Implemented `geo.js` utility for decoding hex EWKB geography points into `lat` and `lng`.
  - Implemented `storageService.js` for uploading photos to Supabase Storage bucket `issue-photos` and generating public URLs.
  - Implemented `wardService.js` and `GET /api/wards`.
  - Implemented `hotspotService.js` and `GET /api/hotspots`.
  - Implemented `statsService.js` (`getStats`, `getPriorityIssues`).
  - Implemented `issueService.js` with duplicate checking, issue creation with daily rate limiting, upvoting, status transitions, and user issues.
  - Connected `routes/issues.js`, `routes/hotspots.js`, `routes/wards.js`, `routes/admin.js`, `routes/me.js`.
  - Tested all endpoints with live Supabase database.

## Next task
Start Phase 4 (Authentication & Client Auth helpers).

## Deployment status
| Item | Status |
|---|---|
| GitHub repo | Not created |
| Supabase project | Not created |
| Render (server) | Not deployed |
| Vercel (client) | Not deployed |
| Uptime pinger | Not set |

## Judging notes (for the final demo)
| Rubric | Weight | Our answer |
|---|---|---|
| Technical correctness | 25% | Clean REST API, PostGIS clustering, role-based access, validated inputs |
| Innovation and depth | 20% | Recurrence detection + transparent priority score + duplicate suggestion |
| Problem understanding | 15% | Water and sanitation issue types, ward-wise view, status lifecycle |
| Scalability and feasibility | 15% | Stateless API, indexed geo queries, free-tier deployable, future SMS/WhatsApp |
| UI/UX and presentation | 15% | Mobile-first map, color-coded status, clear timeline |
| Ethics and domain relevance | 10% | No personal data public, fake-report controls, honest limitations |

### Mentor checklist answers (prepare)
- Logic and assumptions: hotspot radius 200 m and threshold 3 are configurable parameters; explain why.
- Data justified: sample data modeled on realistic Nagpur areas; not real municipal data.
- Limitations: sample data, ward by nearest center, GPS accuracy, fake reports reduced not eliminated.
- Practical and ethical: no personal data exposed, admin actions logged, no health advice.

## Session log
| Date | Work done | Next |
|---|---|---|
| (start) | Documentation created | Phase 1 setup |
| 2026-10-16 | Phase 1 code verified, Phase 2 SQL written and tested locally | Manual Supabase steps, then Phase 3 |
