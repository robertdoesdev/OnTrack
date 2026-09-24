-- =============================================================================
-- OnTrack — Supabase schema
-- -----------------------------------------------------------------------------
-- Safe to run on a fresh project AND safe to re-run on a project that
-- already has an earlier version of this schema applied: every statement
-- is idempotent (`if not exists` / `add column if not exists`), and the
-- one genuinely destructive step (dropping the old plaintext access_code
-- column) only runs after its data has been migrated into the new hashed
-- column — see the MIGRATION section at the bottom. Nothing here ever
-- truncates or drops a table with user data in it.
--
-- Auth model (v2 — replaces anonymous auth):
--   Each OnTrack account is a REAL (non-anonymous) Supabase Auth user,
--   identified internally by a system-generated, never-shown email like
--   "8f2c1e40-...@accounts.ontrack.internal". The user never sees or
--   types this email — they only ever see their Access Code. Sign-in
--   happens via a server-minted magic-link token (see the
--   redeem-access-code Edge Function), verified client-side with
--   supabase.auth.verifyOtp(), which are both documented, currently
--   supported Supabase Auth APIs. This makes "log in from another
--   device" actually work, which anonymous auth cannot do.
-- =============================================================================

-- Required for the migration step below (sha256 hashing of any
-- previously-issued plaintext codes). Supabase projects have this
-- extension available by default.
create extension if not exists pgcrypto;

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'You',
  avatar_url text,
  access_code_hash text unique,
  onboarded boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  last_seen timestamptz,
  last_synced_at timestamptz
);

-- Ensure this column also exists when upgrading an older profiles table.
alter table public.profiles
  add column if not exists access_code_hash text;

create unique index if not exists profiles_access_code_hash_idx
  on public.profiles (access_code_hash);

alter table public.profiles enable row level security;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = id);
-- Deliberately NO select policy that allows looking up by access_code_hash.
-- That lookup only ever happens inside the Edge Function using the
-- service_role key, which bypasses RLS by design — a normal authenticated
-- or anonymous client request can never discover another user's row this
-- way, satisfying "do not allow arbitrary users to query profiles and
-- discover codes."

-- ---------- habits ----------
create table if not exists public.habits (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text default '',
  category text default '',
  frequency jsonb not null default '{"type":"daily"}'::jsonb,
  active boolean not null default true,
  reminder jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists habits_user_idx on public.habits (user_id);

alter table public.habits enable row level security;
drop policy if exists "habits_all_own" on public.habits;
create policy "habits_all_own" on public.habits for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- habit_completions ----------
create table if not exists public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  date date not null,
  status text not null check (status in ('done', 'adjusted', 'missed')),
  updated_at timestamptz not null default now(),
  unique (habit_id, date)
);
create index if not exists completions_user_idx on public.habit_completions (user_id);
create index if not exists completions_habit_date_idx on public.habit_completions (habit_id, date);

alter table public.habit_completions enable row level security;
drop policy if exists "completions_all_own" on public.habit_completions;
create policy "completions_all_own" on public.habit_completions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- priorities (onboarding: "what matters most right now") ----------
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
drop policy if exists "priorities_all_own" on public.priorities;
create policy "priorities_all_own" on public.priorities for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- friction_items (real misses only) ----------
create table if not exists public.friction_items (
  id uuid primary key,
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
drop policy if exists "friction_all_own" on public.friction_items;
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
drop policy if exists "challenges_all_own" on public.challenges;
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
drop policy if exists "reviews_all_own" on public.weekly_reviews;
create policy "reviews_all_own" on public.weekly_reviews for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- skills ("Skills I'm Building") ----------
create table if not exists public.skills (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text default '',
  progress integer not null default 0,
  hours numeric not null default 0,
  related_problem text default '',
  evidence jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists skills_user_idx on public.skills (user_id);

alter table public.skills enable row level security;
drop policy if exists "skills_all_own" on public.skills;
create policy "skills_all_own" on public.skills for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================================
-- Access-code rate limiting
-- -----------------------------------------------------------------------------
-- Written to ONLY by the Edge Function (service_role, bypasses RLS). No
-- policy grants any client access — enabling RLS with zero policies means
-- every normal request is denied by default, which is what we want here.
-- =============================================================================
create table if not exists public.access_code_attempts (
  id bigint generated always as identity primary key,
  ip text,
  created_at timestamptz not null default now()
);
create index if not exists access_attempts_ip_idx on public.access_code_attempts (ip, created_at);
alter table public.access_code_attempts enable row level security;

-- =============================================================================
-- MIGRATION — safe to run even if this project already had the earlier
-- (v1) schema with a plaintext `access_code` column on profiles.
-- =============================================================================
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'access_code'
  ) then
    -- Hash any existing plaintext codes into the new column before the
    -- old column is dropped, so previously issued codes keep working.
    update public.profiles
      set access_code_hash = encode(digest(upper(access_code), 'sha256'), 'hex')
      where access_code_hash is null and access_code is not null;
    alter table public.profiles drop column access_code;
  end if;
end $$;
