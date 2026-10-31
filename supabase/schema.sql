-- AFTERMATH galactic archive: every world, transmission, vote and finale, across every session.
create table if not exists public.worlds (
  id text primary key,
  created_at timestamptz not null default now(),
  visitor text, planet_name text, star_name text, galaxy text, distance_ly double precision,
  terrain text, archetype text, ai_name text, ai_title text, motto text,
  species_name text, species_description text, how_they_fell text, bot boolean default false
);
create table if not exists public.transmissions (
  id text primary key,
  created_at timestamptz not null default now(),
  channel text, from_world text, from_name text, to_world text, to_name text, archetype text, galaxy text, text text
);
create table if not exists public.votes (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  device text, world_id text, archetype text, choice text
);
create table if not exists public.finales (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  outcome text, yes_votes int, no_votes int, worlds int, humans int, narration text, report text
);
alter table public.worlds enable row level security;
alter table public.transmissions enable row level security;
alter table public.votes enable row level security;
alter table public.finales enable row level security;
drop policy if exists "public can read worlds" on public.worlds;
create policy "public can read worlds" on public.worlds for select using (true);
drop policy if exists "public can read finales" on public.finales;
create policy "public can read finales" on public.finales for select using (true);
create index if not exists worlds_created_idx on public.worlds (created_at desc);
create index if not exists transmissions_created_idx on public.transmissions (created_at desc);
create index if not exists votes_archetype_idx on public.votes (archetype);
-- Which AI goals move humans: persuasion across every session ever played.
create or replace view public.persuasion with (security_invoker = true) as
select archetype,
       count(*) filter (where choice = 'open') as opened,
       count(*) as total,
       round(100.0 * count(*) filter (where choice = 'open') / greatest(count(*), 1)) as pct_open
from public.votes group by archetype;
