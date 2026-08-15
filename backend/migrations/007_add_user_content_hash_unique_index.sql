-- Milestone 6.3: User-scoped Content Hash Uniqueness Index

-- Create unique partial index on public.documents for (user_id, content_hash)
-- Partial index (WHERE content_hash IS NOT NULL) allows legacy rows with NULL content_hash
-- and enforces database-level concurrency safety against duplicate uploads for the same user.

create unique index if not exists idx_documents_user_content_hash_unique
on public.documents (user_id, content_hash)
where content_hash is not null;
