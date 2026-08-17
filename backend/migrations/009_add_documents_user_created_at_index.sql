-- Milestone 7.6: Performance Hardening — User-scoped Created At Index
-- Optimizes user-scoped sorting, dashboard chronological queries, and library pagination.

create index if not exists idx_documents_user_created_at
on public.documents (user_id, created_at desc);
