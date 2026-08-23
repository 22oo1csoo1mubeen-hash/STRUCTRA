-- Migration 010: Create Security Activity Audit Log table
create table if not exists public.security_activity (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null,
    event_type text not null,
    description text not null,
    device_info text,
    ip_address text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_security_activity_user_created 
on public.security_activity (user_id, created_at desc);

alter table public.security_activity enable row level security;

create policy "Users can view their own security activity"
on public.security_activity for select
using (auth.uid() = user_id);

create policy "Users can insert their own security activity"
on public.security_activity for insert
with check (auth.uid() = user_id);
