"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/landing/Icon";
import { Avatar } from "@/components/app/Avatar";
import { Chip } from "@/components/ui/Chip";
import {
  getProfileDetailAction,
  type ProfileDetailView,
} from "@/lib/actions/profile-detail";

/**
 * Half-page bottom sheet showing comprehensive profile details:
 * expanded photos, location, phone-number status, date joined and
 * occupation. Dark navy theme (#0F172A) is preserved — the sheet never
 * forces a white background.
 *
 * All fields render through strict optional chaining so a malformed
 * profile row can never crash the deck.
 */
export function ProfileDetailSheet({
  profileId,
  name,
  open,
  onClose,
}: {
  profileId: string | null | undefined;
  name: string;
  open: boolean;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<ProfileDetailView | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setDetail(null);
    setLoading(true);
    getProfileDetailAction(profileId ?? "")
      .then((result) => {
        if (!cancelled) setDetail(result);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    // Escape closes the sheet.
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, profileId, onClose]);

  if (!open) return null;

  const displayName = detail?.name || name || "Community member";
  const photos = detail?.photos ?? [];

  function photoSrc(photo: { storagePath?: string; publicUrl?: string | null }): string | null {
    return (
      photo?.publicUrl ??
      (photo?.storagePath
        ? `/api/photos/${profileId ?? ""}/${photo.storagePath.split("/").pop() ?? ""}`
        : null)
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`${displayName} — full profile`}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/60 backdrop-blur-sm"
      />
      <div className="relative z-10 max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0F172A] shadow-2xl sm:rounded-3xl">
        {/* Sheet grab handle */}
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-[#0F172A]/95 px-5 py-4 backdrop-blur">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-300">
            <Icon name="profile" className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold text-white">{displayName}</h2>
            <p className="truncate text-xs text-ink-300">Full profile</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close full profile"
            className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
        {/* BODY-PLACEHOLDER */}
        {loading ? (
          <div className="flex flex-col gap-3 px-5 py-10" aria-busy="true">
            <span role="status" aria-live="polite" className="sr-only">
              Loading profile
            </span>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                aria-hidden
                className={`sk sk--line block h-4 ${i === 0 ? "w-full max-w-sm" : i === 1 ? "w-4/5 max-w-xs" : "w-3/5 max-w-[12rem]"}`}
              />
            ))}
          </div>
        ) : !detail ? (
          <p className="px-5 py-10 text-center text-sm text-ink-400">
            This profile&apos;s details aren&apos;t available right now.
          </p>
        ) : (
          <div className="flex flex-col gap-6 px-5 py-6">
            {/* Expanded photos */}
            <section aria-label="Photos" className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-400">Photos</h3>
              {photos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {photos.slice(0, 9).map((photo, index) => {
                    const src = photoSrc(photo);
                    return src ? (
                      <img
                        key={photo.storagePath ?? photo.id ?? index}
                        src={src}
                        alt={`${displayName} photo ${index + 1}`}
                        className="aspect-square w-full rounded-xl object-cover ring-1 ring-white/10"
                      />
                    ) : null;
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <Avatar name={displayName} kind={detail.kind} size="lg" />
                  <p className="text-sm text-ink-400">No photos shared yet.</p>
                </div>
              )}
            </section>

            {/* Details grid */}
            <section aria-label="Details" className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-400">Details</h3>
              <dl className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <dt className="text-xs text-ink-400">Location</dt>
                  <dd className="truncate text-sm font-medium text-white">
                    {detail?.location?.trim() || "Not shared"}
                    {detail?.country ? <span className="text-ink-300"> · {detail.country}</span> : null}
                  </dd>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <dt className="text-xs text-ink-400">Phone number</dt>
                  <dd className="text-sm font-medium text-white">
                    {detail?.phoneStatus === "shared" ? (
                      <span className="inline-flex items-center gap-1.5">
                        Shared <Chip tone="success" leadingDot>Verified</Chip>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        Not shared <Chip tone="neutral">Private</Chip>
                      </span>
                    )}
                  </dd>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <dt className="text-xs text-ink-400">Joined</dt>
                  <dd className="truncate text-sm font-medium text-white">
                    {detail?.joinedAt
                      ? new Date(detail.joinedAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "Recently"}
                  </dd>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <dt className="text-xs text-ink-400">Occupation</dt>
                  <dd className="truncate text-sm font-medium text-white">
                    {detail?.occupation?.trim() || "Not shared"}
                  </dd>
                </div>
              </dl>
            </section>

            {/* Bio */}
            {detail?.bio?.trim() ? (
              <section aria-label="About" className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-400">About</h3>
                <p className="text-sm leading-6 text-ink-200">{detail?.bio?.trim()}</p>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
