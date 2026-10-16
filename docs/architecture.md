# architecture.md — System Architecture

> HOW the system is structured. Must stay consistent with PRD.md, database.md and rules.md.

## 1. Tech stack
| Layer | Choice | Reason |
|---|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS | Required stack, good routing and SSR |
| Map | Leaflet + react-leaflet, OpenStreetMap tiles | Free, no API key |
| Charts | Chart.js (react-chartjs-2) | Simple dashboard charts |
| Backend | Node.js 20 + Express 4 | Required stack |
| Database | Supabase Postgres + PostGIS | Geo queries for hotspots |
| Auth | Supabase Auth (email + Google) | One service for DB and auth |
| File storage | Supabase Storage (bucket `issue-photos`) | Photos |
| Hosting | Vercel (client), Render (server) | Free tiers |

## 2. Overall architecture
```
User (browser)
   |
Next.js client (Vercel)
   |-- supabase-js: login only (gets access token)
   |-- fetch: REST calls with Bearer token
   |
Express API (Render)
   |-- auth middleware: verify token, load role
   |-- routes -> services -> Supabase (service role key)
   |
Supabase: Postgres + PostGIS, Storage, Auth
```
The client never queries the database directly. All data access goes through Express.

## 3. Application flow
Report, Verify, In Progress, Resolved (or Rejected). Hotspots and priority are computed on read from SQL functions, not stored.

## 4. Authentication flow
```
Client -> Supabase Auth (login) -> access token (JWT)
Client -> Express (Authorization: Bearer <token>)
Express -> supabase.auth.getUser(token) -> user id
Express -> profiles table -> role
Express -> allow or deny (401 / 403)
```

## 5. Authorization
| Route group | Rule |
|---|---|
| Public GET | No token needed |
| Citizen actions | `requireAuth` |
| Admin actions | `requireAuth` + `requireRole('admin')` |
Admin role is set manually in `profiles.role`; no API can grant it.

## 6. Data flow: report an issue
```
Report form -> POST /api/issues/check-duplicate (optional suggestion)
            -> POST /api/issues (multipart: fields + photo)
Express: validate -> rate limit check -> upload photo -> insert issue
         -> assign ward -> insert status_history (reported)
Client: redirect to /issues/[id]
```

## 7. Data flow: hotspots and priority
```
Admin dashboard -> GET /api/hotspots
Express -> rpc get_hotspots(days, min_reports, radius_m)
Postgres: ST_ClusterDBSCAN per issue type -> aggregate -> score -> sorted list
```

## 8. Folder structure
```
jalsaathi/
├── docs/                      # 7 source-of-truth files
├── client/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx           # map + list
│   │   ├── login/page.tsx
│   │   ├── report/page.tsx
│   │   ├── my-reports/page.tsx
│   │   ├── about/page.tsx
│   │   ├── issues/[id]/page.tsx
│   │   └── admin/
│   │       ├── page.tsx
│   │       └── issues/[id]/page.tsx
│   ├── components/
│   │   ├── ui/                # Button, Card, Badge, Input, Modal, Spinner, EmptyState
│   │   ├── map/               # IssueMap, PinPicker, HotspotLayer
│   │   ├── issues/            # IssueCard, IssueList, StatusBadge, StatusTimeline, UpvoteButton
│   │   ├── admin/             # StatCard, PriorityTable, HotspotList
│   │   └── layout/            # Navbar, Footer
│   ├── lib/
│   │   ├── api.ts             # fetch wrapper (adds token)
│   │   ├── supabase.ts        # browser client (auth only)
│   │   ├── constants.ts       # statuses, issue types, colors
│   │   └── types.ts
│   └── .env.example
└── server/
    ├── src/
    │   ├── index.js
    │   ├── app.js
    │   ├── config/env.js
    │   ├── lib/supabase.js
    │   ├── middleware/        # auth.js, requireRole.js, validate.js, rateLimit.js, errorHandler.js
    │   ├── routes/            # issues.js, hotspots.js, stats.js, admin.js, me.js, wards.js
    │   ├── services/          # issueService.js, hotspotService.js, statsService.js, storageService.js
    │   └── utils/             # response.js, constants.js
    ├── sql/                   # 001_schema.sql, 002_functions.sql, 003_seed.sql, sanity_checks.sql
    └── .env.example
```

## 9. API endpoints
Base: `/api`. Envelope: `{ "data": ..., "error": null }` or `{ "data": null, "error": { "code": "...", "message": "..." } }`.

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/health` | Public | Uptime check |
| GET | `/api/issues` | Public | List with filters: `status, type, ward_id, bbox, limit, offset` |
| GET | `/api/issues/:id` | Public | Detail + status history |
| POST | `/api/issues/check-duplicate` | Citizen | Nearby open issue of same type |
| POST | `/api/issues` | Citizen | Create (multipart, field `photo` optional) |
| POST | `/api/issues/:id/upvote` | Citizen | Add upvote |
| DELETE | `/api/issues/:id/upvote` | Citizen | Remove upvote |
| GET | `/api/me` | Citizen | Profile and role |
| GET | `/api/me/issues` | Citizen | Own reports |
| GET | `/api/wards` | Public | Ward list |
| GET | `/api/hotspots` | Public | Hotspots with score |
| GET | `/api/admin/priority` | Admin | Priority-sorted open issues |
| GET | `/api/admin/stats` | Admin | Dashboard numbers |
| PATCH | `/api/admin/issues/:id/status` | Admin | Change status with remark |

## 10. Component structure rules
- Pages fetch data and compose components; components are presentational where possible.
- Map components are client-only (`dynamic(..., { ssr: false })`) because Leaflet needs `window`.
- Status colors and labels come only from `lib/constants.ts`.

## 11. Important technical decisions
| ID | Decision | Reason |
|---|---|---|
| D1 | Supabase Auth instead of Clerk | One dashboard, fewer services, simple JWT verify in Express |
| D2 | Client does not query DB directly; RLS enabled with no public policies | Single enforcement point (Express), simpler security story |
| D3 | Hotspots computed in SQL on read | Always fresh, no sync jobs, easy to explain |
| D4 | ST_ClusterDBSCAN in UTM 44N (EPSG:32644) | Meter-based radius for Nagpur region |
| D5 | Ward from nearest ward center | No boundary data needed in MVP |
| D6 | No email/SMS notifications in MVP | Time limit; in-app status is enough |
| D7 | Photos uploaded through Express (multer, memory storage, 2 MB limit) | Server validates type and size |
| D8 | SQL functions executable by `service_role` only; browser roles have no table privileges | Supabase exposes public functions at `/rpc`; without this the anon key could call `change_issue_status` |

## 12. Environment variables
Server: `NODE_ENV, PORT, CLIENT_ORIGIN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY`.
Client: `NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY`.
Never commit real values. Only `.env.example` is committed.

## 13. Deployment
- Client on Vercel, root `client`.
- Server on Render, root `server`, build `npm install`, start `node src/index.js`, health path `/health`.
- Uptime pinger hits `/health` every 5 minutes (Render free tier sleeps).
- CORS allows only `CLIENT_ORIGIN`.

## 14. Change log
| Date | Change | Reason |
|---|---|---|
| (initial) | Document created | Project start |
| 2026-10-16 | Added decision D8 | Phase 2 security review |
