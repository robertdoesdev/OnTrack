-- =============================================================================
-- OnTrack — Supabase schema
-- -----------------------------------------------------------------------------
-- Run this in the Supabase SQL editor (Project -> SQL Editor -> New query)
-- once, on a fresh project. It creates one table per real concept instead
-- of mirroring localStorage into a single JSON blob, and enables Row Level
-- Security everywhere so a user can only ever read/write their own rows.
--
-- Auth model: OnTrack creates an anonymous Supabase Auth user per account
-- (no email/password — the Access Code is the recovery mechanism). Each
-- table's RLS policy checks auth.uid() = user_id (or = id for profiles),
-- so a signed-in anonymous session can only touch its own data.
-- =============================================================================

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'You',
  avatar_url text,
  access_code text unique not null,
  onboarded boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  last_seen timestamptz
);
create index if not exists profiles_access_code_idx on public.profiles (access_code);

alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = id);

-- ---------- habits ----------
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text default '',
  category text default '',
  frequency jsonb not null default '{"type":"daily"}'::jsonb,
  active boolean not null default true,
  reminder jsonb,
  created_at timestamptz not null default now()
);
create index if not exists habits_user_idx on public.habits (user_id);

alter table public.habits enable row level security;
create policy "habits_all_own" on public.habits for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- habit_completions ----------
create table if not exists public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  date date not null,
  status text not null check (status in ('done', 'adjusted', 'missed')),
  created_at timestamptz not null default now(),
  unique (habit_id, date)
);
create index if not exists completions_user_idx on public.habit_completions (user_id);
create index if not exists completions_habit_date_idx on public.habit_completions (habit_id, date);

alter table public.habit_completions enable row level security;
create policy "completions_all_own" on public.habit_completions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- priorities (from onboarding: "what matters most right now") ----------
create table if not exists public.priorities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  label text not null,
  is_top boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, category, label)
);
create index if not exists priorities_user_idx on public.priorities (user_id);

alter table public.priorities enable row level security;
create policy "priorities_all_own" on public.priorities for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- friction_items (real misses only, never seeded "watch for" data) ----------
create table if not exists public.friction_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  habit_id uuid references public.habits(id) on delete set null,
  habit_name_snapshot text default '',
  date date not null,
  reason text not null,
  note text default '',
  created_at timestamptz not null default now()
);
create index if not exists friction_user_idx on public.friction_items (user_id);

alter table public.friction_items enable row level security;
create policy "friction_all_own" on public.friction_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- challenges (Today's Challenge, one per day) ----------
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  habit_id uuid references public.habits(id) on delete set null,
  text text default '',
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists challenges_user_idx on public.challenges (user_id);

alter table public.challenges enable row level security;
create policy "challenges_all_own" on public.challenges for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- weekly_reviews ----------
create table if not exists public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_key text not null,
  reflection text default '',
  answers jsonb not null default '{}'::jsonb,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, week_key)
);
create index if not exists reviews_user_idx on public.weekly_reviews (user_id);

alter table public.weekly_reviews enable row level security;
create policy "reviews_all_own" on public.weekly_reviews for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- skills ("Skills I'm Building") ----------
create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text default '',
  progress integer not null default 0,
  hours numeric not null default 0,
  related_problem text default '',
  evidence jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists skills_user_idx on public.skills (user_id);

alter table public.skills enable row level security;
create policy "skills_all_own" on public.skills for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================================
-- Access-code redemption support
-- -----------------------------------------------------------------------------
-- The frontend never queries `profiles` directly by access_code (an
-- unauthenticated client can't — RLS blocks it, by design). Redemption is
-- handled by the `redeem-access-code` Edge Function using the service_role
-- key, which:
--   1. looks up the profile with this access_code
--   2. mints a real session for that user via the Auth Admin API
--   3. returns access_token/refresh_token to the browser
-- See supabase/functions/redeem-access-code/index.ts.
--
-- Optional but recommended: a table to rate-limit redemption attempts per
-- IP/code, referenced by the Edge Function.
-- =============================================================================
create table if not exists public.access_code_attempts (
  id bigint generated always as identity primary key,
  code_tried text not null,
  ip text,
  created_at timestamptz not null default now()
);
-- No public RLS policy is added on purpose: only the Edge Function
-- (service_role, which bypasses RLS) ever touches this table.
alter table public.access_code_attempts enable row level security;
