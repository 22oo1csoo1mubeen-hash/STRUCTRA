-- Milestone 6.2: Document Persistence & Extraction Storage

-- Add extraction_result column to store document-specific structured AI extraction JSON
alter table public.documents
    add column if not exists extraction_result jsonb;

-- Add quality_result column to store document-specific quality signals and confidence evaluation
alter table public.documents
    add column if not exists quality_result jsonb;
