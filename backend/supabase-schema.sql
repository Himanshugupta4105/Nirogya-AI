-- Run this in Supabase Dashboard → SQL Editor.
-- The bucket is private. The Node server uses the service-role key only on the server,
-- verifies every user's access token, and scopes all record queries to that user's ID.

create table if not exists public.health_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  original_name text not null check (char_length(original_name) <= 180),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'application/pdf')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  storage_path text not null unique,
  record_type text not null default 'other' check (record_type in ('report', 'prescription', 'visit_note', 'other')),
  extracted_text text not null default '',
  extraction_method text not null check (extraction_method in ('tesseract_image_ocr', 'pdfjs_text_extraction')),
  extraction_status text not null check (extraction_status in ('completed', 'no_text_found', 'no_text_layer')),
  ocr_confidence numeric(5, 2) check (ocr_confidence is null or (ocr_confidence >= 0 and ocr_confidence <= 100)),
  created_at timestamptz not null default now()
);

create index if not exists health_records_user_created_idx
  on public.health_records (user_id, created_at desc);

alter table public.health_records enable row level security;

drop policy if exists "Users can read their own health records" on public.health_records;
create policy "Users can read their own health records"
  on public.health_records for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own health records" on public.health_records;
create policy "Users can insert their own health records"
  on public.health_records for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own health records" on public.health_records;
create policy "Users can delete their own health records"
  on public.health_records for delete to authenticated
  using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'health-records',
  'health-records',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read their own health files" on storage.objects;
create policy "Users can read their own health files"
  on storage.objects for select to authenticated
  using (bucket_id = 'health-records' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Users can upload their own health files" on storage.objects;
create policy "Users can upload their own health files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'health-records' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Users can delete their own health files" on storage.objects;
create policy "Users can delete their own health files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'health-records' and (storage.foldername(name))[1] = (select auth.uid()::text));
