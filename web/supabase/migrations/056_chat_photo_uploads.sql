-- Chat photo attachments bucket + message image support.
-- Public read so realtime subscribers can render instantly; writes scoped to
-- authenticated members (service-role bypasses RLS for server actions).
insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', true)
on conflict (id) do update set public = true;

drop policy if exists "chat_attachments_read" on storage.objects;
create policy "chat_attachments_read"
  on storage.objects for select
  using (bucket_id = 'chat-attachments');

drop policy if exists "chat_attachments_write" on storage.objects;
create policy "chat_attachments_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'chat-attachments');

alter table public.messages
  add column if not exists image_url text;
