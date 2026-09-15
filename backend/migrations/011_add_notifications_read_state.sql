-- Migration 011: Setup security_activity table and notifications read_at state
-- Safe to run on empty databases or databases where 010 was already applied.

-- 1. Create table if not exists (in case 010 was not previously executed)
create table if not exists public.security_activity (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null,
    event_type text not null,
    description text not null,
    device_info text,
    ip_address text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    read_at timestamp with time zone default null
);

-- 2. Ensure read_at column exists if table was already created by migration 010
alter table public.security_activity
add column if not exists read_at timestamp with time zone default null;

-- 3. Indexes for fast user queries and unread counting
create index if not exists idx_security_activity_user_created 
on public.security_activity (user_id, created_at desc);

create index if not exists idx_security_activity_user_read 
on public.security_activity (user_id, read_at);

-- 4. Enable Row Level Security
alter table public.security_activity enable row level security;

-- 5. Policies (drop first to make execution idempotent; PostgreSQL does not support CREATE POLICY IF NOT EXISTS)
drop policy if exists "Users can view their own security activity" on public.security_activity;
create policy "Users can view their own security activity"
on public.security_activity for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own security activity" on public.security_activity;
create policy "Users can insert their own security activity"
on public.security_activity for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own security activity" on public.security_activity;
create policy "Users can update their own security activity"
on public.security_activity for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Service role can update security activity read state" on public.security_activity;
create policy "Service role can update security activity read state"
on public.security_activity for update
using (true)
with check (true);

