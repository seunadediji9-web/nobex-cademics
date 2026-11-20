-- Run this once in Supabase SQL Editor to create private PDF storage.
-- The app uploads files under: <auth-user-id>/<random-file-name>.pdf

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('study-pdfs', 'study-pdfs', false, 26214400, array['application/pdf'])
on conflict (id) do update
set public = false,
    file_size_limit = 26214400,
    allowed_mime_types = array['application/pdf'];

drop policy if exists "Students upload their own PDFs" on storage.objects;
create policy "Students upload their own PDFs"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'study-pdfs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Students read their own PDFs" on storage.objects;
create policy "Students read their own PDFs"
on storage.objects for select to authenticated
using (
  bucket_id = 'study-pdfs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Students delete their own PDFs" on storage.objects;
create policy "Students delete their own PDFs"
on storage.objects for delete to authenticated
using (
  bucket_id = 'study-pdfs'
  and (storage.foldername(name))[1] = auth.uid()::text
);
