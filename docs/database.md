# database.md — Database Design

> HOW data is stored. Any schema change must be recorded here first.

## 1. Technology
- Supabase Postgres 15+ with extensions `postgis` and `pgcrypto`
- Project name: `jalsaathi`
- Storage bucket: `issue-photos` (public read, server-only write)

## 2. ER overview
```
auth.users (Supabase)
   └── profiles (1:1)
          ├── issues (1:N, reporter_id)
          │      ├── upvotes (1:N)
          │      └── status_history (1:N)
          ├── upvotes (1:N, user_id)
          └── status_history (1:N, changed_by)

wards
   └── issues (1:N, ward_id)
```

## 3. Types
```
issue_type:   water_interruption | pipe_leak | drain_blockage | dirty_toilet
issue_status: reported | verified | in_progress | resolved | rejected
user_role:    citizen | admin
```

## 4. Tables

### wards
| Column | Type | Constraints |
|---|---|---|
| id | serial | PK |
| name | text | NOT NULL, UNIQUE |
| center | geography(Point,4326) | NOT NULL |

### profiles
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK, FK → auth.users.id ON DELETE CASCADE |
| full_name | text | NOT NULL, default `''` |
| role | user_role | NOT NULL, default `citizen` |
| created_at | timestamptz | NOT NULL, default `now()` |

Trigger: on new `auth.users` row, insert a `profiles` row with role `citizen`.

### issues
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK, default `gen_random_uuid()` |
| reporter_id | uuid | NOT NULL, FK → profiles.id |
| type | issue_type | NOT NULL |
| description | text | NOT NULL, length 10 to 500 |
| location | geography(Point,4326) | NOT NULL |
| address_text | text | optional |
| ward_id | int | FK → wards.id |
| photo_path | text | optional (path in bucket) |
| status | issue_status | NOT NULL, default `reported` |
| upvote_count | int | NOT NULL, default 0, CHECK >= 0 |
| created_at | timestamptz | NOT NULL, default `now()` |
| updated_at | timestamptz | NOT NULL, default `now()` |
| resolved_at | timestamptz | set when status becomes `resolved` |

### upvotes
| Column | Type | Constraints |
|---|---|---|
| issue_id | uuid | FK → issues.id ON DELETE CASCADE |
| user_id | uuid | FK → profiles.id ON DELETE CASCADE |
| created_at | timestamptz | NOT NULL, default `now()` |
| | | PRIMARY KEY (issue_id, user_id) |

Trigger: insert/delete on `upvotes` updates `issues.upvote_count`.

### status_history
| Column | Type | Constraints |
|---|---|---|
| id | bigserial | PK |
| issue_id | uuid | NOT NULL, FK → issues.id ON DELETE CASCADE |
| old_status | issue_status | nullable (null for first entry) |
| new_status | issue_status | NOT NULL |
| changed_by | uuid | FK → profiles.id |
| remark | text | optional, max 300 chars |
| changed_at | timestamptz | NOT NULL, default `now()` |

## 5. Indexes
| Index | Purpose |
|---|---|
| GIST on `issues.location` | Radius and bbox queries |
| `issues (status, created_at DESC)` | Lists and dashboard |
| `issues (type, created_at DESC)` | Hotspot window query |
| `issues (ward_id)` | Ward filter |
| `issues (reporter_id, created_at DESC)` | My reports, daily rate limit |
| `status_history (issue_id, changed_at)` | Timeline |

## 6. Allowed status transitions (enforced in the function)
```
reported    -> verified | rejected
verified    -> in_progress | rejected
in_progress -> resolved
resolved    -> (final)
rejected    -> (final)
```

## 7. Functions (in `002_functions.sql`)
| Function | Purpose |
|---|---|
| `check_duplicate(lat, lng, type, radius_m default 50, days default 7)` | Open issues of same type nearby |
| `change_issue_status(issue_id, new_status, admin_id, remark)` | Validates transition, updates issue, writes history, sets `resolved_at` |
| `get_hotspots(days default 30, min_reports default 3, radius_m default 200)` | Clusters and scores hotspots |
| `get_priority_issues(limit)` | Open issues sorted by priority |
| `get_stats()` | Totals, open count, resolved count, avg resolution hours, per ward and per type counts |
| `assign_ward(lat, lng)` | Nearest ward id |

### Function return shapes
| Function | Returns |
|---|---|
| `assign_ward` | `int` (ward id) |
| `check_duplicate` | up to 5 rows: `id, type, description, status, upvote_count, created_at, lat, lng, distance_m`, closest first |
| `change_issue_status` | the updated `issues` row. Errors: `FORBIDDEN:` (42501) → 403, `NOT_FOUND:` (P0002) → 404, `INVALID_TRANSITION:` (P0001) → 409. The API maps by message prefix. |
| `get_hotspots` | rows: `type, cluster_id, recurrence_count, open_reports, total_upvotes, oldest_open_days, priority_score, lat, lng, radius_m, ward_id, ward_name, issue_ids` ordered by `priority_score` desc. `radius_m` is the farthest member from the center (minimum 50), for drawing the red circle |
| `get_priority_issues` | open issues: `id, type, description, status, upvote_count, ward_id, ward_name, lat, lng, created_at, days_open, hotspot_recurrence, upvote_points, age_points, hotspot_points, priority_score`. The three points columns add up to `priority_score`. `limit` is capped at 100 |
| `get_stats` | one `jsonb`: `total, open, resolved, rejected, avg_resolution_hours, by_status{}, by_type{}, by_ward[{ward_id, ward_name, total, open, resolved}]` |

### Hotspot logic
```
Select non-rejected issues of last N days.
Per issue_type: ST_ClusterDBSCAN(ST_Transform(location::geometry, 32644), eps := radius_m, minpoints := min_reports)
Group by (type, cluster_id) ->
  recurrence_count = number of reports
  open_reports     = count where status in (reported, verified, in_progress)
  total_upvotes    = sum(upvote_count)
  oldest_open_days = max(days since created_at) among open reports
  center           = centroid of cluster
  priority         = open_reports*2 + total_upvotes + oldest_open_days*1.5 + recurrence_count*3
Order by priority DESC.
```

### Per-issue priority
`priority = upvote_count + days_open * 1.5 + (hotspot_recurrence_count * 3 if the issue is in a hotspot else 0)`, only for open issues.

## 8. Security
- RLS enabled on all tables, no public policies. Access only through the server using the service role key.
- Storage bucket: public read of photos (needed for display), writes only via server.
- Service role key exists only in server environment variables.
- Input constraints enforced in DB (CHECK lengths, enums) as well as in the API.
- Supabase exposes public functions through `/rest/v1/rpc` to the anon key. All functions in `002_functions.sql` (and the two trigger functions) are revoked from `public`, `anon` and `authenticated`; only `service_role` can execute the API functions. Table privileges are also revoked from `anon` and `authenticated`.
- `change_issue_status` re-checks that `admin_id` has role `admin` (defense in depth).

## 9. Seed data requirements (`003_seed.sql`)
- 6 wards with realistic Nagpur area names (e.g., Dharampeth, Sitabuldi, Sadar, Manish Nagar, Itwari, Laxmi Nagar) and approximate center coordinates.
- 1 demo admin profile and 3 demo citizen profiles (created through Supabase Auth, then role set).
- 60 to 80 issues spread across wards and types, created over the last 30 days.
- At least 3 clear hotspots (4 to 6 reports within 200 m, same type), including one that is already resolved partly.
- Mixed statuses, some upvotes, some status history rows.
- Seed rows are tagged by reporter id (the 4 seed users) so the script can be re-run safely (delete and reinsert only seed rows). Re-run it before a demo so all dates are relative to now.
- Seed users have fixed ids and the password `Demo@12345`: `admin@jalsaathi.demo`, `citizen1@jalsaathi.demo`, `citizen2@jalsaathi.demo`, `citizen3@jalsaathi.demo`. Remove or change them before the public deployment.
- Result: 70 issues (32 reported, 10 verified, 10 in progress, 13 resolved, 5 rejected) and 5 hotspots: Itwari pipe leak (6, top), Dharampeth drain blockage (5), Manish Nagar water interruption (4 counted, 1 rejected), Sadar dirty toilet (4), Laxmi Nagar pipe leak (5, 3 resolved). The newest Itwari report sits exactly at the cluster center and is the demo duplicate target (21.1402, 79.1131).

## 10. Important queries
- List issues with filters and bbox: `ST_Intersects(location, ST_MakeEnvelope(...)::geography)`.
- Own reports: `where reporter_id = $1 order by created_at desc`.
- Daily limit: `count(*) where reporter_id = $1 and created_at > now() - interval '1 day'`.

## 11. Conventions
- Table and column names: `snake_case`, plural table names (except `status_history`).
- All timestamps `timestamptz` in UTC.
- Do not store derived values (hotspots, priority) in tables.

## 12. Change log
| Date | Change | Reason |
|---|---|---|
| (initial) | Schema designed | Project start |
| 2026-10-16 | `001_schema.sql`, `002_functions.sql`, `003_seed.sql`, `sanity_checks.sql` written | Phase 2. No `updated_at` trigger: `change_issue_status` sets it. Function return shapes and privileges documented above |
