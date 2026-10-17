-- Chat voice notes: audio attachments on messages.
--
-- Migration 056 added `image_url` for photo sharing. Voice notes reuse the SAME
-- `chat-attachments` storage bucket (it already has public-read + authenticated-
-- write policies that accept any content type), so no new bucket or storage
-- policy is needed — only a column to hold the recording's public URL.
--
-- `body` keeps a short text fallback ("🎤 Voice note") so every existing bubble
-- renderer shows something meaningful even if it does not understand `audio_url`.

alter table public.messages
  add column if not exists audio_url text;

-- Voice notes are `type = 'audio'`; make sure the enum-ish text column is not
-- constrained. It is a plain text column in 016, so no action is required here
-- beyond ensuring the column exists.
