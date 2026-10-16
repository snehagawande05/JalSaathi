-- 003_seed.sql
-- Phase 2: wards, demo users, 70 sample issues, 5 hotspots, status history and upvotes.
-- Safe to re-run: it deletes only seed rows (issues and upvotes of the 4 seed users) and inserts them again.
-- Re-run it before a demo so every issue date is relative to "now" and hotspots stay inside the 30-day window.
--
-- All data is SAMPLE data modeled on Nagpur areas. It is not real municipal data.
--
-- Demo logins (password for all four: Demo@12345):
--   admin@jalsaathi.demo      -> role admin
--   citizen1@jalsaathi.demo   -> role citizen
--   citizen2@jalsaathi.demo, citizen3@jalsaathi.demo
-- Change or delete these users before the public deployment (Phase 8).
--
-- To make your own real account admin (run once after signing up):
--   update profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'you@example.com');

begin;

-- ---------------------------------------------------------------------------
-- 1. Remove previous seed data
-- ---------------------------------------------------------------------------
delete from upvotes where user_id in (
  'a0000000-0000-4000-8000-000000000001',
  'c0000000-0000-4000-8000-000000000001',
  'c0000000-0000-4000-8000-000000000002',
  'c0000000-0000-4000-8000-000000000003'
);
delete from issues where reporter_id in (
  'a0000000-0000-4000-8000-000000000001',
  'c0000000-0000-4000-8000-000000000001',
  'c0000000-0000-4000-8000-000000000002',
  'c0000000-0000-4000-8000-000000000003'
);

-- ---------------------------------------------------------------------------
-- 2. Wards (approximate centers)
-- ---------------------------------------------------------------------------
insert into wards (name, center) values
  ('Dharampeth',  ST_SetSRID(ST_MakePoint(79.0690, 21.1340), 4326)::geography),
  ('Sitabuldi',   ST_SetSRID(ST_MakePoint(79.0882, 21.1458), 4326)::geography),
  ('Sadar',       ST_SetSRID(ST_MakePoint(79.0825, 21.1665), 4326)::geography),
  ('Manish Nagar',ST_SetSRID(ST_MakePoint(79.0630, 21.0960), 4326)::geography),
  ('Itwari',      ST_SetSRID(ST_MakePoint(79.1125, 21.1400), 4326)::geography),
  ('Laxmi Nagar', ST_SetSRID(ST_MakePoint(79.0595, 21.1245), 4326)::geography)
on conflict (name) do update set center = excluded.center;

-- ---------------------------------------------------------------------------
-- 3. Demo users (auth.users -> trigger creates the profiles rows)
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
select
  '00000000-0000-0000-0000-000000000000', u.id::uuid, 'authenticated', 'authenticated', u.email,
  crypt('Demo@12345', gen_salt('bf')), now(),
  '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', u.full_name),
  now(), now()
from (values
  ('a0000000-0000-4000-8000-000000000001', 'admin@jalsaathi.demo',    'Demo Admin'),
  ('c0000000-0000-4000-8000-000000000001', 'citizen1@jalsaathi.demo', 'Asha Patil'),
  ('c0000000-0000-4000-8000-000000000002', 'citizen2@jalsaathi.demo', 'Rohan Deshmukh'),
  ('c0000000-0000-4000-8000-000000000003', 'citizen3@jalsaathi.demo', 'Meera Joshi')
) as u(id, email, full_name)
on conflict (id) do nothing;

-- Email login needs an identity row. Skipped with a notice if this Supabase version differs.
do $$
begin
  insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  select gen_random_uuid(), u.id::text, u.id,
         jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
         'email', now(), now(), now()
  from auth.users u
  where u.email like '%@jalsaathi.demo'
    and not exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email');
exception when others then
  raise notice 'Could not create auth identities (%). Demo users exist but may not be able to log in.', sqlerrm;
end $$;

update profiles set full_name = 'Demo Admin',     role = 'admin'   where id = 'a0000000-0000-4000-8000-000000000001';
update profiles set full_name = 'Asha Patil',     role = 'citizen' where id = 'c0000000-0000-4000-8000-000000000001';
update profiles set full_name = 'Rohan Deshmukh', role = 'citizen' where id = 'c0000000-0000-4000-8000-000000000002';
update profiles set full_name = 'Meera Joshi',    role = 'citizen' where id = 'c0000000-0000-4000-8000-000000000003';

-- ---------------------------------------------------------------------------
-- 4. Issue definitions (temp table, dropped at commit)
--    5 designed clusters (25 issues) + 45 background issues spread over the wards.
-- ---------------------------------------------------------------------------
create temp table seed_issues on commit drop as
with
  type_list as (
    select array['water_interruption', 'pipe_leak', 'drain_blockage', 'dirty_toilet']::issue_type[] as t
  ),
  -- 8 descriptions per type, in the same order as type_list. index = type_index * 8 + k
  desc_list as (
    select array[
      -- water_interruption
      'No water supply in our lane since yesterday morning. Tanker is the only option now.',
      'Tap water has stopped coming at the usual time for three days in a row.',
      'Very low pressure in the morning supply, upper floors get nothing at all.',
      'Supply timing keeps changing without notice and the water looks muddy.',
      'Water supply was cut for a pipeline repair but never restored afterwards.',
      'Whole colony has had no municipal water since last evening, please check.',
      'Water comes for only ten minutes a day, not enough for the households here.',
      'Supply interrupted since the valve work last week; residents are buying tankers.',
      -- pipe_leak
      'Pipe leaking by the roadside, clean water is running into the drain all day.',
      'Water is spraying from a cracked joint on the footpath near the corner shop.',
      'Slow leak from the main line has made the road muddy and hard to walk on.',
      'Burst pipe near the electric pole, water pooling across half of the street.',
      'Leaking valve chamber cover, water bubbles up continuously even at night.',
      'Supply line is leaking behind the school wall, the wall base is getting damp.',
      'Constant dripping from the overhead pipe at the crossing wastes a lot of water.',
      'Pipe damaged during road digging and nobody has repaired it since.',
      -- drain_blockage
      'Drain is choked with plastic and mud, dirty water overflows onto the lane.',
      'Open drain blocked near the bus stop, strong smell and mosquitoes everywhere.',
      'Sewer line overflowing after light rain, water enters the front gates.',
      'Drain cover is broken and the channel is full of garbage, needs cleaning urgently.',
      'Stormwater drain jammed with silt, the road floods after every shower.',
      'Blocked drain behind the market, wet waste has not been lifted for a week.',
      'Sewage is backing up in the lane and flowing past the houses.',
      'Nala beside the playground is clogged and breeding mosquitoes.',
      -- dirty_toilet
      'Public toilet has not been cleaned for days, the floor is dirty and smells bad.',
      'No water in the community toilet block and the doors do not close properly.',
      'Toilet taps are broken and the drainage is clogged, very unhygienic.',
      'Women section of the public toilet has no light and no cleaning staff.',
      'Garbage piled up outside the toilet block, flies everywhere.',
      'Flush is not working in several stalls of the public toilet near the market.',
      'Toilet block is left open and unclean at night, needs regular caretaker visits.',
      'Overflowing septic tank behind the public toilet, bad smell in the whole area.'
    ] as d
  ),
  citizens as (
    select array[
      'c0000000-0000-4000-8000-000000000001',
      'c0000000-0000-4000-8000-000000000002',
      'c0000000-0000-4000-8000-000000000003'
    ]::uuid[] as ids
  ),
  ward_seed (idx, name, lat, lng) as (values
    (0, 'Dharampeth',   21.1340, 79.0690),
    (1, 'Sitabuldi',    21.1458, 79.0882),
    (2, 'Sadar',        21.1665, 79.0825),
    (3, 'Manish Nagar', 21.0960, 79.0630),
    (4, 'Itwari',       21.1400, 79.1125),
    (5, 'Laxmi Nagar',  21.1245, 79.0595)
  ),
  -- Designed hotspots: same type, all reports within about 100 m of the center
  clusters (no, type_idx, clat, clng, address) as (values
    (1, 1, 21.1402, 79.1131, 'Near Itwari Bazaar gate'),            -- pipe_leak, 6 open reports (top hotspot)
    (2, 2, 21.1343, 79.0702, 'Near Dharampeth Chowk'),              -- drain_blockage, 5 open reports
    (3, 0, 21.0975, 79.0640, 'Manish Nagar water tank road'),       -- water_interruption, 4 counted + 1 rejected
    (4, 3, 21.1668, 79.0829, 'Near Sadar public toilet block'),     -- dirty_toilet, 4 reports
    (5, 1, 21.1250, 79.0598, 'Laxmi Nagar chowk')                   -- pipe_leak, partly resolved
  ),
  cluster_reports (no, ord, dx, dy, status, age) as (values
    (1, 1, -70,  45, 'in_progress', 21.0),
    (1, 2,  55, -30, 'verified',    17.0),
    (1, 3,  20,  70, 'reported',    12.0),
    (1, 4, -40, -60, 'reported',     8.0),
    (1, 5,  90,  20, 'reported',     3.5),
    (1, 6,   0,   0, 'reported',     1.5),  -- demo duplicate target (recent, open, at the cluster center)
    (2, 1,  60,  50, 'verified',    18.0),
    (2, 2, -50,  30, 'in_progress', 14.0),
    (2, 3,  30, -70, 'reported',     9.0),
    (2, 4, -80, -20, 'reported',     5.0),
    (2, 5,  10,  10, 'reported',     2.5),
    (3, 1, -60, -40, 'reported',    20.0),
    (3, 2,  50,  60, 'verified',    15.0),
    (3, 3,  70, -50, 'in_progress', 10.0),
    (3, 4, -30,  80, 'reported',     4.0),
    (3, 5,   0,   0, 'rejected',     3.0),
    (4, 1,  40,  60, 'reported',    14.0),
    (4, 2, -60, -30, 'reported',     9.0),
    (4, 3,  70, -40, 'verified',     5.0),
    (4, 4,   0,   0, 'reported',     2.0),
    (5, 1, -50,  40, 'resolved',    26.0),
    (5, 2,  60,  30, 'resolved',    22.0),
    (5, 3, -20, -70, 'resolved',    18.0),
    (5, 4,  80, -30, 'in_progress', 10.0),
    (5, 5,   0,   0, 'reported',     3.0)
  ),
  cluster_rows as (
    select
      'cluster'::text as src,
      cr.no * 100 + cr.ord as k,
      tl.t[c.type_idx + 1] as type,
      c.clat + cr.dy / 111320.0 as lat,
      c.clng + cr.dx / (111320.0 * cos(radians(c.clat))) as lng,
      c.address as address_text,
      cr.status::issue_status as status,
      cr.age::numeric as age,
      ci.ids[((cr.no + cr.ord) % 3) + 1] as reporter_id,
      dl.d[c.type_idx * 8 + cr.ord] as description
    from cluster_reports cr
    join clusters c on c.no = cr.no
    cross join type_list tl
    cross join citizens ci
    cross join desc_list dl
  ),
  -- Background issues: deterministic golden-angle spread around each ward center (350 to 1250 m)
  background_rows as (
    select
      'background'::text as src,
      n.n as k,
      tl.t[((n.n * 3 + n.n / 6) % 4) + 1] as type,
      ws.lat + (r.r * sin(n.n * 2.39996323)) / 111320.0 as lat,
      ws.lng + (r.r * cos(n.n * 2.39996323)) / (111320.0 * cos(radians(ws.lat))) as lng,
      ws.name || ', Nagpur' as address_text,
      (case
         when n.n % 20 <= 6  then 'reported'
         when n.n % 20 <= 9  then 'verified'
         when n.n % 20 <= 12 then 'in_progress'
         when n.n % 20 <= 17 then 'resolved'
         else 'rejected'
       end)::issue_status as status,
      (1.5 + ((n.n * 7) % 27))::numeric as age,
      ci.ids[(n.n % 3) + 1] as reporter_id,
      dl.d[(((n.n * 3 + n.n / 6) % 4) * 8) + (n.n % 8) + 1] as description
    from generate_series(1, 45) as n(n)
    join ward_seed ws on ws.idx = n.n % 6
    cross join lateral (select 350 + ((n.n * 173) % 900) as r) r
    cross join type_list tl
    cross join citizens ci
    cross join desc_list dl
  )
select
  gen_random_uuid() as id,
  row_number() over (order by x.src, x.k) as seq,
  x.*,
  (case x.status
     when 'reported'    then 0
     when 'verified'    then 0.25
     when 'in_progress' then 0.5
     when 'resolved'    then 0.8
     else 0.25
   end)::numeric as last_frac
from (
  select * from cluster_rows
  union all
  select * from background_rows
) x;

-- ---------------------------------------------------------------------------
-- 5. Issues
-- ---------------------------------------------------------------------------
insert into issues (
  id, reporter_id, type, description, location, address_text, ward_id,
  status, created_at, updated_at, resolved_at
)
select
  s.id, s.reporter_id, s.type, s.description,
  ST_SetSRID(ST_MakePoint(s.lng, s.lat), 4326)::geography,
  s.address_text,
  assign_ward(s.lat, s.lng),
  s.status,
  now() - s.age * interval '1 day',
  now() - s.age * interval '1 day' + s.last_frac * s.age * interval '1 day',
  case when s.status = 'resolved'
       then now() - s.age * interval '1 day' + s.last_frac * s.age * interval '1 day' end
from seed_issues s;

-- ---------------------------------------------------------------------------
-- 6. Status history (consistent with each issue's final status)
-- ---------------------------------------------------------------------------
insert into status_history (issue_id, old_status, new_status, changed_by, remark, changed_at)
select s.id, null::issue_status, 'reported'::issue_status, s.reporter_id, null::text,
       now() - s.age * interval '1 day'
from seed_issues s
union all
select s.id, 'reported', 'verified', 'a0000000-0000-4000-8000-000000000001'::uuid,
       'Verified by the ward team after a site visit.',
       now() - s.age * interval '1 day' + 0.25 * s.age * interval '1 day'
from seed_issues s where s.status in ('verified', 'in_progress', 'resolved')
union all
select s.id, 'verified', 'in_progress', 'a0000000-0000-4000-8000-000000000001'::uuid,
       'Repair crew assigned.',
       now() - s.age * interval '1 day' + 0.5 * s.age * interval '1 day'
from seed_issues s where s.status in ('in_progress', 'resolved')
union all
select s.id, 'in_progress', 'resolved', 'a0000000-0000-4000-8000-000000000001'::uuid,
       'Work completed and checked on site.',
       now() - s.age * interval '1 day' + 0.8 * s.age * interval '1 day'
from seed_issues s where s.status = 'resolved'
union all
select s.id, 'reported', 'rejected', 'a0000000-0000-4000-8000-000000000001'::uuid,
       'Could not be verified on site. No action needed.',
       now() - s.age * interval '1 day' + 0.25 * s.age * interval '1 day'
from seed_issues s where s.status = 'rejected';

-- ---------------------------------------------------------------------------
-- 7. Upvotes (the trigger keeps issues.upvote_count in sync)
-- ---------------------------------------------------------------------------
insert into upvotes (issue_id, user_id, created_at)
select s.id, u.id, now() - s.age * interval '1 day' + 0.1 * s.age * interval '1 day'
from seed_issues s
cross join (values
  (1, 'a0000000-0000-4000-8000-000000000001'::uuid),
  (2, 'c0000000-0000-4000-8000-000000000001'::uuid),
  (3, 'c0000000-0000-4000-8000-000000000002'::uuid),
  (4, 'c0000000-0000-4000-8000-000000000003'::uuid)
) as u(ord, id)
where s.status <> 'rejected'
  and u.id <> s.reporter_id
  and ((s.seq + u.ord * 2) % 3 = 0 or (s.src = 'cluster' and (s.seq + u.ord) % 2 = 0));

commit;
