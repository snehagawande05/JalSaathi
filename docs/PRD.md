# PRD.md — JalSaathi (Product Requirements)

> Source of truth for WHAT we are building. Hackathon: YCCE NSS, Theme: Social Welfare and Community Impact, PS 05.

## 1. Project name
JalSaathi (working name, can be renamed without code impact)

## 2. Overview
A community platform where residents report water and sanitation problems (leaks, supply interruptions, blocked drains, dirty public toilets), track resolution status, and where admins see recurring problem locations and a prioritized maintenance list.

## 3. Problem statement (PS 05)
Communities face recurring water interruptions, leaks, or sanitation issues without a reliable shared record of reports and resolution status.

## 4. Goal
Build a working prototype that:
1. Maps water and sanitation problems.
2. Detects recurring locations (hotspots).
3. Helps prioritize maintenance.

## 5. Target users and roles
| Role | Login | Capabilities |
|---|---|---|
| Guest | No | View map, issue list, issue details, hotspots |
| Citizen | Yes | Everything a guest can, plus report issue, upvote, view own reports |
| Admin | Yes (role set manually in DB) | Everything a citizen can, plus update status, view dashboard, priority list, reject fake reports |

## 6. Core features (MVP)
| ID | Feature | Purpose |
|---|---|---|
| F1 | Report issue (type, map pin, description, optional photo) | Create the shared record |
| F2 | Duplicate check on report | Reduce duplicate reports: suggests upvoting a nearby open issue of the same type |
| F3 | Public map and list with filters (type, status, ward) | Transparency |
| F4 | Status tracking: Reported, Verified, In Progress, Resolved, Rejected | Resolution visibility |
| F5 | Upvote ("Me too") | Signal severity without duplicates |
| F6 | Recurring hotspot detection | Core of PS 05 |
| F7 | Priority score and maintenance list | Core of PS 05 |
| F8 | Admin dashboard (counts, avg resolution time, per-ward stats) | Decision support |
| F9 | My reports page with status history | Closes the loop for the citizen (in-app "notify") |

## 7. Functional requirements
- FR1: A citizen can submit an issue with type, location (lat/lng from map pin), description (10 to 500 chars), optional photo (jpg/png/webp, max 2 MB).
- FR2: System assigns the ward automatically from the pin location (nearest ward center in MVP).
- FR3: Before submit, system checks for an open issue of the same type within 50 m in the last 7 days and shows it.
- FR4: One user can upvote an issue once. Upvote can be removed.
- FR5: Only admins can change status. Every change is stored in status history with optional remark.
- FR6: Hotspot = 3 or more non-rejected reports of the same type within 200 m in the last 30 days.
- FR7: Priority score (per hotspot) = open_reports x 2 + total_upvotes + oldest_open_days x 1.5 + recurrence_count x 3. Per-issue score is defined in database.md.
- FR8: Guests can read all public data without login.
- FR9: A citizen can report at most 5 issues per day (anti-spam).

## 8. Non-functional requirements
- Performance: map loads under 3 s with 500 issues (bounding-box query, limit 500).
- Security: no secrets in client; Supabase service key only on server; role checks on server.
- Privacy: no phone/email shown publicly; reporter shown as "Resident"; photo guideline says avoid faces.
- Usability: mobile-first, works on 360 px width.
- Accessibility: WCAG AA contrast, keyboard-usable forms, alt text on photos.
- Availability: free-tier hosting; uptime ping on `/health`.

## 9. Pages and screens
| Route | Screen | Access |
|---|---|---|
| `/` | Map + issue list + filters | Public |
| `/issues/[id]` | Issue detail, status timeline, upvote | Public (upvote needs login) |
| `/report` | Report form with map pin | Citizen |
| `/my-reports` | Own reports and status | Citizen |
| `/login` | Email/password + Google | Public |
| `/admin` | Dashboard, hotspots, priority list | Admin |
| `/admin/issues/[id]` | Status update with remark | Admin |
| `/about` | Problem, method, limitations (for judges) | Public |

## 10. User journeys
1. Citizen: open app, sees map, logs in, taps "Report", drops pin, picks type, adds photo, sees duplicate suggestion (or not), submits, later sees status change in My reports.
2. Admin: logs in, opens dashboard, sees top hotspot, opens issue, marks Verified, then In Progress, then Resolved with remark.
3. Guest: opens map, filters pipe leaks in Ward 7, opens a hotspot, reads timeline.

## 11. Authentication requirements
- Supabase Auth: email/password and Google.
- Roles stored in `profiles.role` (`citizen` default, `admin` set manually).
- Server verifies the access token on every protected route.

## 12. Admin requirements
- Cannot self-register as admin.
- Can update status, add remark, reject fake reports.
- Can view hotspots, priority list, stats.

## 13. API requirements
See `architecture.md` section 9. All responses use a common JSON envelope.

## 14. Notifications
MVP: in-app only (status visible on My reports and issue timeline). No email or SMS.

## 15. Integrations
- Supabase (DB, Auth, Storage)
- OpenStreetMap tiles via Leaflet (no API key)

## 16. Future features (not built now)
- WhatsApp/SMS reporting for low-internet users
- Email or push notification on status change
- Real municipal ward boundaries and complaint data import
- Maintenance team assignment and SLA timers
- Multilingual UI (Marathi, Hindi)

## 17. Out of scope
- Payments, chat, social feed
- ML/AI prediction
- Native mobile app
- Real government integration

## 18. Limitations (to state honestly to mentors)
- Sample data only; not real municipal data.
- Ward assignment uses nearest ward center, not true boundaries.
- Fake reports reduced by login, rate limit, upvotes and admin review, not eliminated.
- GPS pin can be inaccurate; user can drag the pin.

## 19. Ethics
- Public data is limited to issue info; no personal data.
- Medical or health advice is not given.
- Admin actions are logged in status history.

## 20. Success criteria for demo
- End-to-end flow works: report, hotspot appears, admin prioritizes, status resolved, citizen sees update.
- Rubric mapping is prepared in `docs/judging-notes` section of `memory.md`.
