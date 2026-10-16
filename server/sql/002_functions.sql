-- 002_functions.sql
-- Phase 2: assign_ward, check_duplicate, change_issue_status, get_hotspots, get_priority_issues, get_stats.
-- Design reference: docs/database.md (sections 6 and 7)
-- Safe to run more than once. Run after 001_schema.sql.
--
-- Error convention for change_issue_status (the API maps the message prefix to an HTTP status):
--   FORBIDDEN:          -> 403   (errcode 42501)
--   NOT_FOUND:          -> 404   (errcode P0002)
--   INVALID_TRANSITION: -> 409   (errcode P0001)

-- ---------------------------------------------------------------------------
-- assign_ward(lat, lng) -> nearest ward id (D5: nearest ward center)
-- ---------------------------------------------------------------------------
create or replace function assign_ward(p_lat double precision, p_lng double precision)
returns int
language sql
stable
set search_path = public, extensions
as $$
  select w.id
  from wards w
  order by w.center <-> ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- check_duplicate(lat, lng, type, radius_m, days)
-- Open issues of the same type nearby, closest first (max 5).
-- ---------------------------------------------------------------------------
create or replace function check_duplicate(
  p_lat      double precision,
  p_lng      double precision,
  p_type     issue_type,
  p_radius_m double precision default 50,
  p_days     int default 7
)
returns table (
  id           uuid,
  type         issue_type,
  description  text,
  status       issue_status,
  upvote_count int,
  created_at   timestamptz,
  lat          double precision,
  lng          double precision,
  distance_m   numeric
)
language sql
stable
set search_path = public, extensions
as $$
  with pin as (
    select ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography as g
  )
  select
    i.id,
    i.type,
    i.description,
    i.status,
    i.upvote_count,
    i.created_at,
    ST_Y(i.location::geometry),
    ST_X(i.location::geometry),
    round(ST_Distance(i.location, pin.g)::numeric, 1)
  from issues i, pin
  where i.type = p_type
    and i.status in ('reported', 'verified', 'in_progress')
    and i.created_at > now() - make_interval(days => p_days)
    and ST_DWithin(i.location, pin.g, p_radius_m)
  order by ST_Distance(i.location, pin.g)
  limit 5;
$$;

-- ---------------------------------------------------------------------------
-- change_issue_status(issue_id, new_status, admin_id, remark)
-- Validates admin role and transition, updates the issue, writes history.
--   reported    -> verified | rejected
--   verified    -> in_progress | rejected
--   in_progress -> resolved
--   resolved, rejected are final
-- ---------------------------------------------------------------------------
create or replace function change_issue_status(
  p_issue_id   uuid,
  p_new_status issue_status,
  p_admin_id   uuid,
  p_remark     text default null
)
returns issues
language plpgsql
set search_path = public, extensions
as $$
declare
  v_role    user_role;
  v_issue   issues;
  v_allowed boolean;
  v_remark  text := nullif(btrim(p_remark), '');
begin
  select p.role into v_role from profiles p where p.id = p_admin_id;
  if v_role is distinct from 'admin' then
    raise exception 'FORBIDDEN: admin role required' using errcode = '42501';
  end if;

  select * into v_issue from issues where id = p_issue_id for update;
  if not found then
    raise exception 'NOT_FOUND: issue does not exist' using errcode = 'P0002';
  end if;

  v_allowed := case v_issue.status
    when 'reported'    then p_new_status in ('verified', 'rejected')
    when 'verified'    then p_new_status in ('in_progress', 'rejected')
    when 'in_progress' then p_new_status = 'resolved'
    else false
  end;

  if not v_allowed then
    raise exception 'INVALID_TRANSITION: cannot change status from % to %', v_issue.status, p_new_status
      using errcode = 'P0001';
  end if;

  update issues
     set status      = p_new_status,
         updated_at  = now(),
         resolved_at = case when p_new_status = 'resolved' then now() else resolved_at end
   where id = p_issue_id
   returning * into v_issue;

  insert into status_history (issue_id, old_status, new_status, changed_by, remark)
  values (p_issue_id, (select h.new_status from status_history h
                        where h.issue_id = p_issue_id order by h.changed_at desc, h.id desc limit 1),
          p_new_status, p_admin_id, v_remark);

  return v_issue;
end;
$$;

-- ---------------------------------------------------------------------------
-- get_hotspots(days, min_reports, radius_m)
-- Clusters non-rejected issues of the same type with ST_ClusterDBSCAN in UTM 44N (meters).
--   priority = open_reports*2 + total_upvotes + oldest_open_days*1.5 + recurrence_count*3
-- Computed on read, never stored (D3).
-- ---------------------------------------------------------------------------
create or replace function get_hotspots(
  p_days        int default 30,
  p_min_reports int default 3,
  p_radius_m    double precision default 200
)
returns table (
  type             issue_type,
  cluster_id       int,
  recurrence_count int,
  open_reports     int,
  total_upvotes    int,
  oldest_open_days numeric,
  priority_score   numeric,
  lat              double precision,
  lng              double precision,
  radius_m         int,
  ward_id          int,
  ward_name        text,
  issue_ids        uuid[]
)
language sql
stable
set search_path = public, extensions
as $$
  with recent as (
    select i.id, i.type, i.location, i.status, i.upvote_count, i.created_at,
           ST_Transform(i.location::geometry, 32644) as geom
    from issues i
    where i.status <> 'rejected'
      and i.created_at > now() - make_interval(days => p_days)
  ),
  clustered as (
    select r.*,
           ST_ClusterDBSCAN(r.geom, eps := p_radius_m, minpoints := p_min_reports)
             over (partition by r.type) as cid
    from recent r
  ),
  agg as (
    select
      c.type,
      c.cid,
      count(*)::int as recurrence_count,
      (count(*) filter (where c.status in ('reported', 'verified', 'in_progress')))::int as open_reports,
      coalesce(sum(c.upvote_count), 0)::int as total_upvotes,
      coalesce(
        round((extract(epoch from now() - min(c.created_at)
                 filter (where c.status in ('reported', 'verified', 'in_progress'))) / 86400.0)::numeric, 1),
        0
      ) as oldest_open_days,
      ST_Centroid(ST_Collect(c.location::geometry)) as center,
      array_agg(c.id order by c.created_at) as issue_ids
    from clustered c
    where c.cid is not null
    group by c.type, c.cid
  )
  select
    a.type,
    a.cid,
    a.recurrence_count,
    a.open_reports,
    a.total_upvotes,
    a.oldest_open_days,
    (a.open_reports * 2 + a.total_upvotes + a.oldest_open_days * 1.5 + a.recurrence_count * 3)::numeric,
    ST_Y(a.center),
    ST_X(a.center),
    greatest(50, coalesce((select ceil(max(ST_Distance(i.location, a.center::geography)))::int
                           from issues i where i.id = any (a.issue_ids)), 50)),
    w.id,
    w.name,
    a.issue_ids
  from agg a
  left join wards w on w.id = assign_ward(ST_Y(a.center), ST_X(a.center))
  order by 7 desc, a.recurrence_count desc;
$$;

-- ---------------------------------------------------------------------------
-- get_priority_issues(limit)
-- Open issues sorted by: upvote_count + days_open*1.5 + (hotspot recurrence*3 if in a hotspot)
-- Returns the three components so the admin table can show the breakdown.
-- ---------------------------------------------------------------------------
create or replace function get_priority_issues(p_limit int default 50)
returns table (
  id                uuid,
  type              issue_type,
  description       text,
  status            issue_status,
  upvote_count      int,
  ward_id           int,
  ward_name         text,
  lat               double precision,
  lng               double precision,
  created_at        timestamptz,
  days_open         numeric,
  hotspot_recurrence int,
  upvote_points     numeric,
  age_points        numeric,
  hotspot_points    numeric,
  priority_score    numeric
)
language sql
stable
set search_path = public, extensions
as $$
  with hs as (
    select unnest(h.issue_ids) as issue_id, h.recurrence_count
    from get_hotspots() h
  ),
  base as (
    select
      i.id, i.type, i.description, i.status, i.upvote_count, i.ward_id, w.name as ward_name,
      ST_Y(i.location::geometry) as lat, ST_X(i.location::geometry) as lng, i.created_at,
      round((extract(epoch from now() - i.created_at) / 86400.0)::numeric, 1) as days_open,
      coalesce(hs.recurrence_count, 0) as hotspot_recurrence
    from issues i
    left join wards w on w.id = i.ward_id
    left join hs on hs.issue_id = i.id
    where i.status in ('reported', 'verified', 'in_progress')
  )
  select
    b.id, b.type, b.description, b.status, b.upvote_count, b.ward_id, b.ward_name,
    b.lat, b.lng, b.created_at, b.days_open, b.hotspot_recurrence,
    b.upvote_count::numeric,
    round(b.days_open * 1.5, 1),
    (b.hotspot_recurrence * 3)::numeric,
    b.upvote_count + round(b.days_open * 1.5, 1) + b.hotspot_recurrence * 3
  from base b
  order by 16 desc, b.created_at asc
  limit least(greatest(p_limit, 1), 100);
$$;

-- ---------------------------------------------------------------------------
-- get_stats() -> one jsonb document for the admin dashboard
-- ---------------------------------------------------------------------------
create or replace function get_stats()
returns jsonb
language sql
stable
set search_path = public, extensions
as $$
  select jsonb_build_object(
    'total',    (select count(*) from issues),
    'open',     (select count(*) from issues where status in ('reported', 'verified', 'in_progress')),
    'resolved', (select count(*) from issues where status = 'resolved'),
    'rejected', (select count(*) from issues where status = 'rejected'),
    'avg_resolution_hours',
      (select round((avg(extract(epoch from i.resolved_at - i.created_at)) / 3600.0)::numeric, 1)
         from issues i where i.status = 'resolved' and i.resolved_at is not null),
    'by_status',
      (select jsonb_object_agg(s, (select count(*) from issues where status = s))
         from unnest(enum_range(null::issue_status)) as s),
    'by_type',
      (select jsonb_object_agg(t, (select count(*) from issues where type = t))
         from unnest(enum_range(null::issue_type)) as t),
    'by_ward',
      (select coalesce(jsonb_agg(row_to_json(x) order by x.ward_name), '[]'::jsonb)
         from (
           select w.id as ward_id, w.name as ward_name,
                  count(i.id)::int as total,
                  (count(i.id) filter (where i.status in ('reported', 'verified', 'in_progress')))::int as open,
                  (count(i.id) filter (where i.status = 'resolved'))::int as resolved
           from wards w
           left join issues i on i.ward_id = w.id
           group by w.id, w.name
         ) x)
  );
$$;

-- ---------------------------------------------------------------------------
-- Privileges: Supabase exposes public functions through /rest/v1/rpc to the anon key.
-- These functions must only be callable by the API (service role). Without this,
-- anyone could call change_issue_status with an admin id.
-- ---------------------------------------------------------------------------
revoke all on function assign_ward(double precision, double precision)                              from public, anon, authenticated;
revoke all on function check_duplicate(double precision, double precision, issue_type, double precision, int) from public, anon, authenticated;
revoke all on function change_issue_status(uuid, issue_status, uuid, text)                          from public, anon, authenticated;
revoke all on function get_hotspots(int, int, double precision)                                     from public, anon, authenticated;
revoke all on function get_priority_issues(int)                                                     from public, anon, authenticated;
revoke all on function get_stats()                                                                  from public, anon, authenticated;
revoke all on function handle_new_user()                                                            from public, anon, authenticated;
revoke all on function sync_upvote_count()                                                          from public, anon, authenticated;

grant execute on function assign_ward(double precision, double precision)                              to service_role;
grant execute on function check_duplicate(double precision, double precision, issue_type, double precision, int) to service_role;
grant execute on function change_issue_status(uuid, issue_status, uuid, text)                          to service_role;
grant execute on function get_hotspots(int, int, double precision)                                     to service_role;
grant execute on function get_priority_issues(int)                                                     to service_role;
grant execute on function get_stats()                                                                  to service_role;
