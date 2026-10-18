-- Track recently active Supabase Auth sessions per device.
-- The application writes through its trusted backend using the Supabase secret key.
create table if not exists public.security_activity (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null,
    event_type text not null,
    description text not null,
    device_info text,
    ip_address text,
    created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_security_activity_user_created
    on public.security_activity (user_id, created_at desc);

alter table public.security_activity enable row level security;
drop policy if exists "Users can view their own security activity" on public.security_activity;
create policy "Users can view their own security activity"
    on public.security_activity for select
    using (auth.uid() = user_id);
drop policy if exists "Users can insert their own security activity" on public.security_activity;
create policy "Users can insert their own security activity"
    on public.security_activity for insert
    with check (auth.uid() = user_id);

create table if not exists public.security_sessions (
    user_id uuid not null,
    session_id uuid not null,
    device_info text not null,
    ip_address text,
    created_at timestamptz not null default now(),
    last_seen_at timestamptz not null default now(),
    primary key (user_id, session_id)
);

create index if not exists idx_security_sessions_user_last_seen
    on public.security_sessions (user_id, last_seen_at desc);

alter table public.security_sessions enable row level security;

drop policy if exists "Users can view their own security sessions" on public.security_sessions;
create policy "Users can view their own security sessions"
    on public.security_sessions for select
    using (auth.uid() = user_id);

