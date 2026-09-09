"use client";

import { useState, useRef, useCallback } from "react";
import { Avatar } from "@/components/app/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/landing/Icon";

interface ProfilePhotoUploaderProps {
  uid: string;
  currentUrl?: string | null;
  displayName: string;
  onUploadComplete: (url: string) => void;
}

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const VALID_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function ProfilePhotoUploader({
  uid,
  currentUrl,
  displayName,
  onUploadComplete,
}: ProfilePhotoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (!VALID_TYPES.includes(file.type)) {
      return "Unsupported file type. Use JPG, PNG, or WebP.";
    }
    if (file.size > MAX_BYTES) {
      return "Photo too large. Maximum size is 5 MB.";
    }
    return null;
  }, []);

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

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("uid", uid);

      const response = await fetch("/api/photos/profile", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed");
      }

      const result = await response.json();
      onUploadComplete(result.url);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
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
        if (uid && fileName) {
          await fetch(`/api/photos/${uid}/${fileName}`, { method: "DELETE" });
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
            className="h-24 w-24 rounded-full object-cover ring-2 ring-brand-200"
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

      {error ? <p className="text-xs text-danger-700">{error}</p> : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleUpload}
        aria-label="Profile photo"
      />
      <p className="text-xs text-ink-500">JPG, PNG, or WebP up to 5 MB</p>
    </div>
  );
}
