-- ═══════════════════════════════════════════════════
-- LINESNIPES — Supabase Database Setup
-- Run this in your Supabase SQL Editor (one time)
-- ═══════════════════════════════════════════════════

-- 1. Profiles table (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  plan text default 'free' check (plan in ('free', 'standard', 'unlimited', 'lifetime')),
  fetches_used integer default 0,
  fetches_limit integer default 10,
  plan_started_at timestamptz default now(),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz default now()
);

-- 2. Enable RLS
alter table public.profiles enable row level security;

-- 3. Users can read their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- 4. Service role can do everything (used by serverless functions)
create policy "Service role full access"
  on public.profiles for all
  using (true)
  with check (true);

-- 5. Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, plan, fetches_used, fetches_limit)
  values (new.id, new.email, 'free', 0, 10);
  return new;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if it exists, then create
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. Function to increment usage (called by serverless function)
create or replace function public.increment_usage(user_id uuid)
returns void as $$
begin
  update public.profiles
  set fetches_used = fetches_used + 1
  where id = user_id;
end;
$$ language plpgsql security definer;

-- 7. Index for fast lookups
create index if not exists idx_profiles_stripe_sub
  on public.profiles (stripe_subscription_id)
  where stripe_subscription_id is not null;

create index if not exists idx_profiles_stripe_cust
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;
