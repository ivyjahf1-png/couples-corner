# User media upload deployment

## Changes
- Profile photo picker ref restored; transferred-byte progress and save feedback added.
- Profile uploads use the existing public `photos` bucket and stable `/api/photos/...` URL. Failed profile saves are checked and uploaded objects are cleaned up. Concurrent saves use a compare-and-swap check; retry after conflicts.
- New profile gallery uploads directly to Supabase Storage using the signed-in user's token, never the service-role key. Database rows contain `user_id` and `storage_path`. Reads load 24 items at a time.
- Lifetime ten-item application quota removed. Profile photos: 20 MB per file; gallery: 250 MB per file. MIME allowlists exclude active document types such as SVG/HTML. File MIME metadata is not content scanning or transcoding.
- Existing gallery Server Actions now verify session ownership. Large files should use the new gallery, not Server Actions.

## Required setup (not applied by the coding agent)
1. Back up the database and review existing Storage and `user_media` policies. Policies are additive; unrelated permissive policies may need separate review.
2. In Supabase SQL Editor, run:
   `C:\Users\HomePC\Documents\couple's conner\web\supabase\migrations\014_user_media_endless_uploads.sql`
   This creates the missing public bucket/table, grants API access, sets owner-write RLS, and removes the old quota trigger/policy.
3. Set the Supabase project global upload limit to at least 250 MB if the plan supports it. Check storage/egress budgets. Buckets cannot override a lower global plan limit.
4. Deploy the web changes. Gallery objects are PUBLIC, including on otherwise private profiles; the UI states this before upload. Do not use this gallery for private documents.
5. Test with two ordinary accounts: upload JPEG and MOV, refresh, open originals, load another gallery page, reject unsupported/oversized files, and confirm one account cannot write/delete objects or media records for the other.
6. Test profile replacement and failed-save feedback. Profile photos still use the app API: hosting request-body limits can be lower than 20 MB. Existing profiles must have a valid photos JSONB column and user_id link.

## Verification and limitations
- Mocked profile upload integration verifies storage upload, profile persistence, URL generation, and cleanup on database failure.
- Focused TypeScript checks passed. Full build status is reported separately in the task response.
- Live read-only checks: `photos` exists and is public; `user-media` bucket and `user_media` table are missing.
- No SQL execution credentials, PostgreSQL parser, or signed-in browser test account was available. Migration execution and end-to-end uploads remain unverified.
- No unlimited capacity guarantee: provider limits, billing, browser format support, and network failures still apply. Large uploads are not resumable; failed transfers require retrying. Orphans from interrupted sessions need operational cleanup.
- Gallery uploads do not automatically create feed posts or change the profile avatar. They are attached to the same authenticated user and displayed in that user's profile gallery.
