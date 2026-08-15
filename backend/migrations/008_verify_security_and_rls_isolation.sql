-- Milestone 6.7: Strict User Isolation & RLS Security Verification

-- 1. Ensure RLS is enabled on public.documents
alter table public.documents enable row level security;

-- 2. Select policy (Strict owner isolation)
drop policy if exists "Users can read their own document metadata" on public.documents;
drop policy if exists "Users can select their own document metadata" on public.documents;
create policy "Users can select their own document metadata"
on public.documents
for select
to authenticated
using ((select auth.uid()) = user_id);

-- 3. Insert policy (Strict owner isolation)
drop policy if exists "Users can insert their own document metadata" on public.documents;
create policy "Users can insert their own document metadata"
on public.documents
for insert
to authenticated
with check ((select auth.uid()) = user_id);

-- 4. Update policy (Strict owner isolation)
drop policy if exists "Users can update their own document metadata" on public.documents;
create policy "Users can update their own document metadata"
on public.documents
for update
to authenticated
using ((select auth.uid()) = user_id);

-- 5. Delete policy (Strict owner isolation)
drop policy if exists "Users can delete their own document metadata" on public.documents;
create policy "Users can delete their own document metadata"
on public.documents
for delete
to authenticated
using ((select auth.uid()) = user_id);
