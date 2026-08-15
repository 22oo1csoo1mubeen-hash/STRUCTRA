    -- Create extraction cache table for storing structured AI extractions by SHA-256 content hash
    create table if not exists public.extraction_cache (
        content_hash text primary key check (content_hash ~ '^[0-9a-f]{64}$'),
        extraction_result jsonb not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
    );

    alter table public.extraction_cache enable row level security;

    -- Authenticated users can read cached extractions by content hash
    create policy "Authenticated users can read extraction cache"
    on public.extraction_cache
    for select
    to authenticated
    using (true);

    -- Authenticated users can insert cached extractions
    create policy "Authenticated users can insert extraction cache"
    on public.extraction_cache
    for insert
    to authenticated
    with check (true);

    -- Authenticated users can update cached extractions
    create policy "Authenticated users can update extraction cache"
    on public.extraction_cache
    for update
    to authenticated
    using (true);
