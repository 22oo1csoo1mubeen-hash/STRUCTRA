update public.documents
set status = 'pending'
where status = 'uploaded';

alter table public.documents
    alter column status set default 'pending';

alter table public.documents
    drop constraint if exists documents_status_check,
    add constraint documents_status_check
        check (status in ('pending', 'processing', 'completed', 'failed'));
