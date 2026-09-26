"use client";

import { useState, useRef, useCallback } from "react";
import { Avatar } from "@/components/app/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/landing/Icon";
import { getFreshAccessToken } from "@/lib/supabase/auth-client";
import { getSupabaseClient } from "@/lib/supabase/client";
import { setProfilePhotoAction } from "@/lib/actions/profile";
import {
  PROFILE_PHOTOS_BUCKET,
  uploadFileDirect,
} from "@/lib/utils/direct-upload";
import { PROFILE_PHOTO_MIME_TYPES, validateMediaFile } from "@/lib/utils/media-upload";

interface ProfilePhotoUploaderProps {
  uid: string;
  currentUrl?: string | null;
  displayName: string;
  onUploadComplete: (url: string) => void;
}


export function ProfilePhotoUploader({
  uid,
  currentUrl,
  displayName,
  onUploadComplete,
}: ProfilePhotoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const validateFile = useCallback((file: File) => validateMediaFile(file, true), []);

  const handleUpload = useCallback(async () => {
    const input = inputRef.current;
    if (!input?.files?.[0]) return;

    const file = input.files[0];
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(false);
    setProgress(0);

    try {
      // The photo goes straight to the `photos` bucket from the browser, then a
      // small action links it to the profile row.
      //
      // This previously posted FormData to /api/photos/profile, which made the
      // file the request body of a Vercel function — so the UI promised "up to
      // 20 MB" while the platform silently refused anything over 4.5 MB. See
      // lib/utils/direct-upload.ts for the full explanation.
      const { data: auth } = await getSupabaseClient().auth.getUser();
      if (!auth.user || auth.user.id !== uid) {
        throw new Error("You're signed out. Please sign in again, then retry the upload.");
      }

      const uploaded = await uploadFileDirect(uid, file, {
        bucket: PROFILE_PHOTOS_BUCKET,
        profilePhoto: true,
        onProgress: setProgress,
      });
      if (!uploaded.ok) throw new Error(uploaded.error);

      // Only the path crosses the server boundary now.
      const linked = await setProfilePhotoAction({
        userId: uid,
        storagePath: uploaded.storagePath,
      });
      if (!linked.ok) {
        // Roll the uploaded object back: if the profile row was not updated the
        // file is unreachable from the UI, so leaving it would strand storage.
        await getSupabaseClient()
          .storage.from(PROFILE_PHOTOS_BUCKET)
          .remove([uploaded.storagePath])
          .catch(() => undefined);
        throw new Error(linked.error);
      }

      onUploadComplete(linked.url);
      setSuccess(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [uid, onUploadComplete, validateFile]);

  const handleRemove = useCallback(async () => {
    if (!window.confirm("Remove your profile photo?")) return;

    // If there's a current URL, extract the path and call the DELETE endpoint.
    if (currentUrl) {
      try {
        // URL format: /api/photos/{uid}/{fileName}
        const parts = currentUrl.split("/");
        const fileName = parts.pop();
        const uid = parts.pop();
        const accessToken = await getFreshAccessToken();
        if (uid && fileName) {
          await fetch(`/api/photos/${uid}/${fileName}`, {
            method: "DELETE",
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
          });
        }
      } catch {
        // Fall through to local state update even if the server delete fails.
      }
    }
    onUploadComplete("");
  }, [currentUrl, onUploadComplete]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        {currentUrl ? (
          <img
            src={currentUrl}
            alt={displayName}
            className="h-24 w-24 rounded-full object-cover ring-2 ring-brand-500/40"
          />
        ) : (
          <Avatar name={displayName || "User"} size="xl" />
        )}
        {uploading ? (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-ink-900/40">
            <Icon name="sparkle" className="h-5 w-5 animate-spin text-white" />
          </span>
        ) : null}
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {currentUrl ? "Replace" : "Upload photo"}
        </Button>
        {currentUrl ? (
          <Button size="sm" variant="ghost" disabled={uploading} onClick={handleRemove}>
            Remove
          </Button>
        ) : null}
      </div>

      {error ? <p role="alert" className="text-xs text-danger-300">{error}</p> : null}
      {uploading ? <div role="status" className="w-full text-center text-xs text-ink-300">
        <progress max={100} value={progress} aria-label="Photo upload progress" className="w-full" />
        {progress === 100 ? "Saving photo…" : `Uploading ${progress}%`}
      </div> : null}
      {success && !error ? <p role="status" className="text-xs text-success-300">Photo saved successfully.</p> : null}

      <input
        ref={inputRef}
        type="file"
        accept={PROFILE_PHOTO_MIME_TYPES.join(",")}
        disabled={uploading}
        onChange={handleUpload}
        className="hidden"
      />
      <p className="text-xs text-ink-400">JPEG, PNG, WebP, GIF, or AVIF up to 20 MB. Hosting limits may be lower.</p>
    </div>
  );
}
