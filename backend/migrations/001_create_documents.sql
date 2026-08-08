create table if not exists public.documents (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    filename text not null,
    storage_path text not null unique,
    content_type text not null,
    size bigint not null check (size > 0),
    status text not null default 'uploaded',
    created_at timestamptz not null default now()
);

alter table public.documents enable row level security;

create policy "Users can read their own document metadata"
on public.documents
for select
to authenticated
using ((select auth.uid()) = user_id);
