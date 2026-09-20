"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { sendConnectionAction } from "@/lib/actions/connections";

import { Avatar } from "@/components/app/Avatar";
import { ConnectionButton } from "@/components/app/ConnectionButton";
import { Chip } from "@/components/ui/Chip";
import { useActionError, failureMessage } from "@/components/ui/FailureToasts";
import type { ProfileCardView } from "@/lib/feature/types";

/**
 * Profile card used in Discover and dashboard suggestions. Consumes the
 * Firestore-ready ProfileCardView; connection actions route through
 * ConnectionButton so Server Actions slot in later without UI changes.
 *
 * Storage-backed photos are served via `/api/photos/{uid}/{fileName}`;
 * `avatarUrl` carries that URL (see lib/server/discovery.ts).
 *
 * Every action guards on the profile id: the id is the database key for the
 * connection request, so a card without one can never mutate anything — the
 * Connect button renders disabled instead of throwing
 * "Cannot read properties of null (reading 'id')".
 */
export function ProfileCard({ profile }: { profile: ProfileCardView }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const [error, reportError] = useActionError();
  const connection = sent ? "outgoing_pending" : profile.connection;

  // Guard: no valid target id → nothing to connect to. Render read-only.
  const hasTargetId = typeof profile.id === "string" && profile.id.trim().length > 0;
  const name = profile.name?.trim() || "Community member";

  async function connect() {
    if (!hasTargetId || busy || connection !== "none") return;
    setBusy(true);
    reportError(null);
    try {
      const result = await sendConnectionAction(profile.id);
      if (!result.ok) {
        reportError(failureMessage(result.error || "Couldn't send your request. Please try again.", result.error || "Couldn't send your request. Check your connection and try again."));
        return;
      }
      setSent(true);
      router.refresh();
    } catch (err) {
      reportError(failureMessage(err, "Couldn't send your request. Check your connection and try again."));
    } finally {
      setBusy(false);
    }
  }

  const statusLabel =
    connection === "connected"
      ? "Connected"
      : connection === "outgoing_pending" || connection === "incoming_pending"
        ? "Requested"
        : "New";

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] bg-gradient-to-b from-[#1E293B] to-[#0F172A] p-5 shadow-card transition duration-150 hover:border-orange-500/30 hover:shadow-lg hover:shadow-orange-500/5 hover:bg-white/[0.05]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {profile.avatarUrl && failedPhoto !== profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={name}
              onError={() => setFailedPhoto(profile.avatarUrl ?? null)}
              className="h-11 w-11 rounded-full object-cover"
            />
          ) : (
            <Avatar name={name} kind={profile.kind} size="md" className="bg-gradient-to-br from-brand-500/25 via-brand-600/10 to-ink-700/40 ring-1 ring-white/10" />
          )}
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-white"><Link href={`/profile/${encodeURIComponent(profile.id)}`}>{name}</Link></h3>
            <p className="truncate text-sm text-ink-300">{profile.location?.trim() || "Location not shared"}</p>
          </div>
        </div>
        <Chip tone={profile.connection === "connected" ? "success" : statusLabel === "Requested" ? "brand" : "neutral"}>
          {statusLabel}
        </Chip>
      </div>

      {profile.bio?.trim() ? (
        <p className="text-sm leading-6 text-ink-300">{profile.bio.trim()}</p>
      ) : (
        <p className="text-sm italic leading-6 text-ink-400">
          A quiet presence — this member is keeping their story unwritten for now.
        </p>
      )}

      {profile.interests.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Interests">
          {profile.interests.map((interest) => (
            <li key={interest}>
              <Chip tone="neutral">{interest}</Chip>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs uppercase tracking-wide text-ink-400">Intentional Member · Interests to be revealed</p>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        {typeof profile.sharedInterests === "number" && profile.sharedInterests > 0 ? (
          <span className="text-xs font-medium text-brand-300">
            {profile.sharedInterests} shared interest{profile.sharedInterests === 1 ? "" : "s"}
          </span>
        ) : (
          <span />
        )}
        {!hasTargetId ? (
          <Button size="sm" variant="secondary" disabled title="This profile can't accept requests right now">
            Connect
          </Button>
        ) : connection === "none" ? (
          busy ? <Button size="sm" disabled>Sending…</Button> :
            <ConnectionButton state={connection} onConnect={connect} />
        ) : connection === "self" ? (
          <Button size="sm" href="/profile">Your profile</Button>
        ) : (
          <Button size="sm" variant="secondary" href="/matches">
            {connection === "incoming_pending" ? "Review request" : connection === "connected" ? "View connection" : "Request sent"}
          </Button>
        )}
      </div>
      <Link href={`/profile/${encodeURIComponent(profile.id)}`} className="text-sm font-semibold text-orange-300 hover:underline">
        View profile
      </Link>
      {error ? <p role="alert" className="text-sm text-danger-300">{error}</p> : null}
    </article>
  );
}
