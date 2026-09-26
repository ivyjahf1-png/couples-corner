"use client";

import { useMemo } from "react";
import { Avatar, PresenceDot } from "@/components/app/Avatar";
import { usePresence } from "@/lib/hooks/usePresence";
import { isPresenceOnline } from "@/lib/presence";

/**
 * Public profile header avatar with a live presence dot.
 *
 * Split into its own client component because the profile page itself is a
 * Server Component: presence updates on a timer, so the part that renders the
 * dot has to be on the client while the rest of the page stays server-rendered.
 *
 * `initialOnline` is the server-rendered verdict, so the dot is correct on the
 * first paint instead of flipping a beat later once the first poll resolves.
 */
export function ProfilePresenceAvatar({
  userId,
  name,
  photoUrl,
  initialOnline = false,
  storagePath,
}: {
  userId: string;
  name: string;
  photoUrl?: string | null;
  initialOnline?: boolean;
  /** Present when the photo is served through the /api/photos proxy. */
  storagePath?: string | null;
}) {
  const ids = useMemo(() => (userId ? [userId] : []), [userId]);
  const { presence } = usePresence(ids, Boolean(userId));

  const entry = presence[userId];
  const online = entry ? entry.online : initialOnline;
  const src = photoUrl ?? (storagePath ? `/api/photos/${userId}/${storagePath.split("/").pop()}` : null);

  return (
    <span className="relative inline-flex shrink-0">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          className="h-28 w-28 rounded-full object-cover ring-2 ring-brand-500/40"
        />
      ) : (
        <Avatar name={name} size="xl" />
      )}
      <PresenceDot online={online} size="lg" />
      {/* Announced in text as well as by colour, so the state is never
          colour-only for assistive tech. */}
      <span className="sr-only">
        {online ? "Online now" : "Offline"}
        {entry?.lastSeenAt && !online ? ` — last seen ${new Date(entry.lastSeenAt).toLocaleString()}` : ""}
      </span>
    </span>
  );
}

/** Exported for tests/consumers that need the same rule without rendering. */
export { isPresenceOnline };