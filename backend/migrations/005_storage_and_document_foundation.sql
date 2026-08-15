-- Milestone 6.1: Supabase Storage + Database Foundation

-- 1. Add processed_at column to track processing completion time
alter table public.documents
    add column if not exists processed_at timestamptz;

-- 2. Complete Row Level Security (RLS) policies on public.documents table
alter table public.documents enable row level security;

drop policy if exists "Users can insert their own document metadata" on public.documents;
create policy "Users can insert their own document metadata"
on public.documents
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own document metadata" on public.documents;
create policy "Users can update their own document metadata"
on public.documents
for update
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own document metadata" on public.documents;
create policy "Users can delete their own document metadata"
on public.documents
for delete
to authenticated
using ((select auth.uid()) = user_id);

-- 3. Ensure Supabase Storage 'documents' bucket exists and is PRIVATE
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do update set public = false;

-- 4. Supabase Storage RLS policies enforcing path ownership: {user_id}/{document_id}/original.{ext}
drop policy if exists "Users can read their own documents in storage" on storage.objects;
create policy "Users can read their own documents in storage"
on storage.objects
for select
to authenticated
using (
    bucket_id = 'documents'
    and (select auth.uid())::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can upload their own documents to storage" on storage.objects;
create policy "Users can upload their own documents to storage"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'documents'
    and (select auth.uid())::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update their own documents to storage" on storage.objects;
create policy "Users can update their own documents to storage"
on storage.objects
for update
to authenticated
using (
    bucket_id = 'documents'
    and (select auth.uid())::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete their own documents to storage" on storage.objects;
create policy "Users can delete their own documents to storage"
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'documents'
    and (select auth.uid())::text = (storage.foldername(name))[1]
);
