-- sanity_checks.sql
-- Phase 2: numbered checks with expected values.
-- Run in the Supabase SQL editor right after 001, 002 and 003, before real users add reports.
--
-- Part A returns one row per check with PASS or FAIL. Every row must say PASS.
-- Part B tests change_issue_status inside a transaction that is rolled back, and prints notices.
--
-- Data checks (9 to 18) look only at seed issues. Function checks (19 onward) look at all issues,
-- so they match the expected values only while no real reports exist.

-- ===========================================================================
-- PART A: state checks
-- ===========================================================================
with seed as (
  select array[
    'a0000000-0000-4000-8000-000000000001',
    'c0000000-0000-4000-8000-000000000001',
    'c0000000-0000-4000-8000-000000000002',
    'c0000000-0000-4000-8000-000000000003'
  ]::uuid[] as ids
),
checks (n, label, actual, expected) as (
  select * from (values
    -- Setup and security
    (1,  'Extensions postgis and pgcrypto installed',
         (select count(*) from pg_extension where extname in ('postgis', 'pgcrypto'))::text, '2'),
    (2,  'RLS enabled on all 5 tables',
         (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
             and c.relname in ('wards', 'profiles', 'issues', 'upvotes', 'status_history'))::text, '5'),
    (3,  'No RLS policies exist on public tables (access only through the API)',
         (select count(*) from pg_policies where schemaname = 'public')::text, '0'),
    (4,  'anon cannot read issues',
         has_table_privilege('anon', 'public.issues', 'select')::text, 'false'),
    (5,  'anon and authenticated cannot run change_issue_status',
         (has_function_privilege('anon', 'public.change_issue_status(uuid, issue_status, uuid, text)', 'execute')
          or has_function_privilege('authenticated', 'public.change_issue_status(uuid, issue_status, uuid, text)', 'execute'))::text,
         'false'),
    (6,  'Storage bucket issue-photos exists and is public',
         coalesce((select public::text from storage.buckets where id = 'issue-photos'), 'missing'), 'true'),

    -- Seed data
    (7,  'Wards',
         (select count(*) from wards)::text, '6'),
    (8,  'Seed profiles (1 admin + 3 citizens)',
         (select count(*) filter (where role = 'admin') || ' admin, ' || count(*) filter (where role = 'citizen') || ' citizen'
            from profiles, seed where id = any (seed.ids)), '1 admin, 3 citizen'),
    (9,  'Seed issues',
         (select count(*) from issues, seed where reporter_id = any (seed.ids))::text, '70'),
    (10, 'Seed issues by status',
         (select string_agg(s || '=' || (select count(*) from issues i, seed where i.reporter_id = any (seed.ids) and i.status = s), ', ')
            from unnest(enum_range(null::issue_status)) s),
         'reported=32, verified=10, in_progress=10, resolved=13, rejected=5'),
    (11, 'Seed issues by type',
         (select string_agg(t || '=' || (select count(*) from issues i, seed where i.reporter_id = any (seed.ids) and i.type = t), ', ')
            from unnest(enum_range(null::issue_type)) t),
         'water_interruption=15, pipe_leak=22, drain_blockage=17, dirty_toilet=16'),
    (12, 'Seed issues older than 30 days',
         (select count(*) from issues, seed where reporter_id = any (seed.ids) and created_at < now() - interval '30 days')::text, '0'),
    (13, 'Issues without a ward',
         (select count(*) from issues where ward_id is null)::text, '0'),
    (14, 'Issues whose upvote_count differs from the upvotes table',
         (select count(*) from issues i
           where i.upvote_count <> (select count(*) from upvotes u where u.issue_id = i.id))::text, '0'),
    (15, 'Seed upvotes',
         (select count(*) from upvotes, seed where user_id = any (seed.ids))::text, '102'),
    (16, 'Issues missing the first history row (old_status null, new_status reported)',
         (select count(*) from issues i
           where not exists (select 1 from status_history h
                              where h.issue_id = i.id and h.old_status is null and h.new_status = 'reported'))::text, '0'),
    (17, 'Issues whose latest history status differs from the issue status',
         (select count(*) from issues i
           where i.status is distinct from (select h.new_status from status_history h
                                             where h.issue_id = i.id order by h.changed_at desc, h.id desc limit 1))::text, '0'),
    (18, 'Issues where resolved_at does not match status resolved',
         (select count(*) from issues where (status = 'resolved') <> (resolved_at is not null))::text, '0'),

    -- Hotspots
    (19, 'get_hotspots() rows (3 or more same-type reports within 200 m in 30 days)',
         (select count(*) from get_hotspots())::text, '5'),
    (20, 'Top hotspot: type | reports | ward',
         (select type || ' | ' || recurrence_count || ' | ' || ward_name from get_hotspots() limit 1), 'pipe_leak | 6 | Itwari'),
    (21, 'Hotspot order by priority (types)',
         (select string_agg(type::text, ', ' order by priority_score desc) from get_hotspots()),
         'pipe_leak, drain_blockage, water_interruption, dirty_toilet, pipe_leak'),
    (22, 'Partly resolved hotspot: ward | reports | open',
         (select ward_name || ' | ' || recurrence_count || ' | ' || open_reports from get_hotspots()
           where type = 'pipe_leak' and ward_name = 'Laxmi Nagar'), 'Laxmi Nagar | 5 | 2'),
    (23, 'get_hotspots(30, 6, 200) rows (only the biggest cluster)',
         (select count(*) from get_hotspots(30, 6, 200))::text, '1'),
    (24, 'Rejected reports are excluded (Manish Nagar cluster has 5 reports, 1 rejected)',
         (select recurrence_count::text from get_hotspots() where ward_name = 'Manish Nagar'), '4'),

    -- Duplicate check and ward assignment
    (25, 'check_duplicate at the Itwari pin, pipe_leak, 50 m / 7 days (demo case)',
         (select count(*) from check_duplicate(21.1402, 79.1131, 'pipe_leak'))::text, '1'),
    (26, 'check_duplicate, different type at the same pin',
         (select count(*) from check_duplicate(21.1402, 79.1131, 'dirty_toilet'))::text, '0'),
    (27, 'check_duplicate, pin far away',
         (select count(*) from check_duplicate(21.2000, 79.2000, 'pipe_leak'))::text, '0'),
    (28, 'assign_ward at the Itwari pin',
         (select name from wards where id = assign_ward(21.1402, 79.1131)), 'Itwari'),

    -- Priority list and stats
    (29, 'Top priority issue: type | ward',
         (select type || ' | ' || ward_name from get_priority_issues(1)), 'pipe_leak | Itwari'),
    (30, 'Open issues in priority list (limit 100)',
         (select count(*) from get_priority_issues(100))::text, '52'),
    (31, 'Priority score equals the sum of its three parts (rows that differ)',
         (select count(*) from get_priority_issues(100)
           where priority_score <> upvote_points + age_points + hotspot_points)::text, '0'),
    (32, 'get_stats totals',
         (select 'total=' || (s ->> 'total') || ', open=' || (s ->> 'open') || ', resolved=' || (s ->> 'resolved')
                 || ', rejected=' || (s ->> 'rejected') from (select get_stats() as s) x),
         'total=70, open=52, resolved=13, rejected=5'),
    (33, 'get_stats avg_resolution_hours is plausible (24 to 600)',
         (select ((s ->> 'avg_resolution_hours')::numeric between 24 and 600)::text from (select get_stats() as s) x), 'true'),
    (34, 'get_stats by_ward has one row per ward',
         (select jsonb_array_length(get_stats() -> 'by_ward'))::text, '6')
  ) as v(n, label, actual, expected)
)
select n,
       label,
       actual,
       expected,
       case when actual is not distinct from expected then 'PASS' else 'FAIL' end as result
from checks
order by n;

-- ===========================================================================
-- PART B: change_issue_status rules (everything is rolled back at the end)
-- Expected: eight NOTICE lines starting with PASS and no error.
-- ===========================================================================
do $$
declare
  v_admin   constant uuid := 'a0000000-0000-4000-8000-000000000001';
  v_citizen constant uuid := 'c0000000-0000-4000-8000-000000000001';
  v_issue   uuid;
  v_row     issues;
  v_before  int;
  v_after   int;
begin
  begin
    select id into v_issue from issues where status = 'reported' order by created_at limit 1;
    if v_issue is null then
      raise exception 'SANITY CHECK FAILED: no issue with status reported to test with';
    end if;
    select count(*) into v_before from status_history where issue_id = v_issue;

    -- B1: citizen cannot change status
    begin
      perform change_issue_status(v_issue, 'verified', v_citizen, 'should fail');
      raise exception 'SANITY CHECK FAILED: citizen was allowed to change status';
    exception when insufficient_privilege then
      raise notice 'PASS B1: citizen blocked (FORBIDDEN)';
    end;

    -- B2: unknown issue
    begin
      perform change_issue_status('00000000-0000-4000-8000-00000000dead', 'verified', v_admin, null);
      raise exception 'SANITY CHECK FAILED: unknown issue was accepted';
    exception when no_data_found then
      raise notice 'PASS B2: unknown issue (NOT_FOUND)';
    end;

    -- B3: reported -> resolved is not allowed
    begin
      perform change_issue_status(v_issue, 'resolved', v_admin, null);
      raise exception 'SANITY CHECK FAILED: reported -> resolved was accepted';
    exception when raise_exception then
      if sqlerrm like 'INVALID_TRANSITION:%' then
        raise notice 'PASS B3: reported -> resolved blocked (INVALID_TRANSITION)';
      else
        raise;
      end if;
    end;

    -- B4: reported -> verified works and writes history
    v_row := change_issue_status(v_issue, 'verified', v_admin, '  Checked on site  ');
    select count(*) into v_after from status_history where issue_id = v_issue;
    if v_row.status <> 'verified' or v_after <> v_before + 1 then
      raise exception 'SANITY CHECK FAILED: verify step (status %, history % -> %)', v_row.status, v_before, v_after;
    end if;
    if (select remark from status_history where issue_id = v_issue order by id desc limit 1) <> 'Checked on site' then
      raise exception 'SANITY CHECK FAILED: remark was not trimmed';
    end if;
    raise notice 'PASS B4: reported -> verified, history row written, remark trimmed';

    -- B5: verified -> in_progress -> resolved sets resolved_at
    perform change_issue_status(v_issue, 'in_progress', v_admin, null);
    v_row := change_issue_status(v_issue, 'resolved', v_admin, 'Fixed');
    if v_row.status <> 'resolved' or v_row.resolved_at is null then
      raise exception 'SANITY CHECK FAILED: resolve step did not set resolved_at';
    end if;
    raise notice 'PASS B5: in_progress -> resolved, resolved_at set';

    -- B6: resolved is final
    begin
      perform change_issue_status(v_issue, 'in_progress', v_admin, null);
      raise exception 'SANITY CHECK FAILED: resolved issue was changed';
    exception when raise_exception then
      if sqlerrm like 'INVALID_TRANSITION:%' then
        raise notice 'PASS B6: resolved is final';
      else
        raise;
      end if;
    end;

    -- B7: remark longer than 300 characters is rejected by the table constraint
    select id into v_issue from issues where status = 'reported' order by created_at limit 1;
    begin
      perform change_issue_status(v_issue, 'rejected', v_admin, repeat('x', 301));
      raise exception 'SANITY CHECK FAILED: 301 character remark was accepted';
    exception when check_violation then
      raise notice 'PASS B7: remark over 300 characters rejected';
    end;

    -- B8: reported -> rejected works and rejected is final
    perform change_issue_status(v_issue, 'rejected', v_admin, 'Fake report');
    begin
      perform change_issue_status(v_issue, 'verified', v_admin, null);
      raise exception 'SANITY CHECK FAILED: rejected issue was changed';
    exception when raise_exception then
      if sqlerrm like 'INVALID_TRANSITION:%' then
        raise notice 'PASS B8: reported -> rejected, rejected is final';
      else
        raise;
      end if;
    end;

    -- Undo every change made by this block
    raise exception 'ROLLBACK_TEST';
  exception when raise_exception then
    if sqlerrm <> 'ROLLBACK_TEST' then
      raise;
    end if;
  end;
end $$;
