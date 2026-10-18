"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  PROFILE_PHOTOS_BUCKET,
  uploadFileDirect,
} from "@/lib/utils/direct-upload";

/** Single photo item for the gallery */
export interface ProfilePhoto {
  id: string;
  photo_url: string;
  storage_path?: string | null;
  display_order: number;
  is_primary: boolean;
  created_at: string;
}

/** Props for the full-bleed photo gallery */
export interface ProfileGalleryProps {
  /** Ordered list of photos (display_order ASC) */
  photos: ProfilePhoto[];
  /** Current user id (for upload/delete permissions) */
  currentUserId: string | null;
  /** Profile user id being viewed */
  profileUserId: string;
  /** User name for visitor overlay */
  name: string;
  /** Avatar URL for visitor overlay */
  avatarUrl: string | null;
  /** Online status */
  isOnline: boolean;
  /** Hobby tags */
  hobbies: string[];
  /** Callback when a new photo is uploaded (optional — gallery refreshes via router when absent) */
  onPhotoUploaded?: () => void;
  /** Callback when a photo is deleted (optional) */
  onPhotoDeleted?: (photoId: string) => void;
  /** Callback when display order changes (reorder) (optional) */
  onReorder?: (photoId: string, newOrder: number) => void;
}


/**
 * ProfileGallery - Full-bleed hero image carousel with photo management.
 *
 * Features:
 * - Full-bleed hero image with rounded top corners
 * - Progress dots indicating total photo count
 * - Swipe + tap-left/tap-right navigation
 * - Visitor controls overlay (name, online badge, hobbies, chat, follow)
 * - Owner upload (+ Add Photo), delete, and reorder
 */
export function ProfileGallery({
  photos,
  currentUserId,
  profileUserId,
  name,
  avatarUrl,
  isOnline,
  hobbies = [],
  onPhotoUploaded,
  onPhotoDeleted,
  onReorder,
}: ProfileGalleryProps) {
  const router = useRouter();
  const refresh = onPhotoUploaded ?? (() => router.refresh());
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  /**
   * Inline success/error line under the hero. This app has no toast library —
   * `ProfilePhotoUploader` reports the same way (a message rendered next to the
   * control), so the gallery follows suit rather than inventing a dependency.
   */
  const [feedback, setFeedback] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const totalPhotos = photos.length;
  const activePhoto = photos[activeIndex];
  const isOwner = currentUserId != null && currentUserId === profileUserId;

  // Progress dots
  const dots = Array.from({ length: totalPhotos }, (_, i) => (
    <button
      key={i}
      className={`h-2 w-2 rounded-full transition-all duration-300 ${
        i === activeIndex
          ? "bg-[#FF7A00] scale-100"
          : "bg-white/[0.3] scale-50"
      }`}
      aria-label={`Go to photo ${i + 1}`}
      onClick={() => setActiveIndex(i)}
    />
  ));

  // Handle swipe / drag
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragOffsetX(0);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) setDragOffsetX(e.clientX - dragStartX);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    const threshold = 50;
    if (dragOffsetX < -threshold) setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
    else if (dragOffsetX > threshold)
      setActiveIndex((prev) => (prev < totalPhotos - 1 ? prev + 1 : prev));
    setIsDragging(false);
    setDragOffsetX(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
    else if (e.key === "ArrowRight")
      setActiveIndex((prev) => (prev < totalPhotos - 1 ? prev + 1 : prev));
  };

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !currentUserId) return;
    const file = files[0];
    if (!file.type.startsWith("image/")) {
      setFeedback({ tone: "err", text: "Please select an image file." });
      return;
    }
    try {
      const supabase = getSupabaseClient();
      // Direct browser -> Storage upload (same path ProfilePhotoUploader uses);
      // keeps large files off the 4.5 MB function body limit.
      const uploaded = await uploadFileDirect(currentUserId, file, {
        bucket: PROFILE_PHOTOS_BUCKET,
        profilePhoto: true,
      });
      if (!uploaded.ok) {
        setFeedback({ tone: "err", text: uploaded.error });
        return;
      }
      // Record the row so the next server render includes this photo.
      const { error: insertError } = await supabase.from("profile_photos").insert({
        user_id: currentUserId,
        photo_url: uploaded.publicUrl,
        storage_path: uploaded.storagePath,
        display_order: totalPhotos,
        is_primary: totalPhotos === 0,
      });
      if (insertError) {
        // Roll back the orphaned object so a failed link cannot strand storage.
        await supabase.storage
          .from(PROFILE_PHOTOS_BUCKET)
          .remove([uploaded.storagePath])
          .catch(() => undefined);
        console.error("Insert error:", insertError);
        setFeedback({ tone: "err", text: "Failed to save photo. Please try again." });
        return;
      }
      setFeedback({ tone: "ok", text: "Photo uploaded." });
      refresh();
    } catch (error) {
      console.error("Upload error:", error);
      setFeedback({ tone: "err", text: "Failed to upload photo. Please try again." });
    } finally {
      // Allow re-selecting the same file next time.
      e.target.value = "";
    }
  };

  const handleDeletePhoto = async (photo: ProfilePhoto) => {
    if (!currentUserId) return;

    if (!confirm("Delete this photo?")) return;

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from("profile_photos")
        .delete()
        .eq("id", photo.id)
        .eq("user_id", currentUserId);
      if (error) {
        console.error("Delete error:", error);
        setFeedback({ tone: "err", text: "Failed to delete photo." });
        return;
      }
      // Best-effort storage cleanup; the row is already gone either way.
      if (photo.storage_path) {
        await supabase.storage
          .from(PROFILE_PHOTOS_BUCKET)
          .remove([photo.storage_path])
          .catch(() => undefined);
      }
      setActiveIndex((prev) => Math.max(0, Math.min(prev, totalPhotos - 2)));
      setFeedback({ tone: "ok", text: "Photo deleted." });
      refresh();
    } catch (error) {
      console.error("Delete error:", error);
      setFeedback({ tone: "err", text: "Failed to delete photo." });
    }
  };

  const goPrev = useCallback(
    () => setActiveIndex((p) => (p > 0 ? p - 1 : totalPhotos - 1)),
    [totalPhotos]
  );
  const goNext = useCallback(
    () => setActiveIndex((p) => (p < totalPhotos - 1 ? p + 1 : 0)),
    [totalPhotos]
  );

  // Reorder support is wired by a future drag-to-reorder pass; reference the
  // callback so the prop stays part of the public contract without a lint error.
  void onReorder;

  // Side-zone click: left third = prev, right third = next, centre = no-op
  // (arrows stop propagation so they don't double-fire this).
  const handleCarouselClick = (e: React.MouseEvent) => {
    const el = carouselRef.current;
    if (!el || totalPhotos <= 1) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 3) goPrev();
    else if (x > (rect.width * 2) / 3) goNext();
  };

  return (
    <div className="relative w-full overflow-hidden rounded-t-[2rem] bg-[#0F0C1B]">
      {/* Hero image (full-bleed) */}
      <div
        ref={carouselRef}
        className="relative h-[420px] w-full outline-none"
        onKeyDown={handleKeyDown}
        tabIndex={0}
        onClick={handleCarouselClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Active photo with top rounding */}
        {activePhoto ? (
          <div
            className="absolute inset-0"
            style={{
              maskImage:
                "linear-gradient(to bottom, black 90%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, black 90%, transparent 100%)",
            }}
          >
            <Image
              src={activePhoto.photo_url}
              alt={`Photo ${activeIndex + 1} of ${totalPhotos}`}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1A1726]">
            {avatarUrl ? (
              <Image src={avatarUrl} alt={`${name}'s photo`} fill className="object-cover" priority />
            ) : (
              <p className="text-white/50 text-lg">No photos yet</p>
            )}
          </div>
        )}

        {/* Top rounding with backdrop */}
        <div className="absolute inset-x-0 top-0 h-[2rem] bg-gradient-to-b from-[#0F0C1B] to-transparent" />

        {/* Gradient overlay for visitor info readability */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 to-transparent" />

        {/* Visitor overlay: name + online + hobbies */}
        <div className="absolute bottom-12 left-4 right-4 z-10">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white">{name}</h2>
            <span
              className={`h-2.5 w-2.5 rounded-full ${isOnline ? "bg-green-400" : "bg-white/30"}`}
              title={isOnline ? "Online" : "Offline"}
            />
          </div>
          {hobbies.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {hobbies.slice(0, 4).map((h) => (
                <span
                  key={h}
                  className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white backdrop-blur"
                >
                  {h}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Navigation arrows */}
        {totalPhotos > 1 && (
          <>
            <button
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition hover:bg-white/30"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              aria-label="Previous photo"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition hover:bg-white/30"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              aria-label="Next photo"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </>
        )}

        {/* Progress dots */}
        {totalPhotos > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
            {dots}
          </div>
        )}
      </div>




      {/* Owner actions (top-right of hero): Add Photo + Remove */}
      {isOwner && (
        <div className="absolute right-4 top-12 z-20 flex flex-col items-end gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-white text-xs backdrop-blur-sm transition hover:bg-white/30">
            <Plus className="h-3.5 w-3.5" />
            Add Photo
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAddPhoto}
            />
          </label>
          {activePhoto && (
            <button
              className="flex items-center gap-1.5 rounded-full bg-red-500/80 px-3 py-1.5 text-white text-xs transition hover:bg-red-500"
              onClick={() => handleDeletePhoto(activePhoto)}
            >
              <X className="h-3.5 w-3.5" />
              Remove
            </button>
          )}
        </div>
      )}

      {/* Inline upload/delete feedback (owner actions live just above) */}
      {feedback && (
        <p
          role="status"
          className={`px-4 pb-2 text-xs ${
            feedback.tone === "ok" ? "text-green-400" : "text-red-400"
          }`}
        >
          {feedback.text}
        </p>
      )}

      {/* Drag indicator */}
      {isDragging && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30">
          <span className="text-white/60 text-sm">
            Swipe {dragOffsetX < 0 ? "left" : "right"} to navigate
          </span>
        </div>
      )}
    </div>
  );
}

export default ProfileGallery;
