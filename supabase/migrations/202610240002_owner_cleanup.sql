-- Allow a signed-in user to remove only their own private uploads and metadata.
-- Admins retain full deletion permissions through the existing policies.
drop policy if exists "owners delete own media metadata" on public.media;
create policy "owners delete own media metadata" on public.media for delete to authenticated
using (uploaded_by = auth.uid());

drop policy if exists "owners delete own editorial files" on storage.objects;
create policy "owners delete own editorial files" on storage.objects for delete to authenticated
using (bucket_id = 'rls-editorial' and (storage.foldername(name))[1] = auth.uid()::text);
