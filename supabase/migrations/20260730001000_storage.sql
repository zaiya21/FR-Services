-- =====================================================================
-- STORAGE — where the document scans and the storefront images live.
--
-- The commonest way to leak a company's paperwork is a public bucket. The
-- documents table can mask a permit number perfectly and it will not
-- matter if the PDF behind it is fetchable by URL. So:
--
--   company-documents   private. Read by the owning company, the platform,
--                       and — only for a document whose owner ticked
--                       "let renters open the file" — anyone.
--   company-branding    public. Logos and cover images are on the
--                       storefront by definition.
--
-- Paths are <company_id>/<filename>. The first path segment is the
-- company, which is what every policy below keys on.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('company-documents', 'company-documents', false, 1572864,
   array['application/pdf','image/png','image/jpeg','image/webp']),
  ('company-branding',  'company-branding',  true,  2097152,
   array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

comment on table storage.buckets is
  'company-documents is private and must stay private. SVG is absent from
   both mime lists on purpose: an SVG is a script container, and these files
   are served from the same origin as the app.';

-- ---------------------------------------------------------------------
-- Documents
-- ---------------------------------------------------------------------

-- The company reads and writes its own folder.
create policy "documents: company reads own folder"
on storage.objects for select to authenticated
using (
  bucket_id = 'company-documents'
  and app.is_member_of((storage.foldername(name))[1]::app.slug)
);

create policy "documents: company uploads to own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'company-documents'
  and app.is_member_of((storage.foldername(name))[1]::app.slug)
);

create policy "documents: company replaces own files"
on storage.objects for update to authenticated
using (
  bucket_id = 'company-documents'
  and app.is_member_of((storage.foldername(name))[1]::app.slug)
)
with check (
  bucket_id = 'company-documents'
  and app.is_member_of((storage.foldername(name))[1]::app.slug)
);

create policy "documents: company deletes own files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'company-documents'
  and app.is_member_of((storage.foldername(name))[1]::app.slug)
);

-- The platform reads everything in the bucket — that is the review queue
-- opening the attachment. It writes nothing.
create policy "documents: platform reads all"
on storage.objects for select to authenticated
using (bucket_id = 'company-documents' and app.is_platform());

-- And the narrow public case: a specific file the owner chose to release.
-- Keyed on the documents row, so un-ticking "show the file" revokes access
-- immediately without touching Storage.
create policy "documents: released files are public"
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'company-documents'
  and exists (
    select 1
    from public.documents d
    join public.companies c on c.id = d.company_id
    where d.file_path = storage.objects.name
      and d.published
      and d.show_file
      and c.listed
      and c.suspended_at is null
  )
);

-- ---------------------------------------------------------------------
-- Branding. Public to read, company-scoped to write.
-- ---------------------------------------------------------------------
create policy "branding: anyone reads"
on storage.objects for select to anon, authenticated
using (bucket_id = 'company-branding');

create policy "branding: company writes own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'company-branding'
  and app.is_member_of((storage.foldername(name))[1]::app.slug)
);

create policy "branding: company updates own folder"
on storage.objects for update to authenticated
using (
  bucket_id = 'company-branding'
  and app.is_member_of((storage.foldername(name))[1]::app.slug)
)
with check (
  bucket_id = 'company-branding'
  and app.is_member_of((storage.foldername(name))[1]::app.slug)
);

create policy "branding: company deletes own folder"
on storage.objects for delete to authenticated
using (
  bucket_id = 'company-branding'
  and app.is_member_of((storage.foldername(name))[1]::app.slug)
);
